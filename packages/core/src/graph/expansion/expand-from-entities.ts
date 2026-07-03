import type {
	GraphExpansionInput,
	GraphExpansionResult,
	StoredGraphEdge,
	StoredGraphNode,
} from "../types";
import { validateDepth, validateLimit } from "../utils/validation";

export async function expandFromEntities(
	input: GraphExpansionInput,
): Promise<GraphExpansionResult> {
	const depth = validateDepth(input.depth, 1, 6);
	const limit = validateLimit(input.limit, 100, 5000);
	const seenNodes = new Map<string, StoredGraphNode>();
	const seenEdges = new Map<string, StoredGraphEdge>();
	let frontier = Array.from(new Set(input.seedNodeIds));
	const expanded = new Set<string>();
	let depthReached = 0;

	for (const seedNodeId of frontier) {
		const node = await input.store.getNode(seedNodeId);
		if (node) seenNodes.set(node.id, node);
	}

	for (
		let currentDepth = 0;
		currentDepth < depth && frontier.length > 0;
		currentDepth += 1
	) {
		const nextFrontier: string[] = [];

		for (const nodeId of frontier) {
			if (expanded.has(nodeId)) continue;
			expanded.add(nodeId);

			const neighbors = await input.store.neighbors({
				nodeId,
				direction: input.direction ?? "both",
				edgeTypes: input.edgeTypes,
				minWeight: input.minWeight,
				includeInactive: input.includeInactive,
				includeExpired: input.includeExpired,
				limit,
			});

			for (const neighbor of neighbors) {
				seenNodes.set(neighbor.node.id, neighbor.node);
				seenEdges.set(neighbor.edge.id, neighbor.edge);

				if (
					!expanded.has(neighbor.node.id) &&
					!frontier.includes(neighbor.node.id) &&
					!nextFrontier.includes(neighbor.node.id)
				) {
					nextFrontier.push(neighbor.node.id);
				}

				if (seenNodes.size + seenEdges.size >= limit) {
					return {
						nodes: Array.from(seenNodes.values()),
						edges: Array.from(seenEdges.values()),
						depthReached: currentDepth + 1,
					};
				}
			}
		}

		frontier = nextFrontier.filter((nodeId) => seenNodes.has(nodeId));
		depthReached = currentDepth + 1;
	}

	return {
		nodes: Array.from(seenNodes.values()),
		edges: Array.from(seenEdges.values()),
		depthReached,
	};
}
