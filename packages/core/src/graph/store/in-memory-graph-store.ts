import {
	GraphConflictError,
	GraphNotFoundError,
	GraphValidationError,
} from "../errors/graph-errors";
import { matchesMetadataFilter } from "../filters/metadata-filter";
import type {
	GraphDecayInput,
	GraphDirection,
	GraphEdge,
	GraphEdgeIdentityMode,
	GraphEdgeQuery,
	GraphFactStatus,
	GraphMergeNodesInput,
	GraphNeighbor,
	GraphNeighborQuery,
	GraphNode,
	GraphNodeQuery,
	GraphPath,
	GraphShortestPathQuery,
	GraphSnapshot,
	GraphStats,
	GraphStore,
	StoredGraphEdge,
	StoredGraphNode,
} from "../types";
import { cloneJson, uniqueStrings } from "../utils/clone";
import { stableEdgeId } from "../utils/ids";
import { mergeMetadata } from "../utils/metadata";
import { mergeSourceRefs } from "../utils/source-refs";
import { isExpired, isInactive, nowIso } from "../utils/time";
import {
	edgeIdentitySalt,
	normalizeEdge,
	normalizeEdgeIdentityMode,
	normalizeNode,
	validateLimit,
	validateUnitNumber,
} from "../utils/validation";

export interface InMemoryGraphStoreOptions {
	allowSelfEdges?: boolean;
	requireExistingNodes?: boolean;
	edgeIdentityMode?: GraphEdgeIdentityMode;
}

export class InMemoryGraphStore implements GraphStore {
	private readonly nodes = new Map<string, StoredGraphNode>();
	private readonly edges = new Map<string, StoredGraphEdge>();
	private readonly outgoingEdgeIdsByNode = new Map<string, Set<string>>();
	private readonly incomingEdgeIdsByNode = new Map<string, Set<string>>();
	private readonly edgeIdsByType = new Map<string, Set<string>>();
	private readonly allowSelfEdges: boolean;
	private readonly requireExistingNodes: boolean;
	private readonly edgeIdentityMode: GraphEdgeIdentityMode;

	constructor(options?: InMemoryGraphStoreOptions) {
		this.allowSelfEdges = options?.allowSelfEdges ?? false;
		this.requireExistingNodes = options?.requireExistingNodes ?? true;
		this.edgeIdentityMode = normalizeEdgeIdentityMode(
			options?.edgeIdentityMode ?? "canonical",
		);
	}

	async upsertNodes(nodes: GraphNode[]): Promise<StoredGraphNode[]> {
		if (!Array.isArray(nodes))
			throw new GraphValidationError("nodes must be an array.");

		const seen = new Set<string>();
		const normalized = nodes.map((node) => {
			const current = normalizeNode(node, this.nodes.get(node.id));
			if (seen.has(current.id))
				throw new GraphValidationError(
					`Duplicate node id "${current.id}" in one batch.`,
				);
			seen.add(current.id);
			return current;
		});

		for (const node of normalized) this.nodes.set(node.id, cloneJson(node));
		return normalized.map(cloneJson);
	}

	async upsertEdges(edges: GraphEdge[]): Promise<StoredGraphEdge[]> {
		if (!Array.isArray(edges))
			throw new GraphValidationError("edges must be an array.");

		const seen = new Set<string>();
		const normalized = edges.map((edge) => {
			if (this.requireExistingNodes) {
				if (!this.nodes.has(edge.from))
					throw new GraphNotFoundError(
						`Edge source node "${edge.from}" does not exist.`,
					);
				if (!this.nodes.has(edge.to))
					throw new GraphNotFoundError(
						`Edge target node "${edge.to}" does not exist.`,
					);
			}

			const edgeId = this.resolveEdgeId(edge);
			const current = normalizeEdge(
				{ ...edge, id: edge.id ?? edgeId },
				{
					existing: this.edges.get(edgeId),
					allowSelfEdges: this.allowSelfEdges,
					edgeIdentityMode: this.edgeIdentityMode,
				},
			);

			if (seen.has(current.id))
				throw new GraphValidationError(
					`Duplicate edge id "${current.id}" in one batch.`,
				);
			seen.add(current.id);
			return current;
		});

		for (const edge of normalized) this.setEdge(edge);
		return normalized.map(cloneJson);
	}

