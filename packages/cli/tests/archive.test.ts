/**
 * Integration tests for `memofs consolidate --archive-deprecated` and
 * `memofs restore <id>` CLI subcommands (ticket #72 — Semantic GC:
 * archive move + restore).
 *
 * @module archive.test
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { createTempMemoFsDir } from "@memofs/core/node-fs";
import { describe, expect, it } from "vitest";
import { runMemoFsCli } from "../src";

const NOTES_PATH = ".memofs/memory/notes.md";
const EVENTS_PATH = ".memofs/events/memory-events.jsonl";
const GRAPH_NODES_PATH = ".memofs/graph/nodes.jsonl";
const ARCHIVE_DIR = ".memofs/archive";

async function writeNotesMd(rootDir: string, content: string): Promise<void> {
	await mkdir(join(rootDir, ".memofs", "memory"), { recursive: true });
	await writeFile(join(rootDir, NOTES_PATH), content, "utf8");
}

async function readNotesMd(rootDir: string): Promise<string> {
	try {
		return await readFile(join(rootDir, NOTES_PATH), "utf8");
	} catch {
		return "";
	}
}

async function readMemoryEvents(rootDir: string): Promise<string> {
	try {
		return await readFile(join(rootDir, EVENTS_PATH), "utf8");
	} catch {
		return "";
	}
}

async function readArchiveFile(
	rootDir: string,
	id: string,
): Promise<string | null> {
	try {
		return await readFile(join(rootDir, ARCHIVE_DIR, `${id}.json`), "utf8");
	} catch {
		return null;
	}
}

async function archiveExists(rootDir: string, id: string): Promise<boolean> {
	try {
		await readFile(join(rootDir, ARCHIVE_DIR, `${id}.json`));
		return true;
	} catch {
		return false;
	}
}

/**
 * Writes a graph nodes.jsonl file with one deprecated node bound to the
 * given memory id via sourceRefs. This simulates the state after
 * auto-supersession: the older memory's graph node is deprecated.
 */
async function writeDeprecatedGraphNode(
	rootDir: string,
	memoryId: string,
	nodeId = `concept:${memoryId}`,
): Promise<void> {
	await mkdir(join(rootDir, ".memofs", "graph"), { recursive: true });
	const now = "2026-08-10T01:00:00.000Z";
	const node = {
		id: nodeId,
		type: "concept",
		label: `Concept for ${memoryId}`,
		aliases: [],
		confidence: 1,
		importance: 0.5,
		status: "deprecated",
		createdAt: now,
		updatedAt: now,
		sourceRefs: [
			{
				sourceType: "memory",
				sourceId: memoryId,
			},
		],
	};
	await writeFile(
		join(rootDir, GRAPH_NODES_PATH),
		`${JSON.stringify(node)}\n`,
		"utf8",
	);
}

function makeNoteLine(opts: {
	timestamp: string;
	id: string;
	content: string;
	kind?: string;
}): string {
	const lines = [
		`## ${opts.timestamp}`,
		`- kind: ${opts.kind ?? "note"}`,
		"- tags: none",
		"- confidence: 1",
		`- metadata: ${JSON.stringify({ id: opts.id })}`,
		"",
		opts.content,
		"",
	];
	return lines.join("\n");
}

