/**
 * @file Type definitions for the @tekmemo/core/recall package.
 *
 * @remarks
 * This module defines the core data structures used throughout the recall package
 * including documents, queries, results, filters, and store interfaces.
 *
 * @public
 */

import type { JsonPrimitive, JsonValue } from "../core/types/json";

export type { JsonPrimitive, JsonValue };

/**
 * The type of memory being stored.
 *
 * @remarks
 * Predefined values include "core", "notes", "conversation", "event", "graph", and "snapshot".
 * Additional string values are allowed for extensibility.
 *
 * @public
 */
export type RecallMemoryType =
	| "core"
	| "notes"
	| "conversation"
	| "event"
	| "graph"
	| "snapshot"
	| (string & {});

/**
 * Metadata associated with a recall document.
 *
 * @remarks
 * Contains identifiers for multi-tenant, project, and source scoping.
 * Additional arbitrary JSON-serializable properties are allowed via index signature.
 *
 * @public
 */
export interface RecallMetadata {
	/** Optional tenant identifier for multi-tenant isolation */
	tenantId?: string;
	/** Project identifier that owns this document */
	projectId: string;
	/** Type of the source (e.g., "document", "note", "conversation") */
	sourceType: string;
	/** Unique identifier of the source within the project */
	sourceId: string;
	/** The type of memory being stored */
	memoryType: RecallMemoryType;
	/** Optional section name within the source */
	sectionName?: string;
	/** Optional file path of the source */
	sourcePath?: string;
	/** Optional hash of the content chunk */
	chunkHash?: string;
	/** Optional hash of the entire source */
	sourceHash?: string;
	/** Optional ISO 8601 timestamp when the document was created */
	createdAt?: string;
	/** Optional ISO 8601 timestamp when the document was last updated */
	updatedAt?: string;
	/** Additional arbitrary JSON-serializable metadata */
	[key: string]: JsonValue | undefined;
}

/**
 * A document stored in the recall memory system.
 *
 * @public
 */
export interface RecallDocument {
	/** Unique identifier for the document within its namespace */
	id: string;
	/** The text content of the document */
	text: string;
	/** Vector embedding representing the semantic content */
	embedding: number[];
	/** Metadata associated with the document */
	metadata: RecallMetadata;
	/** Optional namespace for logical grouping (defaults to store's defaultNamespace) */
	namespace?: string;
}

/**
 * Operators available for filtering metadata values.
 *
 * @remarks
 * Each operator object contains exactly one operator key with its operand.
 *
 * @public
 */
export type RecallFilterOperator =
	| { $eq: JsonValue }
	| { $ne: JsonValue }
	| { $in: JsonValue[] }
	| { $nin: JsonValue[] }
	| { $gt: number }
	| { $gte: number }
	| { $lt: number }
	| { $lte: number }
	| { $exists: boolean }
	| { $contains: JsonPrimitive };

/**
 * A value in a recall filter - either a plain JSON value or an operator object.
 *
 * @public
 */
export type RecallFilterValue = JsonValue | RecallFilterOperator;
/**
 * A filter for querying documents based on metadata values.
 *
 * @remarks
 * Keys can use dot notation for nested access (e.g., "metadata.sourceType").
 *
 * @public
 */
export type RecallFilter = Record<string, RecallFilterValue>;

/**
 * A query for semantic recall search.
 *
 * @public
 */
export interface RecallQuery {
	/** Vector embedding to search against */
	embedding: number[];
	/** Maximum number of results to return */
	topK: number;
	/** Optional metadata filter to apply before similarity scoring */
	filter?: RecallFilter;
	/** Optional namespace to scope the query (defaults to store's defaultNamespace) */
	namespace?: string;
	/** Whether to include text in results (defaults to true) */
	includeText?: boolean;
	/** Whether to include metadata in results (defaults to true) */
	includeMetadata?: boolean;
}

/**
 * A result from a recall query.
 *
 * @public
 */
export interface RecallResult {
	/** Document identifier */
	id: string;
	/** Similarity score (typically cosine similarity, range [-1, 1]) */
	score: number;
	/** Optional text content (included when includeText is true) */
	text?: string;
	/** Optional metadata (included when includeMetadata is true) */
	metadata?: Record<string, JsonValue | undefined>;
	/** The namespace of the document */
	namespace?: string;
}

/**
 * Input for deleting documents by their source identifiers.
 *
 * @public
 */
export interface DeleteBySourceInput {
	/** Project identifier */
	projectId: string;
	/** Type of the source */
	sourceType: string;
	/** Unique identifier of the source */
	sourceId: string;
	/** Optional namespace scope (defaults to store's defaultNamespace) */
	namespace?: string;
}

/**
 * Interface for a recall memory store.
 *
 * @remarks
 * Implement this interface to create custom recall storage backends
 * (e.g., vector databases, file-based stores).
 *
 * @public
 */
export interface RecallStore {
	/**
	 * Insert or update documents in the store.
	 *
	 * @param documents - Array of documents to upsert
	 * @returns Promise that resolves when the operation is complete
	 */
	upsert(documents: RecallDocument[]): Promise<void>;
	/**
	 * Query the store for semantically similar documents.
	 *
	 * @param query - The recall query containing embedding and filters
	 * @returns Promise resolving to an array of matching results sorted by score
	 */
	query(query: RecallQuery): Promise<RecallResult[]>;
	/**
	 * Delete documents by their IDs.
	 *
	 * @param ids - Array of document IDs to delete
	 * @param options - Optional namespace scoping
	 * @returns Promise that resolves when the operation is complete
	 */
	delete(ids: string[], options?: { namespace?: string }): Promise<void>;
	/**
	 * Delete all documents matching the source identifiers.
	 *
	 * @param input - Source identification for documents to delete
	 * @returns Promise that resolves when the operation is complete
	 */
	deleteBySource(input: DeleteBySourceInput): Promise<void>;
}

/**
 * Capabilities supported by a recall store implementation.
 *
 * @public
 */
export interface RecallStoreCapabilities {
	/** Whether the store supports namespace-scoped operations */
	supportsNamespaces: boolean;
	/** Whether the store supports metadata filtering */
	supportsMetadataFiltering: boolean;
	/** Whether the store supports deleting by source identifiers */
	supportsDeleteBySource: boolean;
	/** Whether the store persists document text */
	supportsTextStorage: boolean;
	/** Whether the store computes cosine similarity scores */
	supportsCosineScore: boolean;
}

/**
 * Options for creating an InMemoryRecallStore.
 *
 * @public
 */
export interface InMemoryRecallStoreOptions {
	/** Expected embedding dimension (validated on upsert if provided) */
	dimension?: number;
	/** How to handle duplicate document IDs (defaults to "error") */
	duplicateDocumentIdBehavior?: "error" | "last-write-wins";
	/** Default namespace for documents without an explicit namespace */
	defaultNamespace?: string;
	/** Optional function to generate ISO 8601 timestamps (defaults to new Date().toISOString()) */
	now?: () => string;
}

/**
 * Options for running recall store contract tests.
 *
 * @internal
 */
export interface RecallStoreContractOptions {
	/** Namespace to use for contract tests */
	namespace?: string;
	/** Expected embedding dimension for contract tests */
	dimension?: number;
}
