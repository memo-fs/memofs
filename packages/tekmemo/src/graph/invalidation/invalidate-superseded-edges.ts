import type { GraphEdge, StoredGraphEdge } from "../types";
import { nowIso } from "../utils/time";

export interface InvalidateSupersededEdgesInput {
	edges: StoredGraphEdge[];
	supersedingEdgeType?: string;
	now?: string;
}

export function invalidateSupersededEdges(
	input: InvalidateSupersededEdgesInput,
): StoredGraphEdge[] {
	const supersedingType = input.supersedingEdgeType ?? "supersedes";
	const now = input.now ?? nowIso();
	const supersededIds = new Set<string>();

	for (const edge of input.edges) {
		if (edge.type === supersedingType) {
			supersededIds.add(edge.to);
		}
	}

	return input.edges.map((edge) => {
		if (!supersededIds.has(edge.id)) {
			return edge;
		}
		return {
			...edge,
			status: "deprecated",
			validUntil: edge.validUntil ?? now,
			updatedAt: now,
		} satisfies StoredGraphEdge;
	});
}

export function markConflictingEdges(
	edges: StoredGraphEdge[],
	conflictKey: (edge: GraphEdge) => string,
): StoredGraphEdge[] {
	const groups = new Map<string, StoredGraphEdge[]>();

	for (const edge of edges) {
		const key = conflictKey(edge);
		groups.set(key, [...(groups.get(key) ?? []), edge]);
	}

	const conflictingIds = new Set<string>();
	for (const group of groups.values()) {
		const active = group.filter((edge) => edge.status === "active");
		if (active.length > 1) {
			for (const edge of active) {
				conflictingIds.add(edge.id);
			}
		}
	}

	return edges.map((edge) =>
		conflictingIds.has(edge.id)
			? { ...edge, status: "conflicted", updatedAt: nowIso() }
			: edge,
	);
}
