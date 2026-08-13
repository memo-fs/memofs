import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { MEMOFS_PATHS, MemoFS } from "@memofs/core";
import {
	createNodeFsMemoryStore,
	createTempMemoFsDir,
} from "@memofs/core/node-fs";
import { describe, expect, it } from "vitest";
import { runMemoFsCli, stringifyJsonl } from "../src";
import { CORE_MEMORY_SOFT_LIMIT } from "../src/protocol/constants";

describe("doctor and validate", () => {
	it("passes doctor after init", async () => {
		const temp = await createTempMemoFsDir();
		try {
			await runMemoFsCli({
				argv: ["init", "--root", temp.rootDir, "--no-input"],
			});
			const result = await runMemoFsCli({
				argv: ["doctor", "--root", temp.rootDir],
			});
			expect(result.exitCode).toBe(0);
			expect(result.stdout.join("\n")).toContain("passed");
		} finally {
			await temp.cleanup();
		}
	});

	it("fails doctor when protocol is missing", async () => {
		const temp = await createTempMemoFsDir();
		try {
			const result = await runMemoFsCli({
				argv: ["doctor", "--root", temp.rootDir, "--json"],
			});
			expect(result.exitCode).toBe(1);
			const parsed = JSON.parse(result.stdout.join("\n"));
			expect(parsed.ok).toBe(false);
		} finally {
			await temp.cleanup();
		}
	});

	it("passes validate after init", async () => {
		const temp = await createTempMemoFsDir();
		try {
			await runMemoFsCli({
				argv: ["init", "--root", temp.rootDir, "--no-input"],
			});
			const result = await runMemoFsCli({
				argv: ["validate", "--root", temp.rootDir],
			});
			expect(result.exitCode).toBe(0);
		} finally {
			await temp.cleanup();
		}
	});

	it("validate is strict about JSONL schema", async () => {
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
			await memo.store.write(
				MEMOFS_PATHS.events.memoryEvents,
				stringifyJsonl([{ type: "patch" }]),
			);

			const result = await runMemoFsCli({
				argv: ["validate", "--root", temp.rootDir, "--json"],
			});
			expect(result.exitCode).toBe(1);
			const parsed = JSON.parse(result.stdout.join("\n"));
			expect(parsed.ok).toBe(false);
			expect(
				parsed.issues.some(
					(i: { code: string }) => i.code === "schema_violation",
				),
			).toBe(true);
		} finally {
			await temp.cleanup();
		}
	});

	it("validate detects invalid JSON lines", async () => {
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
			await memo.store.write(MEMOFS_PATHS.events.memoryEvents, "{bad json}\n");

			const result = await runMemoFsCli({
				argv: ["validate", "--root", temp.rootDir, "--json"],
			});
			expect(result.exitCode).toBe(1);
			const parsed = JSON.parse(result.stdout.join("\n"));
			expect(parsed.ok).toBe(false);
			expect(
				parsed.issues.some((i: { code: string }) => i.code === "invalid_json"),
			).toBe(true);
		} finally {
			await temp.cleanup();
		}
	});

	it("doctor warns (non-blocking) when core.md exceeds the soft limit", async () => {
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
			// Push core.md past the soft limit (200 lines). Add a comfortable
			// margin so any off-by-one in the doctor check still fires.
			const oversize = `${Array.from({ length: CORE_MEMORY_SOFT_LIMIT + 20 }, (_, i) => `- fact ${i}`).join("\n")}\n`;
			await memo.store.write(MEMOFS_PATHS.memory.core, oversize);

			const result = await runMemoFsCli({
				argv: ["doctor", "--root", temp.rootDir, "--json"],
			});
			// Advisory only — `ok` stays true (no errors).
			expect(result.exitCode).toBe(0);
			const parsed = JSON.parse(result.stdout.join("\n"));
			expect(parsed.ok).toBe(true);
			expect(
				parsed.issues.some(
					(i: { code: string }) => i.code === "core_memory_oversize",
				),
			).toBe(true);
		} finally {
			await temp.cleanup();
		}
	});

	it("doctor does not warn when core.md is under the soft limit", async () => {
		const temp = await createTempMemoFsDir();
		try {
			await runMemoFsCli({
				argv: ["init", "--root", temp.rootDir, "--no-input"],
			});
			const result = await runMemoFsCli({
				argv: ["doctor", "--root", temp.rootDir, "--json"],
			});
			expect(result.exitCode).toBe(0);
			const parsed = JSON.parse(result.stdout.join("\n"));
			expect(parsed.ok).toBe(true);
			expect(
				parsed.issues.some(
					(i: { code: string }) => i.code === "core_memory_oversize",
				),
			).toBe(false);
		} finally {
			await temp.cleanup();
		}
	});

	it("doctor warns when deprecated memories exist and --fix moves them to archive", async () => {
		const temp = await createTempMemoFsDir();
		try {
			await runMemoFsCli({
				argv: ["init", "--root", temp.rootDir, "--no-input"],
			});
			const memoryId = "mem_dep001";
			const now = "2026-08-10T01:00:00.000Z";
			const noteContent = [
				"# Notes",
				"",
				`## ${now}`,
				"- kind: decision",
				"- tags: none",
				"- confidence: 1",
				`- metadata: ${JSON.stringify({ id: memoryId })}`,
				"",
				"Deprecated test note content",
				"",
			].join("\n");
			await mkdir(join(temp.rootDir, ".memofs", "memory"), { recursive: true });
			await writeFile(
				join(temp.rootDir, ".memofs", "memory", "notes.md"),
				noteContent,
				"utf8",
			);

			const node = {
				id: `concept:${memoryId}`,
				type: "concept",
				label: "Deprecated test note",
				status: "deprecated",
				createdAt: now,
				updatedAt: now,
				sourceRefs: [{ sourceType: "memory", sourceId: memoryId }],
			};
			await mkdir(join(temp.rootDir, ".memofs", "graph"), { recursive: true });
			await writeFile(
				join(temp.rootDir, ".memofs", "graph", "nodes.jsonl"),
				`${JSON.stringify(node)}\n`,
				"utf8",
			);

			const warnResult = await runMemoFsCli({
				argv: ["doctor", "--root", temp.rootDir, "--json"],
			});
			expect(warnResult.exitCode).toBe(0);
			const warnParsed = JSON.parse(warnResult.stdout.join("\n"));
			expect(warnParsed.ok).toBe(true);
			expect(
				warnParsed.issues.some(
					(i: { code: string }) =>
						i.code === "deprecated_memories_pending_archive",
				),
			).toBe(true);

			const fixResult = await runMemoFsCli({
				argv: ["doctor", "--root", temp.rootDir, "--fix", "--json"],
			});
			expect(fixResult.exitCode).toBe(0);
			const fixParsed = JSON.parse(fixResult.stdout.join("\n"));
			expect(fixParsed.ok).toBe(true);
			expect(
				fixParsed.issues.some(
					(i: { code: string }) => i.code === "deprecated_memories_archived",
				),
			).toBe(true);

			const cleanResult = await runMemoFsCli({
				argv: ["doctor", "--root", temp.rootDir, "--json"],
			});
			const cleanParsed = JSON.parse(cleanResult.stdout.join("\n"));
			expect(
				cleanParsed.issues.some(
					(i: { code: string }) =>
						i.code === "deprecated_memories_pending_archive",
				),
			).toBe(false);
		} finally {
			await temp.cleanup();
		}
	});
});
