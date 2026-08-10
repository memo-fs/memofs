import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { createTempMemoFsDir } from "@memofs/core/node-fs";
import { describe, expect, it } from "vitest";
import { runMemoFsCli } from "../src";

const NOTES_PATH = ".memofs/memory/notes.md";
const EVENTS_PATH = ".memofs/events/memory-events.jsonl";

async function writeNotesMd(rootDir: string, content: string): Promise<void> {
	await mkdir(join(rootDir, ".memofs", "memory"), { recursive: true });
	await writeFile(join(rootDir, NOTES_PATH), content, "utf8");
}

async function readNotesMd(rootDir: string): Promise<string> {
	return readFile(join(rootDir, NOTES_PATH), "utf8");
}

async function readMemoryEvents(rootDir: string): Promise<string> {
	try {
		return await readFile(join(rootDir, EVENTS_PATH), "utf8");
	} catch {
		return "";
	}
}

describe("migrate anchors", () => {
	it("backfills AnchorRef onto notes referencing file paths", async () => {
		const temp = await createTempMemoFsDir();
		try {
			await runMemoFsCli({
				argv: ["init", "--root", temp.rootDir, "--no-input"],
			});

			await mkdir(join(temp.rootDir, "src", "auth"), { recursive: true });
			await writeFile(
				join(temp.rootDir, "src", "auth", "provider.ts"),
				"export function verifyJwt(token: string): boolean {\n  return token.length > 0;\n}\n",
			);

			await writeNotesMd(
				temp.rootDir,
				[
					"# Notes",
					"",
					"## 2026-08-10T01:00:00.000Z — Auth provider",
					"- kind: decision",
					"- tags: auth",
					"- confidence: 1",
					'- metadata: {"id":"mem_abc123"}',
					"",
					"Auth uses Supabase; see src/auth/provider.ts for the JWT verification logic.",
					"",
				].join("\n"),
			);

			const result = await runMemoFsCli({
				argv: ["migrate", "anchors", "--root", temp.rootDir, "--json"],
			});

			expect(result.exitCode).toBe(0);
			const parsed = JSON.parse(result.stdout.join("\n"));
			expect(parsed.ok).toBe(true);
			expect(parsed.data.scanned).toBe(1);
			expect(parsed.data.anchored).toBe(1);
			expect(parsed.data.skipped).toBe(0);

			const notes = await readNotesMd(temp.rootDir);
			expect(notes).toContain('"anchor"');
			expect(notes).toContain("src/auth/provider.ts");
			expect(notes).toMatch(/[0-9a-f]{64}/);
		} finally {
			await temp.cleanup();
		}
	});

	it("is idempotent — re-running is a no-op on already-anchored notes", async () => {
		const temp = await createTempMemoFsDir();
		try {
			await runMemoFsCli({
				argv: ["init", "--root", temp.rootDir, "--no-input"],
			});

			await mkdir(join(temp.rootDir, "src"), { recursive: true });
			await writeFile(
				join(temp.rootDir, "src", "config.ts"),
				"export const FOO = 42;\n",
			);

			await writeNotesMd(
				temp.rootDir,
				[
					"# Notes",
					"",
					"## 2026-08-10T01:00:00.000Z",
					"- kind: note",
					"- tags: none",
					"- confidence: 1",
					'- metadata: {"id":"mem_xyz789"}',
					"",
					"Config lives in src/config.ts.",
					"",
				].join("\n"),
			);

			const r1 = await runMemoFsCli({
				argv: ["migrate", "anchors", "--root", temp.rootDir, "--json"],
			});
			expect(r1.exitCode).toBe(0);
			const p1 = JSON.parse(r1.stdout.join("\n"));
			expect(p1.data.anchored).toBe(1);
			expect(p1.data.skipped).toBe(0);

			const notesAfterFirst = await readNotesMd(temp.rootDir);

			const r2 = await runMemoFsCli({
				argv: ["migrate", "anchors", "--root", temp.rootDir, "--json"],
			});
			expect(r2.exitCode).toBe(0);
			const p2 = JSON.parse(r2.stdout.join("\n"));
			expect(p2.data.anchored).toBe(0);
			expect(p2.data.skipped).toBe(1);

			const notesAfterSecond = await readNotesMd(temp.rootDir);
			expect(notesAfterSecond).toBe(notesAfterFirst);
		} finally {
			await temp.cleanup();
		}
	});

	it("attaches anchor for non-TS files (file + hash, no symbol)", async () => {
		const temp = await createTempMemoFsDir();
		try {
			await runMemoFsCli({
				argv: ["init", "--root", temp.rootDir, "--no-input"],
			});

			await mkdir(join(temp.rootDir, "lib"), { recursive: true });
			await writeFile(
				join(temp.rootDir, "lib", "utils.py"),
				"def main():\n    pass\n",
			);

			await writeNotesMd(
				temp.rootDir,
				[
					"# Notes",
					"",
					"## 2026-08-10T01:00:00.000Z",
					"- kind: note",
					"- tags: none",
					"- confidence: 1",
					'- metadata: {"id":"mem_py001"}',
					"",
					"Python utils at lib/utils.py handle startup.",
					"",
				].join("\n"),
			);

			const result = await runMemoFsCli({
				argv: ["migrate", "anchors", "--root", temp.rootDir, "--json"],
			});

			expect(result.exitCode).toBe(0);
			const parsed = JSON.parse(result.stdout.join("\n"));
			expect(parsed.data.anchored).toBe(1);

			const notes = await readNotesMd(temp.rootDir);
			expect(notes).toContain("lib/utils.py");
			expect(notes).not.toContain('"symbol"');
		} finally {
			await temp.cleanup();
		}
	});

	it("parses @anchor markers in content and attaches symbol for TS files", async () => {
		const temp = await createTempMemoFsDir();
		try {
			await runMemoFsCli({
				argv: ["init", "--root", temp.rootDir, "--no-input"],
			});

			await mkdir(join(temp.rootDir, "src"), { recursive: true });
			await writeFile(
				join(temp.rootDir, "src", "auth.ts"),
				"export function verifyJwt(token: string): boolean {\n  return true;\n}\n",
			);

			await writeNotesMd(
				temp.rootDir,
				[
					"# Notes",
					"",
					"## 2026-08-10T01:00:00.000Z",
					"- kind: decision",
					"- tags: none",
					"- confidence: 1",
					'- metadata: {"id":"mem_marker01"}',
					"",
					"Auth uses @anchor(file=src/auth.ts, symbol=verifyJwt) for JWT.",
					"",
				].join("\n"),
			);

			const result = await runMemoFsCli({
				argv: ["migrate", "anchors", "--root", temp.rootDir, "--json"],
			});

			expect(result.exitCode).toBe(0);
			const parsed = JSON.parse(result.stdout.join("\n"));
			expect(parsed.data.anchored).toBe(1);

			const notes = await readNotesMd(temp.rootDir);
			expect(notes).toContain("src/auth.ts");
			expect(notes).toContain("verifyJwt");
			expect(notes).toContain('"symbol"');
		} finally {
			await temp.cleanup();
		}
	}, 15000);

	it("reports noRef for notes with no file-path references", async () => {
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
					"## 2026-08-10T01:00:00.000Z",
					"- kind: note",
					"- tags: none",
					"- confidence: 1",
					'- metadata: {"id":"mem_plain001"}',
					"",
					"Just a plain note with no file references at all.",
					"",
				].join("\n"),
			);

			const result = await runMemoFsCli({
				argv: ["migrate", "anchors", "--root", temp.rootDir, "--json"],
			});

			expect(result.exitCode).toBe(0);
			const parsed = JSON.parse(result.stdout.join("\n"));
			expect(parsed.data.scanned).toBe(1);
			expect(parsed.data.anchored).toBe(0);
			expect(parsed.data.noRef).toBe(1);

			const notes = await readNotesMd(temp.rootDir);
			expect(notes).not.toContain('"anchor"');
		} finally {
			await temp.cleanup();
		}
	});

	it("appends memory.created events for cold-start anchor hydration", async () => {
		const temp = await createTempMemoFsDir();
		try {
			await runMemoFsCli({
				argv: ["init", "--root", temp.rootDir, "--no-input"],
			});

			await mkdir(join(temp.rootDir, "src"), { recursive: true });
			await writeFile(
				join(temp.rootDir, "src", "app.ts"),
				"export const APP = 'memofs';\n",
			);

			await writeNotesMd(
				temp.rootDir,
				[
					"# Notes",
					"",
					"## 2026-08-10T01:00:00.000Z",
					"- kind: note",
					"- tags: none",
					"- confidence: 1",
					'- metadata: {"id":"mem_evt001"}',
					"",
					"App entry at src/app.ts.",
					"",
				].join("\n"),
			);

			await runMemoFsCli({
				argv: ["migrate", "anchors", "--root", temp.rootDir, "--json"],
			});

			const events = await readMemoryEvents(temp.rootDir);
			expect(events).toContain("memofs/migrate");
			expect(events).toContain('"anchor"');
			expect(events).toContain("mem_evt001");
		} finally {
			await temp.cleanup();
		}
	});

	it("preserves existing metadata fields when adding anchor", async () => {
		const temp = await createTempMemoFsDir();
		try {
			await runMemoFsCli({
				argv: ["init", "--root", temp.rootDir, "--no-input"],
			});

			await mkdir(join(temp.rootDir, "src"), { recursive: true });
			await writeFile(
				join(temp.rootDir, "src", "db.ts"),
				"export const DB_URL = 'localhost';\n",
			);

			await writeNotesMd(
				temp.rootDir,
				[
					"# Notes",
					"",
					"## 2026-08-10T01:00:00.000Z — DB config",
					"- kind: constraint",
					"- tags: db, config",
					"- confidence: 0.9",
					'- metadata: {"id":"mem_preserve01","workspaceId":"ws1","customField":"hello"}',
					"",
					"DB config in src/db.ts.",
					"",
				].join("\n"),
			);

			await runMemoFsCli({
				argv: ["migrate", "anchors", "--root", temp.rootDir, "--json"],
			});

			const notes = await readNotesMd(temp.rootDir);
			expect(notes).toContain('"workspaceId":"ws1"');
			expect(notes).toContain('"customField":"hello"');
			expect(notes).toContain('"id":"mem_preserve01"');
			expect(notes).toContain('"anchor"');
			expect(notes).toContain("src/db.ts");
		} finally {
			await temp.cleanup();
		}
	});

	it("handles empty notes.md gracefully", async () => {
		const temp = await createTempMemoFsDir();
		try {
			await runMemoFsCli({
				argv: ["init", "--root", temp.rootDir, "--no-input"],
			});

			const result = await runMemoFsCli({
				argv: ["migrate", "anchors", "--root", temp.rootDir, "--json"],
			});

			expect(result.exitCode).toBe(0);
			const parsed = JSON.parse(result.stdout.join("\n"));
			expect(parsed.data.scanned).toBe(0);
			expect(parsed.data.anchored).toBe(0);
		} finally {
			await temp.cleanup();
		}
	});
});
