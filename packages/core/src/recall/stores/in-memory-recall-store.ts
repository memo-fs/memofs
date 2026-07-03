/**
 * @file In-memory implementation of the RecallStore interface.
 *
 * @remarks
 * This module provides a fully-featured in-memory recall store with:
 * - Vector similarity search using cosine similarity
 * - Metadata filtering with operator support
 * - Namespace isolation
 * - Duplicate document ID handling
 *
 * @public
 */

import { RecallDimensionError, RecallValidationError } from "../errors/errors";
import { matchesRecallFilter } from "../filters/filter-match";
import { cosineSimilarity, sortRecallScores } from "../scoring/cosine";
import type {
	DeleteBySourceInput,
	InMemoryRecallStoreOptions,
	RecallDocument,
	RecallQuery,
	RecallResult,
	RecallStore,
	RecallStoreCapabilities,
} from "../types";
import { cloneRecord } from "../utils/json";
import { normalizeNamespace } from "../utils/namespace";
import {
	assertSafeId,
	validateRecallDocuments,
	validateRecallQuery,
} from "../validation/assertions";

/**
 * Internal representation of a stored document.
 *
 * @internal
 */
interface StoredDocument {
	id: string;
	text: string;
	embedding: number[];
	metadata: Record<string, unknown>;
	namespace: string;
	insertedAt: string;
}

/**
 * In-memory implementation of the RecallStore interface.
 *
 * @remarks
 * Documents are stored in a Map keyed by "namespace:id". Supports cosine similarity
 * scoring, metadata filtering, namespace isolation, and configurable duplicate ID behavior.
 *
 * @public
 */
export class InMemoryRecallStore implements RecallStore {
	readonly capabilities: RecallStoreCapabilities = {
		supportsNamespaces: true,
		supportsMetadataFiltering: true,
		supportsDeleteBySource: true,
		supportsTextStorage: true,
		supportsCosineScore: true,
	};

	private readonly documents = new Map<string, StoredDocument>();
	private readonly dimension?: number;
	private readonly duplicateDocumentIdBehavior: "error" | "last-write-wins";
	private readonly defaultNamespace: string;
	private readonly now: () => string;
	private inferredDimension: number | undefined;

	/**
	 * Creates a new InMemoryRecallStore instance.
	 *
	 * @param options - Configuration options for the store
	 * @throws {RecallDimensionError} If dimension is provided but not a positive integer
	 *
	 * @public
	 */
	constructor(options: InMemoryRecallStoreOptions = {}) {
		if (
			options.dimension !== undefined &&
			(!Number.isInteger(options.dimension) || options.dimension <= 0)
		) {
			throw new RecallDimensionError("dimension must be a positive integer.", {
				dimension: options.dimension,
			});
		}
		this.dimension = options.dimension;
		this.duplicateDocumentIdBehavior =
			options.duplicateDocumentIdBehavior ?? "error";
		this.defaultNamespace = normalizeNamespace(
			options.defaultNamespace,
			"default",
		);
		this.now = options.now ?? (() => new Date().toISOString());
	}

	/**
	 * Inserts or updates documents in the store.
	 *
	 * @param documents - Array of documents to upsert
	 * @throws {RecallValidationError} If documents array is invalid or contains duplicates (when error behavior is set)
	 * @throws {RecallDimensionError} If embedding dimensions don't match the store's expected dimension
	 *
	 * @public
	 */
	async upsert(documents: RecallDocument[]): Promise<void> {
		const expectedDimension = this.dimension ?? this.inferredDimension;
		const validated = validateRecallDocuments(documents, expectedDimension);
		if (validated.length === 0) return;

		const batchSeen = new Set<string>();
		for (const document of validated) {
			const namespace = normalizeNamespace(
				document.namespace,
				this.defaultNamespace,
			);
			const storageKey = this.key(namespace, document.id);
			if (
				batchSeen.has(storageKey) &&
				this.duplicateDocumentIdBehavior === "error"
			) {
				throw new RecallValidationError(
					"Duplicate document ID in upsert batch.",
					{ id: document.id, namespace },
				);
			}
			batchSeen.add(storageKey);

			if (
				this.documents.has(storageKey) &&
				this.duplicateDocumentIdBehavior === "error"
			) {
				throw new RecallValidationError(
					"Document already exists in namespace.",
					{ id: document.id, namespace },
				);
			}
		}

		this.ensureDimension(validated[0]?.embedding.length);

		for (const document of validated) {
			const namespace = normalizeNamespace(
				document.namespace,
				this.defaultNamespace,
			);
			this.documents.set(this.key(namespace, document.id), {
				id: document.id,
				text: document.text,
				embedding: [...document.embedding],
				metadata:
					cloneRecord(
						document.metadata as unknown as Record<string, unknown>,
					) ?? {},
				namespace,
				insertedAt: this.now(),
			});
		}
	}

