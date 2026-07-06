/**
 * MemoFS unified client — the single entry point for all memory operations.
 *
 * @public
 */

export {
	extractConfigFile,
	type RecallEngineConfig,
	type ResolvedMemoFsConfig,
	resolveMemoFsConfig,
	type MemoFsConfigFile,
	type MemoFsCloudOptions,
	type MemoFsConfig,
} from "./config";
export {
	createLazyLocalEmbedder,
	type LazyLocalEmbedderOptions,
} from "./local-embedder";
export { sha256Hex } from "./sync/sha256";
export { MemoFS } from "./MemoFS";
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
	MemoFSHealthResult,
	MemoFSRuntimeMode,
	ValidateMemoryInput,
	ValidateMemoryResult,
	WriteMemoryInput,
	WriteMemoryResult,
} from "./types";
