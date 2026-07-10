import { describe, expect, test } from "vitest";
import {
	createProjectNamespace,
	normalizeNamespace,
	RecallValidationError,
} from "../../src/index";

describe("namespace helpers", () => {
	test("creates project namespace", () => {
		expect(
			createProjectNamespace({ tenantId: "ten_1", projectId: "proj_1" }),
		).toBe("project/ten_1/proj_1");
	});

	test("supports custom prefix", () => {
		expect(
			createProjectNamespace({
				prefix: "cloud",
				tenantId: "ten_1",
				projectId: "proj_1",
			}),
		).toBe("cloud/ten_1/proj_1");
	});

	test("normalizes fallback namespace", () => {
		expect(normalizeNamespace(undefined, "default")).toBe("default");
	});

	test("rejects unsafe namespace", () => {
		expect(() => normalizeNamespace("../bad")).toThrow(RecallValidationError);
		expect(() => normalizeNamespace("/bad")).toThrow(RecallValidationError);
		expect(() => normalizeNamespace("bad/")).toThrow(RecallValidationError);
	});
});
