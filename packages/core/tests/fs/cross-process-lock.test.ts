/**
 * Cross-process advisory lock tests (Q28).
 *
 * These are the *real* proof of Q28: two actual OS processes contending on the
 * same `.tekmemo/.lock`. The single-process tests (store-lock.test.ts) verify
 * the store wiring; these verify the lock actually works across a process
 * boundary — the whole point of the feature.
 *
 * Strategy: spawn a child Node process (via `node --import tsx`) that creates a
 * store, writes (acquiring the lock), and holds it. The parent then asserts it
 * cannot write while the child is alive, and can write after the child exits
 * gracefully (exit handler unlinks) or after a crash (PID-liveness reclaim).
 */
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { describe, expect, test } from "vitest";
import { LockHeldError } from "../../src/fs/errors/fs-memory-store-error";
import { createNodeFsMemoryStore } from "../../src/node-fs";
import { createTempRoot, pathExists } from "./test-utils";

/** Absolute path to the package's Node-only src entry, for the child to import. */
const SRC_ENTRY = path
	.resolve(__dirname, "..", "..", "src", "node-fs.ts")
	.replace(/\\/g, "/");

/**
 * Spawns a child that acquires the lock, writes a marker file once held, then
 * idles on stdin (graceful release) or holds for a fixed duration.
 */
function spawnChildHolder(
	rootDir: string,
	markerPath: string,
	mode: "hold" | "crash",
): ReturnType<typeof spawn> {
	const crashSuffix =
		mode === "crash"
			? "process.stdin.resume();"
			: "process.stdin.resume(); process.stdin.on('close', () => process.exit(0));";

	const script = `
		import { createNodeFsMemoryStore } from ${JSON.stringify(SRC_ENTRY)};
		import { writeFileSync } from "node:fs";
		const store = createNodeFsMemoryStore({ rootDir: process.argv[1] });
		await store.write(".tekmemo/memory/core.md", "child\\n");
		writeFileSync(process.argv[2], "ready");
		${crashSuffix}
	`;

	return spawn(
		process.execPath,
		["--import", "tsx", "--eval", script, rootDir, markerPath],
		{ stdio: ["pipe", "pipe", "pipe"] },
	);
}

describe("cross-process advisory lock (Q28)", () => {
	test("a second OS process is blocked while the first holds the lock", async () => {
		const rootDir = await createTempRoot();
		const marker = path.join(rootDir, ".child-ready");
		const lockPath = path.join(rootDir, ".tekmemo", ".lock");

		const child = spawnChildHolder(rootDir, marker, "hold");

		// Pipe child stderr so a failure to acquire (e.g. import error) surfaces
		// in the test's waitForMarker timeout rather than silently hanging.
		child.stderr.on("data", (chunk: Buffer) =>
			process.stderr.write(`[child stderr] ${chunk}`),
		);

		await waitForMarker(marker, 10_000);

		// The lock file exists with the child's PID.
		expect(await pathExists(lockPath)).toBe(true);

		// The parent (this process) is a DIFFERENT live process → blocked.
		const parentStore = createNodeFsMemoryStore({ rootDir });
		await expect(
			parentStore.write(".tekmemo/memory/core.md", "parent\n"),
		).rejects.toBeInstanceOf(LockHeldError);

		// Release the child (close stdin → graceful exit → exit handler unlinks).
		child.stdin?.end();
		await new Promise<void>((resolve) => child.on("exit", () => resolve()));

		// Now the parent can write (child released cleanly).
		await expect(
			parentStore.write(".tekmemo/memory/core.md", "parent-after\n"),
		).resolves.toBeUndefined();

		await parentStore.dispose();
	}, 20_000);

	test("a crashed process leaves a stale lock that the next process reclaims", async () => {
		const rootDir = await createTempRoot();
		const marker = path.join(rootDir, ".child-ready");
		const lockPath = path.join(rootDir, ".tekmemo", ".lock");

		const child = spawnChildHolder(rootDir, marker, "crash");

		child.stderr.on("data", (chunk: Buffer) =>
			process.stderr.write(`[child stderr] ${chunk}`),
		);

		await waitForMarker(marker, 10_000);

		// The lock exists with the (still-alive) child's PID.
		const beforeRaw = await fs.readFile(lockPath, "utf8");
		const beforePid = JSON.parse(beforeRaw).pid;
		expect(beforePid).toBe(child.pid);

		// SIGKILL the child — no exit handler fires, lock file persists.
		child.kill("SIGKILL");
		await new Promise<void>((resolve) => child.on("exit", () => resolve()));

		// The lock file is still on disk (stale).
		expect(await pathExists(lockPath)).toBe(true);

		// A new store in the parent reclaims it (PID-liveness probe sees the
		// dead child) and writes successfully.
		const parentStore = createNodeFsMemoryStore({ rootDir });
		await expect(
			parentStore.write(".tekmemo/memory/core.md", "reclaimed\n"),
		).resolves.toBeUndefined();

		// The lock now carries the parent's PID.
		const afterRaw = await fs.readFile(lockPath, "utf8");
		expect(JSON.parse(afterRaw).pid).toBe(process.pid);

		await parentStore.dispose();
	}, 20_000);
});

/** Waits for a marker file to appear (child signaling readiness), with timeout. */
async function waitForMarker(
	markerPath: string,
	timeoutMs: number,
): Promise<void> {
	const deadline = Date.now() + timeoutMs;
	while (Date.now() < deadline) {
		try {
			await fs.access(markerPath);
			return;
		} catch {
			await new Promise((r) => setTimeout(r, 50));
		}
	}
	throw new Error(`Timed out waiting for marker file: ${markerPath}`);
}
