import fs from "node:fs/promises";
import path from "node:path";
import { describe, expect, test } from "vitest";
import { LockHeldError } from "../../src/fs/errors/fs-memory-store-error";
import {
	AdvisoryFileLock,
	isProcessAlive,
	type LockFileContents,
	parseLockContents,
} from "../../src/fs/utils/advisory-lock";
import { createTempRoot, pathExists } from "./test-utils";

/** Writes a lock file directly, bypassing the lock (for stale-reclaim setup). */
async function writeLockFile(
	lockPath: string,
	contents: LockFileContents,
): Promise<void> {
	await fs.writeFile(lockPath, JSON.stringify(contents), "utf8");
}

describe("AdvisoryFileLock", () => {
	test("acquire creates the lock file with pid + startedAt", async () => {
		const rootDir = await createTempRoot();
		const lockPath = path.join(rootDir, ".lock");
		const lock = new AdvisoryFileLock(lockPath, { fileMode: 0o600 });

		await lock.acquire();

		expect(lock.isHeld).toBe(true);
		expect(await pathExists(lockPath)).toBe(true);

		const raw = await fs.readFile(lockPath, "utf8");
		const contents = parseLockContents(raw);
		expect(contents).not.toBeNull();
		expect(contents?.pid).toBe(process.pid);
		expect(typeof contents?.startedAt).toBe("string");

		await lock.release();
	});

	test("acquire is idempotent for the same instance", async () => {
		const rootDir = await createTempRoot();
		const lockPath = path.join(rootDir, ".lock");
		const lock = new AdvisoryFileLock(lockPath, { fileMode: 0o600 });

		await lock.acquire();
		await expect(lock.acquire()).resolves.toBeUndefined();
		expect(lock.isHeld).toBe(true);

		await lock.release();
	});

	test("release deletes the lock file and is idempotent", async () => {
		const rootDir = await createTempRoot();
		const lockPath = path.join(rootDir, ".lock");
		const lock = new AdvisoryFileLock(lockPath, { fileMode: 0o600 });

		await lock.acquire();
		expect(await pathExists(lockPath)).toBe(true);

		await lock.release();
		expect(await pathExists(lockPath)).toBe(false);
		expect(lock.isHeld).toBe(false);

		// Idempotent.
		await expect(lock.release()).resolves.toBeUndefined();
	});

	test("a second instance on the same path throws LockHeldError when live", async () => {
		const rootDir = await createTempRoot();
		const lockPath = path.join(rootDir, ".lock");
		const first = new AdvisoryFileLock(lockPath, { fileMode: 0o600 });
		const second = new AdvisoryFileLock(lockPath, { fileMode: 0o600 });

		await first.acquire();

		await expect(second.acquire()).rejects.toThrow(LockHeldError);
		// The holder PID is the current process (live), so second does not hold.
		expect(second.isHeld).toBe(false);

		// Error carries the holder details.
		try {
			await second.acquire();
		} catch (error) {
			expect(error).toBeInstanceOf(LockHeldError);
			const details = (error as LockHeldError).details as {
				pid?: number;
				lockPath?: string;
			};
			expect(details.pid).toBe(process.pid);
			expect(details.lockPath).toBe(lockPath);
		}

		await first.release();
	});

	test("reclaims a stale lock whose holder PID is dead", async () => {
		const rootDir = await createTempRoot();
		const lockPath = path.join(rootDir, ".lock");

		// A PID that is effectively guaranteed not to exist (max PID + 1 region).
		// Use a very high number; isProcessAlive will return false for it.
		const deadPid = 999_999;
		// Sanity: the dead PID really is dead on this machine.
		expect(isProcessAlive(deadPid)).toBe(false);

		await writeLockFile(lockPath, {
			pid: deadPid,
			startedAt: new Date().toISOString(),
		});

		const lock = new AdvisoryFileLock(lockPath, { fileMode: 0o600 });
		await expect(lock.acquire()).resolves.toBeUndefined();
		expect(lock.isHeld).toBe(true);

		await lock.release();
	});

	test("does NOT reclaim a stale lock whose holder PID is live (current process)", async () => {
		const rootDir = await createTempRoot();
		const lockPath = path.join(rootDir, ".lock");

		// Pre-write a lock owned by THIS process (live).
		await writeLockFile(lockPath, {
			pid: process.pid,
			startedAt: new Date().toISOString(),
		});

		const lock = new AdvisoryFileLock(lockPath, { fileMode: 0o600 });
		await expect(lock.acquire()).rejects.toThrow(LockHeldError);
		expect(lock.isHeld).toBe(false);
	});

	test("reclaims a stale lock older than maxAgeMs even if PID is live (PID-reuse net)", async () => {
		const rootDir = await createTempRoot();
		const lockPath = path.join(rootDir, ".lock");

		// Owned by this process (live PID) but far older than the max age.
		const ancient = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(); // 2h ago
		await writeLockFile(lockPath, { pid: process.pid, startedAt: ancient });

		const lock = new AdvisoryFileLock(lockPath, {
			fileMode: 0o600,
			maxAgeMs: 60 * 60 * 1000, // 1h
		});
		await expect(lock.acquire()).resolves.toBeUndefined();
		expect(lock.isHeld).toBe(true);

		await lock.release();
	});

	test("reclaims a malformed lock file (human hand-edited)", async () => {
		const rootDir = await createTempRoot();
		const lockPath = path.join(rootDir, ".lock");

		await fs.writeFile(lockPath, "not json at all", "utf8");

		const lock = new AdvisoryFileLock(lockPath, { fileMode: 0o600 });
		await expect(lock.acquire()).resolves.toBeUndefined();
		expect(lock.isHeld).toBe(true);

		await lock.release();
	});

	test("reclaims a partial lock file (missing startedAt)", async () => {
		const rootDir = await createTempRoot();
		const lockPath = path.join(rootDir, ".lock");

		await fs.writeFile(lockPath, JSON.stringify({ pid: process.pid }), "utf8");

		const lock = new AdvisoryFileLock(lockPath, { fileMode: 0o600 });
		await expect(lock.acquire()).resolves.toBeUndefined();

		await lock.release();
	});

	test("reclaims a lock with a non-numeric pid", async () => {
		const rootDir = await createTempRoot();
		const lockPath = path.join(rootDir, ".lock");

		await writeLockFile(lockPath, {
			pid: "not-a-number" as unknown as number,
			startedAt: new Date().toISOString(),
		});

		const lock = new AdvisoryFileLock(lockPath, { fileMode: 0o600 });
		await expect(lock.acquire()).resolves.toBeUndefined();

		await lock.release();
	});

	test("reclaims a lock whose startedAt is unparseable", async () => {
		const rootDir = await createTempRoot();
		const lockPath = path.join(rootDir, ".lock");

		await writeLockFile(lockPath, {
			pid: process.pid,
			startedAt: "not-an-iso-date",
		});

		const lock = new AdvisoryFileLock(lockPath, { fileMode: 0o600 });
		await expect(lock.acquire()).resolves.toBeUndefined();

		await lock.release();
	});

	test("concurrent acquire from the same instance shares one in-flight attempt", async () => {
		const rootDir = await createTempRoot();
		const lockPath = path.join(rootDir, ".lock");
		const lock = new AdvisoryFileLock(lockPath, { fileMode: 0o600 });

		// Fire 50 concurrent acquires; only one lock file should ever exist.
		await Promise.all(Array.from({ length: 50 }, () => lock.acquire()));

		expect(lock.isHeld).toBe(true);
		expect(await pathExists(lockPath)).toBe(true);

		await lock.release();
	});
});

