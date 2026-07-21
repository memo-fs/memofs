import { MEMOFS_PATHS, MemoFS } from "@memofs/core";
import {
	createNodeFsMemoryStore,
	createTempMemoFsDir,
} from "@memofs/core/node-fs";
import { describe, expect, it } from "vitest";
import { runMemoFsCli, stringifyJsonl } from "../src";

async function seedEvents(
	rootDir: string,
	events: Record<string, unknown>[],
): Promise<void> {
	const memo = new MemoFS({
		store: createNodeFsMemoryStore({
			rootDir,
			createRoot: true,
			missingFileBehavior: "empty",
		}),
		rootDir,
		autoBootstrap: false,
	});
	await memo.store.append(
		MEMOFS_PATHS.events.memoryEvents,
		stringifyJsonl(events),
	);
}

const SESSION_START_EVENT = {
	id: "evt_session_1",
	type: "memory.indexed",
	timestamp: "2026-07-13T08:00:00.000Z",
	summary: "Session start — context injected",
	metadata: { hook: "session-start" },
};

const REMEMBER_EVENT = {
	id: "evt_remember_1",
	type: "memory.created",
	timestamp: "2026-07-13T08:05:00.000Z",
	summary: "Persisted decision: use JWT for auth",
};

describe("memofs status (CLI)", () => {
	it("shows all 3 checks ✓ when session-start + recall + remember events exist", async () => {
		const temp = await createTempMemoFsDir();
		try {
			await runMemoFsCli({
				argv: ["init", "--root", temp.rootDir, "--no-input"],
			});
			await seedEvents(temp.rootDir, [
				SESSION_START_EVENT,
				{
					id: "evt_indexed_1",
					type: "memory.reindexed",
					timestamp: "2026-07-13T08:02:00.000Z",
					summary: "Re-indexed notes",
				},
				REMEMBER_EVENT,
			]);

			const result = await runMemoFsCli({
				argv: ["status", "--root", temp.rootDir],
			});
			expect(result.exitCode).toBe(0);
			const out = result.stdout.join("\n");
			expect(out).toContain("✓ Context loaded at session start");
			expect(out).toContain("✓ Memory consulted during session");
			expect(out).toContain("✓ Facts persisted");
		} finally {
			await temp.cleanup();
		}
	});

	it("shows ✗ for memory consulted and facts persisted when only session-start exists", async () => {
		const temp = await createTempMemoFsDir();
		try {
			await runMemoFsCli({
				argv: ["init", "--root", temp.rootDir, "--no-input"],
			});
			await seedEvents(temp.rootDir, [SESSION_START_EVENT]);

			const result = await runMemoFsCli({
				argv: ["status", "--root", temp.rootDir],
			});
			expect(result.exitCode).toBe(0);
			const out = result.stdout.join("\n");
			expect(out).toContain("✓ Context loaded at session start");
			expect(out).toContain("✗ Memory consulted during session");
			expect(out).toContain("✗ Facts persisted");
		} finally {
			await temp.cleanup();
		}
	});

	it("degrades gracefully when no session-start event exists", async () => {
		const temp = await createTempMemoFsDir();
		try {
			await runMemoFsCli({
				argv: ["init", "--root", temp.rootDir, "--no-input"],
			});
			await seedEvents(temp.rootDir, [
				{
					id: "evt_1",
					type: "memory.created",
					timestamp: "2026-07-13T08:00:00.000Z",
					summary: "Some fact",
				},
			]);

			const result = await runMemoFsCli({
				argv: ["status", "--root", temp.rootDir],
			});
			expect(result.exitCode).toBe(0);
			const out = result.stdout.join("\n");
			expect(out).toContain("No session-start event found");
			expect(out).not.toContain("✓ Context loaded");
		} finally {
			await temp.cleanup();
		}
	});

	it("--json returns structured compliance data", async () => {
		const temp = await createTempMemoFsDir();
		try {
			await runMemoFsCli({
				argv: ["init", "--root", temp.rootDir, "--no-input"],
			});
			await seedEvents(temp.rootDir, [SESSION_START_EVENT, REMEMBER_EVENT]);

			const result = await runMemoFsCli({
				argv: ["status", "--root", temp.rootDir, "--json"],
			});
			expect(result.exitCode).toBe(0);
			const parsed = JSON.parse(result.stdout.join("\n"));
			expect(parsed.ok).toBe(true);
			expect(parsed.command).toBe("status");
			expect(parsed.data.hasSession).toBe(true);
			expect(parsed.data.eventCount).toBe(2);
			expect(parsed.data.compliance).toHaveLength(3);
			expect(parsed.data.compliance[0].passed).toBe(true);
			expect(parsed.data.compliance[1].passed).toBe(true);
			expect(parsed.data.compliance[2].passed).toBe(true);
			expect(parsed.data.sessionStart).toBe("2026-07-13T08:00:00.000Z");
		} finally {
			await temp.cleanup();
		}
	});

	it("--json degrades gracefully without session-start", async () => {
		const temp = await createTempMemoFsDir();
		try {
			await runMemoFsCli({
				argv: ["init", "--root", temp.rootDir, "--no-input"],
			});

			const result = await runMemoFsCli({
				argv: ["status", "--root", temp.rootDir, "--json"],
			});
			expect(result.exitCode).toBe(0);
			const parsed = JSON.parse(result.stdout.join("\n"));
			expect(parsed.ok).toBe(true);
			expect(parsed.data.hasSession).toBe(false);
			expect(parsed.data.compliance).toBeUndefined();
		} finally {
			await temp.cleanup();
		}
	});

	it("uses the most recent session-start event when multiple exist", async () => {
		const temp = await createTempMemoFsDir();
		try {
			await runMemoFsCli({
				argv: ["init", "--root", temp.rootDir, "--no-input"],
			});
			await seedEvents(temp.rootDir, [
				{
					id: "evt_old_session",
					type: "memory.indexed",
					timestamp: "2026-07-13T06:00:00.000Z",
					metadata: { hook: "session-start" },
				},
				{
					id: "evt_old_fact",
					type: "memory.created",
					timestamp: "2026-07-13T06:05:00.000Z",
					summary: "Old fact",
				},
				SESSION_START_EVENT,
			]);

			const result = await runMemoFsCli({
				argv: ["status", "--root", temp.rootDir, "--json"],
			});
			expect(result.exitCode).toBe(0);
			const parsed = JSON.parse(result.stdout.join("\n"));
			expect(parsed.data.sessionStart).toBe("2026-07-13T08:00:00.000Z");
			expect(parsed.data.compliance[0].passed).toBe(true);
			expect(parsed.data.compliance[1].passed).toBe(false);
		} finally {
			await temp.cleanup();
		}
	});

	it("sync events after session-start do not count as memory consulted", async () => {
		const temp = await createTempMemoFsDir();
		try {
			await runMemoFsCli({
				argv: ["init", "--root", temp.rootDir, "--no-input"],
			});
			await seedEvents(temp.rootDir, [
				SESSION_START_EVENT,
				{
					id: "evt_sync_1",
					type: "sync.completed",
					timestamp: "2026-07-13T08:01:00.000Z",
					summary: "Cloud sync completed",
				},
				{
					id: "evt_sync_2",
					type: "sync.started",
					timestamp: "2026-07-13T08:02:00.000Z",
					summary: "Cloud sync started",
				},
			]);

			const result = await runMemoFsCli({
				argv: ["status", "--root", temp.rootDir, "--json"],
			});
			expect(result.exitCode).toBe(0);
			const parsed = JSON.parse(result.stdout.join("\n"));
			expect(parsed.data.compliance[0].passed).toBe(true);
			expect(parsed.data.compliance[1].passed).toBe(false);
			expect(parsed.data.compliance[2].passed).toBe(false);
		} finally {
			await temp.cleanup();
		}
	});
});

