/**
 * Normalizes filesystem memory store options.
 *
 * @remarks
 * Fills in defaults for directory mode, file mode, and behavior flags.
 *
 * @internal
 */

import type {
	NodeFsMemoryStoreOptions,
	NormalizedNodeFsMemoryStoreOptions,
} from "../types/options";
import { normalizeRootDir } from "./normalize-root-dir";

const DEFAULT_DIRECTORY_MODE = 0o700;
const DEFAULT_FILE_MODE = 0o600;
const DEFAULT_LOCK_MAX_AGE_MS = 60 * 60 * 1000;

/**
 * Normalizes filesystem memory store options with defaults.
 *
 * @param options - The raw options to normalize.
 * @returns Normalized options with defaults filled in.
 */
export function normalizeOptions(
	options: NodeFsMemoryStoreOptions,
): NormalizedNodeFsMemoryStoreOptions {
	return {
		rootDir: normalizeRootDir(options.rootDir),
		createRoot: options.createRoot ?? true,
		missingFileBehavior: options.missingFileBehavior ?? "throw",
		disallowSymlinks: options.disallowSymlinks ?? true,
		directoryMode: options.directoryMode ?? DEFAULT_DIRECTORY_MODE,
		fileMode: options.fileMode ?? DEFAULT_FILE_MODE,
		lock: options.lock ?? true,
		lockMaxAgeMs: options.lockMaxAgeMs ?? DEFAULT_LOCK_MAX_AGE_MS,
	};
}
