import fs from "node:fs/promises";
import path from "node:path";
import { describe, expect, test } from "vitest";
import { FsMemoryStoreError } from "../../src/index";
import { createNodeFsMemoryStore } from "../../src/node-fs";
import { createTempRoot } from "./test-utils";

describe("filesystem safety", () => {
	test("rejects symlinked managed memory directory by default", async () => {
		const rootDir = await createTempRoot();
		const outside = await createTempRoot("memofs-fs-outside-");
		await fs.symlink(outside, path.join(rootDir, ".memofs"), "dir");
		const store = createNodeFsMemoryStore({ rootDir });

		await expect(
			store.write(".memofs/memory/core.md", "x"),
		).rejects.toBeInstanceOf(FsMemoryStoreError);
	});

	test("allows symlinks when disallowSymlinks is false", async () => {
		const rootDir = await createTempRoot();
		const outside = await createTempRoot("memofs-fs-outside-");
		await fs.symlink(outside, path.join(rootDir, ".memofs"), "dir");
		const store = createNodeFsMemoryStore({ rootDir, disallowSymlinks: false });

		await store.write(".memofs/memory/core.md", "allowed\n");
		await expect(
			fs.readFile(path.join(outside, "memory", "core.md"), "utf8"),
		).resolves.toBe("allowed\n");
	});

	test("does not create files outside root with canonical memory paths", async () => {
		const rootDir = await createTempRoot();
		const store = createNodeFsMemoryStore({ rootDir });

		await store.write(".memofs/memory/core.md", "safe\n");

		await expect(
			fs.readFile(path.join(rootDir, ".memofs", "memory", "core.md"), "utf8"),
		).resolves.toBe("safe\n");
	});
});
