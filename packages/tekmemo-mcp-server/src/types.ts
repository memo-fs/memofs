/**
 * Type declarations and interface definitions for MCP Server execution.
 *
 * Memory/recall/graph/sync types are imported from @tekbreed/tekmemo to avoid duplication.
 * Only MCP-protocol-specific types (tool results, definitions, options) are defined here.
 *
 * @module types
 */

export type {
	AgentSessionCompleteInput,
	AgentSessionExtractResult,
	AgentSessionFileInput,
	AgentSessionResult,
	AgentSessionStartInput,
	GraphEdgeInput,
	GraphNeighborsInput,
	GraphNodeInput,
	GraphPathInput,
	GraphPathResult,
	JsonObject,
	JsonPrimitive,
	JsonValue,
	ListGraphInput,
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
	ResolveSyncConflictInput,
	ResolveSyncConflictResult,
	RuntimeReadPolicy,
	RuntimeWritePolicy,
	SnapshotMemoryInput,
	SnapshotMemoryResult,
	SourceRef,
	SyncConflictResolution,
	SyncEventInput,
	SyncPullInput,
	SyncPullResult,
	SyncPushInput,
	SyncPushResult,
	SyncStatusInput,
	SyncStatusResult,
	TekMemoHealthResult,
	TekMemoRuntimeMode,
	ValidateMemoryInput,
	ValidateMemoryResult,
	WriteMemoryInput,
	WriteMemoryResult,
} from "@tekbreed/tekmemo";

import type {
	AgentSessionCompleteInput,
	AgentSessionExtractResult,
	AgentSessionFileInput,
	AgentSessionResult,
	AgentSessionStartInput,
	GraphEdgeInput,
	GraphNeighborsInput,
	GraphNodeInput,
	GraphPathInput,
	GraphPathResult,
	JsonObject,
	ListGraphInput,
	MemoryContextInput,
	MemoryContextResult,
	MemoryDocumentResult,
	ReadMemoryInput,
	RecallInput,
	RecallItem,
	RecallResult,
	RecentMemoryInput,
	RecentMemoryResult,
	ResolveSyncConflictInput,
	SnapshotMemoryInput,
	SnapshotMemoryResult,
	SyncPullInput,
	SyncPullResult,
	SyncPushInput,
	SyncPushResult,
	SyncStatusInput,
	SyncStatusResult,
	TekMemoHealthResult,
	ValidateMemoryInput,
	ValidateMemoryResult,
	WriteMemoryInput,
	WriteMemoryResult,
} from "@tekbreed/tekmemo";

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

export interface TekMemoMcpOptions {
	runtime: TekMemoMcpRuntime;
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
	): Promise<unknown>;
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

import type { Page } from "@tekbreed/tekmemo";
