import type { JsonPrimitive } from "../core/types/json";

export type { JsonPrimitive };
export type GraphMetadataValue =
	| JsonPrimitive
	| GraphMetadataValue[]
	| { [key: string]: GraphMetadataValue };
export type GraphMetadata = Record<string, GraphMetadataValue>;

export type GraphDirection = "in" | "out" | "both";
export type GraphEdgeIdentityMode =
	| "canonical"
	| "source-aware"
	| "event-aware";

export type GraphNodeType =
	| "person"
	| "project"
	| "workspace"
	| "repo"
	| "document"
	| "code_symbol"
	| "task"
	| "decision"
	| "tool"
	| "concept"
	| "preference"
	| "policy"
	| "procedure"
	| "custom"
	| (string & {});

export type GraphEdgeType =
	| "uses"
	| "mentions"
	| "depends_on"
	| "authored_by"
	| "decided"
	| "supersedes"
	| "blocks"
	| "owns"
	| "prefers"
	| "related_to"
	| "custom"
	| (string & {});

export type GraphFactStatus =
	| "active"
	| "deprecated"
	| "conflicted"
	| "deleted";

export interface GraphSourceSpan {
	start?: number;
	end?: number;
	line?: number;
	column?: number;
}

export interface GraphSourceRef {
	sourceType:
		| "memory"
		| "document"
		| "conversation"
		| "connector"
		| "event"
		| "manual"
		| "custom"
		| (string & {});
	sourceId?: string;
	path?: string;
	title?: string;
	url?: string;
	span?: GraphSourceSpan;
	metadata?: GraphMetadata;
}

export interface GraphNode {
	id: string;
	type: GraphNodeType;
	label: string;
	aliases?: string[];
	summary?: string;
	sourceRefs?: GraphSourceRef[];
	confidence?: number;
	importance?: number;
	status?: GraphFactStatus;
	validFrom?: string;
	validUntil?: string;
	expiresAt?: string;
	createdAt?: string;
	updatedAt?: string;
	metadata?: GraphMetadata;
}

export interface StoredGraphNode extends GraphNode {
	aliases: string[];
	confidence: number;
	importance: number;
	status: GraphFactStatus;
	createdAt: string;
	updatedAt: string;
}

export interface GraphEdge {
	id?: string;
	from: string;
	to: string;
	type: GraphEdgeType;
	directed?: boolean;
	/**
	 * Optional identity salt for preserving parallel facts. Use it for connector row ids,
	 * event ids, claim ids, or other stable provenance keys.
	 */
	dedupeKey?: string;
	weight?: number;
	confidence?: number;
	status?: GraphFactStatus;
	validFrom?: string;
	validUntil?: string;
	expiresAt?: string;
	sourceRefs?: GraphSourceRef[];
	createdAt?: string;
	updatedAt?: string;
	metadata?: GraphMetadata;
}

export interface StoredGraphEdge extends GraphEdge {
	id: string;
	directed: boolean;
	weight: number;
	confidence: number;
	status: GraphFactStatus;
	createdAt: string;
	updatedAt: string;
}

export interface GraphNodeQuery {
	ids?: string[];
	types?: string[];
	statuses?: GraphFactStatus[];
	search?: string;
	metadata?: Record<string, unknown>;
	includeInactive?: boolean;
	includeExpired?: boolean;
	now?: string | Date;
	limit?: number;
}

export interface GraphEdgeQuery {
	ids?: string[];
	from?: string;
	to?: string;
	types?: string[];
	statuses?: GraphFactStatus[];
	directed?: boolean;
	minWeight?: number;
	metadata?: Record<string, unknown>;
	includeInactive?: boolean;
	includeExpired?: boolean;
	now?: string | Date;
	limit?: number;
}

export interface GraphNeighborQuery {
	nodeId: string;
	direction?: GraphDirection;
	edgeTypes?: string[];
	statuses?: GraphFactStatus[];
	minWeight?: number;
	includeInactive?: boolean;
	includeExpired?: boolean;
	now?: string | Date;
	limit?: number;
}

