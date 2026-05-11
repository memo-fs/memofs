import path from "node:path";
import { CliFsError } from "../errors/cli-errors";

export function normalizeRootDir(rootDir: string): string {
	if (typeof rootDir !== "string" || rootDir.trim().length === 0) {
		throw new CliFsError("rootDir must be a non-empty string.");
	}

	if (rootDir.includes("\0")) {
		throw new CliFsError("rootDir must not contain null bytes.");
	}

	return path.resolve(rootDir);
}

export function resolveInsideRoot(
	rootDir: string,
	relativePath: string,
): string {
	if (typeof relativePath !== "string" || relativePath.trim().length === 0) {
		throw new CliFsError("relativePath must be a non-empty string.");
	}

	if (relativePath.includes("\0")) {
		throw new CliFsError("relativePath must not contain null bytes.");
	}

	if (path.isAbsolute(relativePath)) {
		throw new CliFsError("relativePath must not be absolute.");
	}

	const normalized = relativePath.replaceAll("\\", "/");

	if (normalized.split("/").includes("..")) {
		throw new CliFsError("relativePath must not contain path traversal.");
	}

	const resolved = path.resolve(rootDir, normalized);
	const relative = path.relative(rootDir, resolved);

	if (relative.startsWith("..") || path.isAbsolute(relative)) {
		throw new CliFsError("Resolved path escaped rootDir.");
	}

	return resolved;
}
