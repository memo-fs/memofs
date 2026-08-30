/**
 * @file Local strategy context and options types.
 *
 * @remarks
 * Defines the shared types for the local-first strategy, including the
 * graph store abstraction and the optional {@link Logger} for observable
 * best-effort warnings (intelligence hardening).
 */

import type { AgentfsLikeClient } from "../../agentfs/client/agentfs-like";
import type { LlmClient } from "../../ai-runtime/llm-client";
import type { MemoryEmbedder } from "../../core/types/embeddings";
import type { JsonObject } from "../../core/types/json";
import type { Logger } from "../../core/types/logger";
import type { MemoryStore } from "../../core/types/memory-store";
import type { Extractor } from "../../graph/extraction/extractor";
import type { InMemoryGraphStore } from "../../graph/stores/in-memory-graph-store";
import type { BM25Store } from "../../recall/lexical/bm25";
import type { RecallStore } from "../../recall/types";
import type { Reranker } from "../../rerank";
import type { ContextCache } from "../progressive";
import type { FileSyncLayer } from "../sync/file-replication";
import type {
	AnchorRef,
	GraphEdgeInput,
	GraphNodeInput,
	SnapshotMemoryInput,
	SnapshotMemoryResult,
	WriteMemoryResult,
} from "../types";
import type { AnchorHashCache } from "./anchor-drift";
import type { MemoryDecayMeta } from "./decay";

export type { Logger } from "../../core/types/logger";

/**
 * Minimal graph store interface used by the local strategy.
 *
 * @public
 */
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
	/**
	 * When `true` (default), `writeMemory` no-ops a note whose text
	 * near-duplicates an already-indexed memory (deterministic token-set
	 * similarity over the lexical index) and returns
	 * `created: false` + `duplicateOf` instead of appending. Disable only for
	 * capture-everything pipelines that want every write appended verbatim.
	 * @defaultValue `true`
	 */
	dedupeOnWrite?: boolean;
	syncLayer?: FileSyncLayer;
	logger?: Logger;
	/**
	 * Project root directory used to resolve {@link AnchorRef.file}.
	 * Defaults to `"."` (CWD). The drift-detection seam joins anchored
	 * memory records' repo-relative file paths to absolute OS paths here.
	 */
	rootDir?: string;
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
	/**
	 * memoryId → note content body (no heading/metadata lines). Fed by
	 * durable writes and by cold-start hydration with the identical value,
	 * so the dedup-on-write guard compares content-for-content whether the
	 * existing memory was written in this process or loaded from disk.
	 * Cleaned by `pruneLexical` alongside the lexical index.
	 */
	memoryContentById: Map<string, string>;
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
	/**
	 * Project root directory used to resolve {@link AnchorRef.file}.
	 * Defaults to `"."`. Anchored memories' repo-relative `file` paths are
	 * joined against this root before the runtime reads the file's bytes
	 * for SHA-256 drift detection.
	 */
	rootDir: string;
	/**
	 * In-process map of memory id → stored {@link AnchorRef}. Populated at
	 * `ensureReady` time from `memory-events.jsonl` (cold-start recovery)
	 * and at `writeMemory` time when the caller passes `WriteMemoryInput.anchor`.
	 * Read by the query-time drift-detection seam in `localRecall` so items
	 * with anchors can be hash-compared against the live file.
	 */
	anchorByMemoryId: Map<string, AnchorRef>;
	/**
	 * In-process 5-minute-TTL cache of absolute file path → SHA-256 hash.
	 * Cache hits avoid re-reading files on every recall of the same
	 * anchored-memory set. Hydrated from `.memofs/manifest.json` at
	 * `ensureReady` time (cross-session warm start) and persisted back via
	 * {@link LocalStrategyContext.flushAnchorHashCache} after each recall
	 * that mutated the cache.
	 */
	anchorHashCache: AnchorHashCache;
	/**
	 * Persists {@link LocalStrategyContext.anchorHashCache} to
	 * `.memofs/manifest.json` (best-effort). Called by `localRecall`
	 * after {@link applyAnchorDrift} so a fresh process can warm-start
	 * from the prior session's cache entries instead of re-hashing
	 * every anchored file on first recall.
	 */
	flushAnchorHashCache: () => Promise<void>;
	/**
	 * Reverse index `memory id → graph node ids` for the bound
	 * `code_symbol` / `concept` / etc. nodes whose `sourceRefs` point at a
	 * memory. Built at `ensureReady` time and rebuilt after each
	 * `autoExtractGraph` so the drift-detection seam can find the graph
	 * node(s) to transition to `"stale"` without scanning the whole graph
	 * per recall call.
	 */
	graphNodesByMemoryId: Map<string, string[]>;
	/**
	 * Rebuilds {@link LocalStrategyContext.graphNodesByMemoryId} from
	 * `graphNodes` so newly written nodes (and any new sourceRefs pointing
	 * at memory ids) are reflected in the index. Called by `ensureReady`
	 * at boot and by `autoExtractGraph` after each upsert batch.
	 */
	reindexGraphNodesByMemoryId: () => void;
	/**
	 * In-process map of memory id → decay metadata (`kind` + `createdAt`).
	 * Populated at `ensureReady` time from `memory-events.jsonl`
	 * (cold-start recovery) and at `writeMemory` time for the live write.
	 * Read by the query-time decay-detection seam in `localRecall` so
	 * items with a `kind` + age past their {@link EXPIRY_DAYS} floor can
	 * be flagged `unverified` + demoted.
	 */
	memoryMetaByMemoryId: Map<string, MemoryDecayMeta>;
	/**
	 * In-process set of all known memory record IDs (hydrated from events + updated on write).
	 */
	knownMemoryIds: Set<string>;
	/**
	 * In-process map of idempotencyKey → cached WriteMemoryResult for write deduplication.
	 */
	idempotencyKeys: Map<string, WriteMemoryResult>;
}
