import type {
	GraphNodeInput,
	GraphEdgeInput,
	GraphNeighborsInput,
	GraphPathInput,
	GraphPathResult,
} from "../types";
import { paginateArray } from "../helpers";

export function edgeId(edge: GraphEdgeInput): string {
	return (
		edge.id ??
		`${edge.from}|${edge.type}|${edge.to}|${edge.directed ?? true}|${edge.dedupeKey ?? ""}`
	);
}

export function memoryGraphNeighbors(
	nodes: Map<string, GraphNodeInput>,
	edges: Map<string, GraphEdgeInput>,
	input: GraphNeighborsInput,
): {
	items: Array<{
		node: GraphNodeInput;
		edge: GraphEdgeInput;
		direction: "in" | "out";
	}>;
	nextCursor?: string;
} {
	const direction = input.direction ?? "both";
	const results: Array<{
		node: GraphNodeInput;
		edge: GraphEdgeInput;
		direction: "in" | "out";
	}> = [];
	for (const edge of edges.values()) {
		if (input.edgeTypes && !input.edgeTypes.includes(edge.type)) continue;
		if (input.minWeight !== undefined && (edge.weight ?? 1) < input.minWeight)
			continue;
		if (
			(direction === "out" || direction === "both") &&
			edge.from === input.nodeId
		) {
			const node = nodes.get(edge.to);
			if (node) results.push({ node, edge, direction: "out" });
		}
		if (
			(direction === "in" || direction === "both") &&
			edge.to === input.nodeId
		) {
			const node = nodes.get(edge.from);
			if (node) results.push({ node, edge, direction: "in" });
		}
	}
	return paginateArray(
		results,
		{
			cursor: input.cursor,
			limit: input.limit,
			defaultLimit: 25,
			maxLimit: 100,
		},
		`neighbors:${input.nodeId}`,
	);
}

export function memoryGraphPath(
	nodes: Map<string, GraphNodeInput>,
	edges: Map<string, GraphEdgeInput>,
	input: GraphPathInput,
): GraphPathResult {
	const maxDepth = input.maxDepth ?? 10;
	const start = nodes.get(input.from);
	if (!start) return { found: false, nodes: [], edges: [] };
	const queue: Array<{
		id: string;
		nodePath: GraphNodeInput[];
		edgePath: GraphEdgeInput[];
	}> = [{ id: input.from, nodePath: [start], edgePath: [] }];
	const seen = new Set<string>([input.from]);
	while (queue.length > 0) {
		const current = queue.shift();
		if (!current) break;
		if (current.id === input.to) {
			const totalWeight = current.edgePath.reduce(
				(sum, edge) => sum + (edge.weight ?? 1),
				0,
			);
			return {
				found: true,
				nodes: current.nodePath,
				edges: current.edgePath,
				totalWeight,
			};
		}
		if (current.edgePath.length >= maxDepth) continue;
		for (const edge of edges.values()) {
			if (edge.from !== current.id) continue;
			if (input.edgeTypes && !input.edgeTypes.includes(edge.type)) continue;
			if (input.minWeight !== undefined && (edge.weight ?? 1) < input.minWeight)
				continue;
			if (seen.has(edge.to)) continue;
			const next = nodes.get(edge.to);
			if (!next) continue;
			seen.add(edge.to);
			queue.push({
				id: edge.to,
				nodePath: [...current.nodePath, next],
				edgePath: [...current.edgePath, edge],
			});
		}
	}
	return { found: false, nodes: [], edges: [] };
}