	async getNode(id: string): Promise<StoredGraphNode | undefined> {
		const node = this.nodes.get(id);
		return node ? cloneJson(node) : undefined;
	}

	async getEdge(id: string): Promise<StoredGraphEdge | undefined> {
		const edge = this.edges.get(id);
		return edge ? cloneJson(edge) : undefined;
	}

	async queryNodes(query?: GraphNodeQuery): Promise<StoredGraphNode[]> {
		const limit = validateLimit(query?.limit, 100, 10_000);
		const ids = query?.ids ? new Set(query.ids) : undefined;
		const types = query?.types
			? new Set(query.types.map((type) => type.toLowerCase()))
			: undefined;
		const statuses = toStatusSet(query?.statuses);
		const search = query?.search?.trim().toLowerCase();
		const now = query?.now;
		const out: StoredGraphNode[] = [];

		for (const node of this.nodes.values()) {
			if (!query?.includeInactive && isInactive(node)) continue;
			if (!query?.includeExpired && isExpired(node, now)) continue;
			if (ids && !ids.has(node.id)) continue;
			if (types && !types.has(node.type)) continue;
			if (statuses && !statuses.has(node.status)) continue;
			if (!matchesMetadataFilter(node.metadata, query?.metadata)) continue;
			if (search && !nodeMatchesSearch(node, search)) continue;

			out.push(cloneJson(node));
			if (out.length >= limit) break;
		}

		return out;
	}

	async queryEdges(query?: GraphEdgeQuery): Promise<StoredGraphEdge[]> {
		const limit = validateLimit(query?.limit, 100, 10_000);
		const ids = query?.ids ? new Set(query.ids) : undefined;
		const types = query?.types
			? new Set(query.types.map((type) => type.toLowerCase()))
			: undefined;
		const statuses = toStatusSet(query?.statuses);
		const now = query?.now;
		const out: StoredGraphEdge[] = [];

		for (const edgeId of this.edgeQueryCandidateIds(query)) {
			const edge = this.edges.get(edgeId);
			if (!edge) continue;
			if (!query?.includeInactive && isInactive(edge)) continue;
			if (!query?.includeExpired && isExpired(edge, now)) continue;
			if (ids && !ids.has(edge.id)) continue;
			if (query?.from && edge.from !== query.from) continue;
			if (query?.to && edge.to !== query.to) continue;
			if (query?.directed !== undefined && edge.directed !== query.directed)
				continue;
			if (types && !types.has(edge.type)) continue;
			if (statuses && !statuses.has(edge.status)) continue;
			if (query?.minWeight !== undefined && edge.weight < query.minWeight)
				continue;
			if (!matchesMetadataFilter(edge.metadata, query?.metadata)) continue;

			out.push(cloneJson(edge));
			if (out.length >= limit) break;
		}

		return out;
	}

	async neighbors(query: GraphNeighborQuery): Promise<GraphNeighbor[]> {
		if (!this.nodes.has(query.nodeId))
			throw new GraphNotFoundError(`Node "${query.nodeId}" does not exist.`);

		const direction = query.direction ?? "both";
		const edgeTypes = query.edgeTypes
			? new Set(query.edgeTypes.map((type) => type.toLowerCase()))
			: undefined;
		const statuses = toStatusSet(query.statuses);
		const limit = validateLimit(query.limit, 100, 10_000);
		const out: GraphNeighbor[] = [];
		const seen = new Set<string>();

		for (const edgeId of this.neighborEdgeIds(query.nodeId, direction)) {
			const edge = this.edges.get(edgeId);
			if (!edge) continue;
			if (!query.includeInactive && isInactive(edge)) continue;
			if (!query.includeExpired && isExpired(edge, query.now)) continue;
			if (edgeTypes && !edgeTypes.has(edge.type)) continue;
			if (statuses && !statuses.has(edge.status)) continue;
			if (query.minWeight !== undefined && edge.weight < query.minWeight)
				continue;

			const candidates = neighborCandidates(edge, query.nodeId, direction);
			for (const candidate of candidates) {
				const node = this.nodes.get(candidate.nodeId);
				if (!node) continue;
				if (!query.includeInactive && isInactive(node)) continue;
				if (!query.includeExpired && isExpired(node, query.now)) continue;
				const key = `${edge.id}:${candidate.direction}:${node.id}`;
				if (seen.has(key)) continue;
				seen.add(key);
				out.push({
					node: cloneJson(node),
					edge: cloneJson(edge),
					direction: candidate.direction,
				});
				if (out.length >= limit) return out;
			}
		}

		return out;
	}

