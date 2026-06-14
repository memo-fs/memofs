/**
 * Bootstrap utilities for initializing a new TekMemo project.
 *
 * @remarks
 * Ensures all canonical `.tekmemo/` files exist with sensible defaults.
 * Can optionally overwrite existing files.
 *
 * @public
 */

import { assertString } from "@repo/utils";
import {
	type CanonicalTekMemoFile,
	CHUNKS_INDEX_PATH,
	CONVERSATIONS_MEMORY_PATH,
	CORE_MEMORY_PATH,
	GRAPH_EDGES_PATH,
	GRAPH_NODES_PATH,
	MANIFEST_PATH,
	MEMORY_EVENTS_PATH,
	NOTES_MEMORY_PATH,
	SNAPSHOTS_INDEX_PATH,
} from "../constants/memory-paths";
import {
	createDefaultMemoryTemplates,
	type MemoryTemplates,
} from "../defaults/templates";
import type { MemoryStore } from "../types/memory-store";

/**
 * Options for bootstrapping a memory store.
 */
export interface BootstrapMemoryStoreOptions {
	/** Partial override of default file templates. */
	templates?: Partial<MemoryTemplates>;
	/** If true, overwrite files that already exist. */
	overwriteExisting?: boolean;
	/** Optional project ID to embed in the default manifest. */
	projectId?: string;
	/** Optional custom clock function (useful in tests). */
	now?: () => string;
}

/**
 * Result returned after bootstrapping a memory store.
 */
export interface BootstrapMemoryStoreResult {
	/** Files that were created (did not exist before). */
	created: string[];
	/** Files that were overwritten (already existed, overwriteExisting was true). */
	overwritten: string[];
	/** Files that were skipped (already existed, overwriteExisting was false). */
	skipped: string[];
}

const BOOTSTRAP_FILE_ORDER: Array<{
	path: CanonicalTekMemoFile;
	key: keyof MemoryTemplates;
}> = [
	{ path: MANIFEST_PATH, key: "manifest" },
	{ path: CORE_MEMORY_PATH, key: "core" },
	{ path: NOTES_MEMORY_PATH, key: "notes" },
	{ path: MEMORY_EVENTS_PATH, key: "memoryEvents" },
	{ path: CONVERSATIONS_MEMORY_PATH, key: "conversations" },
	{ path: CHUNKS_INDEX_PATH, key: "chunks" },
	{ path: GRAPH_NODES_PATH, key: "graphNodes" },
	{ path: GRAPH_EDGES_PATH, key: "graphEdges" },
	{ path: SNAPSHOTS_INDEX_PATH, key: "snapshots" },
];

/**
 * Bootstrap a memory store by creating all canonical .tekmemo/ files.
 *
 * @param store - The memory store to bootstrap.
 * @param options - Bootstrap options.
 * @returns A result object describing which files were created, overwritten, or skipped.
 */
/**
 * Bootstrap a memory store by creating all canonical .tekmemo/ files.
 *
 * @param store - The memory store to bootstrap.
 * @param options - Bootstrap options.
 * @returns A result object describing which files were created, overwritten, or skipped.
 */
export async function bootstrapMemoryStore(
	store: MemoryStore,
	options: BootstrapMemoryStoreOptions = {},
): Promise<BootstrapMemoryStoreResult> {
	const defaultTemplateOptions: { projectId?: string; now?: () => string } = {};
	if (options.projectId !== undefined)
		defaultTemplateOptions.projectId = options.projectId;
	if (options.now !== undefined) defaultTemplateOptions.now = options.now;

	const templates = {
		...createDefaultMemoryTemplates(defaultTemplateOptions),
		...options.templates,
	};

	for (const [key, value] of Object.entries(templates)) {
		assertString(value, `templates.${key}`);
	}

	const result: BootstrapMemoryStoreResult = {
		created: [],
		overwritten: [],
		skipped: [],
	};

	for (const file of BOOTSTRAP_FILE_ORDER) {
		await ensureFile(store, file.path, templates[file.key], options, result);
	}

	return result;
}

/**
 * Ensures a canonical file exists, creating or overwriting as needed.
 *
 * @param store - The memory store to write to.
 * @param path - The canonical file path.
 * @param content - The content to write.
 * @param options - Bootstrap options (for overwriteExisting flag).
 * @param result - Result object to track created/overwritten/skipped.
 */
async function ensureFile(
	store: MemoryStore,
	path: CanonicalTekMemoFile,
	content: string,
	options: BootstrapMemoryStoreOptions,
	result: BootstrapMemoryStoreResult,
): Promise<void> {
	const exists = await store.exists(path);

	if (exists && options.overwriteExisting) {
		await store.write(path, content);
		result.overwritten.push(path);
		return;
	}

	if (exists) {
		result.skipped.push(path);
		return;
	}

	await store.write(path, content);
	result.created.push(path);
}
