import { type MemoryPath, TEKMEMO_PATHS, Tekmemo } from "@tekmemo/core";
import {
	createNodeFsMemoryStore,
	createTempTekMemoDir,
} from "@tekmemo/core/node-fs";
import { describe, expect, it } from "vitest";

describe("Tekmemo store", () => {
	it("writes and reads files safely", async () => {
		const temp = await createTempTekMemoDir();
		try {
			const memo = new Tekmemo({
				store: createNodeFsMemoryStore({
					rootDir: temp.rootDir,
					createRoot: true,
					missingFileBehavior: "empty",
				}),
				rootDir: temp.rootDir,
				autoBootstrap: false,
			});
			await memo.store.write(TEKMEMO_PATHS.memory.core, "hello");
			await expect(memo.store.read(TEKMEMO_PATHS.memory.core)).resolves.toBe(
				"hello",
			);
		} finally {
			await temp.cleanup();
		}
	});

	it("rejects path traversal", async () => {
		const temp = await createTempTekMemoDir();
		try {
			const memo = new Tekmemo({
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
				memo.store.write(".tekmemo/../bad" as MemoryPath, "content"),
			).rejects.toThrow();
		} finally {
			await temp.cleanup();
		}
	});
});
