import { describe, expect, test } from "vitest";
import {
	AgentfsConfigError,
	normalizeAgentfsMemoryStoreConfig,
	resolveStoreRoot,
} from "../../src/index";

describe("resolveStoreRoot", () => {
	test("returns stable project root with default prefix", () => {
		expect(resolveStoreRoot({ scope: "project", projectId: "proj_123" })).toBe(
			"/stores/project/proj_123",
		);
	});

	test("supports user and session scopes", () => {
		expect(resolveStoreRoot({ scope: "user", userId: "usr-1" })).toBe(
			"/stores/user/usr-1",
		);
		expect(resolveStoreRoot({ scope: "session", sessionId: "sess.1" })).toBe(
			"/stores/session/sess.1",
		);
	});

	test("normalizes custom root prefix", () => {
		expect(
			resolveStoreRoot({
				scope: "project",
				projectId: "abc",
				rootPrefix: " tenants//memory/",
			}),
		).toBe("/tenants/memory/project/abc");
	});

	test("accepts slash root prefix", () => {
		expect(
			resolveStoreRoot({ scope: "project", projectId: "abc", rootPrefix: "/" }),
		).toBe("/project/abc");
	});

	test("rejects missing scope identifiers", () => {
		expect(() => resolveStoreRoot({ scope: "project" })).toThrow(
			AgentfsConfigError,
		);
		expect(() => resolveStoreRoot({ scope: "user" })).toThrow(
			AgentfsConfigError,
		);
		expect(() => resolveStoreRoot({ scope: "session" })).toThrow(
			AgentfsConfigError,
		);
	});

	test("rejects unsafe identifiers", () => {
		expect(() =>
			resolveStoreRoot({ scope: "project", projectId: "../x" }),
		).toThrow(AgentfsConfigError);
		expect(() =>
			resolveStoreRoot({ scope: "project", projectId: "x/y" }),
		).toThrow(AgentfsConfigError);
		expect(() =>
			resolveStoreRoot({ scope: "project", projectId: "x\\y" }),
		).toThrow(AgentfsConfigError);
		expect(() =>
			resolveStoreRoot({ scope: "project", projectId: "bad id" }),
		).toThrow(AgentfsConfigError);
		expect(() =>
			resolveStoreRoot({ scope: "project", projectId: "\0" }),
		).toThrow(AgentfsConfigError);
	});

	test("rejects unsafe rootPrefix", () => {
		expect(() =>
			resolveStoreRoot({ scope: "project", projectId: "abc", rootPrefix: "" }),
		).toThrow(AgentfsConfigError);
		expect(() =>
			resolveStoreRoot({
				scope: "project",
				projectId: "abc",
				rootPrefix: "../stores",
			}),
		).toThrow(AgentfsConfigError);
		expect(() =>
			resolveStoreRoot({
				scope: "project",
				projectId: "abc",
				rootPrefix: "a\\b",
			}),
		).toThrow(AgentfsConfigError);
		expect(() =>
			resolveStoreRoot({
				scope: "project",
				projectId: "abc",
				rootPrefix: "\0",
			}),
		).toThrow(AgentfsConfigError);
	});

	test("normalizes supported options", () => {
		expect(
			normalizeAgentfsMemoryStoreConfig({
				scope: "project",
				projectId: "abc",
				missingFileBehavior: "empty",
				allowReadWriteAppendFallback: false,
				preferNativeAppend: false,
			}),
		).toEqual({
			scope: "project",
			root: "/stores/project/abc",
			missingFileBehavior: "empty",
			allowReadWriteAppendFallback: false,
			preferNativeAppend: false,
		});
	});

	test("rejects invalid missingFileBehavior", () => {
		expect(() =>
			normalizeAgentfsMemoryStoreConfig({
				scope: "project",
				projectId: "abc",
				missingFileBehavior: "relaxed" as never,
			}),
		).toThrow(AgentfsConfigError);
	});
});
