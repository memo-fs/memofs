import fs from "node:fs/promises";
import { isNotFoundError, wrapFsError } from "../errors/fs-memory-store-error";
import type { NormalizedNodeFsMemoryStoreOptions } from "../types/options";

export async function ensureRootDir(
	options: NormalizedNodeFsMemoryStoreOptions,
): Promise<void> {
	try {
		const stats = await fs.stat(options.rootDir);
		if (!stats.isDirectory()) {
			throw wrapFsError(
				"rootDir exists but is not a directory.",
				{ rootDir: options.rootDir },
				undefined,
			);
		}
		return;
	} catch (error) {
		if (!isNotFoundError(error)) {
			if (error instanceof Error && error.name === "FsMemoryStoreError") {
				throw error;
			}
			throw wrapFsError(
				"Failed to inspect rootDir.",
				{ rootDir: options.rootDir },
				error,
			);
		}
	}

	if (!options.createRoot) {
		throw wrapFsError(
			"rootDir does not exist and createRoot is disabled.",
			{ rootDir: options.rootDir },
			undefined,
		);
	}

	try {
		await fs.mkdir(options.rootDir, {
			recursive: true,
			mode: options.directoryMode,
		});
	} catch (error) {
		throw wrapFsError(
			"Failed to create rootDir.",
			{ rootDir: options.rootDir },
			error,
		);
	}
}
