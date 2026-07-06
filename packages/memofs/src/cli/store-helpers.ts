/**
 * Convenience helpers for accessing the MemoryStore from CLI commands.
 *
 * These mirror the old `MemoFsFileSystem` methods (readTextIfExists, exists, etc.)
 * but operate on a `MemoryStore` from `@memofs/core`.
 *
 * @module store-helpers
 */

import type { MemoryPath, MemoryStore } from "@memofs/core";
import { MemoryNotFoundError } from "@memofs/core";

/**
 * Reads text from the store, returning undefined if the file does not exist.
 *
 * @param store - The memory store to read from.
 * @param path - Relative path within the store.
 * @returns The file content, or undefined if missing.
 */
export async function readTextIfExists(
	store: MemoryStore,
	path: string,
): Promise<string | undefined> {
	try {
		const content = await store.read(path as MemoryPath);
		if (content === "") return undefined;
		return content;
	} catch (err) {
		if (err instanceof MemoryNotFoundError) return undefined;
		throw err;
	}
}

/**
 * Reads text from the store, throwing if the file does not exist.
 *
 * @param store - The memory store to read from.
 * @param path - Relative path within the store.
 * @returns The file content.
 */
export async function readText(
	store: MemoryStore,
	path: string,
): Promise<string> {
	return store.read(path as MemoryPath);
}

/**
 * Checks whether a path exists in the store.
 *
 * @param store - The memory store to check.
 * @param path - Relative path within the store.
 * @returns True if the path exists.
 */
export async function exists(
	store: MemoryStore,
	path: string,
): Promise<boolean> {
	return store.exists(path as MemoryPath);
}

/**
 * Writes text to the store.
 *
 * @param store - The memory store to write to.
 * @param path - Relative path within the store.
 * @param content - The text content to write.
 */
export async function writeText(
	store: MemoryStore,
	path: string,
	content: string,
): Promise<void> {
	await store.write(path as MemoryPath, content);
}

/**
 * Appends text to a file in the store.
 *
 * @param store - The memory store to append to.
 * @param path - Relative path within the store.
 * @param content - The text content to append.
 */
export async function appendText(
	store: MemoryStore,
	path: string,
	content: string,
): Promise<void> {
	await store.append(path as MemoryPath, content);
}

/**
 * Gets the root directory from a NodeFsMemoryStore-backed store.
 * Falls back to process.cwd() if the store doesn't expose rootDir.
 *
 * @param store - The memory store.
 * @returns The root directory path.
 */
export function getRootDir(store: MemoryStore): string {
	if (
		typeof store === "object" &&
		store !== null &&
		"rootDir" in store &&
		typeof (store as { rootDir: unknown }).rootDir === "string"
	) {
		return (store as { rootDir: string }).rootDir;
	}
	return process.cwd();
}
