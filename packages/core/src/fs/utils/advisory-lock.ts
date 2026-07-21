/**
 * Cross-process advisory file lock for the local single-process contract.
 *
 * @remarks
 * Implements the decision: the local runtime is single-process by
 * contract, but two Claude Code windows on one repo is a
 * day-one v1 scenario. A replace-whole-file race on `core.md` silently loses
 * a write. This lock — `.memofs/.lock`, the git-index model — is acquired on
 * the first mutating write and held process-lifetime; a second process
 * attempting a mutating op gets a clear {@link LockHeldError}. Non-mutating
 * reads never block.
 *
 * Lock file contents are JSON (`{ pid, startedAt, ownerId }`) so a stale lock
 * left by a crashed process is detectable (PID-liveness probe) and
 * reclaimable. The process start signature guards against PID reuse. Files
 * are published only after their complete contents are written.
 *
 * This is the local counterpart to's cloud concurrency-control layer:
 * local *serializes* (a second local process is accidental, not a workload);
 * cloud serializes *through a DB* (multi-agent writers are the intended B3
 * workload). Two mechanisms, two scales.
 *
 * @internal
 */

import { execSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import fsPromises from "node:fs/promises";
import { isNotFoundError } from "../../core/internal/is-not-found-error";
import { LockHeldError } from "../errors/fs-memory-store-error";

/** Shape of the JSON written to the `.lock` file. */
export interface LockFileContents {
	/** OS process id of the lock holder. */
	pid: number;
	/** ISO timestamp of when the lock was acquired. */
	startedAt: string;
	/** The unique process start time from the OS to guard against PID reuse. */
	processStartedAt?: string;
	/** Random per-acquisition token used to protect a subsequent holder's lock. */
	ownerId?: string;
}

/**
 * Retrieves the start time signature of a process from the OS.
 */
export function getProcessStartTime(pid: number): string | null {
	if (process.platform === "linux") {
		try {
			const stat = fs.readFileSync(`/proc/${pid}/stat`, "utf8");
			const lastParen = stat.lastIndexOf(")");
			if (lastParen === -1) return null;
			const afterName = stat.substring(lastParen + 2);
			const fields = afterName.split(" ");
			const starttimeTicks = fields[19];
			return starttimeTicks ? starttimeTicks.trim() : null;
		} catch {
			return null;
		}
	} else if (process.platform === "darwin") {
		try {
			const stdout = execSync(`ps -p ${pid} -o lstart=`, {
				stdio: ["pipe", "pipe", "ignore"],
				encoding: "utf8",
			});
			const trimmed = stdout.trim();
			return trimmed || null;
		} catch {
			return null;
		}
	}
	return null;
}

/** Options for {@link AdvisoryFileLock}. */
export interface AdvisoryFileLockOptions {
	/**
	 * @deprecated A live process is never reclaimed by age because that can
	 * delete its valid lock. PID reuse is guarded by `processStartedAt` instead.
	 */
	maxAgeMs?: number;
	/** Optional process-start probe, primarily for portable deterministic tests. */
	getProcessStartTime?: (pid: number) => string | null;
}

/**
 * Cross-process advisory file lock held process-lifetime.
 *
 * Acquire is idempotent (safe to call before every mutating op). Release is
 * registered as a `process.on('exit')` sync unlink so a graceful exit frees
 * the lock even if {@link dispose} is never called; a hard crash (SIGKILL)
 * leaves a stale lock reclaimed by the next process via the PID-liveness probe.
 */
export class AdvisoryFileLock {
	private static readonly heldLocks = new Set<AdvisoryFileLock>();
	private static exitHandlerRegistered = false;
	private static readonly processExitHandler = (): void => {
		for (const lock of AdvisoryFileLock.heldLocks) {
			lock.releaseSync();
		}
	};

	private held = false;
	private readonly lockPath: string;
	private readonly fileMode: number;
	private readonly ownerId = randomUUID();
	private readonly processStartTime: (pid: number) => string | null;
	private registered = false;
	/**
	 * In-flight acquire promise, so concurrent same-process calls (e.g. 50
	 * concurrent appends from one store) share a single acquire attempt rather
	 * than racing past the `held` guard.
	 */
	private acquirePromise: Promise<void> | null = null;

	/**
	 * Creates a new advisory lock bound to a lock-file path.
	 *
	 * @param lockPath - Absolute path to the `.lock` file.
	 * @param options - Store options and lock options.
	 */
	constructor(
		lockPath: string,
		options: AdvisoryFileLockOptions & {
			fileMode: number;
		},
	) {
		this.lockPath = lockPath;
		this.fileMode = options.fileMode;
		this.processStartTime = options.getProcessStartTime ?? getProcessStartTime;
	}

	/** Whether this instance currently holds the lock. */
	get isHeld(): boolean {
		return this.held;
	}

	/** The absolute lock-file path. */
	get path(): string {
		return this.lockPath;
	}

	/**
	 * Acquires the lock (idempotent). Creates the lock file atomically; reclaims
	 * a stale lock; throws {@link LockHeldError} if a live process holds it.
	 *
	 * @remarks
	 * The lock-file's parent directory must already exist — the caller (the
	 * store) is responsible for `ensureRootDir` first, so that rootDir-is-a-file
	 * and createRoot-disabled errors surface before locking. Concurrent calls
	 * from the same instance share one in-flight acquire.
	 */
	async acquire(): Promise<void> {
		if (this.held) return;
		if (this.acquirePromise) return this.acquirePromise;

		this.acquirePromise = this.doAcquire().finally(() => {
			this.acquirePromise = null;
		});
		return this.acquirePromise;
	}

	private async doAcquire(): Promise<void> {
		if (this.held) return;
		await this.tryCreateOrReclaim();
		this.held = true;
		if (!this.registered) {
			AdvisoryFileLock.heldLocks.add(this);
			if (!AdvisoryFileLock.exitHandlerRegistered) {
				process.on("exit", AdvisoryFileLock.processExitHandler);
				AdvisoryFileLock.exitHandlerRegistered = true;
			}
			this.registered = true;
		}
	}

	/**
	 * Releases the lock (async). Idempotent. Removes the exit handler.
	 */
	async release(): Promise<void> {
		if (!this.held) return;
		this.deregister();
		try {
			if (await this.isCurrentOwner()) {
				await fsPromises.unlink(this.lockPath);
			}
		} catch {
			// Already gone (another process reclaimed, or never persisted).
			// Release must never throw during teardown.
		}
		this.held = false;
	}

	/**
	 * Releases the lock synchronously (for the `process.on('exit')` handler,
	 * which cannot await). Idempotent.
	 */
	releaseSync(): void {
		if (!this.held) return;
		this.deregister();
		try {
			if (this.isCurrentOwnerSync()) {
				fs.unlinkSync(this.lockPath);
			}
		} catch {
			// Swallow all errors during process exit.
		}
		this.held = false;
	}

	/** Alias for {@link release}. */
	dispose(): Promise<void> {
		return this.release();
	}

	private deregister(): void {
		if (this.registered) {
			AdvisoryFileLock.heldLocks.delete(this);
			if (
				AdvisoryFileLock.heldLocks.size === 0 &&
				AdvisoryFileLock.exitHandlerRegistered
			) {
				process.removeListener("exit", AdvisoryFileLock.processExitHandler);
				AdvisoryFileLock.exitHandlerRegistered = false;
			}
			this.registered = false;
		}
	}

	private async tryCreateOrReclaim(): Promise<void> {
		const contents: LockFileContents = {
			pid: process.pid,
			startedAt: new Date().toISOString(),
			processStartedAt: this.processStartTime(process.pid) ?? undefined,
			ownerId: this.ownerId,
		};

		const created = await this.tryWriteLockFile(contents);
		if (created) return;

		// Exists — read it. A null result means the lock file is unreadable or
		// malformed (a human hand-edited `.lock`, or a partial write). That is
		// unrecoverable as a *live* holder signal, so treat it as stale and
		// reclaim rather than hard-erroring (the local contract says a stale
		// lock is reclaimable; a malformed file can't prove a live holder).
		const existing = await this.readLock();
		if (existing === null || this.isStale(existing)) {
			await this.reclaimAndCreate(contents);
			return;
		}

		throw new LockHeldError(this.lockPath, existing);
	}

	private async tryWriteLockFile(contents: LockFileContents): Promise<boolean> {
		const temporaryPath = `${this.lockPath}.${process.pid}.${randomUUID()}.tmp`;
		try {
			const handle = await fsPromises.open(temporaryPath, "wx", this.fileMode);
			try {
				await handle.writeFile(JSON.stringify(contents), "utf8");
			} finally {
				await handle.close();
			}
			try {
				await fsPromises.link(temporaryPath, this.lockPath);
			} catch (error) {
				if (isAlreadyExistsError(error)) return false;
				throw error;
			}
			return true;
		} catch (error) {
			if (isAlreadyExistsError(error)) return false;
			throw error;
		} finally {
			try {
				await fsPromises.unlink(temporaryPath);
			} catch {
				// The temporary path is best-effort cleanup; do not mask the lock
				// operation's result if another actor has already removed it.
			}
		}
	}

	private async reclaimAndCreate(contents: LockFileContents): Promise<void> {
		// Unlink the stale lock, then race to re-create. If another process
		// wins the race, EEXIST propagates as a hard error (do not retry loops).
		try {
			await fsPromises.unlink(this.lockPath);
		} catch (error) {
			if (!isNotFoundError(error)) throw error;
		}

		const created = await this.tryWriteLockFile(contents);
		if (!created) {
			// Lost the race to another reclaimer.
			const existing = await this.readLock();
			throw new LockHeldError(this.lockPath, existing ?? undefined);
		}
	}

	private async readLock(): Promise<LockFileContents | null> {
		try {
			const raw = await fsPromises.readFile(this.lockPath, "utf8");
			return parseLockContents(raw);
		} catch {
			// Missing or unreadable — treat as malformed/stale (reclaimable).
			return null;
		}
	}

	/**
	 * A lock is stale if its holder process is dead or its PID was reused.
	 */
	private isStale(contents: LockFileContents): boolean {
		if (typeof contents.pid !== "number" || !Number.isFinite(contents.pid)) {
			return true;
		}
		if (!isProcessAlive(contents.pid)) return true;

		// Verify PID reuse:
		if (contents.processStartedAt) {
			const currentStartTime = this.processStartTime(contents.pid);
			if (currentStartTime && currentStartTime !== contents.processStartedAt) {
				return true;
			}
		}

		return Number.isNaN(Date.parse(contents.startedAt));
	}

	private async isCurrentOwner(): Promise<boolean> {
		const current = await this.readLock();
		return current?.ownerId === this.ownerId;
	}

	private isCurrentOwnerSync(): boolean {
		try {
			return (
				parseLockContents(fs.readFileSync(this.lockPath, "utf8"))?.ownerId ===
				this.ownerId
			);
		} catch {
			return false;
		}
	}
}

/**
 * Probes whether a process is alive via a signal-0 delivery.
 *
 * @param pid - The process id to probe.
 * @returns `true` if the process exists (alive or running as another user),
 * `false` if it is dead.
 */
export function isProcessAlive(pid: number): boolean {
	if (typeof pid !== "number" || !Number.isFinite(pid) || pid <= 0) {
		return false;
	}
	try {
		process.kill(pid, 0);
		return true;
	} catch (error) {
		// ESRCH (no such process) → dead. EPERM (exists, other user) → alive.
		const code = (error as NodeJS.ErrnoException)?.code;
		return code !== "ESRCH";
	}
}

/**
 * Parses raw lock-file bytes into {@link LockFileContents}.
 *
 * @returns The parsed contents, or `null` if malformed/partial (reclaimable).
 */
export function parseLockContents(raw: string): LockFileContents | null {
	try {
		const value = JSON.parse(raw) as unknown;
		if (
			typeof value === "object" &&
			value !== null &&
			typeof (value as LockFileContents).pid === "number" &&
			typeof (value as LockFileContents).startedAt === "string"
		) {
			return value as LockFileContents;
		}
		return null;
	} catch {
		return null;
	}
}

// Errno classifier kept local to avoid an import cycle through the errors
// module (which imports this module for LockHeldError). `isNotFoundError` is
// imported from the cycle-free `core/internal` leaf.
function isAlreadyExistsError(error: unknown): boolean {
	return (
		typeof error === "object" &&
		error !== null &&
		(error as NodeJS.ErrnoException).code === "EEXIST"
	);
}