describe("parseLockContents", () => {
	test("parses a well-formed lock file", () => {
		expect(
			parseLockContents(
				JSON.stringify({ pid: 1234, startedAt: "2026-06-22T10:00:00.000Z" }),
			),
		).toEqual({ pid: 1234, startedAt: "2026-06-22T10:00:00.000Z" });
	});

	test("returns null for malformed JSON", () => {
		expect(parseLockContents("nope")).toBeNull();
	});

	test("returns null when pid is missing", () => {
		expect(parseLockContents(JSON.stringify({ startedAt: "x" }))).toBeNull();
	});

	test("returns null when startedAt is missing", () => {
		expect(parseLockContents(JSON.stringify({ pid: 1 }))).toBeNull();
	});

	test("returns null for non-object JSON", () => {
		expect(parseLockContents("42")).toBeNull();
		expect(parseLockContents("null")).toBeNull();
	});
});

describe("isProcessAlive", () => {
	test("returns true for the current process", () => {
		expect(isProcessAlive(process.pid)).toBe(true);
	});

	test("returns false for a dead PID", () => {
		expect(isProcessAlive(999_999)).toBe(false);
	});

	test("returns false for invalid inputs", () => {
		expect(isProcessAlive(NaN)).toBe(false);
		expect(isProcessAlive(-1)).toBe(false);
		expect(isProcessAlive(0)).toBe(false);
	});
});
