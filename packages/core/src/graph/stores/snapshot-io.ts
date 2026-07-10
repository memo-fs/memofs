/**
 * Snapshot export/import for the in-memory graph store.
 *
 * @remarks
 * Extracted from `in-memory-graph-store.ts` to keep the store under the 500-LoC
 * cap. Contains the pure serialization (export) and validation+loading (import)
 * logic for graph snapshots used by JSONL persistence and cloud sync.
 *
 * @internal
 */

import {
	GraphNotFoundError,
	GraphValidationError,
} from "../errors/graph-errors";
import type {
	GraphEdge,
	GraphEdgeIdentityMode,
	GraphSnapshot,
	StoredGraphEdge,
	StoredGraphNode,
} from "../types";
import { cloneJson } from "../utils/clone";
import { nowIso } from "../utils/time";
import { normalizeEdge, normalizeNode } from "../utils/validation";

/**
 * Exports the current graph state as a serializable snapshot.
 *
 * @param nodes - The node map to export.
 * @param edges - The edge map to export.
 * @returns A {@link GraphSnapshot} with deep-cloned nodes and edges.
 */
export function exportSnapshot(
	nodes: Map<string, StoredGraphNode>,
	edges: Map<string, StoredGraphEdge>,
): GraphSnapshot {
	return {
		version: 1,
		exportedAt: nowIso(),
		nodes: Array.from(nodes.values()).map(cloneJson),
		edges: Array.from(edges.values()).map(cloneJson),
	};
}

/**
 * Imports a graph snapshot into a store, validating and normalizing every node
 * and edge.
 *
 * @param snapshot - The snapshot to import (must have `version === 1`).
 * @param store - The store receiver: maps to populate, identity config, and
 *   `setEdge`/`clear` callbacks.
 * @param options - When `clear` is `true` (default), the store is cleared
 *   before importing.
 * @throws {@link GraphValidationError} When the snapshot shape is invalid or a
 *   node/edge fails normalization.
 * @throws {@link GraphNotFoundError} When an edge references a missing node.
 */
export async function importSnapshot(
	snapshot: GraphSnapshot,
	store: {
		nodes: Map<string, StoredGraphNode>;
		edges: Map<string, StoredGraphEdge>;
		allowSelfEdges: boolean;
		edgeIdentityMode: GraphEdgeIdentityMode;
		setEdge: (edge: StoredGraphEdge) => void;
		clear: () => Promise<void>;
	},
	options?: { clear?: boolean },
): Promise<void> {
	if (
		snapshot?.version !== 1 ||
		!Array.isArray(snapshot.nodes) ||
		!Array.isArray(snapshot.edges)
	) {
		throw new GraphValidationError("Invalid graph snapshot.");
	}

	const nodeIds = new Set<string>();
	const normalizedNodes = snapshot.nodes.map((node, index) => {
		try {
			const normalized = normalizeNode(node);
			if (nodeIds.has(normalized.id))
				throw new GraphValidationError(`Duplicate node id "${normalized.id}".`);
			nodeIds.add(normalized.id);
			return normalized;
		} catch (error) {
			const message = error instanceof Error ? error.message : "Invalid node.";
			throw new GraphValidationError(
				`Invalid snapshot node at index ${index}: ${message}`,
				{ cause: error },
			);
		}
	});

	const edgeIds = new Set<string>();
	const normalizedEdges = snapshot.edges.map((edge: GraphEdge, index) => {
		try {
			if (!nodeIds.has(edge.from))
				throw new GraphNotFoundError(
					`Snapshot edge source node "${edge.from}" does not exist.`,
				);
			if (!nodeIds.has(edge.to))
				throw new GraphNotFoundError(
					`Snapshot edge target node "${edge.to}" does not exist.`,
				);
			const normalized = normalizeEdge(edge, {
				allowSelfEdges: store.allowSelfEdges,
				edgeIdentityMode: store.edgeIdentityMode,
			});
			if (edgeIds.has(normalized.id))
				throw new GraphValidationError(`Duplicate edge id "${normalized.id}".`);
			edgeIds.add(normalized.id);
			return normalized;
		} catch (error) {
			const message = error instanceof Error ? error.message : "Invalid edge.";
			throw new GraphValidationError(
				`Invalid snapshot edge at index ${index}: ${message}`,
				{ cause: error },
			);
		}
	});

	if (options?.clear ?? true) await store.clear();
	for (const node of normalizedNodes) store.nodes.set(node.id, cloneJson(node));
	for (const edge of normalizedEdges) store.setEdge(edge);
}
