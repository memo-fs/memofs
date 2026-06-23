import type { MissingFileBehavior } from "../../core/types/config";

export type { MissingFileBehavior };
export interface NodeFsMemoryStoreOptions {
	/**
	 * Root directory where TekMemo files are stored.
	 * Memory paths are resolved beneath this directory.
	 */
	rootDir: string | URL;

	/**
	 * Create the root directory automatically before write/append operations.
	 * Defaults to true.
	 */
	createRoot?: boolean | undefined;

	/**
	 * Behavior when reading a missing memory file.
	 * Defaults to "throw" to match the core InMemory store contract.
	 */
	missingFileBehavior?: MissingFileBehavior | undefined;

	/**
	 * Reject symlinks inside the managed memory path before writes/appends/reads.
	 * Defaults to true.
	 */
	disallowSymlinks?: boolean | undefined;

	/**
	 * Directory mode used when creating directories.
	 * Defaults to 0o700.
	 */
	directoryMode?: number | undefined;

	/**
	 * File mode used when creating files.
	 * Defaults to 0o600.
	 */
	fileMode?: number | undefined;

	/**
	 * Whether to acquire the cross-process advisory lock (`.tekmemo/.lock`)
	 * on the first mutating write. Defaults to `true`.
	 *
	 * @remarks
	 * Implements the local single-process contract (Q28 / decisions.md): a
	 * second process mutating the same `.tekmemo/` root gets a
	 * {@link LockHeldError}. Set to `false` to opt out — e.g. when an external
	 * coordinator already serializes access, or in tests that deliberately
	 * share a root across stores.
	 */
	lock?: boolean | undefined;

	/**
	 * Max age (ms) before a held lock is treated as stale (and reclaimable)
	 * regardless of PID liveness. Guards against PID reuse.
	 * Default: 3,600,000 (1 hour).
	 */
	lockMaxAgeMs?: number | undefined;
}

export interface NormalizedNodeFsMemoryStoreOptions {
	rootDir: string;
	createRoot: boolean;
	missingFileBehavior: MissingFileBehavior;
	disallowSymlinks: boolean;
	directoryMode: number;
	fileMode: number;
	/** Whether the cross-process advisory lock is enabled. */
	lock: boolean;
	/** Max age (ms) before a held lock is treated as stale. */
	lockMaxAgeMs: number;
}
