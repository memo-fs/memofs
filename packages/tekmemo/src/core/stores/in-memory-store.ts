/**
 * In-memory implementation of the MemoryStore interface.
 *
 * @remarks
 * Useful for testing and scenarios where no filesystem is available.
 * All data is held in a `Map` and never persisted to disk.
 *
 * @public
 */

import { assertString } from "@repo/utils";
import {
	assertMemoryPath,
	CANONICAL_TEKMEMO_FILES,
	type MemoryPath,
} from "../constants/memory-paths";
import { MemoryNotFoundError } from "../errors/errors";
import type { MemoryStore, MemoryStoreSnapshot } from "../types/memory-store";

export type InMemoryStoreInitialFiles =
	| Partial<Record<MemoryPath, string>>
	| Record<string, string>;

export class InMemoryMemoryStore implements MemoryStore {
	private readonly files = new Map<MemoryPath, string>();

	/**
	 * Creates an in-memory store with optional initial files.
	 *
	 * @param initialFiles - Optional map of paths to file contents.
	 */
	constructor(initialFiles: InMemoryStoreInitialFiles = {}) {
		for (const [path, content] of Object.entries(initialFiles)) {
			assertMemoryPath(path);
			assertString(content, `initialFiles[${path}]`);
			this.files.set(path, content);
		}
	}

	/**
	 * Reads a file from the in-memory store.
	 *
	 * @param path - Canonical memory path.
	 * @returns The file content.
	 * @throws {@link MemoryNotFoundError} If the file does not exist.
	 */
	async read(path: MemoryPath): Promise<string> {
		assertMemoryPath(path);
		if (!this.files.has(path)) {
			throw new MemoryNotFoundError(`Memory file not found: ${path}`, { path });
		}
		return this.files.get(path) ?? "";
	}

	/**
	 * Writes content to a file in the in-memory store.
	 *
	 * @param path - Canonical memory path.
	 * @param content - The content to write.
	 */
	async write(path: MemoryPath, content: string): Promise<void> {
		assertMemoryPath(path);
		assertString(content, "content");
		this.files.set(path, content);
	}

	/**
	 * Appends content to a file in the in-memory store.
	 *
	 * @param path - Canonical memory path.
	 * @param content - The content to append.
	 */
	async append(path: MemoryPath, content: string): Promise<void> {
		assertMemoryPath(path);
		assertString(content, "content");
		if (content.length === 0) return;
		const current = this.files.get(path) ?? "";
		this.files.set(path, `${current}${content}`);
	}

	/**
	 * Checks if a file exists in the in-memory store.
	 *
	 * @param path - Canonical memory path.
	 * @returns `true` if the file exists, `false` otherwise.
	 */
	async exists(path: MemoryPath): Promise<boolean> {
		assertMemoryPath(path);
		return this.files.has(path);
	}

	/**
	 * Returns a frozen snapshot of all files in the store.
	 *
	 * @returns A read-only record of all file paths to their content.
	 */
	snapshot(): MemoryStoreSnapshot {
		const output: Record<string, string | undefined> = {};
		for (const path of CANONICAL_TEKMEMO_FILES) {
			output[path] = this.files.get(path);
		}
		for (const [path, value] of this.files.entries()) {
			output[path] = value;
		}
		return Object.freeze(output);
	}

	/**
	 * Clears all files from the in-memory store.
	 */
	clear(): void {
		this.files.clear();
	}
}
