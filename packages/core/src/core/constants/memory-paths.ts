/**
 * Canonical file paths and path utilities for MemoFS.
 *
 * @remarks
 * All MemoFS files live under the `.memofs/` directory.
 * This module defines the canonical paths, validates paths, and provides
 * utilities for working with memory paths.
 *
 * @public
 */

import { MemoryPathError } from "../errors/errors";

/** The root directory name for all MemoFS files. */
export const MEMOFS_DIR = ".memofs" as const;

/**
 * Backwards-compatible alias for older package internals.
 * New code should prefer MEMOFS_DIR.
 */
export const MEMORY_ROOT = MEMOFS_DIR;

/** Canonical .memofs/ protocol paths. */
export const MEMOFS_PATHS = Object.freeze({
	manifest: `${MEMOFS_DIR}/manifest.json`,
	memory: Object.freeze({
		core: `${MEMOFS_DIR}/memory/core.md`,
		notes: `${MEMOFS_DIR}/memory/notes.md`,
	}),
	events: Object.freeze({
		memoryEvents: `${MEMOFS_DIR}/events/memory-events.jsonl`,
		conversations: `${MEMOFS_DIR}/events/conversations.jsonl`,
	}),
	indexes: Object.freeze({
		chunks: `${MEMOFS_DIR}/indexes/chunks.jsonl`,
		embeddings: `${MEMOFS_DIR}/indexes/embeddings.jsonl`,
	}),
	graph: Object.freeze({
		nodes: `${MEMOFS_DIR}/graph/nodes.jsonl`,
		edges: `${MEMOFS_DIR}/graph/edges.jsonl`,
	}),
	snapshots: Object.freeze({
		index: `${MEMOFS_DIR}/snapshots/snapshots.jsonl`,
	}),
	/** Connector config — the 11th canonical file. No secrets. */
	connectors: `${MEMOFS_DIR}/connectors.json`,
	tmpDir: `${MEMOFS_DIR}/tmp`,
} as const);

/** Path to the manifest file. */
export const MANIFEST_PATH = MEMOFS_PATHS.manifest;
/** Path to the core memory file. */
export const CORE_MEMORY_PATH = MEMOFS_PATHS.memory.core;
/** Path to the notes memory file. */
export const NOTES_MEMORY_PATH = MEMOFS_PATHS.memory.notes;
/** Path to the memory events JSONL file. */
export const MEMORY_EVENTS_PATH = MEMOFS_PATHS.events.memoryEvents;
/** Path to the conversations JSONL file. */
export const CONVERSATIONS_MEMORY_PATH = MEMOFS_PATHS.events.conversations;
/** Path to the chunks index JSONL file. */
export const CHUNKS_INDEX_PATH = MEMOFS_PATHS.indexes.chunks;
/** Path to the persisted embeddings index JSONL file. */
export const EMBEDDINGS_INDEX_PATH = MEMOFS_PATHS.indexes.embeddings;
/** Path to the graph nodes JSONL file. */
export const GRAPH_NODES_PATH = MEMOFS_PATHS.graph.nodes;
/** Path to the graph edges JSONL file. */
export const GRAPH_EDGES_PATH = MEMOFS_PATHS.graph.edges;
/** Path to the snapshots index JSONL file. */
export const SNAPSHOTS_INDEX_PATH = MEMOFS_PATHS.snapshots.index;
/** Path to the connector-config JSON file (no secrets; `secretRef` only). */
export const CONNECTORS_PATH = MEMOFS_PATHS.connectors;

export const CANONICAL_MEMOFS_FILES = [
	MANIFEST_PATH,
	CORE_MEMORY_PATH,
	NOTES_MEMORY_PATH,
	MEMORY_EVENTS_PATH,
	CONVERSATIONS_MEMORY_PATH,
	CHUNKS_INDEX_PATH,
	EMBEDDINGS_INDEX_PATH,
	GRAPH_NODES_PATH,
	GRAPH_EDGES_PATH,
	SNAPSHOTS_INDEX_PATH,
	CONNECTORS_PATH,
] as const;

/**
 * Backwards-compatible alias. New code should prefer CANONICAL_MEMOFS_FILES.
 */
export const MEMORY_PATHS = CANONICAL_MEMOFS_FILES;

export type CanonicalMemoFSFile = (typeof CANONICAL_MEMOFS_FILES)[number];
export type SnapshotFilePath = `${typeof MEMOFS_DIR}/snapshots/${string}.json`;
export type MemoryPath = CanonicalMemoFSFile | SnapshotFilePath;

