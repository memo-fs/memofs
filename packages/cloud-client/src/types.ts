/**
 * Public types for @tekmemo/cloud-client.
 *
 * The package is aligned with TekMemo Cloud's current project-scoped API:
 * /api/v1/projects/:projectId/...
 *
 * It intentionally does not import Cloudflare, D1, Better Auth, Polar, or any
 * server-only TekMemo Cloud internals.
 *
 * @public
 */

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue =
	| JsonPrimitive
	| JsonValue[]
	| { [key: string]: JsonValue };
export type JsonObject = { [key: string]: JsonValue };

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface TekMemoCloudMeta {
	requestId?: string;
	[key: string]: JsonValue | undefined;
}

export interface TekMemoCloudSuccessEnvelope<T> {
	data: T;
	meta?: TekMemoCloudMeta;
}

export interface TekMemoCloudErrorEnvelope {
	error: {
		code: string;
		message: string;
		details?: JsonValue;
	};
	meta?: TekMemoCloudMeta;
}

export type TekMemoCloudEnvelope<T> =
	| TekMemoCloudSuccessEnvelope<T>
	| TekMemoCloudErrorEnvelope;

/** Legacy generated-client shape. Not canonical. Kept only as compatibility. */
export type TekMemoLegacyCloudEnvelope<T> =
	| {
			ok: true;
			data: T;
			warnings?: string[];
			requestId?: string;
			meta?: TekMemoCloudMeta;
	  }
	| {
			ok: false;
			error: {
				code: string;
				message: string;
				details?: JsonValue;
			};
			requestId?: string;
			meta?: TekMemoCloudMeta;
	  };

export interface TekMemoCloudFetchResponse {
	readonly ok: boolean;
	readonly status: number;
	readonly statusText: string;
	readonly headers: Headers;
	text(): Promise<string>;
}

export type TekMemoCloudFetch = (
	input: URL | RequestInfo,
	init?: RequestInit,
) => Promise<TekMemoCloudFetchResponse>;

export interface TekMemoCloudRetryOptions {
	retries?: number;
	baseDelayMs?: number;
	maxDelayMs?: number;
	statuses?: number[];
}

export interface TekMemoCloudClientOptions {
	/** Base URL, usually https://memo.tekbreed.com/api/v1 or a self-hosted /api/v1 URL. */
	baseUrl: string;
	/** TekMemo API key, e.g. tk_live_... . Never pass provider keys here. */
	apiKey?: string;
	/** Default project used by project-scoped API calls. */
	defaultProjectId?: string;
	/** Optional workspace value kept for caller metadata/config. API calls are project-scoped. */
	defaultWorkspaceId?: string;
	fetch?: TekMemoCloudFetch;
	timeoutMs?: number;
	retry?: TekMemoCloudRetryOptions | false;
	headers?: Record<string, string>;
	userAgent?: string;
	requireApiKey?: boolean;
	/** Accept older { ok, data } envelopes temporarily during compatibility windows. */
	acceptLegacyEnvelope?: boolean;
}

export interface TekMemoCloudRequestOptions {
	method: HttpMethod;
	path: string;
	query?: Record<string, string | number | boolean | null | undefined>;
	body?: unknown;
	signal?: AbortSignal;
	requireApiKey?: boolean;
}

export interface TekMemoCloudRequestMeta {
	requestId?: string;
	status?: number;
	retryAfterMs?: number;
}

export type MemoryKind =
	| "decision"
	| "constraint"
	| "goal"
	| "preference"
	| "reference"
	| "summary"
	| "note";

export type RecallStrategy = "local" | "vector" | "hybrid";
export type RecallFallbackMode = "none" | "local";
export type RecallIndexMode = "all" | "changed" | "core" | "notes";
export type SyncConflictResolution = "keep_cloud" | "use_client" | "ignore";
export type RuntimeReadPolicy =
	| "local-first"
	| "cloud-first"
	| "local-only"
	| "cloud-only";
