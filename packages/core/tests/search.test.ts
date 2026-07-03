import { describe, expect, it } from "vitest";
import {
	MemoryValidationError,
	searchMemoryText,
	splitSearchBlocks,
} from "../src/index";

describe("searchMemoryText", () => {
	it("searches markdown sections and ranks by occurrence", () => {
		const results = searchMemoryText({
			content: "# Notes\n\n## A\none needle\n\n## B\nneedle needle\n",
			query: "needle",
		});

		expect(results[0]?.text).toMatch(/## B/);
		expect(results[0]?.score).toBeGreaterThan(results[1]?.score ?? 0);
	});

	it("searches lines when there are no markdown sections", () => {
		const results = searchMemoryText({
			content: "alpha\nbeta\ngamma",
			query: "beta",
		});
		expect(results).toHaveLength(1);
		expect(results[0]?.text).toBe("beta");
	});

	it("returns empty results for no matches", () => {
		expect(searchMemoryText({ content: "alpha", query: "zzz" })).toEqual([]);
	});

	it("rejects empty queries", () => {
		expect(() => searchMemoryText({ content: "alpha", query: " " })).toThrow(
			MemoryValidationError,
		);
	});

	it("rejects invalid limits", () => {
		expect(() =>
			searchMemoryText({ content: "alpha", query: "a", limit: -1 }),
		).toThrow(MemoryValidationError);
	});

	it("splits explicit modes", () => {
		expect(
			splitSearchBlocks("## A\na\n## B\nb", "markdown-section"),
		).toHaveLength(2);
		expect(splitSearchBlocks("a\nb", "line")).toEqual(["a", "b"]);
	});
});
