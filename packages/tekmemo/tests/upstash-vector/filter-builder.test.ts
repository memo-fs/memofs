import { describe, expect, test } from "vitest";
import {
	buildUpstashFilter,
	UpstashRecallValidationError,
} from "../../src/index";

describe("buildUpstashFilter", () => {
	test("returns undefined when there are no filters", () => {
		expect(buildUpstashFilter({})).toBeUndefined();
	});

	test("adds required tenant and project filters", () => {
		expect(
			buildUpstashFilter({
				requiredTenantId: "ten_1",
				requiredProjectId: "proj_1",
			}),
		).toBe('tenantId = "ten_1" AND projectId = "proj_1"');
	});

	test("adds required source filters", () => {
		expect(
			buildUpstashFilter({
				requiredSource: { sourceType: "note", sourceId: "note_1" },
			}),
		).toBe('sourceType = "note" AND sourceId = "note_1"');
	});

	test("maps equality filter", () => {
		expect(buildUpstashFilter({ filter: { memoryType: "notes" } })).toBe(
			'memoryType = "notes"',
		);
	});

	test("maps numeric comparison operators", () => {
		expect(buildUpstashFilter({ filter: { version: { $gte: 2 } } })).toBe(
			"version >= 2",
		);
	});

	test("maps in and nin operators", () => {
		expect(
			buildUpstashFilter({
				filter: { memoryType: { $in: ["core", "notes"] } },
			}),
		).toBe('(memoryType = "core" OR memoryType = "notes")');
		expect(
			buildUpstashFilter({ filter: { memoryType: { $nin: ["event"] } } }),
		).toBe('NOT memoryType = "event"');
	});

	test("maps contains operator", () => {
		expect(
			buildUpstashFilter({ filter: { tags: { $contains: "decision" } } }),
		).toBe('tags CONTAINS "decision"');
	});

	test("required isolation filters override user-supplied tenant/project filters", () => {
		expect(
			buildUpstashFilter({
				requiredTenantId: "ten_real",
				requiredProjectId: "proj_real",
				filter: { tenantId: "bad", projectId: "bad", memoryType: "core" },
			}),
		).toBe(
			'tenantId = "ten_real" AND projectId = "proj_real" AND memoryType = "core"',
		);
	});

	test("rejects unsafe field names and unsupported operators", () => {
		expect(() => buildUpstashFilter({ filter: { "bad field": "x" } })).toThrow(
			UpstashRecallValidationError,
		);
		expect(() =>
			buildUpstashFilter({ filter: { memoryType: { $regex: ".*" } as never } }),
		).toThrow(UpstashRecallValidationError);
	});
});