export type RuntimeWritePolicy =
	| "local-first"
	| "cloud-first"
	| "local-only"
	| "cloud-only";

export interface ProjectScopedInput {
	projectId?: string;
}

export interface ReadCoreMemoryInput extends ProjectScopedInput {}

export interface UpdateCoreMemoryInput extends ProjectScopedInput {
	content: string;
}

export interface CoreMemoryDocument {
	content: string;
	updatedAt?: string;
	version?: number;
}

export interface ListNotesInput extends ProjectScopedInput {
	limit?: number;
	cursor?: string;
	kind?: MemoryKind;
	tag?: string;
}

export interface CreateNoteInput extends ProjectScopedInput {
	kind?: MemoryKind;
	title?: string;
	content: string;
	tags?: string[];
	confidence?: number;
	source?: string;
	metadata?: JsonObject;
}

export interface MemoryNote {
	id: string;
	kind: MemoryKind;
	title?: string;
	content: string;
	tags?: string[];
	confidence?: number;
	source?: string;
	metadata?: JsonObject;
	createdAt?: string;
	updatedAt?: string;
}

export interface Page<T> {
	items: T[];
	nextCursor?: string;
}

export interface RecallQueryInput extends ProjectScopedInput {
	query: string;
	topK?: number;
	strategy?: RecallStrategy;
	rerank?: boolean;
	fallback?: RecallFallbackMode;
	filters?: JsonObject;
}

export interface RecallHit {
	id: string;
	text: string;
	score?: number;
	sourceType?: string;
	sourceId?: string;
	sourcePath?: string;
	metadata?: JsonObject;
}

export interface RecallQueryResult {
	items: RecallHit[];
	strategy?: RecallStrategy;
	fallbackUsed?: boolean;
	warnings?: string[];
}

export interface RecallIndexInput extends ProjectScopedInput {
	mode?: RecallIndexMode;
	force?: boolean;
}

export interface RecallIndexResult {
	jobId?: string;
	status: "queued" | "running" | "completed" | "skipped";
	indexed?: number;
	warnings?: string[];
}

export interface SyncEventInput {
	clientEventId: string;
	type: string;
	path?: string;
	payload?: JsonObject;
	payloadHash?: string;
	createdAt?: string;
	baseServerVersion?: number;
}

