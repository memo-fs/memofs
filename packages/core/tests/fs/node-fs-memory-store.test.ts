import fs from "node:fs/promises";
import path from "node:path";
import {
	CORE_MEMORY_PATH,
	MemoryNotFoundError,
	MemoryPathError,
} from "@memofs/core";
import { describe, expect, test } from "vitest";
import { FsMemoryStoreError } from "../../src/index";
import { createNodeFsMemoryStore, NodeFsMemoryStore } from "../../src/node-fs";
import { createTempRoot, readFile } from "./test-utils";

describe("NodeFsMemoryStore", () => {
	test("creates a store through factory", async () => {
		const rootDir = await createTempRoot();
		const store = createNodeFsMemoryStore({ rootDir });
		expect(store).toBeInstanceOf(NodeFsMemoryStore);
		expect(store.rootDir).toBe(path.resolve(rootDir));
	});

	test("writes and reads a canonical memory file", async () => {
		const rootDir = await createTempRoot();
		const store = createNodeFsMemoryStore({ rootDir });

		await store.write(CORE_MEMORY_PATH, "# Core Memory\n");

		await expect(store.read(CORE_MEMORY_PATH)).resolves.toBe("# Core Memory\n");
		await expect(readFile(rootDir, CORE_MEMORY_PATH)).resolves.toBe(
			"# Core Memory\n",
		);
	});

	test("append adds content without replacing existing content", async () => {
		const rootDir = await createTempRoot();
		const store = createNodeFsMemoryStore({ rootDir });

		await store.write(".tekmemo/memory/notes.md", "# Notes\n");
		await store.append(".tekmemo/memory/notes.md", "\n- one");
		await store.append(".tekmemo/memory/notes.md", "\n- two");

		await expect(store.read(".tekmemo/memory/notes.md")).resolves.toBe(
			"# Notes\n\n- one\n- two",
		);
	});

	test("empty append is a no-op and does not create a file", async () => {
		const rootDir = await createTempRoot();
		const store = createNodeFsMemoryStore({ rootDir });

		await store.append(".tekmemo/memory/notes.md", "");

		await expect(store.exists(".tekmemo/memory/notes.md")).resolves.toBe(false);
	});

	test("exists returns true for files and false for missing files", async () => {
		const rootDir = await createTempRoot();
		const store = createNodeFsMemoryStore({ rootDir });

		await expect(store.exists(CORE_MEMORY_PATH)).resolves.toBe(false);
		await store.write(CORE_MEMORY_PATH, "# Core\n");
		await expect(store.exists(CORE_MEMORY_PATH)).resolves.toBe(true);
	});

	test("read throws MemoryNotFoundError for missing files by default", async () => {
		const rootDir = await createTempRoot();
		const store = createNodeFsMemoryStore({ rootDir });

		await expect(store.read(CORE_MEMORY_PATH)).rejects.toBeInstanceOf(
			MemoryNotFoundError,
		);
	});

	test("read can return empty string for missing files when configured", async () => {
		const rootDir = await createTempRoot();
		const store = createNodeFsMemoryStore({
			rootDir,
			missingFileBehavior: "empty",
		});

		await expect(store.read(CORE_MEMORY_PATH)).resolves.toBe("");
	});

	test("rejects unsupported memory paths", async () => {
		const rootDir = await createTempRoot();
		const store = createNodeFsMemoryStore({ rootDir });

		await expect(
			store.write(".tekmemo/unknown.md" as never, "x"),
		).rejects.toBeInstanceOf(MemoryPathError);
	});

	test("rejects path traversal even when cast to MemoryPath", async () => {
		const rootDir = await createTempRoot();
		const store = createNodeFsMemoryStore({ rootDir });

		await expect(
			store.write("../secret.md" as never, "x"),
		).rejects.toBeInstanceOf(MemoryPathError);
	});

	test("rejects null-byte paths", async () => {
		const rootDir = await createTempRoot();
		const store = createNodeFsMemoryStore({ rootDir });

		await expect(
			store.exists(".tekmemo/memory/core.md\0" as never),
		).rejects.toBeInstanceOf(MemoryPathError);
	});

	test("rejects non-string write content", async () => {
		const rootDir = await createTempRoot();
		const store = createNodeFsMemoryStore({ rootDir });

		await expect(store.write(CORE_MEMORY_PATH, 123 as never)).rejects.toThrow(
			/content must be a string/i,
		);
	});

	test("throws when rootDir exists as a file", async () => {
		const rootDir = await createTempRoot();
		const fileRoot = path.join(rootDir, "not-dir");
		await fs.writeFile(fileRoot, "not a dir", "utf8");
		const store = createNodeFsMemoryStore({ rootDir: fileRoot });

		await expect(store.write(CORE_MEMORY_PATH, "x")).rejects.toBeInstanceOf(
			FsMemoryStoreError,
		);
	});

	test("throws when createRoot is false and rootDir does not exist", async () => {
		const rootDir = path.join(await createTempRoot(), "missing-root");
		const store = createNodeFsMemoryStore({ rootDir, createRoot: false });

		await expect(store.write(CORE_MEMORY_PATH, "x")).rejects.toBeInstanceOf(
			FsMemoryStoreError,
		);
	});

	test("accepts file URL rootDir", async () => {
		const rootDir = await createTempRoot();
		const store = createNodeFsMemoryStore({
			rootDir: new URL(`file://${rootDir}/`),
		});

		await store.write(CORE_MEMORY_PATH, "# URL root\n");
		await expect(store.read(CORE_MEMORY_PATH)).resolves.toBe("# URL root\n");
	});

	test("prevents out-of-band edit clobbering via optimistic concurrency hash check", async () => {
		const rootDir = await createTempRoot();
		const store = createNodeFsMemoryStore({ rootDir });

		await store.write(CORE_MEMORY_PATH, "original version");
		const readVal = await store.read(CORE_MEMORY_PATH);
		expect(readVal).toBe("original version");

		const filePath = path.join(rootDir, CORE_MEMORY_PATH);
		await fs.writeFile(filePath, "manual external modification", "utf8");

		await expect(
			store.write(CORE_MEMORY_PATH, "agent attempt to overwrite"),
		).rejects.toThrow(
			/Conflict detected: the memory file .* was modified externally/,
		);

		const updatedVal = await store.read(CORE_MEMORY_PATH);
		expect(updatedVal).toBe("manual external modification");

		await expect(
			store.write(CORE_MEMORY_PATH, "agent successfully writes after reload"),
		).resolves.toBeUndefined();

		expect(await store.read(CORE_MEMORY_PATH)).toBe(
			"agent successfully writes after reload",
		);
	});
});
