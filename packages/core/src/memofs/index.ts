/**
 * MemoFS unified client — the single entry point for all memory operations.
 *
 * @public
 */

export {
	extractConfigFile,
	type MemoFsCloudOptions,
	type MemoFsConfig,
	type MemoFsConfigFile,
	type RecallEngineConfig,
	type ResolvedMemoFsConfig,
	resolveMemoFsConfig,
} from "./config";
export {
	decodeCursor,
	encodeCursor,
	normalizeLimit,
	type PaginationOptions,
	paginateArray,
} from "./helpers/utils";
export {
	createLazyLocalEmbedder,
	type LazyLocalEmbedderOptions,
} from "./local-embedder";
export { MemoFS } from "./memo-fs";
export { sha256Hex } from "./sync/sha256";
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
	SnapshotMemoryInput,
	SnapshotMemoryResult,
	SourceRef,
	SyncPushCompleteInput,
	SyncPushCompleteResult,
	ValidateMemoryInput,
	ValidateMemoryResult,
	WriteMemoryInput,
	WriteMemoryResult,
} from "./types";
export {
	isTaskType,
	TASK_TYPES,
	type TaskType,
} from "./types";
