/**
 * Tekmemo unified client — the single entry point for all memory operations.
 *
 * @public
 */

export {
	type LazyLocalEmbedderOptions,
	createLazyLocalEmbedder,
} from "./local-embedder";
export { sha256Hex } from "./sync/sha256";
export {
	type RecallEngineConfig,
	type ResolvedTekmemoConfig,
	resolveTekmemoConfig,
	type TekmemoCloudOptions,
	type TekmemoConfig,
} from "./config";
export { Tekmemo } from "./Tekmemo";
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
	RuntimeReadPolicy,
	RuntimeWritePolicy,
	SnapshotMemoryInput,
	SnapshotMemoryResult,
	SourceRef,
	SyncPullInput,
	SyncPullResult,
	SyncPushCompleteInput,
	SyncPushCompleteResult,
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
} from "./types";