	async shortestPath(
		query: GraphShortestPathQuery,
	): Promise<GraphPath | undefined> {
		return this.fewestHopsPath(query);
	}

	async fewestHopsPath(
		query: GraphShortestPathQuery,
	): Promise<GraphPath | undefined> {
		const { fewestHopsPath: computeFewestHops } = await import("./pathfinding");
		return computeFewestHops(this, query);
	}

	async weightedShortestPath(
		query: GraphShortestPathQuery,
	): Promise<GraphPath | undefined> {
		const { weightedShortestPath: computeWeighted } = await import(
			"./pathfinding"
		);
		return computeWeighted(this, query);
	}

	async mergeNodes(input: GraphMergeNodesInput): Promise<StoredGraphNode> {
		const source = this.nodes.get(input.sourceId);
		const target = this.nodes.get(input.targetId);
		if (!source)
			throw new GraphNotFoundError(
				`Source node "${input.sourceId}" does not exist.`,
			);
		if (!target)
			throw new GraphNotFoundError(
				`Target node "${input.targetId}" does not exist.`,
			);
		if (source.id === target.id)
			throw new GraphConflictError("Cannot merge a node into itself.");

		const merged: StoredGraphNode = normalizeNode(
			{
				...target,
				aliases: uniqueStrings([
					...(target.aliases ?? []),
					source.label,
					...(source.aliases ?? []),
				]),
				confidence: Math.max(target.confidence, source.confidence),
				importance: Math.max(target.importance, source.importance),
				metadata: mergeMetadata(
					source.metadata,
					target.metadata,
					input.metadata,
				),
				sourceRefs: mergeSourceRefs(target.sourceRefs, source.sourceRefs),
				updatedAt: nowIso(),
			},
			target,
		);

		this.nodes.set(target.id, merged);

		const movedEdges: GraphEdge[] = [];
		for (const edge of Array.from(this.edges.values())) {
			if (edge.from !== source.id && edge.to !== source.id) continue;
			this.removeEdge(edge.id);
			const next: GraphEdge = {
				...edge,
				id: undefined,
				from: edge.from === source.id ? target.id : edge.from,
				to: edge.to === source.id ? target.id : edge.to,
				dedupeKey: edge.dedupeKey ?? edge.id,
				updatedAt: nowIso(),
			};
			if (next.from !== next.to || this.allowSelfEdges) movedEdges.push(next);
		}

		if (movedEdges.length > 0) await this.upsertEdges(movedEdges);
		if (input.deleteSource ?? true) this.nodes.delete(source.id);
		return cloneJson(merged);
	}

	async decayEdges(
		input: GraphDecayInput,
	): Promise<{ updated: number; deleted: number }> {
		validateUnitNumber(input.factor, "factor");
		const minWeight = input.minWeight ?? 0;
		validateUnitNumber(minWeight, "minWeight");
		const edgeTypes = input.edgeTypes
			? new Set(input.edgeTypes.map((type) => type.toLowerCase()))
			: undefined;
		let updated = 0;
		let deleted = 0;

		for (const edge of Array.from(this.edges.values())) {
			if (edgeTypes && !edgeTypes.has(edge.type)) continue;
			if (!matchesMetadataFilter(edge.metadata, input.metadata)) continue;
			const nextWeight = Math.max(0, edge.weight * input.factor);
			if (nextWeight < minWeight) {
				this.removeEdge(edge.id);
				deleted += 1;
				continue;
			}
			this.setEdge({
				...edge,
				weight: nextWeight,
				updatedAt: input.now ?? nowIso(),
			});
			updated += 1;
		}

		return { updated, deleted };
	}

