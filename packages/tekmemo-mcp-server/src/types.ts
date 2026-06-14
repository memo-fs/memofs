export type JsonPrimitive = string | number | boolean | null;
export type JsonValue =
	| JsonPrimitive
	| JsonValue[]
	| { [key: string]: JsonValue };
export type JsonObject = { [key: string]: JsonValue };

export type ToolSafety = "read" | "write" | "destructive" | "external";
export type McpRole = "user" | "assistant";
export type TekMemoRuntimeMode = "local" | "cloud" | "hybrid" | "memory";

export interface TextContentItem {
	type: "text";
	text: string;
}
export interface ResourceLinkContentItem {
	type: "resource_link";
	uri: string;
	name: string;
	description?: string;
	mimeType?: string;
}
export type McpContentItem = TextContentItem | ResourceLinkContentItem;

export interface McpToolResult {
	content: McpContentItem[];
	structuredContent?: JsonObject;
	isError?: boolean;
}
export interface McpPromptMessage {
	role: McpRole;
	content: TextContentItem;
}
export interface McpPromptResult {
	description?: string;
	messages: McpPromptMessage[];
}

export interface McpToolDefinition {
	name: string;
	title: string;
	description: string;
	inputSchema: JsonObject;
	outputSchema?: JsonObject;
	safety: ToolSafety;
	annotations?: JsonObject;
}

export interface McpResourceDefinition {
	uri: string;
	name: string;
	description: string;
	mimeType: string;
}
export interface McpPromptDefinition {
	name: string;
	title: string;
	description: string;
	arguments?: Array<{ name: string; description?: string; required?: boolean }>;
}
export interface Page<T> {
	items: T[];
	nextCursor?: string;
}

export type MemoryKind =
	| "decision"
	| "constraint"
	| "goal"
	| "preference"
	| "reference"
	| "summary"
	| "note";

