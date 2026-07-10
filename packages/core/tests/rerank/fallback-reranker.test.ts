import { describe, expect, it } from "vitest";
import { createDeterministicFallbackReranker } from "../../src";

describe("DeterministicFallbackReranker", () => {
	it("returns empty results for empty documents", async () => {
		const reranker = createDeterministicFallbackReranker();
		await expect(
			reranker.rerank({ query: "memory", documents: [] }),
		).resolves.toEqual([]);
	});

	it("prefers lexical matches", async () => {
		const reranker = createDeterministicFallbackReranker();
		const results = await reranker.rerank({
			query: "memory architecture",
			documents: [
				{ id: "billing", text: "billing usage quotas" },
				{ id: "memory", text: "memory architecture local protocol" },
			],
			topK: 1,
		});

		expect(results[0]?.id).toBe("memory");
		expect(results[0]?.rank).toBe(1);
	});

	it("does not mutate metadata", async () => {
		const reranker = createDeterministicFallbackReranker();
		const metadata = { tags: ["a"] };
		const results = await reranker.rerank({
			query: "a",
			documents: [{ id: "doc", text: "a", metadata }],
		});

		(results[0]?.metadata as { tags: string[] }).tags.push("b");
		expect(metadata.tags).toEqual(["a"]);
	});
});
