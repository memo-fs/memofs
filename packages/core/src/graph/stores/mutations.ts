/**
 * Edge-rewiring helpers for graph node merges.
 *
 * @remarks
 * Extracted from `in-memory-graph-store.ts` to keep the store under the 500-LoC
 * cap. Contains the pure logic that re-points edges from a merged-away source
 * node onto the surviving target node.
 *
 * @internal
 */

import type { GraphEdge, StoredGraphEdge } from "../types";
import { nowIso } from "../utils/time";

/**
 * Rewires edges from a merged-away source node onto the surviving target node.
 *
 * @param edges - The current edge map (read-only iteration).
 * @param sourceId - The node being merged away.
 * @param targetId - The surviving node.
 * @param allowSelfEdges - Whether self-edges are permitted after rewiring.
 * @param removeEdge - Callback to remove an edge from the store by id.
 * @returns New edge objects (without ids) to be re-inserted via `upsertEdges`.
 */
export function rewireEdgesForMerge(
	edges: Map<string, StoredGraphEdge>,
	sourceId: string,
	targetId: string,
	allowSelfEdges: boolean,
	removeEdge: (id: string) => void,
): GraphEdge[] {
	const movedEdges: GraphEdge[] = [];
	for (const edge of Array.from(edges.values())) {
		if (edge.from !== sourceId && edge.to !== sourceId) continue;
		removeEdge(edge.id);
		movedEdges.push({
			...edge,
			id: undefined,
			from: edge.from === sourceId ? targetId : edge.from,
			to: edge.to === sourceId ? targetId : edge.to,
			dedupeKey: edge.dedupeKey ?? edge.id,
			updatedAt: nowIso(),
		});
	}
	return movedEdges.filter(
		(next) => next.from !== next.to || allowSelfEdges,
	);
}
