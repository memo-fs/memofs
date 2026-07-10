/**
 * Type declarations and interface definitions for MCP Server execution.
 *
 * Memory/recall/graph/sync types are imported from @memofs/core to avoid duplication.
 * Only MCP-protocol-specific types (tool results, definitions, options) are defined here.
 *
 * The runtime surface mirrors the v1.0.0-beta.1 contract: every operation runs in the
 * local engine against the canonical `.memofs/` files, and the cloud is a dumb file
 * replica exposed only through `sync.{push,pull,status}` (+ `health`/`readiness`). The
 * cloud-engine surface (context compose, extraction, evals, benchmarks, exports, hosted
 * snapshots, providers, and event-level conflict resolution) has been deleted — see
 * `docs/architecture/cloud-sync-and-refactor.md` §7 and §9.
 *
 * @module types
 */
import type { Page } from "@memofs/core";

export type {
	AgentSessionCompleteInput,
	AgentSessionExtractResult,
	AgentSessionFileInput,
	AgentSessionResult,
	AgentSessionStartInput,
	ConsolidateMemoryInput,
	ConsolidateMemoryResult,
	GraphEdgeInput,
	GraphNeighborsInput,
	GraphNodeInput,
	GraphPathInput,
	GraphPathResult,
	JsonObject,
	JsonPrimitive,
	JsonValue,
	ListGraphInput,
	MemoFSHealthResult,
	MemoFSRuntimeMode,
	MemoryContextInput,
	MemoryContextResult,
	MemoryDocumentResult,
	MemoryKind,
	Page,
	ReadMemoryInput,
	RecallInput,
	RecallItem,
	RecallResult,
	RecentMemoryInput,
	RecentMemoryResult,
	SnapshotMemoryInput,
	SnapshotMemoryResult,
	SourceRef,
	SyncPullInput,
	SyncPullResult,
	SyncPushInput,
	SyncPushResult,
	SyncStatusInput,
	SyncStatusResult,
	ValidateMemoryInput,
	ValidateMemoryResult,
	WriteMemoryInput,
	WriteMemoryResult,
} from "@memofs/core";

import type {
	AgentSessionCompleteInput,
	AgentSessionExtractResult,
	AgentSessionFileInput,
	AgentSessionResult,
	AgentSessionStartInput,
	ConsolidateMemoryInput,
	ConsolidateMemoryResult,
	GraphEdgeInput,
	GraphNeighborsInput,
	GraphNodeInput,
	GraphPathInput,
	GraphPathResult,
	JsonObject,
	ListGraphInput,
	MemoFSHealthResult,
	MemoryContextInput,
	MemoryContextResult,
	MemoryDocumentResult,
	ReadMemoryInput,
	RecallInput,
	RecallResult,
	RecentMemoryInput,
	RecentMemoryResult,
	SnapshotMemoryInput,
	SnapshotMemoryResult,
	SyncPullInput,
	SyncPullResult,
	SyncPushInput,
	SyncPushResult,
	SyncStatusInput,
	SyncStatusResult,
	ValidateMemoryInput,
	ValidateMemoryResult,
	WriteMemoryInput,
	WriteMemoryResult,
} from "@memofs/core";

export type ToolSafety = "read" | "write" | "destructive" | "external";
export type McpRole = "user" | "assistant";

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

export interface AuthorizationContext {
	operation: string;
	safety: ToolSafety;
	workspaceId?: string;
	arguments: unknown;
}

export interface MemoFSMcpOptions {
	runtime: MemoFSMcpRuntime;
	name?: string;
	version?: string;
	instructions?: string;
	readOnly?: boolean;
	defaultPageSize?: number;
	maxPageSize?: number;
	requestTimeoutMs?: number;
	maxInputBytes?: number;
	maxOutputBytes?: number;
	authorize?: (context: AuthorizationContext) => Promise<boolean> | boolean;
	redact?: (args: unknown) => unknown;
}

/**
 * Runtime contract implemented by every MCP server entrypoint.
 *
 * The local runtime implements every engine-backed method (recall, writeMemory,
 * graph*) against the canonical `.memofs/` files; the three `sync*` methods
 * additionally mirror those files to/from the cloud replica. The Worker cloud
 * runtime implements only `health`, `readiness`, and `sync*` — every
 * engine-backed method is optional here so a file-replica runtime can omit it,
 * and the MCP tool/resource layers report such calls as unsupported. There is no
 * cloud-engine surface: recall/memory/graph/agentfs run locally, and conflict
 * resolution is last-writer-wins (see `docs/architecture/cloud-sync-and-refactor.md`
 * §7 and §9).
 */
export interface MemoFSMcpRuntime {
	health(signal?: AbortSignal): Promise<MemoFSHealthResult>;
	context?(
		input: MemoryContextInput,
		signal?: AbortSignal,
	): Promise<MemoryContextResult>;
	recall?(input: RecallInput, signal?: AbortSignal): Promise<RecallResult>;
	writeMemory?(
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
	upsertGraphNodes?(
		input: {
			workspaceId?: string;
			projectId?: string;
			nodes: GraphNodeInput[];
		},
		signal?: AbortSignal,
	): Promise<{ nodes: GraphNodeInput[] }>;
	upsertGraphEdges?(
		input: {
			workspaceId?: string;
			projectId?: string;
			edges: GraphEdgeInput[];
		},
		signal?: AbortSignal,
	): Promise<{ edges: GraphEdgeInput[] }>;
	graphNeighbors?(
		input: GraphNeighborsInput,
		signal?: AbortSignal,
	): Promise<
		Page<{
			node: GraphNodeInput;
			edge: GraphEdgeInput;
			direction: "in" | "out";
		}>
	>;
	graphPath?(
		input: GraphPathInput,
		signal?: AbortSignal,
	): Promise<GraphPathResult>;
	listGraphNodes?(
		input: ListGraphInput,
		signal?: AbortSignal,
	): Promise<Page<GraphNodeInput>>;
	listGraphEdges?(
		input: ListGraphInput,
		signal?: AbortSignal,
	): Promise<Page<GraphEdgeInput>>;
	consolidateMemory?(
		input: ConsolidateMemoryInput,
		signal?: AbortSignal,
	): Promise<ConsolidateMemoryResult>;
}
