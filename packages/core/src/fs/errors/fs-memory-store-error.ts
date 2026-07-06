import { MemoryStoreError } from "@memofs/core";

/**
 * Error class for filesystem memory store errors.
 *
 * @remarks
 * Extends {@link MemoryStoreError} to add Node.js-specific error handling.
 *
 * @public
 */
export class FsMemoryStoreError extends MemoryStoreError {
	/**
	 * Creates a new FsMemoryStoreError.
	 * @internal
	 */
	constructor(
		message: string,
		details?: Record<string, unknown>,
		cause?: unknown,
	) {
		super(message, details, cause);
		this.name = "FsMemoryStoreError";
	}
}

/**
 * Shape of the `details` attached to a {@link LockHeldError}.
 *
 * @public
 */
export interface LockHeldDetails {
	/** Absolute path to the `.lock` file. */
	lockPath: string;
	/** PID of the process holding the lock, if known. */
	pid?: number;
	/** ISO timestamp the lock was acquired, if known. */
	startedAt?: string;
	[key: string]: unknown;
}

/**
 * Thrown when a second process attempts a mutating op on a `.tekmemo/` root
 * that is already locked.
 *
 * @remarks
 * Implements the local single-process contract (Q28 / decisions.md). A second
 * Claude Code window on one repo is the canonical day-one scenario this
 * guards. `details` carries the holder PID + startedAt so the caller can show
 * "locked by pid 1234 since 2026-06-22T10:00Z." Releasing is via the holder
 * exiting gracefully; a crashed holder leaves a stale lock the next process
 * reclaims via the PID-liveness probe.
 *
 * @public
 */
export class LockHeldError extends FsMemoryStoreError {
	/**
	 * Creates a new LockHeldError.
	 *
	 * @param lockPath - Absolute path to the lock file.
	 * @param holder - The holder's PID + startedAt, if recoverable from the lock.
	 */
	constructor(
		lockPath: string,
		holder?: { pid?: number; startedAt?: string } | null,
	) {
		const details: LockHeldDetails = { lockPath };
		if (holder?.pid !== undefined) details.pid = holder.pid;
		if (holder?.startedAt !== undefined) details.startedAt = holder.startedAt;
		super(
			`TekMemo store is locked by another process (lock: ${lockPath}${
				holder?.pid ? `, pid ${holder.pid}` : ""
			}). A second process cannot mutate this store. Exit the other process or remove the lock file.`,
			details,
		);
		this.name = "LockHeldError";
	}
}

/**
 * Checks if an error is a Node.js ErrnoException.
 *
 * @param error - The error to check.
 * @returns `true` if the error has a `code` property, `false` otherwise.
 */
export function isNodeErrnoException(
	error: unknown,
): error is NodeJS.ErrnoException {
	return typeof error === "object" && error !== null && "code" in error;
}

/**
 * Checks if an error is a "not found" (ENOENT) error.
 *
 * @param error - The error to check.
 * @returns `true` if the error is an ENOENT error, `false` otherwise.
 */
export function isNotFoundError(error: unknown): boolean {
	return isNodeErrnoException(error) && error.code === "ENOENT";
}

/**
 * Checks if an error is an "already exists" (EEXIST) error.
 *
 * @param error - The error to check.
 * @returns `true` if the error is an EEXIST error, `false` otherwise.
 */
export function isAlreadyExistsError(error: unknown): boolean {
	return isNodeErrnoException(error) && error.code === "EEXIST";
}

export function wrapFsError(
	message: string,
	details: Record<string, unknown>,
	cause: unknown,
): FsMemoryStoreError {
	return new FsMemoryStoreError(message, details, cause);
}
