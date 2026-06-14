/**
 * Core memory document management (core.md).
 *
 * @remarks
 * Core memory is the primary durable memory file. It stores compact,
 * always-relevant, canonical truths about the project or agent.
 *
 * @public
 */

import { assertString } from "@repo/utils";
import { CORE_MEMORY_PATH } from "../constants/memory-paths";
import type { MemoryStore } from "../types/memory-store";

/**
 * Reads the core memory document from the store.
 *
 * @param store - The memory store to read from.
 * @returns The raw core memory text.
 */
/**
 * Reads the core memory document from the store.
 *
 * @param store - The memory store to read from.
 * @returns The raw core memory text.
 */
export async function readCoreMemory(store: MemoryStore): Promise<string> {
	return store.read(CORE_MEMORY_PATH);
}

/**
 * Writes content to the core memory document, normalizing line endings.
 *
 * @param store - The memory store to write to.
 * @param content - The markdown content to write.
 */
/**
 * Writes content to the core memory document, normalizing line endings.
 *
 * @param store - The memory store to write to.
 * @param content - The markdown content to write.
 */
export async function writeCoreMemory(
	store: MemoryStore,
	content: string,
): Promise<void> {
	assertString(content, "content");
	await store.write(CORE_MEMORY_PATH, normalizeMarkdownDocument(content));
}

/**
 * Reads and returns trimmed core memory text.
 *
 * @param store - The memory store to read from.
 * @returns Trimmed core memory text.
 */
/**
 * Reads and returns trimmed core memory text.
 *
 * @param store - The memory store to read from.
 * @returns Trimmed core memory text.
 */
export async function buildCoreMemoryText(store: MemoryStore): Promise<string> {
	const core = await readCoreMemory(store);
	return core.trim();
}

/**
 * Normalizes a markdown document: fixes line endings and ensures trailing newline.
 *
 * @param content - The raw markdown content.
 * @returns Normalized content with Unix line endings and trailing newline.
 */
export function normalizeMarkdownDocument(content: string): string {
	assertString(content, "content");
	const normalized = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
	return normalized.endsWith("\n") ? normalized : `${normalized}\n`;
}
