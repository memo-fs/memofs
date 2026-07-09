/**
 * Normalizes a root directory path (string or URL).
 *
 * @remarks
 * Validates and resolves the rootDir to an absolute path.
 *
 * @internal
 */

import path from "node:path";
import { fileURLToPath } from "node:url";
import { MemoryPathError } from "../../core/errors/errors";

/**
 * Normalizes a root directory path (string or URL).
 *
 * @param rootDir - The root directory (string or URL).
 * @returns The normalized absolute path.
 * @throws {MemoryPathError} If the input is invalid.
 */
export function normalizeRootDir(rootDir: string | URL): string {
	if (rootDir instanceof URL && rootDir.protocol !== "file:") {
		throw new MemoryPathError("rootDir URL must use the file: protocol.", {
			protocol: rootDir.protocol,
		});
	}

	const raw = rootDir instanceof URL ? fileURLToPath(rootDir) : rootDir;

	if (typeof raw !== "string") {
		throw new MemoryPathError("rootDir must be a string or file URL.", {
			receivedType: typeof raw,
		});
	}

	if (raw.length === 0 || raw.trim().length === 0) {
		throw new MemoryPathError("rootDir must not be empty.");
	}

	if (raw.includes("\0")) {
		throw new MemoryPathError("rootDir must not contain null bytes.");
	}

	return path.resolve(raw);
}