const CANONICAL_MEMOFS_FILE_SET = new Set<string>(CANONICAL_MEMOFS_FILES);
const SNAPSHOT_FILE_PATTERN = /^\.memofs\/snapshots\/[a-zA-Z0-9_.-]+\.json$/;

/**
 * Checks if a value is a valid memory path.
 *
 * @param path - The value to check.
 * @returns `true` if the path is a valid {@link MemoryPath}, `false` otherwise.
 */
export function isMemoryPath(path: unknown): path is MemoryPath {
	return (
		typeof path === "string" &&
		(CANONICAL_MEMOFS_FILE_SET.has(path) || SNAPSHOT_FILE_PATTERN.test(path))
	);
}

/**
 * Asserts that a value is a valid memory path.
 *
 * @param path - The value to check.
 * @throws {@link MemoryPathError} If the path is invalid.
 */
export function assertMemoryPath(path: unknown): asserts path is MemoryPath {
	if (typeof path !== "string") {
		throw new MemoryPathError("Memory path must be a string.", {
			pathType: typeof path,
		});
	}

	if (path.includes("\0")) {
		throw new MemoryPathError("Memory path must not contain null bytes.", {
			path,
		});
	}

	if (path.startsWith("/") || path.includes("\\")) {
		throw new MemoryPathError("Unsafe memory path rejected.", { path });
	}

	if (path.split("/").some((part) => part === "..")) {
		throw new MemoryPathError(
			"Memory path must not contain parent directory segments.",
			{ path },
		);
	}

	if (!path.startsWith(`${MEMOFS_DIR}/`)) {
		throw new MemoryPathError(
			"Memory path must be inside the canonical .memofs directory.",
			{ path },
		);
	}

	if (!isMemoryPath(path)) {
		throw new MemoryPathError(`Unsupported MemoFS path: ${path}`, {
			path,
			supported: CANONICAL_MEMOFS_FILES,
			dynamic: `${MEMOFS_DIR}/snapshots/<safe-name>.json`,
		});
	}
}

/**
 * Creates a snapshot path from a snapshot ID.
 *
 * @param snapshotId - The snapshot ID to create a path for.
 * @returns A valid {@link SnapshotFilePath}.
 * @throws {@link MemoryPathError} If the snapshot ID is invalid.
 */
export function createSnapshotPath(snapshotId: string): SnapshotFilePath {
	if (typeof snapshotId !== "string" || snapshotId.trim().length === 0) {
		throw new MemoryPathError("snapshotId must be a non-empty string.", {
			snapshotId,
		});
	}

	const normalized = snapshotId.trim();
	if (!/^[a-zA-Z0-9_.-]+$/.test(normalized)) {
		throw new MemoryPathError("snapshotId contains unsupported characters.", {
			snapshotId,
		});
	}

	const path = `${MEMOFS_DIR}/snapshots/${normalized}.json` as SnapshotFilePath;
	assertMemoryPath(path);
	return path;
}

export type PathKind =
	| "manifest"
	| "core"
	| "notes"
	| "memory-event"
	| "conversation"
	| "chunk"
	| "embedding"
	| "graph-node"
	| "graph-edge"
	| "snapshot-index"
	| "connector"
	| "snapshot";

/**
 * Determines the kind of memory path (manifest, core, notes, etc.).
 *
 * @param path - The memory path to check.
 * @returns The {@link PathKind} for the given path.
 */
export function memoryTypeFromPath(path: MemoryPath): PathKind {
	assertMemoryPath(path);

	switch (path) {
		case MANIFEST_PATH:
			return "manifest";
		case CORE_MEMORY_PATH:
			return "core";
		case NOTES_MEMORY_PATH:
			return "notes";
		case MEMORY_EVENTS_PATH:
			return "memory-event";
		case CONVERSATIONS_MEMORY_PATH:
			return "conversation";
		case CHUNKS_INDEX_PATH:
			return "chunk";
		case EMBEDDINGS_INDEX_PATH:
			return "embedding";
		case GRAPH_NODES_PATH:
			return "graph-node";
		case GRAPH_EDGES_PATH:
			return "graph-edge";
		case SNAPSHOTS_INDEX_PATH:
			return "snapshot-index";
		case CONNECTORS_PATH:
			return "connector";
		default:
			return "snapshot";
	}
}
