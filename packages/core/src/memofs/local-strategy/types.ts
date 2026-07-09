import type { JsonObject } from "../../core/types/json";
import type { MemoryEmbedder } from "../../core/types/embeddings";
import type { MemoryStore } from "../../core/types/memory-store";
import type { Extractor } from "../../graph/extraction/extractor";
import type { AgentfsLikeClient } from "../../agentfs/client/agentfs-like";
import type {
	GraphEdgeInput,
	GraphNodeInput,
	SnapshotMemoryInput,
	SnapshotMemoryResult,
} from "../types";
import type { InMemoryGraphStore } from "../../graph/stores/in-memory-graph-store";
import type { LlmClient } from "../../ai-runtime/llm-client";
import type { BM25Store } from "../../recall/lexical/bm25";
import type { RecallStore } from "../../recall/types";
import type { Reranker } from "../../rerank";
import type { ContextCache } from "../progressive";
import type { FileSyncLayer } from "../sync/file-replication";

export type LocalGraphStore = Pick<
	InMemoryGraphStore,
	| "upsertNodes"
	| "upsertEdges"
	| "getNode"
	| "getEdge"
	| "queryNodes"
	| "queryEdges"
	| "neighbors"
	| "fewestHopsPath"
	| "weightedShortestPath"
	| "mergeNodes"
	| "stats"
	| "exportSnapshot"
	| "importSnapshot"
> & { hydrate?: () => Promise<void> };

export interface LocalStrategyOptions {
	store: MemoryStore;
	embedder?: MemoryEmbedder;
	extractor?: Extractor;
	recallStore?: RecallStore;
	projectId: string;
	tenantId?: string;
	autoBootstrap: boolean;
	name: string;
	version: string;
	reranker?: Reranker;
	llmClient?: LlmClient;
	graphStore?: LocalGraphStore;
	autoExtractGraph?: boolean;
	syncLayer?: FileSyncLayer;
	createAgentfsClient?: (opts: {
		store: MemoryStore;
		projectId: string;
		syncLayer?: FileSyncLayer;
		createSnapshot?(input?: SnapshotMemoryInput): Promise<SnapshotMemoryResult>;
	}) => AgentfsLikeClient;
}

export interface LocalStrategyContext {
	options: LocalStrategyOptions;
	bootstrapped: boolean;
	setBootstrapped: (val: boolean) => void;
	graphNodes: Map<string, GraphNodeInput>;
	graphEdges: Map<string, GraphEdgeInput>;
	lexicalStore: BM25Store;
	lexicalTextById: Map<string, string>;
	contextCache: ContextCache;
	agentfsClient: AgentfsLikeClient;
	extractor: Extractor;
	graphStore: LocalGraphStore;
	reranker: Reranker;
	ensureReady: () => Promise<void>;
	indexLexical: (doc: { id: string; text: string }) => void;
	pruneLexical: (ids: string[]) => void;
	isRetiredGraphDoc: (lexicalId: string) => boolean;
	collectRetiredGraphDocIds: () => Set<string>;
	createSnapshotImpl: (
		input?: SnapshotMemoryInput,
		signal?: AbortSignal,
	) => Promise<SnapshotMemoryResult>;
	listRecentMemories: (
		limit?: number,
		signal?: AbortSignal,
	) => Promise<{
		items: Array<{
			id: string;
			type: string;
			timestamp: string;
			summary: string;
			metadata?: JsonObject;
		}>;
		warnings?: string[];
	}>;
}
