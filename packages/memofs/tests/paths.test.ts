import { describe, expect, it } from "vitest";
import { resolveInsideRoot } from "../src/utils/content";

describe("resolveInsideRoot", () => {
	it("resolves a relative path inside root", () => {
		const result = resolveInsideRoot("/project", ".tekmemo/memory/core.md");
		expect(result).toBe("/project/.tekmemo/memory/core.md");
	});

	it("throws on empty relative path", () => {
		expect(() => resolveInsideRoot("/project", "")).toThrow();
		expect(() => resolveInsideRoot("/project", " ")).toThrow();
	});

	it("throws on null bytes", () => {
		expect(() => resolveInsideRoot("/project", "bad\0path")).toThrow();
	});

	it("throws on absolute paths", () => {
		expect(() => resolveInsideRoot("/project", "/etc/passwd")).toThrow();
	});

	it("rejects path traversal with ..", () => {
		expect(() => resolveInsideRoot("/project", "../etc/passwd")).toThrow();
		expect(() =>
			resolveInsideRoot("/project", ".tekmemo/../etc/passwd"),
		).toThrow();
	});
});
