import { GraphNotFoundError } from "../errors/graph-errors";
import type {
	GraphPath,
	GraphShortestPathQuery,
	GraphPathStep,
	StoredGraphNode,
	StoredGraphEdge,
} from "../types";
import { cloneJson } from "../utils/clone";
import { validateDepth } from "../utils/validation";

interface PathQueueItem {
	nodeId: string;
	steps: GraphPathStep[];
	totalWeight: number;
	totalCost: number;
	depth: number;
}

export interface PathfindingStore {
	getNode(id: string): Promise<StoredGraphNode | undefined>;
	neighbors(query: any): Promise<any[]>;
}

function edgeCost(edge: StoredGraphEdge): number {
	return 1 - edge.weight;
}

export async function fewestHopsPath(
	store: PathfindingStore,
	query: GraphShortestPathQuery,
): Promise<GraphPath | undefined> {
	const from = await store.getNode(query.from);
	if (!from)
		throw new GraphNotFoundError(`Start node "${query.from}" does not exist.`);
	const to = await store.getNode(query.to);
	if (!to)
		throw new GraphNotFoundError(`Target node "${query.to}" does not exist.`);

	const maxDepth = validateDepth(query.maxDepth, 8, 32);
	const direction = query.direction ?? "out";
	const queue: PathQueueItem[] = [
		{
			nodeId: from.id,
			steps: [{ node: cloneJson(from) }],
			totalWeight: 0,
			totalCost: 0,
			depth: 0,
		},
	];
	const visited = new Set<string>([from.id]);

	while (queue.length > 0) {
		const current = queue.shift()!;
		if (current.nodeId === to.id) {
			return {
				steps: current.steps,
				totalWeight: current.totalWeight,
				totalCost: current.totalCost,
			};
		}
		if (current.depth >= maxDepth) continue;

		const nextNeighbors = await store.neighbors({
			nodeId: current.nodeId,
			direction,
			edgeTypes: query.edgeTypes,
			statuses: query.statuses,
			minWeight: query.minWeight,
			includeInactive: query.includeInactive,
			includeExpired: query.includeExpired,
			now: query.now,
			limit: 10_000,
		});

		for (const neighbor of nextNeighbors) {
			if (visited.has(neighbor.node.id)) continue;
			visited.add(neighbor.node.id);
			queue.push({
				nodeId: neighbor.node.id,
				steps: [...current.steps, { node: neighbor.node, via: neighbor.edge }],
				totalWeight: current.totalWeight + neighbor.edge.weight,
				totalCost: current.totalCost + edgeCost(neighbor.edge),
				depth: current.depth + 1,
			});
		}
	}

	return undefined;
}

export async function weightedShortestPath(
	store: PathfindingStore,
	query: GraphShortestPathQuery,
): Promise<GraphPath | undefined> {
	const from = await store.getNode(query.from);
	if (!from)
		throw new GraphNotFoundError(`Start node "${query.from}" does not exist.`);
	const to = await store.getNode(query.to);
	if (!to)
		throw new GraphNotFoundError(`Target node "${query.to}" does not exist.`);
	const maxDepth = validateDepth(query.maxDepth, 8, 32);
	const direction = query.direction ?? "out";

	const queue: PathQueueItem[] = [
		{
			nodeId: from.id,
			steps: [{ node: cloneJson(from) }],
			totalWeight: 0,
			totalCost: 0,
			depth: 0,
		},
	];
	const bestCostByNode = new Map<string, number>([[from.id, 0]]);

	while (queue.length > 0) {
		queue.sort(
			(a, b) =>
				a.totalCost - b.totalCost ||
				b.totalWeight - a.totalWeight ||
				a.depth - b.depth,
		);
		const current = queue.shift()!;
		const knownCost = bestCostByNode.get(current.nodeId);
		if (knownCost !== undefined && current.totalCost > knownCost) continue;
		if (current.nodeId === to.id) {
			return {
				steps: current.steps,
				totalWeight: current.totalWeight,
				totalCost: current.totalCost,
			};
		}
		if (current.depth >= maxDepth) continue;

		const nextNeighbors = await store.neighbors({
			nodeId: current.nodeId,
			direction,
			edgeTypes: query.edgeTypes,
			statuses: query.statuses,
			minWeight: query.minWeight,
			includeInactive: query.includeInactive,
			includeExpired: query.includeExpired,
			now: query.now,
			limit: 10_000,
		});

		for (const neighbor of nextNeighbors) {
			const nextCost = current.totalCost + edgeCost(neighbor.edge);
			const previousBest = bestCostByNode.get(neighbor.node.id);
			if (previousBest !== undefined && nextCost >= previousBest) continue;
			bestCostByNode.set(neighbor.node.id, nextCost);
			queue.push({
				nodeId: neighbor.node.id,
				steps: [...current.steps, { node: neighbor.node, via: neighbor.edge }],
				totalWeight: current.totalWeight + neighbor.edge.weight,
				totalCost: nextCost,
				depth: current.depth + 1,
			});
		}
	}

	return undefined;
}
