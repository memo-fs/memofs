/**
 * Runtime and scope types for TekMemo AI SDK integration.
 *
 * These types are intentionally structural. A runtime returned by
 * `@tekbreed/tekmemo/cloud` can be passed here without this package importing
 * cloud-client directly. This keeps @tekbreed/tekmemo/ai-sdk cloud-optional while making
 * cloud and hybrid usage plug-and-play.
 *
 * @public
 */

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue =
	| JsonPrimitive
	| JsonValue[]
	| { [key: string]: JsonValue };
export type JsonObject = { [key: string]: JsonValue | undefined };

export type AiMemoryScope =
	| "project"
	| "workspace"
	| "tenant"
	| "user"
	| "conversation"
	| "participant-shared";

export type AiMemoryVisibility = "private" | "shared" | "system";

export type AiMemoryKind =
	| "decision"
	| "constraint"
	| "goal"
	| "preference"
	| "reference"
	| "summary"
	| "note";

export interface AiMemoryScopeMetadata extends JsonObject {
	scope: AiMemoryScope;
	visibility: AiMemoryVisibility;
	tenantId?: string;
	workspaceId?: string;
	projectId?: string;
	userId?: string;
	conversationId?: string;
	participantIds?: string[];
	actorId?: string;
	createdByPackage?: "@tekbreed/tekmemo/ai-sdk";
}

export interface AiMemoryAccessContext {
	/** Tenant/org scope, when available. */
	tenantId?: string;
	/** Workspace scope, when available. */
	workspaceId?: string;
	/** Project/app scope. Required for cloud runtime calls. */
	projectId?: string;
	/** Authenticated end-user whose private memory may be read/written. */
	userId?: string;
	/** Active conversation/thread. */
	conversationId?: string;
	/** Participants in a group conversation. */
	participantIds?: string[];
	/** Actor performing this operation, e.g. assistant id, agent name, user id. */
	actorId?: string;
	/** Explicitly allowed scopes. Defaults to safe scopes derived from IDs. */
	allowedScopes?: AiMemoryScope[];
	/** Whether private user memory can be read. Defaults to true only when userId exists. */
	includeUserMemory?: boolean;
	/** Whether conversation memory can be read. Defaults to true only when conversationId exists. */
	includeConversationMemory?: boolean;
	/** Whether project/workspace memory can be read. Defaults to true. */
	includeProjectMemory?: boolean;
	/** Whether participant-shared memory can be read. Defaults to true only when participantIds has values. */
	includeSharedParticipantMemory?: boolean;
}

export interface NormalizedAiMemoryAccessContext extends AiMemoryAccessContext {
	allowedScopes: AiMemoryScope[];
	participantIds: string[];
	includeUserMemory: boolean;
	includeConversationMemory: boolean;
	includeProjectMemory: boolean;
	includeSharedParticipantMemory: boolean;
}

export interface AiRuntimeCoreMemoryDocument {
	content: string;
	updatedAt?: string;
	version?: number;
}

export interface AiRuntimeMemoryNote {
	id: string;
	kind: AiMemoryKind;
	title?: string;
	content: string;
	tags?: string[];
	confidence?: number;
	source?: string;
	metadata?: JsonObject;
	createdAt?: string;
	updatedAt?: string;
}

export interface AiRuntimePage<T> {
	items: T[];
	nextCursor?: string;
}

export interface AiRuntimeRecallHit {
	id: string;
	text: string;
	score?: number;
	sourceType?: string;
	sourceId?: string;
	sourcePath?: string;
	metadata?: JsonObject;
}

export interface AiRuntimeRecallResult {
	items: AiRuntimeRecallHit[];
	strategy?: "local" | "vector" | "hybrid" | string;
	fallbackUsed?: boolean;
	warnings?: string[];
}

export interface AiRuntimeRecallInput {
	query: string;
	topK?: number;
	strategy?: "local" | "vector" | "hybrid";
	rerank?: boolean;
	fallback?: "none" | "local";
	filters?: JsonObject;
}

export interface AiRuntimeListNotesInput {
	limit?: number;
	cursor?: string;
	kind?: AiMemoryKind;
	tag?: string;
}

export interface AiRuntimeCreateNoteInput {
	kind?: AiMemoryKind;
	title?: string;
	content: string;
	tags?: string[];
	confidence?: number;
	source?: string;
	metadata?: JsonObject;
}

export interface AiRuntimeIndexInput {
	mode?: "all" | "changed" | "core" | "notes";
	force?: boolean;
}

export interface AiRuntimeIndexResult {
	jobId?: string;
	status: "queued" | "running" | "completed" | "skipped";
	indexed?: number;
	warnings?: string[];
}

export interface TekMemoAiRuntime {
	readCoreMemory(signal?: AbortSignal): Promise<AiRuntimeCoreMemoryDocument>;
	updateCoreMemory(
		input: { content: string },
		signal?: AbortSignal,
	): Promise<AiRuntimeCoreMemoryDocument>;
	listNotes(
		input?: AiRuntimeListNotesInput,
		signal?: AbortSignal,
	): Promise<AiRuntimePage<AiRuntimeMemoryNote>>;
	createNote(
		input: AiRuntimeCreateNoteInput,
		signal?: AbortSignal,
	): Promise<AiRuntimeMemoryNote>;
	recall(
		input: AiRuntimeRecallInput,
		signal?: AbortSignal,
	): Promise<AiRuntimeRecallResult>;
	index?(
		input?: AiRuntimeIndexInput,
		signal?: AbortSignal,
	): Promise<AiRuntimeIndexResult>;
}

export interface ScopedMemoryWriteInput {
	content: string;
	kind?: AiMemoryKind;
	title?: string;
	tags?: string[];
	confidence?: number;
	source?: string;
	scope?: AiMemoryScope;
	visibility?: AiMemoryVisibility;
	metadata?: JsonObject;
}

export interface BuildRuntimeMemoryContextInput {
	baseInstructions?: string;
	runtime: TekMemoAiRuntime;
	access: AiMemoryAccessContext;
	query?: string;
	includeCoreMemory?: boolean;
	includeNotes?: boolean;
	includeRecall?: boolean;
	noteLimit?: number;
	recallLimit?: number;
	maxChars?: number;
	maxSectionChars?: number;
	signal?: AbortSignal;
}

export interface BuildRuntimeMemoryContextResult {
	text: string;
	warnings: string[];
	sections: Array<{
		title: string;
		charLength: number;
	}>;
}

export interface RuntimeMemoryToolOptions {
	runtime: TekMemoAiRuntime;
	access: AiMemoryAccessContext;
	allowWrites?: boolean;
	allowCoreUpdates?: boolean;
	allowIndexing?: boolean;
	allowSecrets?: boolean;
	maxContentChars?: number;
}
