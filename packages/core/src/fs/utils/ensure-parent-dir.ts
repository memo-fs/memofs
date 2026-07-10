/**
 * Ensures the parent directory of a path exists.
 *
 * @remarks
 * Creates directories recursively with the configured directory mode.
 *
 * @internal
 */

import fs from "node:fs/promises";
import path from "node:path";
import { wrapFsError } from "../errors/fs-memory-store-error";
import type { NormalizedNodeFsMemoryStoreOptions } from "../types/options";

/**
 * Ensures the parent directory of a path exists.
 *
 * @param absolutePath - The path whose parent should exist.
 * @param options - Normalized store options.
 * @returns A promise that resolves when the directory exists.
 * @throws {FsMemoryStoreError} If the directory cannot be created.
 */
export async function ensureParentDir(
	absolutePath: string,
	options: NormalizedNodeFsMemoryStoreOptions,
): Promise<void> {
	const parent = path.dirname(absolutePath);

	try {
		await fs.mkdir(parent, {
			recursive: true,
			mode: options.directoryMode,
		});
	} catch (error) {
		throw wrapFsError(
			"Failed to create memory file parent directory.",
			{
				absolutePath,
				parent,
			},
			error,
		);
	}
}
