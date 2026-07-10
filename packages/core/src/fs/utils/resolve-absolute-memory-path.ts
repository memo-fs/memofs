/**
 * Resolves a memory path to an absolute filesystem path.
 *
 * @remarks
 * Ensures the resolved path stays within the rootDir.
 *
 * @internal
 */

import path from "node:path";
import {
	assertMemoryPath,
	type MemoryPath,
} from "../../core/constants/memory-paths";
import { FsMemoryStoreError } from "../errors/fs-memory-store-error";
import type { NormalizedNodeFsMemoryStoreOptions } from "../types/options";

/**
 * Resolves a memory path to an absolute filesystem path.
 *
 * @param options - Options containing rootDir.
 * @param memoryPath - The memory path to resolve.
 * @returns The absolute filesystem path.
 * @throws {FsMemoryStoreError} If the resolved path escapes rootDir.
 */
export function resolveAbsoluteMemoryPath(
	options: Pick<NormalizedNodeFsMemoryStoreOptions, "rootDir">,
	memoryPath: MemoryPath,
): string {
	assertMemoryPath(memoryPath);

	const absolutePath = path.resolve(options.rootDir, memoryPath);
	const relative = path.relative(options.rootDir, absolutePath);

	if (
		relative === "" ||
		relative.startsWith("..") ||
		path.isAbsolute(relative)
	) {
		throw new FsMemoryStoreError("Resolved memory path escaped rootDir.", {
			rootDir: options.rootDir,
			memoryPath,
			absolutePath,
		});
	}

	return absolutePath;
}
