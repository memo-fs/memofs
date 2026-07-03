import { describe, expect, it } from "vitest";
import { expectSortedDescending, expectVector } from "../src";

describe("assertions", () => {
	it("validates vectors", () => {
		expect(() => expectVector([1, 2], 2)).not.toThrow();
		expect(() => expectVector([1, Number.NaN], 2)).toThrow();
	});

	it("validates descending order", () => {
		expect(() => expectSortedDescending([3, 2, 2, 1])).not.toThrow();
		expect(() => expectSortedDescending([1, 2])).toThrow();
	});
});
