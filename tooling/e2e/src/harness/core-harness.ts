/**
 * Real core harness — file-first truth proof for @memofs/core.
 *
 * @remarks
 * Creates an isolated temp dir via `fs.mkdtemp`, boots a real
 * `NodeFsMemoryStore` + `MemoFS` client, and provides cleanup,
 * snapshot, and assertion helpers. This is the primary seam for
 * real e2e (ADR 0021 F1, F5).
 *
 * Node-only: imports `node:fs`, `node:os`, `node:path` and
 * `@memofs/core/node-fs`. Must not be imported from Workers.
 *
 * @public
 */

import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { MemoFS } from "@memofs/core";
import type { NodeFsMemoryStore } from "@memofs/core/node-fs";
import { createNodeFsMemoryStore } from "@memofs/core/node-fs";

import {
	assertFileExistsAt,
	assertFileNotExistsAt,
	listFilesRecursive,
	snapshotFsRecursive,
} from "./fs-helpers.js";

/**
 * Base real harness — tmpDir + cleanup + file assertions.
 *
 * @public
 */
export type RealHarness = {
	/** Absolute path to isolated tmpDir (e.g. `/tmp/memofs-e2e-XXXX`). */
	tmpDir: string;
	/** Removes tmpDir recursively (`rm -rf`). Idempotent. */
	cleanup: () => Promise<void>;
	/** Asserts a file exists relative to tmpDir (e.g. `.memofs/memory/foo.md`). */
	assertFileExists: (relPath: string) => Promise<void>;
	/** Asserts a file does NOT exist relative to tmpDir. */
	assertFileNotExists: (relPath: string) => Promise<void>;
	/**
	 * Snapshot of all files under tmpDir.
	 * @returns Record<relativePath, content> (utf8).
	 */
	snapshotFs: () => Promise<Record<string, string>>;
	/** Lists all files under tmpDir as relative paths, sorted. */
	listFiles: () => Promise<string[]>;
};

/**
 * Core real harness — real MemoFS client backed by Node-fs store.
 *
 * @public
 */
export type CoreRealHarness = RealHarness & {
	/** Real MemoFS client (lexical recall, no embedder). */
	client: MemoFS;
	/** Real NodeFsMemoryStore (for direct store access if needed). */
	store: NodeFsMemoryStore;
	/** Convenience: `client.writeMemory({content})`. */
	remember: (fact: string) => Promise<{ id: string }>;
	/** Convenience: `client.recall(query)` returning items. */
	search: (
		query: string,
	) => Promise<Awaited<ReturnType<MemoFS["recall"]>>["items"]>;
	/** Convenience: `client.context(input)`. */
	context: (
		input: Parameters<MemoFS["context"]>[0],
	) => ReturnType<MemoFS["context"]>;
};

export type CreateRealCoreHarnessOptions = {
	/**
	 * Reuse existing tmpDir instead of creating new.
	 * Useful for cross-visibility tests (CLI write → core read same dir).
	 */
	tmpDir?: string;
	/** Project ID for MemoFS client. @defaultValue `"e2e-test"` */
	projectId?: string;
	/** Prefix for mkdtemp. @defaultValue `"memofs-e2e-"` */
	prefix?: string;
	/**
	 * Whether to enable cross-process file lock.
	 * @defaultValue false — disabled for e2e to allow sharing tmpDir across harnesses.
	 */
	lock?: boolean;
	/**
	 * Whether to ensure root dir exists immediately.
	 * @defaultValue true
	 */
	createRoot?: boolean;
};

/**
 * Creates a real core harness with isolated tmpDir and real MemoFS client.
 *
 * Proves file-first truth: after `remember`, `.memofs/memory/*.md` exists
 * on disk and is readable via `snapshotFs()` / `assertFileExists()`.
 *
 * @example
 * ```ts
 * const harness = await createRealCoreHarness();
 * try {
 *   await harness.remember("Simba prefers TypeScript");
 *   await harness.assertFileExists(".memofs/memory");
 *   const files = await harness.listFiles();
 *   expect(files.some(f => f.includes("memory"))).toBe(true);
 * } finally {
 *   await harness.cleanup();
 * }
 * ```
 *
 * @public
 */
export async function createRealCoreHarness(
	options: CreateRealCoreHarnessOptions = {},
): Promise<CoreRealHarness> {
	const prefix = options.prefix ?? "memofs-e2e-";
	const tmpDir = options.tmpDir ?? (await mkdtemp(join(tmpdir(), prefix)));

	// Ensure tmpDir exists if reused (idempotent)
	if (options.tmpDir) {
		await mkdir(tmpDir, { recursive: true });
	}

	const store = createNodeFsMemoryStore({
		rootDir: tmpDir,
		createRoot: options.createRoot ?? true,
		missingFileBehavior: "empty",
		lock: options.lock ?? false,
	});

	const client = new MemoFS({
		store,
		projectId: options.projectId ?? "e2e-test",
		recall: { engine: "lexical" },
	});

	let cleaned = false;

	const cleanup = async (): Promise<void> => {
		if (cleaned) return;
		cleaned = true;
		// Dispose lock if enabled
		try {
			await store.dispose?.();
		} catch {
			// ignore dispose errors during cleanup
		}
		await rm(tmpDir, { recursive: true, force: true });
	};

	const assertFileExists = async (relPath: string): Promise<void> => {
		await assertFileExistsAt(tmpDir, relPath);
	};

	const assertFileNotExists = async (relPath: string): Promise<void> => {
		await assertFileNotExistsAt(tmpDir, relPath);
	};

	const listFiles = async (): Promise<string[]> => {
		return listFilesRecursive(tmpDir);
	};

	const snapshotFs = async (): Promise<Record<string, string>> => {
		return snapshotFsRecursive(tmpDir);
	};

	const remember = async (fact: string): Promise<{ id: string }> => {
		const result = await client.writeMemory({ content: fact });
		// writeMemory returns {id, created} etc — normalize to {id}
		return { id: (result as { id?: string }).id ?? "unknown" };
	};

	const search: CoreRealHarness["search"] = async (query: string) => {
		const result = await client.recall(query);
		return result.items;
	};

	const context: CoreRealHarness["context"] = (input) => {
		return client.context(input);
	};

	return {
		tmpDir,
		cleanup,
		assertFileExists,
		assertFileNotExists,
		snapshotFs,
		listFiles,
		client,
		store,
		remember,
		search,
		context,
	};
}
