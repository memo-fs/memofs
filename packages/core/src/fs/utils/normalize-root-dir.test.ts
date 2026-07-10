import path from "node:path";
import { expect, test } from "vitest";
import { normalizeRootDir } from "./normalize-root-dir";

test("normalizeRootDir resolves relative path", () => {
	const resolved = normalizeRootDir("./tmp");
	expect(resolved).toBe(path.resolve("./tmp"));
});

test("normalizeRootDir rejects empty string", () => {
	expect(() => normalizeRootDir("")).toThrow();
});

test("normalizeRootDir rejects null bytes", () => {
	expect(() => normalizeRootDir("/tmp\0evil")).toThrow();
});

test("normalizeRootDir accepts file URL", () => {
	const url = new URL(`file://${path.resolve("/tmp")}`);
	expect(() => normalizeRootDir(url)).not.toThrow();
});

test("normalizeRootDir rejects non-file URL", () => {
	expect(() => normalizeRootDir(new URL("https://example.com"))).toThrow();
});
