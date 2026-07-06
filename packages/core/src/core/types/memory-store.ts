/**
 * Types defining the memory store interface and snapshot shape.
 *
 * @public
 */

import type { MemoryPath } from "../constants/memory-paths";

export type { MemoryPath } from "../constants/memory-paths";

/**
 * Interface for a memory store that reads/writes canonical MemoFS files.
 *
 * @remarks
 * All paths must be canonical `.memofs/` paths validated by `assertMemoryPath`.
 * Implementations include `NodeFsMemoryStore` (filesystem) and
 * `InMemoryMemoryStore` (for testing).
 *
 * @public
 */
export interface MemoryStore {
	/**
	 * Reads the content of a memory file.
	 *
	 * @param path - Canonical memory path (e.g., `.memofs/memory/core.md`).
	 * @returns The file content as a string.
	 * @throws {@link MemoryNotFoundError} If the file does not exist.
	 */
	read(path: MemoryPath): Promise<string>;
	/**
	 * Writes content to a memory file (overwrites if it exists).
	 *
	 * @param path - Canonical memory path.
	 * @param content - The content to write.
	 */
	write(path: MemoryPath, content: string): Promise<void>;
	/**
	 * Appends content to a memory file.
	 *
	 * @param path - Canonical memory path.
	 * @param content - The content to append.
	 */
	append(path: MemoryPath, content: string): Promise<void>;
	/**
	 * Checks if a memory file exists.
	 *
	 * @param path - Canonical memory path.
	 * @returns `true` if the file exists, `false` otherwise.
	 */
	exists(path: MemoryPath): Promise<boolean>;
	/**
	 * Deletes a memory file. Idempotent: deleting a missing file resolves
	 * without error. Used by file-replication sync to apply server-side
	 * removals after a pull.
	 *
	 * @param path - Canonical memory path.
	 */
	delete(path: MemoryPath): Promise<void>;
}

/**
 * A frozen snapshot of all canonical memory file contents.
 * Used for testing and checkpointing.
 *
 * @public
 */
export type MemoryStoreSnapshot = Readonly<Record<string, string | undefined>>;
