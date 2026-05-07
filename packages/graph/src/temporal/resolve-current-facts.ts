import type {
	GraphEdge,
	GraphNode,
	StoredGraphEdge,
	StoredGraphNode,
} from "../types.js";
import { isExpired, isInactive } from "../utils/time.js";

export function resolveCurrentNodes<T extends GraphNode | StoredGraphNode>(
	nodes: T[],
	now = new Date().toISOString(),
): T[] {
	return nodes.filter((node) => !isInactive(node) && !isExpired(node, now));
}

export function resolveCurrentEdges<T extends GraphEdge | StoredGraphEdge>(
	edges: T[],
	now = new Date().toISOString(),
): T[] {
	return edges.filter((edge) => !isInactive(edge) && !isExpired(edge, now));
}
