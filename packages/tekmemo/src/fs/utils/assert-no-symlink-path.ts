/**
 * Asserts that no path segment is a symbolic link.
 *
 * @remarks
 * Walks each segment from rootDir to the path, checking for symlinks.
 *
 * @internal
 */

import fs from "node:fs/promises";
import path from "node:path";
import {
	FsMemoryStoreError,
	isNotFoundError,
	wrapFsError,
} from "../errors/fs-memory-store-error";
import type { NormalizedNodeFsMemoryStoreOptions } from "../types/options";

/**
 * Asserts that no path segment is a symbolic link.
 *
 * @param absolutePath - The path to check.
 * @param options - Normalized store options.
 * @returns A promise that resolves if no symlinks are found.
 * @throws {FsMemoryStoreError} If a symlink is detected or inspection fails.
 */
export async function assertNoSymlinkPath(
	absolutePath: string,
	options: NormalizedNodeFsMemoryStoreOptions,
): Promise<void> {
	if (!options.disallowSymlinks) {
		return;
	}

	const relative = path.relative(options.rootDir, absolutePath);
	const parts = relative.split(path.sep).filter(Boolean);
	let current = options.rootDir;

	for (const part of parts) {
		current = path.join(current, part);

		try {
			const stats = await fs.lstat(current);
			if (stats.isSymbolicLink()) {
				throw new FsMemoryStoreError(
					"Symlink inside managed memory path rejected.",
					{
						rootDir: options.rootDir,
						symlinkPath: current,
						absolutePath,
					},
				);
			}
		} catch (error) {
			if (isNotFoundError(error)) {
				return;
			}
			if (error instanceof FsMemoryStoreError) {
				throw error;
			}
			throw wrapFsError(
				"Failed to inspect memory path for symlinks.",
				{
					absolutePath,
					inspectedPath: current,
				},
				error,
			);
		}
	}
}
