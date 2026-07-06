/**
 * Safely reads a memory path, returning a default value if not found.
 *
 * @remarks
 * Wraps store.read() and catches common MemoFS/storage not-found errors.
 * Other errors are propagated.
 *
 * @internal
 */

import type { MemoryPath, MemoryStore } from "@memofs/core";

export async function safeReadMemoryPath(
	store: MemoryStore,
	path: MemoryPath,
	defaultValue = "",
): Promise<string> {
	try {
		return await store.read(path);
	} catch (error) {
		if (isNotFoundError(error)) return defaultValue;
		throw error;
	}
}

function isNotFoundError(error: unknown): boolean {
	if (!error || typeof error !== "object") return false;
	const record = error as Record<string, unknown>;
	const name = typeof record.name === "string" ? record.name.toLowerCase() : "";
	const code = typeof record.code === "string" ? record.code.toLowerCase() : "";
	const message =
		typeof record.message === "string" ? record.message.toLowerCase() : "";
	return (
		name.includes("notfound") ||
		name.includes("not_found") ||
		code === "enoent" ||
		code.includes("not_found") ||
		message.includes("not found") ||
		message.includes("does not exist")
	);
}