export interface SyncPushInput extends ProjectScopedInput {
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

export interface SyncPullInput extends ProjectScopedInput {
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

export interface SyncStatusInput extends ProjectScopedInput {
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

export interface ResolveConflictInput extends ProjectScopedInput {
	conflictId: string;
	resolution: SyncConflictResolution;
	content?: JsonObject;
}

export interface ResolveConflictResult {
	conflictId: string;
	resolved: boolean;
	serverVersion?: number;
}

export interface TekMemoCloudContextComposeInput extends ProjectScopedInput {
	query: string;
	topK?: number;
	memoryTypes?: Array<"core" | "notes" | "connectors">;
	strategy?: "auto" | "vector" | "local";
	rerank?: boolean;
	includeCoreMemory?: boolean;
	includeRecallResults?: boolean;
	includeGraphContext?: boolean;
	graphDepth?: number;
	graphLimit?: number;
	maxContextCharacters?: number;
	maxSourceCharacters?: number;
}

export interface TekMemoCloudContextComposeResult {
	context: string;
	sources: Array<{
		type: string;
		id?: string;
		text?: string;
		score?: number;
	}>;
	warnings?: string[];
}

export interface TekMemoCloudGraphSourceRef {
	sourceType:
		| "memory_document"
		| "memory_note"
		| "sync_event"
		| "conversation"
		| "manual"
		| "document"
		| "api";
	path?: string;
	url?: string;
	id?: string;
	span?: { start: number; end: number };
}

export interface TekMemoCloudGraphNode {
	nodeId: string;
	type: string;
	label: string;
	summary?: string;
	aliases?: string[];
	metadata?: Record<string, unknown>;
	sourceRefs?: TekMemoCloudGraphSourceRef[];
	status?: "active" | "deprecated" | "conflicted" | "deleted";
	validFrom?: string;
	validUntil?: string;
	expiresAt?: string;
}

export interface TekMemoCloudGraphEdge {
	edgeId?: string;
	fromNodeId: string;
	toNodeId: string;
	type: string;
	directed?: boolean;
	weight?: number;
	confidence?: number;
	importance?: number;
	metadata?: Record<string, unknown>;
	sourceRefs?: TekMemoCloudGraphSourceRef[];
	status?: "active" | "deprecated" | "conflicted" | "deleted";
	validFrom?: string;
	validUntil?: string;
	expiresAt?: string;
}

export interface TekMemoCloudGraphListInput extends ProjectScopedInput {
	cursor?: string;
	limit?: number;
	status?: "active" | "deprecated" | "conflicted" | "deleted";
}

export interface TekMemoCloudGraphNeighborsInput extends ProjectScopedInput {
	nodeId: string;
	direction?: "in" | "out" | "both";
	depth?: number;
	limit?: number;
	includeInactive?: boolean;
	includeExpired?: boolean;
}

export interface TekMemoCloudGraphPathInput extends ProjectScopedInput {
	fromNodeId: string;
	toNodeId: string;
	maxDepth?: number;
	includeInactive?: boolean;
	includeExpired?: boolean;
}

export interface TekMemoCloudExtractionRunInput extends ProjectScopedInput {
	mode?: "full" | "core" | "notes" | "sync" | "connectors";
	force?: boolean;
}

export interface TekMemoCloudExtractionRunResult {
	jobId?: string;
	status: "queued" | "running" | "completed" | "skipped";
	warnings?: string[];
}

export interface TekMemoCloudExtractionJobsInput extends ProjectScopedInput {
	limit?: number;
}

export interface TekMemoCloudEvalRunInput extends ProjectScopedInput {
	fixtureIds?: string[];
	graphDepth?: number;
	graphLimit?: number;
	includeGraphContext?: boolean;
	maxContextCharacters?: number;
	maxSourceCharacters?: number;
	rerank?: boolean;
	strategy?: "auto" | "vector" | "local";
	topK?: number;
}

export interface TekMemoCloudEvalRunResult {
	passRate: number;
	avgEvalPercentage?: number;
	failedCases?: number;
}

export interface TekMemoCloudBenchmarkRunInput
	extends TekMemoCloudEvalRunInput {
	iterations?: number;
	warmupIterations?: number;
	thresholds?: {
		maxAverageLatencyMs?: number;
		maxFailedCases?: number;
		maxFallbackRuns?: number;
		maxP95LatencyMs?: number;
		minAverageEvalPercentage?: number;
		minPassRate?: number;
	};
}

export interface TekMemoCloudBenchmarkRunResult {
	passRate: number;
	avgLatencyMs?: number;
	p95LatencyMs?: number;
	failedCases?: number;
}

export interface TekMemoCloudExportInput extends ProjectScopedInput {
	label?: string;
}

export interface TekMemoCloudExportResult {
	exportId: string;
	label?: string;
	downloadUrl?: string;
}

export interface TekMemoCloudSnapshotInput extends ProjectScopedInput {
	label?: string;
	trigger?: "manual" | "sync" | "system";
}

export interface TekMemoCloudSnapshotResult {
	snapshotId: string;
	label?: string;
	downloadUrl?: string;
}

export interface TekMemoCloudProviderInput {
	provider: "voyageai" | "openai" | "upstash-vector";
	projectId?: string | null;
	keyName: string;
	secret: string;
	restUrl?: string;
	embeddingModel?: string;
	rerankModel?: string;
}

export interface TekMemoCloudProviderCredential {
	credentialId: string;
	provider: string;
	keyName: string;
	projectId?: string;
	createdAt?: string;
}

export type AgentSessionStatus =
	| "active"
	| "completed"
	| "failed"
	| "abandoned";
export type AgentSessionWorkspaceProvider = "agentfs" | "local" | "hosted";
export type AgentSessionApprovalStatus =
	| "pending"
	| "approved"
	| "rejected"
	| "auto_saved";

export interface CreateAgentSessionInput extends ProjectScopedInput {
	sessionId: string;
	task: string;
	actorId?: string;
	workspaceProvider?: AgentSessionWorkspaceProvider;
	workspaceRoot?: string;
	metadata?: JsonObject;
}

export interface AgentSessionRecord {
	id: string;
	projectId: string;
	sessionId: string;
	task: string;
	actorId?: string;
	workspaceProvider: AgentSessionWorkspaceProvider;
	workspaceRoot?: string;
	status: AgentSessionStatus;
	metadata?: JsonObject;
	createdAt: string;
	completedAt?: string;
}

export interface CreateAgentSessionEventInput extends ProjectScopedInput {
	sessionId: string;
	type: string;
	message: string;
	metadata?: JsonObject;
	occurredAt?: string;
}

export interface AgentSessionEvent {
	id: string;
	projectId: string;
	sessionId: string;
	type: string;
	message: string;
	metadata?: JsonObject;
	occurredAt: string;
}

export interface ExtractAgentSessionMemoryInput extends ProjectScopedInput {
	sessionId: string;
	summary?: string;
	durableMemory?: string;
	followUps?: string;
	errors?: string;
	changes?: string;
	checkpointLabel?: string;
}

export interface AgentSessionExtraction {
	id: string;
	projectId: string;
	sessionId: string;
	summary: string;
	durableMemory: string;
	followUps: string;
	errors: string;
	changes: string;
	checkpointLabel?: string;
	approvalStatus: AgentSessionApprovalStatus;
	createdMemoryNoteId?: string;
	createdAt: string;
}

export interface ApproveAgentSessionMemoryInput extends ProjectScopedInput {
	sessionId: string;
	extractionId: string;
	content?: string;
	kind?: MemoryKind;
	title?: string;
	tags?: string[];
	approvedBy?: string;
}

export interface CompleteAgentSessionInput extends ProjectScopedInput {
	sessionId: string;
	status?: AgentSessionStatus;
	checkpointLabel?: string;
	completedAt?: string;
}

export interface TekMemoCloudMemoryClient {
	readCore(
		input?: ReadCoreMemoryInput,
		signal?: AbortSignal,
	): Promise<CoreMemoryDocument>;
	updateCore(
		input: UpdateCoreMemoryInput,
		signal?: AbortSignal,
	): Promise<CoreMemoryDocument>;
	listNotes(
		input?: ListNotesInput,
		signal?: AbortSignal,
	): Promise<Page<MemoryNote>>;
	createNote(input: CreateNoteInput, signal?: AbortSignal): Promise<MemoryNote>;
}

export interface TekMemoCloudRecallClient {
	query(
		input: RecallQueryInput,
		signal?: AbortSignal,
	): Promise<RecallQueryResult>;
	index(
		input?: RecallIndexInput,
		signal?: AbortSignal,
	): Promise<RecallIndexResult>;
}

export interface TekMemoCloudSyncClient {
	push(input: SyncPushInput, signal?: AbortSignal): Promise<SyncPushResult>;
	pull(input: SyncPullInput, signal?: AbortSignal): Promise<SyncPullResult>;
	status(
		input?: SyncStatusInput,
		signal?: AbortSignal,
	): Promise<SyncStatusResult>;
	resolveConflict(
		input: ResolveConflictInput,
		signal?: AbortSignal,
	): Promise<ResolveConflictResult>;
}

export interface TekMemoCloudHealthResult {
	ok: boolean;
	name?: string;
	version?: string;
	capabilities?: string[];
	warnings?: string[];
}

export interface TekMemoCloudContextClient {
	compose(
		input: TekMemoCloudContextComposeInput,
		signal?: AbortSignal,
	): Promise<TekMemoCloudContextComposeResult>;
}

export interface TekMemoCloudGraphClient {
	listNodes(
		input?: TekMemoCloudGraphListInput,
		signal?: AbortSignal,
	): Promise<Page<TekMemoCloudGraphNode>>;
	createNode(
		input: TekMemoCloudGraphNode,
		signal?: AbortSignal,
	): Promise<TekMemoCloudGraphNode>;
	listEdges(
		input?: TekMemoCloudGraphListInput,
		signal?: AbortSignal,
	): Promise<Page<TekMemoCloudGraphEdge>>;
	createEdge(
		input: TekMemoCloudGraphEdge,
		signal?: AbortSignal,
	): Promise<TekMemoCloudGraphEdge>;
	neighbors(
		input: TekMemoCloudGraphNeighborsInput,
		signal?: AbortSignal,
	): Promise<{
		nodes: TekMemoCloudGraphNode[];
		edges: TekMemoCloudGraphEdge[];
	}>;
	path(
		input: TekMemoCloudGraphPathInput,
		signal?: AbortSignal,
	): Promise<{
		nodes: TekMemoCloudGraphNode[];
		edges: TekMemoCloudGraphEdge[];
	}>;
}

export interface TekMemoCloudExtractionClient {
	run(
		input?: TekMemoCloudExtractionRunInput,
		signal?: AbortSignal,
	): Promise<TekMemoCloudExtractionRunResult>;
	jobs(
		input?: TekMemoCloudExtractionJobsInput,
		signal?: AbortSignal,
	): Promise<Page<{ jobId: string; status: string; createdAt?: string }>>;
}

export interface TekMemoCloudEvalClient {
	run(
		input?: TekMemoCloudEvalRunInput,
		signal?: AbortSignal,
	): Promise<TekMemoCloudEvalRunResult>;
}

export interface TekMemoCloudBenchmarkClient {
	run(
		input?: TekMemoCloudBenchmarkRunInput,
		signal?: AbortSignal,
	): Promise<TekMemoCloudBenchmarkRunResult>;
}

export interface TekMemoCloudExportClient {
	create(
		input?: TekMemoCloudExportInput,
		signal?: AbortSignal,
	): Promise<TekMemoCloudExportResult>;
	downloadUrl(
		input: { exportId: string } & ProjectScopedInput,
		signal?: AbortSignal,
	): Promise<{ downloadUrl: string }>;
}

export interface TekMemoCloudSnapshotClient {
	create(
		input?: TekMemoCloudSnapshotInput,
		signal?: AbortSignal,
	): Promise<TekMemoCloudSnapshotResult>;
	downloadUrl(
		input: { snapshotId: string } & ProjectScopedInput,
		signal?: AbortSignal,
	): Promise<{ downloadUrl: string }>;
}

export interface TekMemoCloudProviderClient {
	list(
		input?: ProjectScopedInput,
		signal?: AbortSignal,
	): Promise<TekMemoCloudProviderCredential[]>;
	create(
		input: TekMemoCloudProviderInput,
		signal?: AbortSignal,
	): Promise<TekMemoCloudProviderCredential>;
	test(
		input: { credentialId: string } & ProjectScopedInput,
		signal?: AbortSignal,
	): Promise<{ ok: boolean; message?: string }>;
}

export interface TekMemoCloudAgentSessionsClient {
	create(
		input: CreateAgentSessionInput,
		signal?: AbortSignal,
	): Promise<AgentSessionRecord>;
	addEvent(
		input: CreateAgentSessionEventInput,
		signal?: AbortSignal,
	): Promise<AgentSessionEvent>;
	extract(
		input: ExtractAgentSessionMemoryInput,
		signal?: AbortSignal,
	): Promise<AgentSessionExtraction>;
	approveMemory(
		input: ApproveAgentSessionMemoryInput,
		signal?: AbortSignal,
	): Promise<AgentSessionExtraction>;
	complete(
		input: CompleteAgentSessionInput,
		signal?: AbortSignal,
	): Promise<AgentSessionRecord>;
}

export interface TekMemoCloudClient {
	health(signal?: AbortSignal): Promise<TekMemoCloudHealthResult>;
	readiness(signal?: AbortSignal): Promise<TekMemoCloudHealthResult>;
	memory: TekMemoCloudMemoryClient;
	recall: TekMemoCloudRecallClient;
	context: TekMemoCloudContextClient;
	graph: TekMemoCloudGraphClient;
	extraction: TekMemoCloudExtractionClient;
	evals: TekMemoCloudEvalClient;
	benchmarks: TekMemoCloudBenchmarkClient;
	sync: TekMemoCloudSyncClient;
	exports: TekMemoCloudExportClient;
	snapshots: TekMemoCloudSnapshotClient;
	providers: TekMemoCloudProviderClient;
	agentSessions: TekMemoCloudAgentSessionsClient;
}

export interface TekMemoRuntime {
	readCoreMemory(signal?: AbortSignal): Promise<CoreMemoryDocument>;
	updateCoreMemory(
		input: { content: string },
		signal?: AbortSignal,
	): Promise<CoreMemoryDocument>;
	listNotes(
		input?: Omit<ListNotesInput, "projectId">,
		signal?: AbortSignal,
	): Promise<Page<MemoryNote>>;
	createNote(
		input: Omit<CreateNoteInput, "projectId">,
		signal?: AbortSignal,
	): Promise<MemoryNote>;
	recall(
		input: Omit<RecallQueryInput, "projectId">,
		signal?: AbortSignal,
	): Promise<RecallQueryResult>;
	contextCompose?(
		input: Omit<TekMemoCloudContextComposeInput, "projectId">,
		signal?: AbortSignal,
	): Promise<TekMemoCloudContextComposeResult>;
	index?(
		input?: Omit<RecallIndexInput, "projectId">,
		signal?: AbortSignal,
	): Promise<RecallIndexResult>;
	syncPush?(
		input: Omit<SyncPushInput, "projectId">,
		signal?: AbortSignal,
	): Promise<SyncPushResult>;
	syncPull?(
		input: Omit<SyncPullInput, "projectId">,
		signal?: AbortSignal,
	): Promise<SyncPullResult>;
	syncStatus?(
		input?: Omit<SyncStatusInput, "projectId">,
		signal?: AbortSignal,
	): Promise<SyncStatusResult>;
	upsertGraphNodes?(
		input: { nodes: TekMemoCloudGraphNode[] },
		signal?: AbortSignal,
	): Promise<TekMemoCloudGraphNode[]>;
	upsertGraphEdges?(
		input: { edges: TekMemoCloudGraphEdge[] },
		signal?: AbortSignal,
	): Promise<TekMemoCloudGraphEdge[]>;
	graphNeighbors?(
		input: Omit<TekMemoCloudGraphNeighborsInput, "projectId">,
		signal?: AbortSignal,
	): Promise<{
		nodes: TekMemoCloudGraphNode[];
		edges: TekMemoCloudGraphEdge[];
	}>;
	graphPath?(
		input: Omit<TekMemoCloudGraphPathInput, "projectId">,
		signal?: AbortSignal,
	): Promise<{
		nodes: TekMemoCloudGraphNode[];
		edges: TekMemoCloudGraphEdge[];
	}>;
}

export interface CreateCloudRuntimeOptions {
	client: TekMemoCloudClient;
	projectId: string;
}

export interface CreateHybridRuntimeOptions {
	local: TekMemoRuntime;
	cloud: TekMemoRuntime;
	readPolicy?: RuntimeReadPolicy;
	writePolicy?: RuntimeWritePolicy;
	onWarning?: (warning: string) => void;
}
