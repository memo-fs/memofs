/**
 * Canonical file paths and path utilities for TekMemo.
 *
 * @remarks
 * All TekMemo files live under the `.tekmemo/` directory.
 * This module defines the canonical paths, validates paths, and provides
 * utilities for working with memory paths.
 *
 * @public
 */

import { MemoryPathError } from "../errors/errors";

/** The root directory name for all TekMemo files. */
export const TEKMEMO_DIR = ".tekmemo" as const;

/**
 * Backwards-compatible alias for older package internals.
 * New code should prefer TEKMEMO_DIR.
 */
export const MEMORY_ROOT = TEKMEMO_DIR;

/** Canonical .tekmemo/ protocol paths. */
export const TEKMEMO_PATHS = Object.freeze({
	manifest: `${TEKMEMO_DIR}/manifest.json`,
	memory: Object.freeze({
		core: `${TEKMEMO_DIR}/memory/core.md`,
		notes: `${TEKMEMO_DIR}/memory/notes.md`,
	}),
	events: Object.freeze({
		memoryEvents: `${TEKMEMO_DIR}/events/memory-events.jsonl`,
		conversations: `${TEKMEMO_DIR}/events/conversations.jsonl`,
	}),
	indexes: Object.freeze({
		chunks: `${TEKMEMO_DIR}/indexes/chunks.jsonl`,
		embeddings: `${TEKMEMO_DIR}/indexes/embeddings.jsonl`,
	}),
	graph: Object.freeze({
		nodes: `${TEKMEMO_DIR}/graph/nodes.jsonl`,
		edges: `${TEKMEMO_DIR}/graph/edges.jsonl`,
	}),
	snapshots: Object.freeze({
		index: `${TEKMEMO_DIR}/snapshots/snapshots.jsonl`,
	}),
	/** Connector config — the 11th canonical file ( / decision Q2). No secrets. */
	connectors: `${TEKMEMO_DIR}/connectors.json`,
	tmpDir: `${TEKMEMO_DIR}/tmp`,
} as const);

/** Path to the manifest file. */
export const MANIFEST_PATH = TEKMEMO_PATHS.manifest;
/** Path to the core memory file. */
export const CORE_MEMORY_PATH = TEKMEMO_PATHS.memory.core;
/** Path to the notes memory file. */
export const NOTES_MEMORY_PATH = TEKMEMO_PATHS.memory.notes;
/** Path to the memory events JSONL file. */
export const MEMORY_EVENTS_PATH = TEKMEMO_PATHS.events.memoryEvents;
/** Path to the conversations JSONL file. */
export const CONVERSATIONS_MEMORY_PATH = TEKMEMO_PATHS.events.conversations;
/** Path to the chunks index JSONL file. */
export const CHUNKS_INDEX_PATH = TEKMEMO_PATHS.indexes.chunks;
/** Path to the persisted embeddings index JSONL file. */
export const EMBEDDINGS_INDEX_PATH = TEKMEMO_PATHS.indexes.embeddings;
/** Path to the graph nodes JSONL file. */
export const GRAPH_NODES_PATH = TEKMEMO_PATHS.graph.nodes;
/** Path to the graph edges JSONL file. */
export const GRAPH_EDGES_PATH = TEKMEMO_PATHS.graph.edges;
/** Path to the snapshots index JSONL file. */
export const SNAPSHOTS_INDEX_PATH = TEKMEMO_PATHS.snapshots.index;
/** Path to the connector-config JSON file (no secrets; `secretRef` only). */
export const CONNECTORS_PATH = TEKMEMO_PATHS.connectors;

export const CANONICAL_TEKMEMO_FILES = [
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
 * Backwards-compatible alias. New code should prefer CANONICAL_TEKMEMO_FILES.
 */
export const MEMORY_PATHS = CANONICAL_TEKMEMO_FILES;

export type CanonicalTekMemoFile = (typeof CANONICAL_TEKMEMO_FILES)[number];
export type SnapshotFilePath = `${typeof TEKMEMO_DIR}/snapshots/${string}.json`;
export type MemoryPath = CanonicalTekMemoFile | SnapshotFilePath;

const CANONICAL_TEKMEMO_FILE_SET = new Set<string>(CANONICAL_TEKMEMO_FILES);
const SNAPSHOT_FILE_PATTERN = /^\.tekmemo\/snapshots\/[a-zA-Z0-9_.-]+\.json$/;

/**
 * Checks if a value is a valid memory path.
 *
 * @param path - The value to check.
 * @returns `true` if the path is a valid {@link MemoryPath}, `false` otherwise.
 */
export function isMemoryPath(path: unknown): path is MemoryPath {
	return (
		typeof path === "string" &&
		(CANONICAL_TEKMEMO_FILE_SET.has(path) || SNAPSHOT_FILE_PATTERN.test(path))
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

	if (!path.startsWith(`${TEKMEMO_DIR}/`)) {
		throw new MemoryPathError(
			"Memory path must be inside the canonical .tekmemo directory.",
			{ path },
		);
	}

	if (!isMemoryPath(path)) {
		throw new MemoryPathError(`Unsupported TekMemo path: ${path}`, {
			path,
			supported: CANONICAL_TEKMEMO_FILES,
			dynamic: `${TEKMEMO_DIR}/snapshots/<safe-name>.json`,
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

	const path =
		`${TEKMEMO_DIR}/snapshots/${normalized}.json` as SnapshotFilePath;
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
