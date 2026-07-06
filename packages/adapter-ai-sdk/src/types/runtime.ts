/**
 * Tool-layer types for the TekMemo Vercel AI SDK adapter.
 *
 * @remarks
 * The framework-neutral runtime contract (`TekMemoMemoryRuntime` and its
 * `MemoryRuntime*` value types) lives in `@memofs/core` core and is
 * re-exported here for adapter consumers. This file owns only the **L2
 * tool-layer** types — memory scopes, access contexts, and the options that
 * shape the AI SDK memory tool / context builders. These are Vercel-AI-SDK-
 * facing concerns and do not belong in core.
 *
 * See docs/adr/0007-ai-sdk-extraction.md (L1/L2 split).
 *
 * @public
 */

// L1 — framework-neutral runtime contract, owned by core. Re-exported so
// adapter consumers can import everything from this package.
export type {
	JsonArray,
	JsonObject,
	JsonPrimitive,
	JsonValue,
	MemoryRuntimeCoreMemoryDocument,
	MemoryRuntimeCreateNoteInput,
	MemoryRuntimeIndexInput,
	MemoryRuntimeIndexResult,
	MemoryRuntimeListNotesInput,
	MemoryRuntimeNote,
	MemoryRuntimeNoteKind,
	MemoryRuntimePage,
	MemoryRuntimeRecallHit,
	MemoryRuntimeRecallInput,
	MemoryRuntimeRecallResult,
	MemoryRuntimeRecallStrategy,
	TekMemoMemoryRuntime,
} from "@memofs/core";

// Imported locally (not just re-exported) so the L2 interfaces below can
// reference the runtime contract without importing it again from core.
import type { JsonObject, TekMemoMemoryRuntime } from "@memofs/core";

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

export interface AiMemoryScopeMetadata {
	scope: AiMemoryScope;
	visibility: AiMemoryVisibility;
	tenantId?: string;
	workspaceId?: string;
	projectId?: string;
	userId?: string;
	conversationId?: string;
	participantIds?: string[];
	actorId?: string;
	createdByPackage?: "@memofs/adapter-ai-sdk";
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
	runtime: TekMemoMemoryRuntime;
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
	runtime: TekMemoMemoryRuntime;
	access: AiMemoryAccessContext;
	allowWrites?: boolean;
	allowCoreUpdates?: boolean;
	allowIndexing?: boolean;
	allowSecrets?: boolean;
	maxContentChars?: number;
}