describe("consolidate --archive-deprecated", () => {
	it("physically moves deprecated memories to .memofs/archive/<id>.json", async () => {
		const temp = await createTempMemoFsDir();
		try {
			await runMemoFsCli({
				argv: ["init", "--root", temp.rootDir, "--no-input"],
			});

			await writeNotesMd(
				temp.rootDir,
				[
					"# Notes",
					"",
					makeNoteLine({
						timestamp: "2026-08-09T01:00:00.000Z",
						id: "mem_old001",
						content: "Old decision: we use JWT for auth.",
					}),
					makeNoteLine({
						timestamp: "2026-08-10T01:00:00.000Z",
						id: "mem_new001",
						content: "New decision: we use OAuth2 for auth.",
					}),
				].join("\n"),
			);

			await writeDeprecatedGraphNode(temp.rootDir, "mem_old001");

			const result = await runMemoFsCli({
				argv: [
					"consolidate",
					"--archive-deprecated",
					"--root",
					temp.rootDir,
					"--json",
				],
			});

			expect(result.exitCode).toBe(0);
			const parsed = JSON.parse(result.stdout.join("\n"));
			expect(parsed.ok).toBe(true);
			expect(parsed.data.archive.archived).toBe(1);
			expect(parsed.data.archive.archivedIds).toContain("mem_old001");

			const archived = await readArchiveFile(temp.rootDir, "mem_old001");
			expect(archived).not.toBeNull();
			const record = JSON.parse(archived ?? "{}");
			expect(record.id).toBe("mem_old001");
			expect(record.content).toContain("JWT");
			expect(record.sourcePath).toBe(NOTES_PATH);

			const notes = await readNotesMd(temp.rootDir);
			expect(notes).not.toContain("mem_old001");
			expect(notes).not.toContain("JWT");
			expect(notes).toContain("mem_new001");
		} finally {
			await temp.cleanup();
		}
	});

	it("is idempotent — re-running after all deprecated memories are archived is a no-op", async () => {
		const temp = await createTempMemoFsDir();
		try {
			await runMemoFsCli({
				argv: ["init", "--root", temp.rootDir, "--no-input"],
			});

			await writeNotesMd(
				temp.rootDir,
				[
					"# Notes",
					"",
					makeNoteLine({
						timestamp: "2026-08-09T01:00:00.000Z",
						id: "mem_dup001",
						content: "Old fact that was deprecated.",
					}),
				].join("\n"),
			);

			await writeDeprecatedGraphNode(temp.rootDir, "mem_dup001");

			const r1 = await runMemoFsCli({
				argv: [
					"consolidate",
					"--archive-deprecated",
					"--root",
					temp.rootDir,
					"--json",
				],
			});
			expect(r1.exitCode).toBe(0);
			const p1 = JSON.parse(r1.stdout.join("\n"));
			expect(p1.data.archive.archived).toBe(1);

			const r2 = await runMemoFsCli({
				argv: [
					"consolidate",
					"--archive-deprecated",
					"--root",
					temp.rootDir,
					"--json",
				],
			});
			expect(r2.exitCode).toBe(0);
			const p2 = JSON.parse(r2.stdout.join("\n"));
			expect(p2.data.archive.archived).toBe(0);
			expect(p2.data.archive.scanned).toBe(0);
		} finally {
			await temp.cleanup();
		}
	});

	it("writes memory.archived event on archive-move", async () => {
		const temp = await createTempMemoFsDir();
		try {
			await runMemoFsCli({
				argv: ["init", "--root", temp.rootDir, "--no-input"],
			});

			await writeNotesMd(
				temp.rootDir,
				[
					"# Notes",
					"",
					makeNoteLine({
						timestamp: "2026-08-09T01:00:00.000Z",
						id: "mem_evt_arch",
						content: "Deprecated fact to archive.",
					}),
				].join("\n"),
			);

			await writeDeprecatedGraphNode(temp.rootDir, "mem_evt_arch");

			await runMemoFsCli({
				argv: [
					"consolidate",
					"--archive-deprecated",
					"--root",
					temp.rootDir,
					"--json",
				],
			});

			const events = await readMemoryEvents(temp.rootDir);
			expect(events).toContain("memory.archived");
			expect(events).toContain("memofs/consolidate");
			expect(events).toContain("mem_evt_arch");
		} finally {
			await temp.cleanup();
		}
	});

	it("leaves notes with active graph nodes in place (no archive-move)", async () => {
		const temp = await createTempMemoFsDir();
		try {
			await runMemoFsCli({
				argv: ["init", "--root", temp.rootDir, "--no-input"],
			});

			await writeNotesMd(
				temp.rootDir,
				[
					"# Notes",
					"",
					makeNoteLine({
						timestamp: "2026-08-10T01:00:00.000Z",
						id: "mem_active001",
						content: "Active fact that is not deprecated.",
					}),
				].join("\n"),
			);

			// Write an ACTIVE graph node (not deprecated).
			await mkdir(join(temp.rootDir, ".memofs", "graph"), {
				recursive: true,
			});
			const now = "2026-08-10T01:00:00.000Z";
			const activeNode = {
				id: `concept:mem_active001`,
				type: "concept",
				label: "Active concept",
				aliases: [],
				confidence: 1,
				importance: 0.5,
				status: "active",
				createdAt: now,
				updatedAt: now,
				sourceRefs: [{ sourceType: "memory", sourceId: "mem_active001" }],
			};
			await writeFile(
				join(temp.rootDir, GRAPH_NODES_PATH),
				`${JSON.stringify(activeNode)}\n`,
				"utf8",
			);

			const result = await runMemoFsCli({
				argv: [
					"consolidate",
					"--archive-deprecated",
					"--root",
					temp.rootDir,
					"--json",
				],
			});

			expect(result.exitCode).toBe(0);
			const parsed = JSON.parse(result.stdout.join("\n"));
			expect(parsed.data.archive.archived).toBe(0);
			expect(parsed.data.archive.skipped).toBe(1);

			const notes = await readNotesMd(temp.rootDir);
			expect(notes).toContain("mem_active001");

			expect(await archiveExists(temp.rootDir, "mem_active001")).toBe(false);
		} finally {
			await temp.cleanup();
		}
	});
});

