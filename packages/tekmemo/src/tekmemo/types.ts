/**
 * Unified public types for the Tekmemo client API.
 *
 * These types were previously scattered across the MCP server, CLI, and cloud-client.
 * They are now consolidated here as the single source of truth.
 *
 * @public
 */

import type {
	DurabilityReason,
	DurabilityTier,
} from "../security/durability-tier";

export type TekMemoRuntimeMode = "local" | "hybrid" | "memory";

export type RuntimeReadPolicy = "local-first" | "cloud-first" | "local-only";

export type RuntimeWritePolicy = "local-first" | "cloud-first" | "local-only";

export type MemoryKind =
	| "decision"
	| "constraint"
	| "goal"
	| "preference"
	| "reference"
	| "summary"
	| "note";

export interface Page<T> {
	items: T[];
	nextCursor?: string;
}

export interface SourceRef {
	sourceType: string;
	sourceId?: string;
	path?: string;
	title?: string;
	url?: string;
	metadata?: JsonObject;
}

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | JsonObject;
export type JsonObject = Record<string, unknown>;

export interface RecallInput {
	query: string;
	workspaceId?: string;
	projectId?: string;
	limit?: number;
	includeGraph?: boolean;
	includeSources?: boolean;
	filters?: JsonObject;
}

export interface RecallItem {
	id: string;
	text: string;
	score?: number;
	sourceRefs?: SourceRef[];
	metadata?: JsonObject;
}

export interface RecallResult {
	items: RecallItem[];
	warnings?: string[];
}

export interface MemoryContextInput extends RecallInput {
	maxBytes?: number;
	includeCore?: boolean;
	includeNotes?: boolean;
	includeRecent?: boolean;
}

export interface MemoryContextResult {
	text: string;
	/**
	 * Ordered context sections. The first section is a `directive` that tells
	 * the agent how to act on the rest of the context; the remaining sections
	 * carry the memory content (core, recent, recall, notes, graph).
	 */
	sections: Array<{
		type: "directive" | "core" | "notes" | "recent" | "recall" | "graph";
		title: string;
		content: string;
	}>;
	items?: RecallItem[];
	warnings?: string[];
}

export interface WriteMemoryInput {
	title?: string;
	content: string;
	kind?: MemoryKind;
	workspaceId?: string;
	projectId?: string;
	tags?: string[];
	sourceRefs?: SourceRef[];
	metadata?: JsonObject;
	confidence?: number;
	source?: string;
	/**
	 * Optional explicit durability tier override (ADR 0009 Component 6). When
	 * set, the classifier returns it verbatim; when omitted, the deterministic
	 * classifier decides from `kind` + `confidence` + content shape. `transient`
	 * memories are written to `notes.md` (audit trail) but not indexed into
	 * recall/graph — they don't pollute retrieval.
	 */
	tier?: DurabilityTier;
}

export interface WriteMemoryResult {
	id: string;
	created: boolean;
	sourceRefs?: SourceRef[];
	/**
	 * The durability tier the write was classified into (ADR 0009 Component 6).
	 * `transient` means the memory was written to `notes.md` but **not** indexed
	 * into recall/graph. Always present on a successful write so callers can
	 * audit the decision.
	 */
	tier: DurabilityTier;
	/** Why the classifier chose `tier` (auditable; the benchmark kit reads it). */
	tierReason: DurabilityReason;
	warnings?: string[];
}

export interface ReadMemoryInput {
	workspaceId?: string;
	projectId?: string;
}

export interface MemoryDocumentResult {
	content: string;
	warnings?: string[];
}

export interface RecentMemoryInput extends ReadMemoryInput {
	limit?: number;
}

export interface RecentMemoryResult {
	items: Array<{
		id: string;
		type?: string;
		timestamp?: string;
		summary?: string;
		metadata?: JsonObject;
	}>;
	warnings?: string[];
}

export interface ValidateMemoryInput extends ReadMemoryInput {
	strict?: boolean;
}

export interface ValidateMemoryResult {
	ok: boolean;
	warnings: string[];
	errors: string[];
}

export interface SnapshotMemoryInput extends ReadMemoryInput {
	label?: string;
	type?: "manual" | "automatic" | "pre-sync" | "pre-restore";
	metadata?: JsonObject;
}

export interface SnapshotMemoryResult {
	id: string;
	path?: string;
	created: boolean;
	warnings?: string[];
}

export interface AgentSessionStartInput extends ReadMemoryInput {
	task: string;
	actorId?: string;
	sessionId?: string;
}

export interface AgentSessionFileInput extends ReadMemoryInput {
	sessionId: string;
	path: string;
	content?: string;
}

export interface AgentSessionCompleteInput extends ReadMemoryInput {
	sessionId: string;
	extractDurableMemory?: boolean;
	checkpointLabel?: string;
}