export interface GraphNeighbor {
	node: StoredGraphNode;
	edge: StoredGraphEdge;
	direction: "in" | "out";
}

export interface GraphShortestPathQuery {
	from: string;
	to: string;
	direction?: GraphDirection;
	edgeTypes?: string[];
	statuses?: GraphFactStatus[];
	minWeight?: number;
	includeInactive?: boolean;
	includeExpired?: boolean;
	now?: string | Date;
	maxDepth?: number;
}

export interface GraphPathStep {
	node: StoredGraphNode;
	via?: StoredGraphEdge;
}

export interface GraphPath {
	steps: GraphPathStep[];
	/** Sum of edge weights on the chosen path. */
	totalWeight: number;
	/** Internal path cost. Lower is better for weighted shortest-path queries. */
	totalCost?: number;
}

export interface GraphMergeNodesInput {
	sourceId: string;
	targetId: string;
	deleteSource?: boolean;
	metadata?: GraphMetadata;
}

export interface GraphDecayInput {
	factor: number;
	minWeight?: number;
	edgeTypes?: string[];
	metadata?: Record<string, unknown>;
	now?: string;
}

export interface GraphExpansionInput {
	store: GraphStore;
	seedNodeIds: string[];
	depth?: number;
	direction?: GraphDirection;
	edgeTypes?: string[];
	minWeight?: number;
	includeInactive?: boolean;
	includeExpired?: boolean;
	limit?: number;
}

export interface GraphExpansionResult {
	nodes: StoredGraphNode[];
	edges: StoredGraphEdge[];
	depthReached: number;
}

export interface GraphSnapshot {
	nodes: StoredGraphNode[];
	edges: StoredGraphEdge[];
	exportedAt: string;
	version: 1;
}

export interface GraphStats {
	nodeCount: number;
	edgeCount: number;
	nodeTypes: Record<string, number>;
	edgeTypes: Record<string, number>;
	statusCounts: Record<string, number>;
}

export interface GraphStore {
	upsertNodes(nodes: GraphNode[]): Promise<StoredGraphNode[]>;
	upsertEdges(edges: GraphEdge[]): Promise<StoredGraphEdge[]>;
	getNode(id: string): Promise<StoredGraphNode | undefined>;
	getEdge(id: string): Promise<StoredGraphEdge | undefined>;
	queryNodes(query?: GraphNodeQuery): Promise<StoredGraphNode[]>;
	queryEdges(query?: GraphEdgeQuery): Promise<StoredGraphEdge[]>;
	neighbors(query: GraphNeighborQuery): Promise<GraphNeighbor[]>;
	/** Backward-compatible alias for fewestHopsPath. */
	shortestPath(query: GraphShortestPathQuery): Promise<GraphPath | undefined>;
	fewestHopsPath(query: GraphShortestPathQuery): Promise<GraphPath | undefined>;
	weightedShortestPath(
		query: GraphShortestPathQuery,
	): Promise<GraphPath | undefined>;
	mergeNodes(input: GraphMergeNodesInput): Promise<StoredGraphNode>;
	decayEdges(
		input: GraphDecayInput,
	): Promise<{ updated: number; deleted: number }>;
	deleteNode(
		id: string,
		options?: { cascadeEdges?: boolean },
	): Promise<boolean>;
	deleteEdge(id: string): Promise<boolean>;
	clear(): Promise<void>;
	stats(): Promise<GraphStats>;
	exportSnapshot(): Promise<GraphSnapshot>;
	importSnapshot(
		snapshot: GraphSnapshot,
		options?: { clear?: boolean },
	): Promise<void>;
}

export interface RuleBasedExtractionInput {
	text: string;
	sourceRef?: GraphSourceRef;
	defaultNodeType?: GraphNodeType;
	maxFacts?: number;
}

export interface RuleBasedExtractionResult {
	nodes: GraphNode[];
	edges: GraphEdge[];
}
