import type { LocalStrategyContext } from "./types";
import {
	type GraphNodeInput,
	type GraphEdgeInput,
	type GraphNeighborsInput,
	type GraphPathInput,
	type GraphPathResult,
	type ListGraphInput,
	type ConsolidateMemoryInput,
	type ConsolidateMemoryResult,
} from "../types";
import { stableEdgeKey, toGraphNodeInput, toGraphEdgeInput } from "./helpers";
import { paginateArray } from "../helpers";
import {
	consolidateGraph,
	applyConsolidation,
	type GraphNode,
	type GraphEdge,
	type JsonObject,
} from "../../index";

export function edgeId(edge: GraphEdgeInput): string {
	return (
		edge.id ??
		`${edge.from}|${edge.type}|${edge.to}|${edge.directed ?? true}|${edge.dedupeKey ?? ""}`
	);
}

export async function upsertGraphNodes(
	ctx: LocalStrategyContext,
	input: {
		workspaceId?: string;
		projectId?: string;
		nodes: GraphNodeInput[];
	},
	signal?: AbortSignal,
): Promise<{ nodes: GraphNodeInput[] }> {
	if (signal?.aborted) throw new Error("Operation aborted.");
	await ctx.ensureReady();
	for (const node of input.nodes) ctx.graphNodes.set(node.id, node);
	try {
		await ctx.graphStore.upsertNodes(input.nodes as GraphNode[]);
		for (const node of input.nodes) {
			ctx.indexLexical({
				id: `graph:${node.id}`,
				text: `${node.label}${node.summary ? ` ${node.summary}` : ""}`,
			});
		}
	} catch {
		// Fall back to in-memory only.
	}
	return { nodes: input.nodes };
}

export async function upsertGraphEdges(
	ctx: LocalStrategyContext,
	input: {
		workspaceId?: string;
		projectId?: string;
		edges: GraphEdgeInput[];
	},
	signal?: AbortSignal,
): Promise<{ edges: GraphEdgeInput[] }> {
	if (signal?.aborted) throw new Error("Operation aborted.");
	await ctx.ensureReady();
	for (const edge of input.edges) {
		const key = edgeId(edge);
		ctx.graphEdges.set(key, { directed: true, weight: 1, ...edge });
	}
	try {
		await ctx.graphStore.upsertEdges(input.edges as GraphEdge[]);
	} catch {
		// Fall back to in-memory only.
	}
	return { edges: input.edges };
}