export interface AgentSessionResult {
	sessionId: string;
	root: string;
	paths: JsonObject;
}

export interface AgentSessionExtractResult {
	sessionId: string;
	extracted: JsonObject;
}

/**
 * File-based sync types — single source of truth.
 *
 * These are re-exported from the cloud-client, which freezes the four-method
 * file-replica contract (`push`, `complete`, `pull`, `status`) into
 * `v1.0.0-alpha.0` (see `docs/architecture/cloud-sync-and-refactor.md` §7).
 * The cloud is a file replica, never an engine: there are no event-level
 * types, no conflict-resolution types, and no `serverVersion`/`openConflicts`
 * fields. All engine operations (recall, memory CRUD, graph, extraction,
 * agent sessions) run locally.
 *
 * @public
 */
export type {
	CloudFileManifest,
	CloudFileSyncEntry,
	FileManifest,
	FileSyncEntry,
	SyncCursor,
	SyncDownloadTarget,
	SyncPullInput,
	SyncPullResult,
	SyncPushCompleteInput,
	SyncPushCompleteResult,
	SyncPushInput,
	SyncPushResult,
	SyncStatusInput,
	SyncStatusResult,
	SyncUploadTarget,
} from "../cloud-client/types";

export interface GraphNodeInput {
	id: string;
	type: string;
	label: string;
	aliases?: string[];
	summary?: string;
	confidence?: number;
	importance?: number;
	status?: string;
	sourceRefs?: SourceRef[];
	metadata?: JsonObject;
}

export interface GraphEdgeInput {
	id?: string;
	from: string;
	to: string;
	type: string;
	directed?: boolean;
	dedupeKey?: string;
	weight?: number;
	confidence?: number;
	status?: string;
	sourceRefs?: SourceRef[];
	metadata?: JsonObject;
}

export interface GraphNeighborsInput {
	nodeId: string;
	workspaceId?: string;
	projectId?: string;
	direction?: "in" | "out" | "both";
	edgeTypes?: string[];
	minWeight?: number;
	limit?: number;
	cursor?: string;
}

export interface GraphPathInput {
	from: string;
	to: string;
	workspaceId?: string;
	projectId?: string;
	weighted?: boolean;
	maxDepth?: number;
	edgeTypes?: string[];
	minWeight?: number;
}

export interface ListGraphInput {
	workspaceId?: string;
	projectId?: string;
	limit?: number;
	cursor?: string;
}

export interface GraphPathResult {
	found: boolean;
	nodes: GraphNodeInput[];
	edges: GraphEdgeInput[];
	totalWeight?: number;
	totalCost?: number;
}

/**
 * Input to a memory consolidation pass.
 *
 * Consolidation is a local, deterministic pass that merges duplicate entities
 * and retires superseded facts — never deleting (the audit trail is preserved).
 * It runs over the whole graph snapshot, so the input carries only optional
 * knobs (an override for "now" and the edge type that expresses supersession).
 *
 * @public
 */
export interface ConsolidateMemoryInput {
	workspaceId?: string;
	projectId?: string;
	/**
	 * When `true` (default), the computed plan is persisted to the graph store
	 * (merges applied, edges/nodes marked `deprecated`). When `false`, the pass
	 * is read-only — useful for previewing what a consolidation would change.
	 */
	apply?: boolean;
	/**
	 * Override the `now` timestamp stamped onto every retirement, for
	 * deterministic tests. Defaults to the current ISO time.
	 */
	now?: string;
	/**
	 * Edge type that expresses "A replaces B". Defaults to `"supersedes"` — the
	 * type the rule-based extractor and the contradiction normalization in
	 * `autoExtractGraph` both emit.
	 */
	supersedingEdgeType?: string;
}

/**
 * Result of a memory consolidation pass.
 *
 * Carries both the computed {@link ConsolidationResult} plan (what *would*
 * change) and the counts actually applied (which may be lower when `apply` is
 * `false` or the store rejected individual operations).
 *
 * @public
 */
export interface ConsolidateMemoryResult {
	/** The full plan: merges + retirements that consolidation proposed. */
	plan: {
		merges: number;
		retiredEdges: number;
		retiredNodes: number;
		changed: boolean;
		now: string;
	};
	/** How many merges were actually persisted (`0` when `apply` is `false`). */
	mergesApplied: number;
	/** How many retirements were actually persisted (`0` when `apply` is `false`). */
	retirementsApplied: number;
	/** Whether the plan was persisted. */
	applied: boolean;
}

export interface TekMemoHealthResult {
	ok: boolean;
	name: string;
	version: string;
	mode?: TekMemoRuntimeMode;
	capabilities: string[];
	warnings?: string[];
}
