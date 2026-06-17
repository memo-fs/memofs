import { chunkArray } from "@repo/utils";
import {
	assertSafeId,
	type DeleteBySourceInput,
	RecallDimensionError,
	type RecallDocument,
	RecallProviderError,
	type RecallResult,
	type RecallStore,
	type RecallStoreCapabilities,
	validateRecallDocuments,
	validateRecallQuery,
} from "@tekbreed/tekmemo";
import {
	assertUpstashLikeIndex,
	type UpstashLikeIndex,
	type UpstashVectorPoint,
	type UpstashVectorQueryResultItem,
} from "../client/upstash-like";
import {
	UpstashRecallError,
	UpstashRecallValidationError,
} from "../errors/upstash-errors";
import { buildUpstashFilter } from "../filters/filter-builder";
import {
	normalizeResultMetadata,
	normalizeUpstashMetadata,
} from "../metadata/metadata";
import {
	resolveRequestNamespace,
	resolveUpstashNamespace,
	type UpstashNamespaceConfig,
} from "../namespace/namespace";

/**
 * @file Implements the TekMemo RecallStore using Upstash Vector as the backend.
 *
 * @remarks
 * This store normalizes TekMemo documents into Upstash vector points,
 * handles namespace resolution, batch upserts, and metadata filtering.
 *
 * @public
 */

/**
 * Input for resolving chunk IDs by source, extending the base delete-by-source input
 * with a resolved namespace.
 *
 * @public
 */
export interface ResolveChunkIdsBySourceInput extends DeleteBySourceInput {
	/** The resolved namespace to operate within. */
	namespace: string;
}

/**
 * Configuration options for creating a {@link UpstashRecallStore}.
 *
 * @public
 */
export interface UpstashRecallStoreConfig extends UpstashNamespaceConfig {
	/** Expected embedding dimension. If omitted, dimension is inferred from first upsert/query. */
	dimension?: number;
	/** Optional hard batch size for Upstash upsert requests. Defaults to 100. */
	batchSize?: number;
	/** Include text payload in query responses. Defaults to true. */
	includeTextByDefault?: boolean;
	/** Include metadata payload in query responses. Defaults to true. */
	includeMetadataByDefault?: boolean;
	/** Add tenant isolation filter to every query/deleteBySource when present. */
	tenantId?: string;
	/** Add project isolation filter to every query when present. */
	projectId?: string;
	/** Optional source -> chunk ID resolver for deleteBySource. */
	resolveChunkIdsBySource?: (
		input: ResolveChunkIdsBySourceInput,
	) => Promise<string[]>;
	/** What to do when deleteBySource cannot resolve chunk IDs. Defaults to error. */
	deleteBySourceWithoutResolver?: "error" | "noop";
}

/**
 * A serializable snapshot of an {@link UpstashRecallStore} instance.
 *
 * @public
 */
export interface UpstashRecallStoreSnapshot {
	/** The namespace used by the store. */
	namespace: string;
	/** The configured or inferred embedding dimension. */
	dimension?: number;
	/** The capabilities reported by the store. */
	capabilities: RecallStoreCapabilities;
}

const DEFAULT_BATCH_SIZE = 100;
const MAX_BATCH_SIZE = 1000;
const MAX_TOP_K = 1000;

/**
 * Validates and normalizes the batch size configuration.
 *
 * @param value - The batch size value to validate.
 * @returns The validated batch size, or the default if undefined.
 * @throws {UpstashRecallValidationError} If the value is not a positive integer within allowed range.
 *
 * @internal
 */
function assertBatchSize(value: number | undefined): number {
	if (value === undefined) return DEFAULT_BATCH_SIZE;
	if (!Number.isInteger(value) || value <= 0 || value > MAX_BATCH_SIZE) {
		throw new UpstashRecallValidationError(
			`batchSize must be an integer between 1 and ${MAX_BATCH_SIZE}.`,
			{ batchSize: value },
		);
	}
	return value;
}

/**
 * Validates and normalizes the embedding dimension configuration.
 *
 * @param value - The dimension value to validate.
 * @returns The validated dimension, or undefined if not specified.
 * @throws {UpstashRecallValidationError} If the value is not a positive integer.
 *
 * @internal
 */
