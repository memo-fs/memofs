import { describe, expect, test } from "vitest";
import { UpstashRecallValidationError } from "../src/errors/upstash-errors";
import { resolveRequestNamespace, resolveUpstashNamespace } from "../src/index";

describe("namespace resolution", () => {
	test("uses explicit namespace when provided", () => {
		expect(resolveUpstashNamespace({ namespace: "tenant/proj" })).toBe(
			"tenant/proj",
		);
	});

	test("builds default namespace from prefix and environment", () => {
		expect(resolveUpstashNamespace({ environment: "prod" })).toBe(
			"tekmemo-prod",
		);
	});

	test("builds tenant and project namespace", () => {
		expect(
			resolveUpstashNamespace({
				namespacePrefix: "memo",
				environment: "prod",
				tenantId: "ten_1",
				projectId: "proj_1",
			}),
		).toBe("memo-prod-ten_1-proj_1");
	});

	test("rejects unsafe namespace", () => {
		expect(() => resolveUpstashNamespace({ namespace: "../bad" })).toThrow(
			UpstashRecallValidationError,
		);
	});

	test("rejects unsafe namespace segments", () => {
		expect(() => resolveUpstashNamespace({ environment: "../prod" })).toThrow(
			UpstashRecallValidationError,
		);
		expect(() =>
			resolveUpstashNamespace({ namespacePrefix: "bad space" }),
		).toThrow(UpstashRecallValidationError);
	});

	test("request namespace falls back safely", () => {
		expect(resolveRequestNamespace({ fallback: "tekmemo-test" })).toBe(
			"tekmemo-test",
		);
		expect(
			resolveRequestNamespace({
				explicit: "custom/ns",
				fallback: "tekmemo-test",
			}),
		).toBe("custom/ns");
	});
});