	async deleteNode(
		id: string,
		options?: { cascadeEdges?: boolean },
	): Promise<boolean> {
		if (!this.nodes.has(id)) return false;
		const cascadeEdges = options?.cascadeEdges ?? true;

		const connectedEdgeIds = new Set([
			...Array.from(this.outgoingEdgeIdsByNode.get(id) ?? []),
			...Array.from(this.incomingEdgeIdsByNode.get(id) ?? []),
		]);

		if (!cascadeEdges && connectedEdgeIds.size > 0) {
			throw new GraphConflictError(`Node "${id}" still has connected edges.`);
		}

		this.nodes.delete(id);
		if (cascadeEdges) {
			for (const edgeId of connectedEdgeIds) this.removeEdge(edgeId);
		}
		return true;
	}

	async deleteEdge(id: string): Promise<boolean> {
		return this.removeEdge(id);
	}

	async clear(): Promise<void> {
		this.nodes.clear();
		this.edges.clear();
		this.outgoingEdgeIdsByNode.clear();
		this.incomingEdgeIdsByNode.clear();
		this.edgeIdsByType.clear();
	}

	async stats(): Promise<GraphStats> {
		const nodeTypes: Record<string, number> = {};
		const edgeTypes: Record<string, number> = {};
		const statusCounts: Record<string, number> = {};

		for (const node of this.nodes.values()) {
			nodeTypes[node.type] = (nodeTypes[node.type] ?? 0) + 1;
			statusCounts[node.status] = (statusCounts[node.status] ?? 0) + 1;
		}

		for (const edge of this.edges.values()) {
			edgeTypes[edge.type] = (edgeTypes[edge.type] ?? 0) + 1;
			statusCounts[edge.status] = (statusCounts[edge.status] ?? 0) + 1;
		}

		return {
			nodeCount: this.nodes.size,
			edgeCount: this.edges.size,
			nodeTypes,
			edgeTypes,
			statusCounts,
		};
	}

	async exportSnapshot(): Promise<GraphSnapshot> {
		return {
			version: 1,
			exportedAt: nowIso(),
			nodes: Array.from(this.nodes.values()).map(cloneJson),
			edges: Array.from(this.edges.values()).map(cloneJson),
		};
	}