function assertDimension(value: number | undefined): number | undefined {
	if (value === undefined) return undefined;
	if (!Number.isInteger(value) || value <= 0) {
		throw new UpstashRecallValidationError(
			"dimension must be a positive integer.",
			{ dimension: value },
		);
	}
	return value;
}

/**
 * Validates an array of IDs, ensuring they are unique and safe.
 *
 * @param ids - The array of IDs to validate.
 * @returns A deduplicated array of validated IDs.
 * @throws {UpstashRecallValidationError} If ids is not an array or contains invalid IDs.
 *
 * @internal
 */
function assertIds(ids: string[]): string[] {
	if (!Array.isArray(ids)) {
		throw new UpstashRecallValidationError("ids must be an array of strings.");
	}
	const seen = new Set<string>();
	const output: string[] = [];
	for (const [index, id] of ids.entries()) {
		assertSafeId(id, `ids[${index}]`);
		if (!seen.has(id)) {
			seen.add(id);
			output.push(id);
		}
	}
	return output;
}

/**
 * Maps a raw Upstash query result item to a TekMemo {@link RecallResult}.
 *
 * @param item - The raw result item from Upstash.
 * @param options - Options controlling what data to include in the result.
 * @returns The normalized RecallResult.
 * @throws {UpstashRecallError} If the result item has an invalid id.
 *
 * @internal
 */
function mapResult(
	item: UpstashVectorQueryResultItem,
	options: {
		includeText: boolean;
		includeMetadata: boolean;
		namespace: string;
	},
): RecallResult {
	if (typeof item.id !== "string" && typeof item.id !== "number") {
		throw new UpstashRecallError(
			"Upstash query returned a result with an invalid id.",
			{
				operation: "query",
				details: { id: item.id },
			},
		);
	}

	const result: RecallResult = {
		id: String(item.id),
		score:
			typeof item.score === "number" && Number.isFinite(item.score)
				? item.score
				: 0,
		namespace: options.namespace,
	};

	if (options.includeText) {
		if (typeof item.data === "string") result.text = item.data;
		else if (item.data !== undefined && item.data !== null)
			result.text = JSON.stringify(item.data);
	}

	if (options.includeMetadata) {
		const metadata = normalizeResultMetadata(item.metadata);
		if (metadata !== undefined) result.metadata = metadata;
	}

	return result;
}

/**
 * A TekMemo {@link RecallStore} backed by an Upstash Vector index.
 *
 * @remarks
 * This store adapts the TekMemo recall interface to work with Upstash Vector.
 * It handles namespace resolution, batch upserts, metadata normalization,
 * and tenant/project isolation through filters.
 *
 * @public
 */
export class UpstashRecallStore implements RecallStore {
	readonly capabilities: RecallStoreCapabilities = {
		supportsNamespaces: true,
		supportsMetadataFiltering: true,
		supportsDeleteBySource: true,
		supportsTextStorage: true,
		supportsCosineScore: false,
	};

	private readonly index: UpstashLikeIndex;
	private readonly namespace: string;
	private readonly batchSize: number;
	private readonly includeTextByDefault: boolean;
	private readonly includeMetadataByDefault: boolean;
	private readonly tenantId?: string;
	private readonly projectId?: string;
	private readonly resolveChunkIdsBySource?: (
		input: ResolveChunkIdsBySourceInput,
	) => Promise<string[]>;
	private readonly deleteBySourceWithoutResolver: "error" | "noop";
	private dimension?: number;

	/**
	 * Creates a new UpstashRecallStore.
	 *
	 * @param index - An Upstash-like vector index implementing the required methods.
	 * @param config - Configuration options for the store.
	 *
	 * @throws {UpstashRecallValidationError} If the configuration is invalid.
	 */
	constructor(index: UpstashLikeIndex, config: UpstashRecallStoreConfig = {}) {
		assertUpstashLikeIndex(index);
		this.index = index;
		this.namespace = resolveUpstashNamespace(config);
		this.dimension = assertDimension(config.dimension);
		this.batchSize = assertBatchSize(config.batchSize);
		this.includeTextByDefault = config.includeTextByDefault ?? true;
		this.includeMetadataByDefault = config.includeMetadataByDefault ?? true;
		this.tenantId = config.tenantId;
		this.projectId = config.projectId;
		this.resolveChunkIdsBySource = config.resolveChunkIdsBySource;
		this.deleteBySourceWithoutResolver =
			config.deleteBySourceWithoutResolver ?? "error";
	}

