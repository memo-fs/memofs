import { describe, expect, test } from "vitest";
import {
	createProjectNamespace,
	RecallDimensionError,
	RecallValidationError,
	validateEmbedding,
	validateRecallDocument,
	validateRecallFilter,
	validateRecallQuery,
} from "../../src/index";

const validDocument = {
	id: "doc_1",
	text: "hello",
	embedding: [1, 0, 0],
	metadata: {
		projectId: "proj_1",
		sourceType: "note",
		sourceId: "note_1",
		memoryType: "notes",
	},
};

describe("validation", () => {
	test("validates recall documents", () => {
		expect(validateRecallDocument(validDocument)).toEqual(validDocument);
	});

	test("rejects unsafe document IDs", () => {
		expect(() =>
			validateRecallDocument({ ...validDocument, id: "../secret" }),
		).toThrow(RecallValidationError);
	});

	test("rejects empty text", () => {
		expect(() =>
			validateRecallDocument({ ...validDocument, text: " " }),
		).toThrow(RecallValidationError);
	});

	test("rejects missing metadata fields", () => {
		expect(() =>
			validateRecallDocument({
				...validDocument,
				metadata: { projectId: "proj_1" },
			}),
		).toThrow(RecallValidationError);
	});

	test("rejects circular metadata", () => {
		const circular: Record<string, unknown> = {
			projectId: "proj_1",
			sourceType: "note",
			sourceId: "note_1",
			memoryType: "notes",
		};
		circular.self = circular;
		expect(() =>
			validateRecallDocument({ ...validDocument, metadata: circular }),
		).toThrow(RecallValidationError);
	});

	test("rejects prototype pollution keys", () => {
		const metadata = { ...validDocument.metadata } as Record<string, unknown>;
		Object.defineProperty(metadata, "__proto__", {
			value: "bad",
			enumerable: true,
		});

		expect(() =>
			validateRecallDocument({
				...validDocument,
				metadata,
			}),
		).toThrow(RecallValidationError);
	});

	test("validates embedding dimension", () => {
		expect(() => validateEmbedding([1, 2], "embedding", 3)).toThrow(
			RecallDimensionError,
		);
	});

	test("rejects NaN and infinite embeddings", () => {
		expect(() => validateEmbedding([Number.NaN])).toThrow(
			RecallValidationError,
		);
		expect(() => validateEmbedding([Infinity])).toThrow(RecallValidationError);
	});

	test("validates recall query", () => {
		expect(validateRecallQuery({ embedding: [1, 0, 0], topK: 5 })).toEqual({
			embedding: [1, 0, 0],
			topK: 5,
		});
	});

	test("rejects invalid topK", () => {
		expect(() => validateRecallQuery({ embedding: [1], topK: 0 })).toThrow(
			RecallValidationError,
		);
		expect(() => validateRecallQuery({ embedding: [1], topK: 1.5 })).toThrow(
			RecallValidationError,
		);
	});

	test("validates supported filter operators", () => {
		expect(
			validateRecallFilter({
				tag: { $eq: "typescript" },
				scoreValue: { $gte: 5 },
			}),
		).toEqual({
			tag: { $eq: "typescript" },
			scoreValue: { $gte: 5 },
		});
	});

	test("rejects unsupported filter operators", () => {
		expect(() => validateRecallFilter({ tag: { $regex: ".*" } })).toThrow(
			RecallValidationError,
		);
	});

	test("rejects invalid namespace", () => {
		expect(() =>
			createProjectNamespace({ tenantId: "../bad", projectId: "proj_1" }),
		).toThrow(RecallValidationError);
	});
});
