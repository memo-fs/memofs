/**
 * Pure query helpers for the in-memory graph store.
 *
 * @remarks
 * Extracted from `in-memory-graph-store.ts` to keep the store under the 500-LoC
 * cap. Contains stateless search, status-set, neighbor-candidate, and
 * index-maintenance utilities used by the store's query and mutation paths.
 *
 * @internal
 */

import type {
	GraphDirection,
	GraphFactStatus,
	StoredGraphEdge,
	StoredGraphNode,
} from "../types";

/**
 * Tests whether a node's text fields contain a case-insensitive search string.
 *
 * @param node - The node to test.
 * @param search - The lowercased search string.
 * @returns `true` when any text field contains the search string.
 */
export function nodeMatchesSearch(
	node: StoredGraphNode,
	search: string,
): boolean {
	return [node.id, node.type, node.label, node.summary, ...(node.aliases ?? [])]
		.filter(Boolean)
		.some((value) => String(value).toLowerCase().includes(search));
}

/**
 * Converts a status array to a set for O(1) membership tests.
 *
 * @param statuses - Optional status array; `undefined` means "all statuses".
 * @returns A set of statuses, or `undefined` when no filtering is needed.
 */
export function toStatusSet(
	statuses: GraphFactStatus[] | undefined,
): Set<GraphFactStatus> | undefined {
	return statuses ? new Set(statuses) : undefined;
}

/**
 * Computes the neighbor node candidates for a given edge and traversal direction.
 *
 * @param edge - The edge to traverse.
 * @param nodeId - The node from which to traverse.
 * @param direction - The traversal direction (`in`, `out`, or `both`).
 * @returns Array of `{ nodeId, direction }` pairs for reachable neighbors.
 */
export function neighborCandidates(
	edge: StoredGraphEdge,
	nodeId: string,
	direction: GraphDirection,
): Array<{ nodeId: string; direction: "in" | "out" }> {
	const out: Array<{ nodeId: string; direction: "in" | "out" }> = [];

	if ((direction === "out" || direction === "both") && edge.from === nodeId) {
		out.push({ nodeId: edge.to, direction: "out" });
	}
	if ((direction === "in" || direction === "both") && edge.to === nodeId) {
		out.push({ nodeId: edge.from, direction: "in" });
	}
	if (!edge.directed) {
		if ((direction === "out" || direction === "both") && edge.to === nodeId) {
			out.push({ nodeId: edge.from, direction: "out" });
		}
		if ((direction === "in" || direction === "both") && edge.from === nodeId) {
			out.push({ nodeId: edge.to, direction: "in" });
		}
	}

	return out;
}

/**
 * Adds a value to a multi-map index (key → set of values).
 *
 * @param index - The index map to mutate.
 * @param key - The index key.
 * @param value - The value to add under the key.
 */
export function addToIndex(
	index: Map<string, Set<string>>,
	key: string,
	value: string,
): void {
	let set = index.get(key);
	if (!set) {
		set = new Set<string>();
		index.set(key, set);
	}
	set.add(value);
}

/**
 * Removes a value from a multi-map index, cleaning up empty sets.
 *
 * @param index - The index map to mutate.
 * @param key - The index key.
 * @param value - The value to remove from the key's set.
 */
export function removeFromIndex(
	index: Map<string, Set<string>>,
	key: string,
	value: string,
): void {
	const set = index.get(key);
	if (!set) return;
	set.delete(value);
	if (set.size === 0) index.delete(key);
}
