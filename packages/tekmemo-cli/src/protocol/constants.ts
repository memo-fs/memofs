import {
	CANONICAL_TEKMEMO_FILES,
	CHUNKS_INDEX_PATH,
	CONVERSATIONS_MEMORY_PATH,
	CORE_MEMORY_PATH,
	GRAPH_EDGES_PATH,
	GRAPH_NODES_PATH,
	MANIFEST_PATH,
	MEMORY_EVENTS_PATH,
	NOTES_MEMORY_PATH,
	SNAPSHOTS_INDEX_PATH,
	TEKMEMO_DIR,
} from "@tekbreed/tekmemo";

export { TEKMEMO_DIR };

/**
 * Flat CLI path map kept for command ergonomics.
 * The values intentionally come from `@tekbreed/tekmemo`, so the CLI cannot drift from
 * the canonical protocol owned by the core package.
 */
export const TEKMEMO_PATHS = {
	manifest: MANIFEST_PATH,
	coreMemory: CORE_MEMORY_PATH,
	notesMemory: NOTES_MEMORY_PATH,
	memoryEvents: MEMORY_EVENTS_PATH,
	conversations: CONVERSATIONS_MEMORY_PATH,
	chunks: CHUNKS_INDEX_PATH,
	graphNodes: GRAPH_NODES_PATH,
	graphEdges: GRAPH_EDGES_PATH,
	snapshots: SNAPSHOTS_INDEX_PATH,
	snapshotsDir: `${TEKMEMO_DIR}/snapshots`,
	tmpDir: `${TEKMEMO_DIR}/tmp`,
} as const;

export const REQUIRED_FILES = CANONICAL_TEKMEMO_FILES;

export const REQUIRED_DIRS = [
	TEKMEMO_DIR,
	`${TEKMEMO_DIR}/memory`,
	`${TEKMEMO_DIR}/events`,
	`${TEKMEMO_DIR}/indexes`,
	`${TEKMEMO_DIR}/graph`,
	`${TEKMEMO_DIR}/snapshots`,
	`${TEKMEMO_DIR}/tmp`,
] as const;
