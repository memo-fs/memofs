/**
 * TekMemo core — file-first memory runtime for agents and AI applications.
 *
 * This package provides the core memory model, document types, validation,
 * patching, and canonical file path conventions used by all TekMemo adapters.
 *
 * @public
 */

export * from "./agentfs";
// Explicit re-export resolves TS2308 ambiguity: isNotFoundError appears in multiple export * sources.
export { isNotFoundError } from "./agentfs";
export * from "./ai-sdk";
// Explicit type exports to resolve ambiguities between cloud-client re-exports
// and types of the same name from other sub-packages.
export type {
	MemoryKind,
	Page,
	RuntimeReadPolicy,
	RuntimeWritePolicy,
	SyncConflictResolution,
	SyncEventInput,
	SyncPullInput,
	SyncPullResult,
	SyncPushInput,
	SyncPushResult,
	SyncStatusInput,
	SyncStatusResult,
} from "./cloud-client";
export * from "./cloud-client";
export * from "./core/bootstrap/bootstrap-memory-store";
export * from "./core/chunking/chunk-text";
export * from "./core/commands/run-memory-command";
export * from "./core/constants/memory-paths";
export * from "./core/defaults/templates";
export * from "./core/documents/conversations-memory";
export * from "./core/documents/core-memory";
export * from "./core/documents/notes-memory";
export * from "./core/documents/source-manifest";
export * from "./core/errors/errors";
export * from "./core/events/memory-events";
export * from "./core/indexes/chunk-records";
export * from "./core/manifest/manifest";
export * from "./core/search/search-memory";
export * from "./core/snapshots/snapshot-records";
export * from "./core/stores/in-memory-store";
export * from "./core/types/config";
// Explicit type exports to resolve ambiguities from duplicate embedding types
// across sub-packages.
export type {
	EmbeddingRecord,
	EmbedTextsInput,
	EmbedTextsResult,
} from "./core/types/embeddings";
export * from "./core/types/embeddings";
// Explicit exports to resolve ambiguities from duplicate exports in sub-packages
export type { JsonObject, JsonPrimitive, JsonValue } from "./core/types/json";
export * from "./core/types/json";
export * from "./core/types/memory-commands";
export * from "./core/types/memory-documents";
export * from "./core/types/memory-store";
// consolidated subpath exports
export * from "./fs";
export * from "./graph";
// Explicit re-export resolves TS2308 ambiguity: cloneAndValidateMetadata appears in multiple export * sources.
export { cloneAndValidateMetadata } from "./graph";
export type { RecallResult as StoreRecallResult } from "./recall";
export * from "./recall";
export { assertNonEmptyString } from "./recall";
export * from "./rerank";
export type { RecallResult } from "./tekmemo";
export * from "./tekmemo";
export * from "./testing";