describe("restore <id>", () => {
	it("reverses the archive move: note returns to notes.md + graph node back to active", async () => {
		const temp = await createTempMemoFsDir();
		try {
			await runMemoFsCli({
				argv: ["init", "--root", temp.rootDir, "--no-input"],
			});

			await writeNotesMd(
				temp.rootDir,
				[
					"# Notes",
					"",
					makeNoteLine({
						timestamp: "2026-08-09T01:00:00.000Z",
						id: "mem_restore001",
						content: "Deprecated fact to restore.",
					}),
				].join("\n"),
			);

			await writeDeprecatedGraphNode(temp.rootDir, "mem_restore001");

			// Stage 1: archive
			await runMemoFsCli({
				argv: [
					"consolidate",
					"--archive-deprecated",
					"--root",
					temp.rootDir,
					"--json",
				],
			});

			// Capture the notes.md state immediately after archive (archive
			// empties the file to the `# Notes` header, so confirm the id
			// is truly gone before restoring).
			const notesAfterArchive = await readNotesMd(temp.rootDir);
			expect(notesAfterArchive).not.toContain("mem_restore001");

			const archivedFile = await readArchiveFile(
				temp.rootDir,
				"mem_restore001",
			);
			expect(archivedFile).not.toBeNull();

			// Stage 2: restore
			const result = await runMemoFsCli({
				argv: ["restore", "mem_restore001", "--root", temp.rootDir, "--json"],
			});

			expect(result.exitCode).toBe(0);
			const parsed = JSON.parse(result.stdout.join("\n"));
			expect(parsed.ok).toBe(true);
			expect(parsed.data.restored).toBe(true);
			expect(parsed.data.id).toBe("mem_restore001");

			const notes = await readNotesMd(temp.rootDir);
			expect(notes).toContain("mem_restore001");
			expect(notes).toContain("Deprecated fact to restore.");

			// Archive file should be deleted on restore.
			expect(await archiveExists(temp.rootDir, "mem_restore001")).toBe(false);

			const events = await readMemoryEvents(temp.rootDir);
			expect(events).toContain("memory.restored");
			expect(events).toContain("mem_restore001");
		} finally {
			await temp.cleanup();
		}
	});

	it("returns gracefully when no archive file exists for the id", async () => {
		const temp = await createTempMemoFsDir();
		try {
			await runMemoFsCli({
				argv: ["init", "--root", temp.rootDir, "--no-input"],
			});

			const result = await runMemoFsCli({
				argv: ["restore", "mem_nonexistent", "--root", temp.rootDir, "--json"],
			});

			expect(result.exitCode).toBe(0);
			const parsed = JSON.parse(result.stdout.join("\n"));
			expect(parsed.ok).toBe(true);
			expect(parsed.data.restored).toBe(false);
		} finally {
			await temp.cleanup();
		}
	});
});