export async function graphNeighbors(
	ctx: LocalStrategyContext,
	input: GraphNeighborsInput,
	signal?: AbortSignal,
): Promise<{
	items: Array<{
		node: GraphNodeInput;
		edge: GraphEdgeInput;
		direction: "in" | "out";
	}>;
	nextCursor?: string;
}> {
	if (signal?.aborted) throw new Error("Operation aborted.");
	const direction = input.direction ?? "both";
	const results: Array<{
		node: GraphNodeInput;
		edge: GraphEdgeInput;
		direction: "in" | "out";
	}> = [];
	for (const edge of ctx.graphEdges.values()) {
		if (input.edgeTypes && !input.edgeTypes.includes(edge.type)) continue;
		if (input.minWeight !== undefined && (edge.weight ?? 1) < input.minWeight)
			continue;
		if (
			(direction === "out" || direction === "both") &&
			edge.from === input.nodeId
		) {
			const node = ctx.graphNodes.get(edge.to);
			if (node) results.push({ node, edge, direction: "out" });
		}
		if (
			(direction === "in" || direction === "both") &&
			edge.to === input.nodeId
		) {
			const node = ctx.graphNodes.get(edge.from);
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

export async function graphPath(
	ctx: LocalStrategyContext,
	input: GraphPathInput,
	signal?: AbortSignal,
): Promise<GraphPathResult> {
	if (signal?.aborted) throw new Error("Operation aborted.");
	const start = ctx.graphNodes.get(input.from);
	if (!start) return { found: false, nodes: [], edges: [] };
	const maxDepth = input.maxDepth ?? 10;
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
		for (const edge of ctx.graphEdges.values()) {
			if (edge.from !== current.id) continue;
			if (input.edgeTypes && !input.edgeTypes.includes(edge.type)) continue;
			if (input.minWeight !== undefined && (edge.weight ?? 1) < input.minWeight)
				continue;
			if (seen.has(edge.to)) continue;
			const next = ctx.graphNodes.get(edge.to);
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

export async function listGraphNodes(
	ctx: LocalStrategyContext,
	input: ListGraphInput,
	signal?: AbortSignal,
): Promise<{ items: GraphNodeInput[]; nextCursor?: string }> {
	if (signal?.aborted) throw new Error("Operation aborted.");
	return paginateArray(
		[...ctx.graphNodes.values()],
		{
			cursor: input.cursor,
			limit: input.limit,
			defaultLimit: 25,
			maxLimit: 100,
		},
		"graph:nodes",
	);
}

export async function listGraphEdges(
	ctx: LocalStrategyContext,
	input: ListGraphInput,
	signal?: AbortSignal,
): Promise<{ items: GraphEdgeInput[]; nextCursor?: string }> {
	if (signal?.aborted) throw new Error("Operation aborted.");
	return paginateArray(
		[...ctx.graphEdges.values()],
		{
			cursor: input.cursor,
			limit: input.limit,
			defaultLimit: 25,
			maxLimit: 100,
		},
		"graph:edges",
	);
}

export async function consolidateMemory(
	ctx: LocalStrategyContext,
	input: ConsolidateMemoryInput,
	signal?: AbortSignal,
): Promise<ConsolidateMemoryResult> {
	if (signal?.aborted) throw new Error("Operation aborted.");
	await ctx.ensureReady();
	const apply = input.apply ?? true;
	const nodes = await ctx.graphStore.queryNodes({ includeInactive: true });
	const edges = await ctx.graphStore.queryEdges({ includeInactive: true });
	const plan = consolidateGraph({
		nodes,
		edges,
		...(input.now === undefined ? {} : { now: input.now }),
		...(input.supersedingEdgeType === undefined
			? {}
			: { supersedingEdgeType: input.supersedingEdgeType }),
	});
	if (!apply || !plan.changed) {
		return {
			plan: {
				merges: plan.merges.length,
				retiredEdges: plan.retiredEdges.length,
				retiredNodes: plan.retiredNodes.length,
				changed: plan.changed,
				now: plan.now,
			},
			mergesApplied: 0,
			retirementsApplied: 0,
			applied: false,
		};
	}
	const applied = await applyConsolidation(ctx.graphStore, plan);
	const retiredNodeIds = new Set(plan.retiredNodes.map((r) => r.id));
	for (const id of retiredNodeIds) {
		const existing = ctx.graphNodes.get(id);
		if (!existing) continue;
		ctx.graphNodes.set(id, { ...existing, status: "deprecated" });
	}
	for (const r of plan.retiredEdges) {
		for (const edge of ctx.graphEdges.values()) {
			if (edge.id !== r.id) continue;
			ctx.graphEdges.set(
				edge.id ?? stableEdgeKey(edge.from, edge.type, edge.to),
				{
					...edge,
					status: "deprecated",
				},
			);
		}
	}
	for (const merge of plan.merges) {
		ctx.graphNodes.delete(merge.sourceId);
	}
	ctx.pruneLexical([
		...plan.retiredNodes.map((r) => `graph:${r.id}`),
		...plan.merges.map((m) => `graph:${m.sourceId}`),
	]);
	return {
		plan: {
			merges: plan.merges.length,
			retiredEdges: plan.retiredEdges.length,
			retiredNodes: plan.retiredNodes.length,
			changed: plan.changed,
			now: plan.now,
		},
		mergesApplied: applied.mergesApplied,
		retirementsApplied: applied.retirementsApplied,
		applied: true,
	};
}