describe("memofs context --mark-session-start (T7)", () => {
	it("writes a session-start event when --mark-session-start is passed", async () => {
		const temp = await createTempMemoFsDir();
		try {
			await runMemoFsCli({
				argv: ["init", "--root", temp.rootDir, "--no-input"],
			});

			await runMemoFsCli({
				argv: [
					"context",
					"--root",
					temp.rootDir,
					"--query",
					"test task",
					"--json",
					"--mark-session-start",
				],
			});

			const statusResult = await runMemoFsCli({
				argv: ["status", "--root", temp.rootDir, "--json"],
			});
			expect(statusResult.exitCode).toBe(0);
			const parsed = JSON.parse(statusResult.stdout.join("\n"));
			expect(parsed.data.hasSession).toBe(true);
			expect(parsed.data.compliance[0].passed).toBe(true);
			expect(parsed.data.compliance[1].passed).toBe(false);
			expect(parsed.data.compliance[2].passed).toBe(false);
		} finally {
			await temp.cleanup();
		}
	});

	it("writes session-start event, then remember creates facts-persisted compliance", async () => {
		const temp = await createTempMemoFsDir();
		try {
			await runMemoFsCli({
				argv: ["init", "--root", temp.rootDir, "--no-input"],
			});

			await runMemoFsCli({
				argv: [
					"context",
					"--root",
					temp.rootDir,
					"--query",
					"test task",
					"--json",
					"--mark-session-start",
				],
			});

			await runMemoFsCli({
				argv: [
					"remember",
					"Use JWT for auth",
					"--root",
					temp.rootDir,
					"--kind",
					"decision",
				],
			});

			const statusResult = await runMemoFsCli({
				argv: ["status", "--root", temp.rootDir, "--json"],
			});
			expect(statusResult.exitCode).toBe(0);
			const parsed = JSON.parse(statusResult.stdout.join("\n"));
			expect(parsed.data.hasSession).toBe(true);
			expect(parsed.data.compliance[0].passed).toBe(true);
			expect(parsed.data.compliance[1].passed).toBe(true);
			expect(parsed.data.compliance[2].passed).toBe(true);
		} finally {
			await temp.cleanup();
		}
	});
});