	/**
	 * Returns the namespace used by this store.
	 *
	 * @returns The current namespace string.
	 */
	getNamespace(): string {
		return this.namespace;
	}

	/**
	 * Returns the configured or inferred embedding dimension.
	 *
	 * @returns The dimension, or undefined if not yet determined.
	 */
	getDimension(): number | undefined {
		return this.dimension;
	}

	/**
	 * Creates a serializable snapshot of the store's current state.
	 *
	 * @returns A snapshot object with namespace, dimension, and capabilities.
	 */
	snapshot(): UpstashRecallStoreSnapshot {
		return {
			namespace: this.namespace,
			dimension: this.dimension,
			capabilities: { ...this.capabilities },
		};
	}

	/**
	 * Upserts (inserts or updates) documents into the vector store.
	 *
	 * @param documents - The recall documents to upsert.
	 * @returns A promise that resolves when the operation completes.
	 * @throws {UpstashRecallValidationError} If documents are invalid or dimensions mismatch.
	 * @throws {UpstashRecallError} If the underlying upsert operation fails.
	 */
	async upsert(documents: RecallDocument[]): Promise<void> {
		const validated = validateRecallDocuments(documents, this.dimension);
		if (validated.length === 0) return;

		this.ensureDimension(validated[0]?.embedding.length, "upsert");

		const seen = new Set<string>();
		for (const document of validated) {
			if (seen.has(document.id)) {
				throw new UpstashRecallValidationError(
					"Duplicate document ids are not allowed in the same upsert batch.",
					{ id: document.id },
				);
			}
			seen.add(document.id);
			this.ensureDimension(document.embedding.length, "upsert");
		}

		const byNamespace = new Map<string, UpstashVectorPoint[]>();
		for (const document of validated) {
			const namespace = resolveRequestNamespace({
				explicit: document.namespace,
				fallback: this.namespace,
			});
			const point: UpstashVectorPoint = {
				id: document.id,
				vector: document.embedding,
				data: document.text,
				metadata: normalizeUpstashMetadata(document),
			};
			const list = byNamespace.get(namespace) ?? [];
			list.push(point);
			byNamespace.set(namespace, list);
		}

		try {
			for (const [namespace, points] of byNamespace.entries()) {
				for (const batch of chunkArray(points, this.batchSize)) {
					await this.index.upsert(batch, { namespace });
				}
			}
		} catch (error) {
			throw new UpstashRecallError("Failed to upsert vectors into Upstash.", {
				operation: "upsert",
				cause: error,
			});
		}
	}

	/**
	 * Queries the vector store for similar documents.
	 *
	 * @param query - The query parameters including embedding, topK, and filters.
	 * @returns A promise resolving to an array of recall results.
	 * @throws {UpstashRecallValidationError} If the query is invalid or topK exceeds limits.
	 * @throws {UpstashRecallError} If the underlying query operation fails.
	 */
	async query(
		query: Parameters<RecallStore["query"]>[0],
	): Promise<RecallResult[]> {
		const validated = validateRecallQuery(query, this.dimension);
		if (validated.topK > MAX_TOP_K) {
			throw new UpstashRecallValidationError(`topK must be <= ${MAX_TOP_K}.`, {
				topK: validated.topK,
			});
		}
		this.ensureDimension(validated.embedding.length, "query");

		const namespace = resolveRequestNamespace({
			explicit: validated.namespace,
			fallback: this.namespace,
		});
		const filter = buildUpstashFilter({
			filter: validated.filter,
			requiredTenantId: this.tenantId,
			requiredProjectId: this.projectId,
		});

		const includeText = validated.includeText ?? this.includeTextByDefault;
		const includeMetadata =
			validated.includeMetadata ?? this.includeMetadataByDefault;

		let results: UpstashVectorQueryResultItem[];
		try {
			results = await this.index.query(
				{
					vector: validated.embedding,
					topK: validated.topK,
					filter,
					includeData: includeText,
					includeMetadata,
				},
				{ namespace },
			);
		} catch (error) {
			throw new UpstashRecallError("Failed to query Upstash vectors.", {
				operation: "query",
				cause: error,
			});
		}

		if (!Array.isArray(results)) {
			throw new UpstashRecallError(
				"Upstash query returned a non-array response.",
				{ operation: "query" },
			);
		}

		return results.map((item) =>
			mapResult(item, { includeText, includeMetadata, namespace }),
		);
	}

