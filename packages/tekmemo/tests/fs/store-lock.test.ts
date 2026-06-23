import path from "node:path";
import { afterEach, describe, expect, test } from "vitest";
import { LockHeldError } from "../../src/fs/errors/fs-memory-store-error";
import { createNodeFsMemoryStore } from "../../src/index";
import { createTempRoot, pathExists } from "./test-utils";

/**
 * Store-level integration tests for the cross-process advisory lock (Q28).
 *
 * These exercise the lock through the public MemoryStore surface — the same
 * path real consumers (the runtime, the CLI, the MCP server) take — rather than
 * the lock primitive directly (see advisory-lock.test.ts for that).
 */

// Track stores created in a test so we can dispose them between tests. Without
// this, a held lock would leak across tests that share a rootDir (each test
// below creates its own rootDir, but disposing is still good hygiene and avoids
// dangling exit handlers).
const stores: Array<{ dispose(): Promise<void> }> = [];

afterEach(async () => {
	await Promise.all(
		stores.splice(0).map((s) => s.dispose().catch(() => undefined)),
	);
});

describe("NodeFsMemoryStore — cross-process advisory lock (Q28)", () => {
	test("a write acquires and persists the .lock file", async () => {
		const rootDir = await createTempRoot();
		const store = createNodeFsMemoryStore({ rootDir });
		stores.push(store);

		await store.write(".tekmemo/memory/core.md", "hello");

		expect(await pathExists(path.join(rootDir, ".tekmemo", ".lock"))).toBe(
			true,
		);
	});

	test("reads do NOT acquire the lock and do NOT block", async () => {
		const rootDir = await createTempRoot();
		const storeA = createNodeFsMemoryStore({ rootDir });
		const storeB = createNodeFsMemoryStore({ rootDir });
		stores.push(storeA, storeB);

		await storeA.write(".tekmemo/memory/core.md", "v1");

		// storeA now holds the lock; storeB is a second process's view.
		// storeB can read freely (reads never acquire).
		await expect(storeB.read(".tekmemo/memory/core.md")).resolves.toBe("v1");
		await expect(storeB.exists(".tekmemo/memory/core.md")).resolves.toBe(true);
	});

	test("a second store on the same rootDir cannot write while the first holds the lock", async () => {
		const rootDir = await createTempRoot();
		const storeA = createNodeFsMemoryStore({ rootDir });
		const storeB = createNodeFsMemoryStore({ rootDir });
		stores.push(storeA, storeB);

		await storeA.write(".tekmemo/memory/core.md", "a");

		await expect(
			storeB.write(".tekmemo/memory/core.md", "b"),
		).rejects.toBeInstanceOf(LockHeldError);
	});

	test("a second store cannot append or delete while the first holds the lock", async () => {
		const rootDir = await createTempRoot();
		const storeA = createNodeFsMemoryStore({ rootDir });
		const storeB = createNodeFsMemoryStore({ rootDir });
		stores.push(storeA, storeB);

		await storeA.write(".tekmemo/memory/notes.md", "first\n");

		await expect(
			storeB.append(".tekmemo/memory/notes.md", "second\n"),
		).rejects.toBeInstanceOf(LockHeldError);

		await expect(
			storeB.delete(".tekmemo/memory/notes.md"),
		).rejects.toBeInstanceOf(LockHeldError);
	});

	test("dispose releases the lock so a second store can write", async () => {
		const rootDir = await createTempRoot();
		const storeA = createNodeFsMemoryStore({ rootDir });
		const storeB = createNodeFsMemoryStore({ rootDir });
		stores.push(storeB);

		await storeA.write(".tekmemo/memory/core.md", "a");

		// storeA holds the lock; storeB is blocked.
		await expect(
			storeB.write(".tekmemo/memory/core.md", "b"),
		).rejects.toBeInstanceOf(LockHeldError);

		// Release via dispose; now storeB can proceed.
		await storeA.dispose();

		await expect(
			storeB.write(".tekmemo/memory/core.md", "b"),
		).resolves.toBeUndefined();
		expect(await storeB.read(".tekmemo/memory/core.md")).toBe("b");
	});

	test("lock: false disables the advisory lock entirely", async () => {
		const rootDir = await createTempRoot();
		const storeA = createNodeFsMemoryStore({ rootDir, lock: false });
		const storeB = createNodeFsMemoryStore({ rootDir, lock: false });
		stores.push(storeA, storeB);

		await storeA.write(".tekmemo/memory/core.md", "a");

		// No lock file created.
		expect(await pathExists(path.join(rootDir, ".lock"))).toBe(false);

		// Second store writes freely (no enforcement). This is the opt-out path.
		await expect(
			storeB.write(".tekmemo/memory/core.md", "b"),
		).resolves.toBeUndefined();
	});

	test("the held lock advertises the holder PID in the error", async () => {
		const rootDir = await createTempRoot();
		const storeA = createNodeFsMemoryStore({ rootDir });
		const storeB = createNodeFsMemoryStore({ rootDir });
		stores.push(storeA, storeB);

		await storeA.write(".tekmemo/memory/core.md", "a");

		try {
			await storeB.write(".tekmemo/memory/core.md", "b");
			expect.unreachable("should have thrown");
		} catch (error) {
			expect(error).toBeInstanceOf(LockHeldError);
			const details = (error as LockHeldError).details as {
				pid?: number;
				lockPath?: string;
			};
			// The holder is this test process.
			expect(details.pid).toBe(process.pid);
			expect(details.lockPath).toBe(path.join(rootDir, ".tekmemo", ".lock"));
		}
	});

	test("the .lock file lives inside .tekmemo/ (Q28: .tekmemo/.lock)", async () => {
		const rootDir = await createTempRoot();
		const store = createNodeFsMemoryStore({ rootDir });
		stores.push(store);

		await store.write(".tekmemo/memory/core.md", "x");

		expect(await pathExists(path.join(rootDir, ".tekmemo", ".lock"))).toBe(
			true,
		);
		// And NOT at the rootDir level.
		expect(await pathExists(path.join(rootDir, ".lock"))).toBe(false);
	});
});
