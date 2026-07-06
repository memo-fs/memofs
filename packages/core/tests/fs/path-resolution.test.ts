import path from "node:path";
import { MemoryPathError } from "@memofs/core";
import { describe, expect, test } from "vitest";
import {
	normalizeOptions,
	normalizeRootDir,
	resolveAbsoluteMemoryPath,
} from "../../src/node-fs";
import { createTempRoot } from "./test-utils";

describe("path utilities", () => {
	test("normalizeRootDir resolves relative paths to absolute paths", () => {
		expect(normalizeRootDir("relative-memory-root")).toBe(
			path.resolve("relative-memory-root"),
		);
	});

	test("normalizeRootDir rejects empty rootDir", () => {
		expect(() => normalizeRootDir(" ")).toThrow(MemoryPathError);
	});

	test("normalizeRootDir rejects null bytes", () => {
		expect(() => normalizeRootDir("/tmp/bad\0root")).toThrow(MemoryPathError);
	});

	test("normalizeOptions applies production-safe defaults", async () => {
		const rootDir = await createTempRoot();
		const options = normalizeOptions({ rootDir });

		expect(options.createRoot).toBe(true);
		expect(options.missingFileBehavior).toBe("throw");
		expect(options.disallowSymlinks).toBe(true);
		expect(options.directoryMode).toBe(0o700);
		expect(options.fileMode).toBe(0o600);
	});

	test("resolveAbsoluteMemoryPath resolves under root", async () => {
		const rootDir = await createTempRoot();
		const options = normalizeOptions({ rootDir });

		expect(resolveAbsoluteMemoryPath(options, ".tekmemo/memory/core.md")).toBe(
			path.join(rootDir, ".tekmemo", "memory", "core.md"),
		);
	});
});

describe("URL rootDir validation", () => {
	test("rejects non-file URL rootDir", () => {
		expect(() =>
			normalizeRootDir(new URL("https://example.com/memory")),
		).toThrow(MemoryPathError);
	});
});
