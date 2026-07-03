import { describe, expect, it } from "vitest";
import { applyTopK, stableSortRerankResults } from "../../src";

describe("result sorting", () => {
	it("sorts by score descending and then ID", () => {
		const results = stableSortRerankResults([
			{ id: "b", text: "b", score: 1, rank: 0 },
			{ id: "a", text: "a", score: 1, rank: 0 },
			{ id: "c", text: "c", score: 2, rank: 0 },
		]);

		expect(results.map((result) => result.id)).toEqual(["c", "a", "b"]);
		expect(results.map((result) => result.rank)).toEqual([1, 2, 3]);
	});

	it("applies topK and reranks", () => {
		const results = applyTopK(
			[
				{ id: "a", text: "a", score: 0.1, rank: 0 },
				{ id: "b", text: "b", score: 0.9, rank: 0 },
			],
			1,
		);

		expect(results).toHaveLength(1);
		expect(results[0]?.id).toBe("b");
		expect(results[0]?.rank).toBe(1);
	});
});
