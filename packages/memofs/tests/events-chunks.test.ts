import { MEMOFS_PATHS, MemoFS } from "@memofs/core";
import {
	createNodeFsMemoryStore,
	createTempMemoFsDir,
} from "@memofs/core/node-fs";
import { describe, expect, it } from "vitest";
import { runMemoFsCli, stringifyJsonl } from "../src";

describe("events and chunks", () => {
	it("prints event records", async () => {
		const temp = await createTempMemoFsDir();
		try {
			await runMemoFsCli({
				argv: ["init", "--root", temp.rootDir, "--no-input"],
			});
			const memo = new MemoFS({
				store: createNodeFsMemoryStore({
					rootDir: temp.rootDir,
					createRoot: true,
					missingFileBehavior: "empty",
				}),
				rootDir: temp.rootDir,
				autoBootstrap: false,
			});
			await memo.store.append(
				MEMOFS_PATHS.events.memoryEvents,
				stringifyJsonl([
					{
						id: "evt_1",
						type: "memory.updated",
						timestamp: "2026-01-01T00:00:00.000Z",
						summary: "Updated core",
					},
				]),
			);

			const result = await runMemoFsCli({
				argv: ["events", "--root", temp.rootDir],
			});
			expect(result.stdout.join("\n")).toContain("memory.updated");
		} finally {
			await temp.cleanup();
		}
	});

	it("prints chunk records", async () => {
		const temp = await createTempMemoFsDir();
		try {
			await runMemoFsCli({
				argv: ["init", "--root", temp.rootDir, "--no-input"],
			});
			const memo = new MemoFS({
				store: createNodeFsMemoryStore({
					rootDir: temp.rootDir,
					createRoot: true,
					missingFileBehavior: "empty",
				}),
				rootDir: temp.rootDir,
				autoBootstrap: false,
			});
			await memo.store.append(
				MEMOFS_PATHS.indexes.chunks,
				stringifyJsonl([
					{
						chunkId: "chunk_1",
						sourcePath: MEMOFS_PATHS.memory.core,
						sourceType: "document",
						sourceId: "core",
						sourceHash: "hash_a",
						textHash: "hash_b",
						memoryType: "core",
						index: 0,
						startOffset: 0,
						endOffset: 10,
						status: "active",
						createdAt: "2026-01-01T00:00:00.000Z",
					},
				]),
			);

			const result = await runMemoFsCli({
				argv: ["chunks", "--root", temp.rootDir],
			});
			expect(result.stdout.join("\n")).toContain("chunk_1");
		} finally {
			await temp.cleanup();
		}
	});
});
