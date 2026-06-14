import { describe, expect, test } from "vitest";
import {
	cosineSimilarity,
	RecallDimensionError,
	sortRecallScores,
} from "../../src/index";

describe("scoring", () => {
	test("computes cosine similarity", () => {
		expect(cosineSimilarity([1, 0], [1, 0])).toBe(1);
		expect(cosineSimilarity([1, 0], [0, 1])).toBe(0);
	});

	test("returns 0 for zero vectors", () => {
		expect(cosineSimilarity([0, 0], [1, 0])).toBe(0);
	});

	test("rejects mismatched dimensions", () => {
		expect(() => cosineSimilarity([1], [1, 0])).toThrow(RecallDimensionError);
	});

	test("sorts by score descending and ID ascending", () => {
		expect(
			sortRecallScores([
				{ id: "b", score: 1 },
				{ id: "a", score: 1 },
				{ id: "c", score: 2 },
			]),
		).toEqual([
			{ id: "c", score: 2 },
			{ id: "a", score: 1 },
			{ id: "b", score: 1 },
		]);
	});
});