export interface SourceRef {
	sourceType: string;
	sourceId?: string;
	path?: string;
	title?: string;
	url?: string;
	metadata?: JsonObject;
}
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
	sections: Array<{
		type: "core" | "notes" | "recent" | "recall" | "graph";
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

export type SyncConflictResolution = "keep_cloud" | "use_client" | "ignore";
export interface SyncEventInput {
	clientEventId: string;
	type: string;
	path?: string;
	payload?: JsonObject;
	payloadHash?: string;
	createdAt?: string;
	baseServerVersion?: number;
}
export interface SyncPushInput extends ReadMemoryInput {
	clientId: string;
	events: SyncEventInput[];
	checkpoint?: {
		localVersion?: number;
		serverVersion?: number;
		hash?: string;
	};
}
export interface SyncPushResult {
	accepted: Array<{
		clientEventId: string;
		serverEventId: string;
		serverVersion: number;
	}>;
	duplicates: string[];
	rejected: Array<{ clientEventId: string; code: string; message: string }>;
	conflicts: Array<{
		conflictId: string;
		clientEventId: string;
		reason: string;
	}>;
	serverVersion: number;
}
export interface SyncPullInput extends ReadMemoryInput {
	clientId: string;
	sinceServerVersion?: number;
	limit?: number;
}
export interface SyncPullResult {
	events: Array<{
		serverEventId: string;
		serverVersion: number;
		type: string;
		path?: string;
		payload?: JsonObject;
		createdAt?: string;
	}>;
	serverVersion: number;
	nextCursor?: string;
}
export interface SyncStatusInput extends ReadMemoryInput {
	clientId?: string;
}
export interface SyncStatusResult {
	serverVersion: number;
	clients: Array<{
		clientId: string;
		lastSeenAt?: string;
		serverVersion?: number;
		status?: string;
	}>;
	openConflicts: number;
	recentEvents?: number;
}
export interface ResolveSyncConflictInput extends ReadMemoryInput {
	conflictId: string;
	resolution: SyncConflictResolution;
	content?: JsonObject;
}
export interface ResolveSyncConflictResult {
	conflictId: string;
	resolved: boolean;
	serverVersion?: number;
}

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

export interface TekMemoMcpRuntime {
	health(signal?: AbortSignal): Promise<TekMemoHealthResult>;
	context?(
		input: MemoryContextInput,
		signal?: AbortSignal,
	): Promise<MemoryContextResult>;
	recall(input: RecallInput, signal?: AbortSignal): Promise<RecallResult>;
	writeMemory(
		input: WriteMemoryInput,
		signal?: AbortSignal,
	): Promise<WriteMemoryResult>;
	readCoreMemory?(
		input?: ReadMemoryInput,
		signal?: AbortSignal,
	): Promise<MemoryDocumentResult>;
	readNotesMemory?(
		input?: ReadMemoryInput,
		signal?: AbortSignal,
	): Promise<MemoryDocumentResult>;
	listRecentMemories?(
		input?: RecentMemoryInput,
		signal?: AbortSignal,
	): Promise<RecentMemoryResult>;
	validate?(
		input?: ValidateMemoryInput,
		signal?: AbortSignal,
	): Promise<ValidateMemoryResult>;
	createSnapshot?(
		input?: SnapshotMemoryInput,
		signal?: AbortSignal,
	): Promise<SnapshotMemoryResult>;
	startAgentSession?(
		input: AgentSessionStartInput,
		signal?: AbortSignal,
	): Promise<AgentSessionResult>;
	readAgentSessionFile?(
		input: AgentSessionFileInput,
		signal?: AbortSignal,
	): Promise<{ content: string }>;
	writeAgentSessionFile?(
		input: AgentSessionFileInput,
		signal?: AbortSignal,
	): Promise<{ written: true; path: string }>;
	appendAgentSessionFile?(
		input: AgentSessionFileInput,
		signal?: AbortSignal,
	): Promise<{ appended: true; path: string }>;
	extractAgentSession?(
		input: { sessionId: string; workspaceId?: string; projectId?: string },
		signal?: AbortSignal,
	): Promise<AgentSessionExtractResult>;
	completeAgentSession?(
		input: AgentSessionCompleteInput,
		signal?: AbortSignal,
	): Promise<AgentSessionExtractResult & { durableMemoryWritten: boolean }>;
	readiness?(signal?: AbortSignal): Promise<unknown>;
	contextCompose?(input: JsonObject, signal?: AbortSignal): Promise<unknown>;
	graphListNodes?(input: JsonObject, signal?: AbortSignal): Promise<unknown>;
	graphCreateNode?(input: JsonObject, signal?: AbortSignal): Promise<unknown>;
	graphListEdges?(input: JsonObject, signal?: AbortSignal): Promise<unknown>;
	graphCreateEdge?(input: JsonObject, signal?: AbortSignal): Promise<unknown>;
	extractionRun?(input: JsonObject, signal?: AbortSignal): Promise<unknown>;
	extractionJobs?(input: JsonObject, signal?: AbortSignal): Promise<unknown>;
	evalsRun?(input: JsonObject, signal?: AbortSignal): Promise<unknown>;
	benchmarksRun?(input: JsonObject, signal?: AbortSignal): Promise<unknown>;
	exportsCreate?(input: JsonObject, signal?: AbortSignal): Promise<unknown>;
	exportsDownload?(input: JsonObject, signal?: AbortSignal): Promise<unknown>;
	snapshotsCreate?(input: JsonObject, signal?: AbortSignal): Promise<unknown>;
	snapshotsDownload?(input: JsonObject, signal?: AbortSignal): Promise<unknown>;
	providersList?(input: JsonObject, signal?: AbortSignal): Promise<unknown>;
	providersCreate?(input: JsonObject, signal?: AbortSignal): Promise<unknown>;
	providersTest?(input: JsonObject, signal?: AbortSignal): Promise<unknown>;
	updateCoreMemory?(
		input: { content: string; workspaceId?: string; projectId?: string },
		signal?: AbortSignal,
	): Promise<MemoryDocumentResult>;
	syncPush?(
		input: SyncPushInput,
		signal?: AbortSignal,
	): Promise<SyncPushResult>;
	syncPull?(
		input: SyncPullInput,
		signal?: AbortSignal,
	): Promise<SyncPullResult>;
	syncStatus?(
		input?: SyncStatusInput,
		signal?: AbortSignal,
	): Promise<SyncStatusResult>;
	resolveSyncConflict?(
		input: ResolveSyncConflictInput,
		signal?: AbortSignal,
	): Promise<ResolveSyncConflictResult>;
	upsertGraphNodes(
		input: {
			workspaceId?: string;
			projectId?: string;
			nodes: GraphNodeInput[];
		},
		signal?: AbortSignal,
	): Promise<{ nodes: GraphNodeInput[] }>;
	upsertGraphEdges(
		input: {
			workspaceId?: string;
			projectId?: string;
			edges: GraphEdgeInput[];
		},
		signal?: AbortSignal,
	): Promise<{ edges: GraphEdgeInput[] }>;
	graphNeighbors(
		input: GraphNeighborsInput,
		signal?: AbortSignal,
	): Promise<
		Page<{
			node: GraphNodeInput;
			edge: GraphEdgeInput;
			direction: "in" | "out";
		}>
	>;
	graphPath(
		input: GraphPathInput,
		signal?: AbortSignal,
	): Promise<GraphPathResult>;
	listGraphNodes(
		input: ListGraphInput,
		signal?: AbortSignal,
	): Promise<Page<GraphNodeInput>>;
	listGraphEdges(
		input: ListGraphInput,
		signal?: AbortSignal,
	): Promise<Page<GraphEdgeInput>>;
}

export interface AuthorizationContext {
	operation: string;
	safety: ToolSafety;
	workspaceId?: string;
	arguments?: unknown;
}
export interface TekMemoMcpOptions {
	runtime: TekMemoMcpRuntime;
	name?: string;
	version?: string;
	instructions?: string;
	maxInputBytes?: number;
	maxOutputBytes?: number;
	requestTimeoutMs?: number;
	defaultPageSize?: number;
	maxPageSize?: number;
	readOnly?: boolean;
	authorize?: (context: AuthorizationContext) => boolean | Promise<boolean>;
	redact?: (value: unknown, context: { operation: string }) => unknown;
}