	async importSnapshot(
		snapshot: GraphSnapshot,
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
					throw new GraphValidationError(
						`Duplicate node id "${normalized.id}".`,
					);
				nodeIds.add(normalized.id);
				return normalized;
			} catch (error) {
				const message =
					error instanceof Error ? error.message : "Invalid node.";
				throw new GraphValidationError(
					`Invalid snapshot node at index ${index}: ${message}`,
					{ cause: error },
				);
			}
		});

		const edgeIds = new Set<string>();
		const normalizedEdges = snapshot.edges.map((edge, index) => {
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
					allowSelfEdges: this.allowSelfEdges,
					edgeIdentityMode: this.edgeIdentityMode,
				});
				if (edgeIds.has(normalized.id))
					throw new GraphValidationError(
						`Duplicate edge id "${normalized.id}".`,
					);
				edgeIds.add(normalized.id);
				return normalized;
			} catch (error) {
				const message =
					error instanceof Error ? error.message : "Invalid edge.";
				throw new GraphValidationError(
					`Invalid snapshot edge at index ${index}: ${message}`,
					{ cause: error },
				);
			}
		});

		if (options?.clear ?? true) await this.clear();
		for (const node of normalizedNodes)
			this.nodes.set(node.id, cloneJson(node));
		for (const edge of normalizedEdges) this.setEdge(edge);
	}

	private resolveEdgeId(edge: GraphEdge): string {
		if (edge.id) return edge.id;
		const preview = normalizeEdge(edge, {
			allowSelfEdges: this.allowSelfEdges,
			edgeIdentityMode: this.edgeIdentityMode,
		});
		return (
			preview.id ??
			stableEdgeId({
				from: preview.from,
				type: preview.type,
				to: preview.to,
				directed: preview.directed,
				dedupeKey: edgeIdentitySalt(preview, this.edgeIdentityMode),
			})
		);
	}

	private setEdge(edge: StoredGraphEdge): void {
		const existing = this.edges.get(edge.id);
		if (existing) this.unindexEdge(existing);
		this.edges.set(edge.id, cloneJson(edge));
		this.indexEdge(edge);
	}

	private removeEdge(id: string): boolean {
		const existing = this.edges.get(id);
		if (!existing) return false;
		this.unindexEdge(existing);
		return this.edges.delete(id);
	}

	private indexEdge(edge: StoredGraphEdge): void {
		addToIndex(this.outgoingEdgeIdsByNode, edge.from, edge.id);
		addToIndex(this.incomingEdgeIdsByNode, edge.to, edge.id);
		addToIndex(this.edgeIdsByType, edge.type, edge.id);
		if (!edge.directed) {
			addToIndex(this.outgoingEdgeIdsByNode, edge.to, edge.id);
			addToIndex(this.incomingEdgeIdsByNode, edge.from, edge.id);
		}
	}

	private unindexEdge(edge: StoredGraphEdge): void {
		removeFromIndex(this.outgoingEdgeIdsByNode, edge.from, edge.id);
		removeFromIndex(this.incomingEdgeIdsByNode, edge.to, edge.id);
		removeFromIndex(this.edgeIdsByType, edge.type, edge.id);
		if (!edge.directed) {
			removeFromIndex(this.outgoingEdgeIdsByNode, edge.to, edge.id);
			removeFromIndex(this.incomingEdgeIdsByNode, edge.from, edge.id);
		}
	}

	private neighborEdgeIds(nodeId: string, direction: GraphDirection): string[] {
		if (direction === "out")
			return Array.from(this.outgoingEdgeIdsByNode.get(nodeId) ?? []);
		if (direction === "in")
			return Array.from(this.incomingEdgeIdsByNode.get(nodeId) ?? []);
		return Array.from(
			new Set([
				...Array.from(this.outgoingEdgeIdsByNode.get(nodeId) ?? []),
				...Array.from(this.incomingEdgeIdsByNode.get(nodeId) ?? []),
			]),
		);
	}

	private edgeQueryCandidateIds(query?: GraphEdgeQuery): Iterable<string> {
		if (query?.ids && query.ids.length > 0) return query.ids;
		if (query?.from) return this.outgoingEdgeIdsByNode.get(query.from) ?? [];
		if (query?.to) return this.incomingEdgeIdsByNode.get(query.to) ?? [];
		if (query?.types && query.types.length === 1) {
			// biome-ignore lint/style/noNonNullAssertion: guaranteed by length === 1
			const type = query.types[0]!;
			return this.edgeIdsByType.get(type.toLowerCase()) ?? [];
		}
		return this.edges.keys();
	}
}

export function createInMemoryGraphStore(
	options?: InMemoryGraphStoreOptions,
): InMemoryGraphStore {
	return new InMemoryGraphStore(options);
}

function nodeMatchesSearch(node: StoredGraphNode, search: string): boolean {
	return [node.id, node.type, node.label, node.summary, ...(node.aliases ?? [])]
		.filter(Boolean)
		.some((value) => String(value).toLowerCase().includes(search));
}

function toStatusSet(
	statuses: GraphFactStatus[] | undefined,
): Set<GraphFactStatus> | undefined {
	return statuses ? new Set(statuses) : undefined;
}

function neighborCandidates(
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

function _edgeCost(edge: StoredGraphEdge): number {
	return 1 - edge.weight;
}

function addToIndex(
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

function removeFromIndex(
	index: Map<string, Set<string>>,
	key: string,
	value: string,
): void {
	const set = index.get(key);
	if (!set) return;
	set.delete(value);
	if (set.size === 0) index.delete(key);
}