	/**
	 * Queries the store for semantically similar documents.
	 *
	 * @param query - The recall query containing embedding, topK, and optional filters
	 * @returns Promise resolving to an array of matching results sorted by score (highest first)
	 * @throws {RecallValidationError} If the query is invalid
	 * @throws {RecallDimensionError} If embedding dimensions don't match
	 *
	 * @public
	 */
	async query(query: RecallQuery): Promise<RecallResult[]> {
		const expectedDimension = this.dimension ?? this.inferredDimension;
		const validated = validateRecallQuery(query, expectedDimension);
		const namespace = normalizeNamespace(
			validated.namespace,
			this.defaultNamespace,
		);

		const candidates = [...this.documents.values()].filter((document) => {
			if (document.namespace !== namespace) return false;
			return matchesRecallFilter(document.metadata, validated.filter);
		});

		const scored = candidates.map((document): RecallResult => {
			const result: RecallResult = {
				id: document.id,
				score: cosineSimilarity(validated.embedding, document.embedding),
				namespace: document.namespace,
			};
			if (validated.includeText !== false) result.text = document.text;
			if (validated.includeMetadata !== false)
				result.metadata = cloneRecord(document.metadata) as never;
			return result;
		});

		return sortRecallScores(scored).slice(0, validated.topK);
	}

	/**
	 * Deletes documents by their IDs.
	 *
	 * @param ids - Array of document IDs to delete
	 * @param options - Optional namespace scoping (defaults to store's defaultNamespace)
	 * @returns Promise that resolves when deletion is complete
	 * @throws {RecallValidationError} If ids is not an array or contains invalid IDs
	 *
	 * @public
	 */
	async delete(
		ids: string[],
		options: { namespace?: string } = {},
	): Promise<void> {
		if (!Array.isArray(ids))
			throw new RecallValidationError("ids must be an array.");
		const namespace = normalizeNamespace(
			options.namespace,
			this.defaultNamespace,
		);
		for (const id of ids) {
			assertSafeId(id, "id");
			this.documents.delete(this.key(namespace, id));
		}
	}

	/**
	 * Deletes all documents matching the source identifiers.
	 *
	 * @param input - Source identification (projectId, sourceType, sourceId) and optional namespace
	 * @returns Promise that resolves when deletion is complete
	 * @throws {RecallValidationError} If input contains invalid identifiers
	 *
	 * @public
	 */
	async deleteBySource(input: DeleteBySourceInput): Promise<void> {
		assertSafeId(input.projectId, "projectId");
		assertSafeId(input.sourceType, "sourceType");
		assertSafeId(input.sourceId, "sourceId");
		const namespace = normalizeNamespace(
			input.namespace,
			this.defaultNamespace,
		);

		for (const [key, document] of this.documents) {
			if (document.namespace !== namespace) continue;
			if (
				document.metadata.projectId === input.projectId &&
				document.metadata.sourceType === input.sourceType &&
				document.metadata.sourceId === input.sourceId
			) {
				this.documents.delete(key);
			}
		}
	}

	/**
	 * Clears all documents from the store, or from a specific namespace.
	 *
	 * @param namespace - Optional namespace to clear (if omitted, clears all)
	 * @returns Promise that resolves when clear is complete
	 *
	 * @public
	 */
	async clear(namespace?: string): Promise<void> {
		if (namespace === undefined) {
			this.documents.clear();
			this.inferredDimension = undefined;
			return;
		}
		const normalized = normalizeNamespace(namespace, this.defaultNamespace);
		for (const key of this.documents.keys()) {
			if (key.startsWith(`${normalized}:`)) this.documents.delete(key);
		}
	}

	/**
	 * Returns the number of documents in the store, optionally scoped to a namespace.
	 *
	 * @param namespace - Optional namespace to count (if omitted, counts all)
	 * @returns Promise resolving to the document count
	 *
	 * @public
	 */
	async count(namespace?: string): Promise<number> {
		if (namespace === undefined) return this.documents.size;
		const normalized = normalizeNamespace(namespace, this.defaultNamespace);
		return [...this.documents.values()].filter(
			(document) => document.namespace === normalized,
		).length;
	}

	/**
	 * Returns a snapshot of all documents in the store.
	 *
	 * @remarks
	 * This method is synchronous and returns cloned documents to prevent mutation.
	 *
	 * @returns Array of all stored documents
	 *
	 * @public
	 */
	snapshot(): RecallDocument[] {
		return [...this.documents.values()].map((document) => ({
			id: document.id,
			text: document.text,
			embedding: [...document.embedding],
			metadata: cloneRecord(document.metadata) as never,
			namespace: document.namespace,
		}));
	}

	/**
	 * Creates a composite key from namespace and document ID.
	 *
	 * @param namespace - The namespace
	 * @param id - The document ID
	 * @returns Composite key in the format "namespace:id"
	 *
	 * @internal
	 */
	private key(namespace: string, id: string): string {
		return `${namespace}:${id}`;
	}

	/**
	 * Ensures embedding dimension consistency across documents.
	 *
	 * @param dimension - The dimension to check/set
	 * @throws {RecallDimensionError} If dimension conflicts with previously stored embeddings
	 *
	 * @internal
	 */
	private ensureDimension(dimension: number | undefined): void {
		if (dimension === undefined) return;
		if (this.dimension !== undefined) return;
		if (this.inferredDimension === undefined) {
			this.inferredDimension = dimension;
			return;
		}
		if (this.inferredDimension !== dimension) {
			throw new RecallDimensionError(
				"Embedding dimension mismatch for store.",
				{
					expectedDimension: this.inferredDimension,
					actualDimension: dimension,
				},
			);
		}
	}
}

/**
 * Factory function to create a new InMemoryRecallStore instance.
 *
 * @param options - Configuration options for the store
 * @returns A new InMemoryRecallStore instance
 *
 * @public
 */
export function createInMemoryRecallStore(
	options?: InMemoryRecallStoreOptions,
): InMemoryRecallStore {
	return new InMemoryRecallStore(options);
}
