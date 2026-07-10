import { MEMOFS_PATHS, MemoFS, type MemoryPath } from "@memofs/core";
import {
	createNodeFsMemoryStore,
	createTempMemoFsDir,
} from "@memofs/core/node-fs";
import { describe, expect, it } from "vitest";

describe("MemoFS store", () => {
	it("writes and reads files safely", async () => {
		const temp = await createTempMemoFsDir();
		try {
			const memo = new MemoFS({
				store: createNodeFsMemoryStore({
					rootDir: temp.rootDir,
					createRoot: true,
					missingFileBehavior: "empty",
				}),
				rootDir: temp.rootDir,
				autoBootstrap: false,
			});
			await memo.store.write(MEMOFS_PATHS.memory.core, "hello");
			await expect(memo.store.read(MEMOFS_PATHS.memory.core)).resolves.toBe(
				"hello",
			);
		} finally {
			await temp.cleanup();
		}
	});

	it("rejects path traversal", async () => {
		const temp = await createTempMemoFsDir();
		try {
			const memo = new MemoFS({
				store: createNodeFsMemoryStore({
					rootDir: temp.rootDir,
					createRoot: true,
					missingFileBehavior: "empty",
				}),
				rootDir: temp.rootDir,
				autoBootstrap: false,
			});
			await expect(
				memo.store.write("../bad" as MemoryPath, "content"),
			).rejects.toThrow();
			await expect(
				memo.store.write(".memofs/../bad" as MemoryPath, "content"),
			).rejects.toThrow();
		} finally {
			await temp.cleanup();
		}
	});
});
