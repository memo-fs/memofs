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
}

export interface NormalizedNodeFsMemoryStoreOptions {
	rootDir: string;
	createRoot: boolean;
	missingFileBehavior: MissingFileBehavior;
	disallowSymlinks: boolean;
	directoryMode: number;
	fileMode: number;
}