	/**
	 * Deletes vectors from the store by their IDs.
	 *
	 * @param ids - Array of IDs to delete.
	 * @param options - Optional namespace override.
	 * @returns A promise that resolves when the operation completes.
	 * @throws {UpstashRecallValidationError} If ids are invalid.
	 * @throws {UpstashRecallError} If the underlying delete operation fails.
	 */
	async delete(
		ids: string[],
		options: { namespace?: string } = {},
	): Promise<void> {
		const validated = assertIds(ids);
		if (validated.length === 0) return;
		const namespace = resolveRequestNamespace({
			explicit: options.namespace,
			fallback: this.namespace,
		});

		try {
			for (const batch of chunkArray(validated, this.batchSize)) {
				await this.index.delete(batch, { namespace });
			}
		} catch (error) {
			throw new UpstashRecallError("Failed to delete vectors from Upstash.", {
				operation: "delete",
				cause: error,
			});
		}
	}

	/**
	 * Deletes all vectors associated with a given source.
	 *
	 * @param input - The source identification (projectId, sourceType, sourceId).
	 * @returns A promise that resolves when the operation completes.
	 * @throws {RecallProviderError} If no resolver is configured and policy is "error".
	 * @throws {UpstashRecallError} If resolving chunk IDs or deletion fails.
	 */
	async deleteBySource(input: DeleteBySourceInput): Promise<void> {
		assertSafeId(input.projectId, "projectId");
		assertSafeId(input.sourceType, "sourceType");
		assertSafeId(input.sourceId, "sourceId");
		const namespace = resolveRequestNamespace({
			explicit: input.namespace,
			fallback: this.namespace,
		});

		if (this.resolveChunkIdsBySource === undefined) {
			if (this.deleteBySourceWithoutResolver === "noop") return;
			throw new RecallProviderError(
				"deleteBySource requires resolveChunkIdsBySource when using Upstash.",
				{
					provider: "upstash",
					operation: "deleteBySource",
					details: {
						projectId: input.projectId,
						sourceType: input.sourceType,
						sourceId: input.sourceId,
					},
				},
			);
		}

		let ids: string[];
		try {
			ids = await this.resolveChunkIdsBySource({ ...input, namespace });
		} catch (error) {
			throw new UpstashRecallError(
				"Failed to resolve chunk ids for source deletion.",
				{ operation: "deleteBySource", cause: error },
			);
		}

		await this.delete(ids, { namespace });
	}

	/**
	 * Ensures the embedding dimension is consistent across operations.
	 *
	 * @param value - The dimension to check.
	 * @param operation - The name of the operation being performed (for error reporting).
	 * @throws {RecallDimensionError} If the dimension does not match the stored dimension.
	 *
	 * @internal
	 */
	private ensureDimension(value: number | undefined, operation: string): void {
		if (value === undefined) return;
		if (this.dimension === undefined) {
			this.dimension = value;
			return;
		}
		if (this.dimension !== value) {
			throw new RecallDimensionError("Embedding dimension mismatch.", {
				operation,
				expectedDimension: this.dimension,
				actualDimension: value,
			});
		}
	}
}

/**
 * Factory function to create a new {@link UpstashRecallStore} instance.
 *
 * @param index - An Upstash-like vector index.
 * @param config - Configuration options for the store.
 * @returns A new UpstashRecallStore instance.
 *
 * @public
 */
export function createUpstashRecallStore(
	index: UpstashLikeIndex,
	config: UpstashRecallStoreConfig = {},
): UpstashRecallStore {
	return new UpstashRecallStore(index, config);
}
