/**
 * CLI protocol constants defining standard files, directory paths, and structures.
 *
 * @module constants
 */

import {
	CANONICAL_MEMOFS_FILES,
	CHUNKS_INDEX_PATH,
	CONVERSATIONS_MEMORY_PATH,
	CORE_MEMORY_PATH,
	GRAPH_EDGES_PATH,
	GRAPH_NODES_PATH,
	MANIFEST_PATH,
	MEMOFS_DIR,
	MEMORY_EVENTS_PATH,
	NOTES_MEMORY_PATH,
	SNAPSHOTS_INDEX_PATH,
} from "@memofs/core";

export { MEMOFS_DIR };

/**
 * Flat CLI path map kept for command ergonomics.
 * The values intentionally come from `@memofs/core`, so the CLI cannot drift from
 * the canonical protocol owned by the core package.
 */
export const MEMOFS_CLI_PATHS = {
	manifest: MANIFEST_PATH,
	coreMemory: CORE_MEMORY_PATH,
	notesMemory: NOTES_MEMORY_PATH,
	memoryEvents: MEMORY_EVENTS_PATH,
	conversations: CONVERSATIONS_MEMORY_PATH,
	chunks: CHUNKS_INDEX_PATH,
	graphNodes: GRAPH_NODES_PATH,
	graphEdges: GRAPH_EDGES_PATH,
	snapshots: SNAPSHOTS_INDEX_PATH,
	snapshotsDir: `${MEMOFS_DIR}/snapshots`,
	tmpDir: `${MEMOFS_DIR}/tmp`,
} as const;

/**
 * Canonical array of required files in a MemoFS workspace.
 */
export const REQUIRED_FILES = CANONICAL_MEMOFS_FILES;

/**
 * Array of paths that must be initialized as directories inside a MemoFS workspace.
 */
export const REQUIRED_DIRS = [
	MEMOFS_DIR,
	`${MEMOFS_DIR}/memory`,
	`${MEMOFS_DIR}/events`,
	`${MEMOFS_DIR}/indexes`,
	`${MEMOFS_DIR}/graph`,
	`${MEMOFS_DIR}/snapshots`,
	`${MEMOFS_DIR}/tmp`,
] as const;
