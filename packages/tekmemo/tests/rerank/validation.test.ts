import { describe, expect, it } from "vitest";
import { normalizeRerankInput, RerankValidationError } from "../../src";

describe("normalizeRerankInput", () => {
	it("normalizes valid input", () => {
		const input = normalizeRerankInput({
			query: "memory",
			documents: [{ id: "doc_1", text: "memory architecture" }],
			topK: 10,
		});

		expect(input.topK).toBe(1);
		expect(input.documents[0]?.id).toBe("doc_1");
	});

	it("rejects empty query", () => {
		expect(() => normalizeRerankInput({ query: "", documents: [] })).toThrow(
			RerankValidationError,
		);
	});

	it("rejects unsafe IDs", () => {
		expect(() =>
			normalizeRerankInput({
				query: "x",
				documents: [{ id: "../bad", text: "hello" }],
			}),
		).toThrow(RerankValidationError);
	});

	it("rejects duplicate IDs", () => {
		expect(() =>
			normalizeRerankInput({
				query: "x",
				documents: [
					{ id: "doc", text: "one" },
					{ id: "doc", text: "two" },
				],
			}),
		).toThrow(RerankValidationError);
	});

	it("rejects invalid topK", () => {
		expect(() =>
			normalizeRerankInput({
				query: "x",
				documents: [{ id: "doc", text: "one" }],
				topK: 0,
			}),
		).toThrow(RerankValidationError);
	});

	it("rejects circular metadata", () => {
		const metadata: Record<string, unknown> = {};
		metadata.self = metadata;

		expect(() =>
			normalizeRerankInput({
				query: "x",
				documents: [{ id: "doc", text: "one", metadata }],
			}),
		).toThrow(RerankValidationError);
	});

	it("rejects prototype pollution metadata keys", () => {
		expect(() =>
			normalizeRerankInput({
				query: "x",
				documents: [
					{ id: "doc", text: "one", metadata: { constructor: "bad" } },
				],
			}),
		).toThrow(RerankValidationError);
	});
});
