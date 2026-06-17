import {
	createTempTekMemoDir,
	TEKMEMO_PATHS,
	Tekmemo,
} from "@tekbreed/tekmemo";
import { describe, expect, it } from "vitest";
import { runTekMemoCli, stringifyJsonl } from "../src";

describe("events and chunks", () => {
	it("prints event records", async () => {
		const temp = await createTempTekMemoDir();
		try {
			await runTekMemoCli({
				argv: ["init", "--root", temp.rootDir, "--no-input"],
			});
			const memo = new Tekmemo({ rootDir: temp.rootDir, autoBootstrap: false });
			await memo.store.append(
				TEKMEMO_PATHS.events.memoryEvents,
				stringifyJsonl([
					{
						id: "evt_1",
						type: "memory.updated",
						timestamp: "2026-01-01T00:00:00.000Z",
						summary: "Updated core",
					},
				]),
			);

			const result = await runTekMemoCli({
				argv: ["events", "--root", temp.rootDir],
			});
			expect(result.stdout.join("\n")).toContain("memory.updated");
		} finally {
			await temp.cleanup();
		}
	});

	it("prints chunk records", async () => {
		const temp = await createTempTekMemoDir();
		try {
			await runTekMemoCli({
				argv: ["init", "--root", temp.rootDir, "--no-input"],
			});
			const memo = new Tekmemo({ rootDir: temp.rootDir, autoBootstrap: false });
			await memo.store.append(
				TEKMEMO_PATHS.indexes.chunks,
				stringifyJsonl([
					{
						chunkId: "chunk_1",
						sourcePath: TEKMEMO_PATHS.memory.core,
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

			const result = await runTekMemoCli({
				argv: ["chunks", "--root", temp.rootDir],
			});
			expect(result.stdout.join("\n")).toContain("chunk_1");
		} finally {
			await temp.cleanup();
		}
	});
});
