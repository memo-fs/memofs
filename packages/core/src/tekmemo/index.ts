/**
 * Tekmemo unified client — the single entry point for all memory operations.
 *
 * @public
 */

export {
	extractConfigFile,
	type RecallEngineConfig,
	type ResolvedTekmemoConfig,
	resolveTekmemoConfig,
	type TekMemoConfigFile,
	type TekmemoCloudOptions,
	type TekmemoConfig,
} from "./config";
export {
	createLazyLocalEmbedder,
	type LazyLocalEmbedderOptions,
} from "./local-embedder";
export { sha256Hex } from "./sync/sha256";
export { Tekmemo } from "./Tekmemo";
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
	MemoryContextExpandableSection,
	MemoryContextExpansion,
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
