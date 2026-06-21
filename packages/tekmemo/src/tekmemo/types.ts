/**
 * Unified public types for the Tekmemo client API.
 *
 * These types were previously scattered across the MCP server, CLI, and cloud-client.
 * They are now consolidated here as the single source of truth.
 *
 * @public
 */

export type TekMemoRuntimeMode = "local" | "hybrid" | "memory";

export type RuntimeReadPolicy =
	| "local-first"
	| "cloud-first"
	| "local-only";

export type RuntimeWritePolicy =
	| "local-first"
	| "cloud-first"
	| "local-only";

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
		type:
			| "directive"
			| "core"
			| "notes"
			| "recent"
			| "recall"
			| "graph";
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
}

export interface WriteMemoryResult {
	id: string;
	created: boolean;
	sourceRefs?: SourceRef[];
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
	CloudFileSyncEntry,
	CloudFileManifest,
	FileManifest,
	FileSyncEntry,
	SyncPullInput,
	SyncPullResult,
	SyncPushCompleteInput,
	SyncPushCompleteResult,
	SyncPushInput,
	SyncPushResult,
	SyncStatusInput,
	SyncStatusResult,
	SyncUploadTarget,
	SyncDownloadTarget,
	SyncCursor,
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

export interface TekMemoHealthResult {
	ok: boolean;
	name: string;
	version: string;
	mode?: TekMemoRuntimeMode;
	capabilities: string[];
	warnings?: string[];
}
