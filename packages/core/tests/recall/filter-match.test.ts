import { describe, expect, test } from "vitest";
import { matchesRecallFilter } from "../../src/index";

const metadata = {
	projectId: "proj_1",
	sourceType: "note",
	sourceId: "note_1",
	memoryType: "notes",
	tag: "typescript",
	tags: ["typescript", "memory"],
	scoreValue: 10,
	nested: { owner: "tek" },
};

describe("metadata filter matching", () => {
	test("matches exact values", () => {
		expect(matchesRecallFilter(metadata, { tag: "typescript" })).toBe(true);
		expect(matchesRecallFilter(metadata, { tag: "python" })).toBe(false);
	});

	test("matches equality and inequality operators", () => {
		expect(matchesRecallFilter(metadata, { tag: { $eq: "typescript" } })).toBe(
			true,
		);
		expect(matchesRecallFilter(metadata, { tag: { $ne: "python" } })).toBe(
			true,
		);
	});

	test("matches inclusion operators", () => {
		expect(
			matchesRecallFilter(metadata, { tag: { $in: ["typescript", "rust"] } }),
		).toBe(true);
		expect(
			matchesRecallFilter(metadata, { tag: { $nin: ["python", "rust"] } }),
		).toBe(true);
	});

	test("matches numeric comparison operators", () => {
		expect(matchesRecallFilter(metadata, { scoreValue: { $gt: 5 } })).toBe(
			true,
		);
		expect(matchesRecallFilter(metadata, { scoreValue: { $lte: 10 } })).toBe(
			true,
		);
		expect(matchesRecallFilter(metadata, { scoreValue: { $lt: 1 } })).toBe(
			false,
		);
	});

	test("matches exists and contains operators", () => {
		expect(matchesRecallFilter(metadata, { missing: { $exists: false } })).toBe(
			true,
		);
		expect(
			matchesRecallFilter(metadata, { tag: { $contains: "script" } }),
		).toBe(true);
		expect(
			matchesRecallFilter(metadata, { tags: { $contains: "memory" } }),
		).toBe(true);
	});

	test("supports dotted nested keys", () => {
		expect(matchesRecallFilter(metadata, { "nested.owner": "tek" })).toBe(true);
	});
});
