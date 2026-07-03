import { describe, expect, it } from "vitest";
import { createFakeReranker } from "../../src/rerank/testing";

describe("FakeReranker", () => {
	it("uses explicit scores", async () => {
		const reranker = createFakeReranker({ scores: { a: 0.2, b: 0.9 } });
		const results = await reranker.rerank({
			query: "x",
			documents: [
				{ id: "a", text: "a" },
				{ id: "b", text: "b" },
			],
		});

		expect(results.map((result) => result.id)).toEqual(["b", "a"]);
		expect(reranker.calls).toHaveLength(1);
	});

	it("can fail intentionally", async () => {
		const reranker = createFakeReranker({ failWith: new Error("boom") });
		await expect(
			reranker.rerank({ query: "x", documents: [] }),
		).rejects.toThrow("boom");
	});
});
