import type { RecallDocument } from "@tekbreed/tekmemo";
import { describe, expect, test } from "vitest";
import {
	normalizeResultMetadata,
	normalizeUpstashMetadata,
	UpstashRecallValidationError,
} from "../src/index";

const doc: RecallDocument = {
	id: "chunk_1",
	text: "hello",
	embedding: [0.1, 0.2],
	metadata: {
		tenantId: "ten_1",
		projectId: "proj_1",
		sourceType: "note",
		sourceId: "note_1",
		memoryType: "notes",
		tags: ["a", "b"],
		nested: { ok: true },
	},
	namespace: "ns_1",
};

describe("metadata normalization", () => {
	test("normalizes document metadata for Upstash", () => {
		expect(normalizeUpstashMetadata(doc)).toMatchObject({
			tenantId: "ten_1",
			projectId: "proj_1",
			sourceType: "note",
			sourceId: "note_1",
			memoryType: "notes",
			namespace: "ns_1",
		});
	});

	test("rejects reserved metadata keys", () => {
		expect(() =>
			normalizeUpstashMetadata({
				...doc,
				metadata: {
					projectId: "proj_1",
					sourceType: "note",
					sourceId: "note_1",
					memoryType: "notes",
					constructor: "bad",
				},
			}),
		).toThrow(UpstashRecallValidationError);
	});

	test("normalizes provider result metadata defensively", () => {
		expect(
			normalizeResultMetadata({
				projectId: "proj_1",
				sourceType: "note",
				sourceId: "note_1",
				memoryType: "notes",
			}),
		).toMatchObject({ projectId: "proj_1" });
		expect(normalizeResultMetadata(null)).toBeUndefined();
		expect(normalizeResultMetadata("not-object")).toBeUndefined();
	});
});
