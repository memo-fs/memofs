/**
 * Atomic file write utility for Node.js.
 *
 * @remarks
 * Writes to a temporary file, then renames to the target path.
 * Retries up to 5 times if EEXIST errors occur.
 *
 * @internal
 */

import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import {
	isAlreadyExistsError,
	wrapFsError,
} from "../errors/fs-memory-store-error";
import type { NormalizedNodeFsMemoryStoreOptions } from "../types/options";

/**
 * Writes content to a file atomically (via temp file + rename).
 *
 * @param absolutePath - The target file path.
 * @param content - The content to write.
 * @param options - Normalized store options.
 * @returns A promise that resolves when the write is complete.
 * @throws {FsMemoryStoreError} If the write fails after retries.
 */
export async function writeFileAtomic(
	absolutePath: string,
	content: string,
	options: NormalizedNodeFsMemoryStoreOptions,
): Promise<void> {
	const parent = path.dirname(absolutePath);
	const base = path.basename(absolutePath);
	let lastError: unknown;

	for (let attempt = 0; attempt < 5; attempt += 1) {
		const tempPath = path.join(
			parent,
			`.${base}.${process.pid}.${Date.now()}.${randomUUID()}.tmp`,
		);

		try {
			const handle = await fs.open(tempPath, "wx", options.fileMode);
			try {
				await handle.writeFile(content, "utf8");
				await handle.sync();
			} finally {
				await handle.close();
			}

			await fs.rename(tempPath, absolutePath);
			return;
		} catch (error) {
			lastError = error;
			try {
				await fs.rm(tempPath, { force: true });
			} catch {
				// Best-effort cleanup only.
			}

			if (isAlreadyExistsError(error)) {
				continue;
			}
			break;
		}
	}

	throw wrapFsError(
		"Failed to atomically write memory file.",
		{ absolutePath },
		lastError,
	);
}
