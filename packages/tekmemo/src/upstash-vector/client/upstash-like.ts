import type { JsonValue } from "../../recall/index";

/**
 * @file Defines the Upstash-like vector index interface and related types.
 *
 * @remarks
 * This module provides the contract that any Upstash-compatible vector store
 * must implement to work with the TekMemo Upstash adapter.
 *
 * @internal
 */

/**
 * Represents a single point (vector) stored in Upstash Vector.
 *
 * @public
 */
export interface UpstashVectorPoint {
	/** Unique identifier for the vector point. */
	id: string;
	/** The embedding vector values. */
	vector: number[];
	/** Optional text payload associated with the point. */
	data?: string;
	/** Optional metadata record attached to the point. */
	metadata?: Record<string, JsonValue | undefined>;
}

/**
 * Options for querying vectors from Upstash Vector.
 *
 * @public
 */
export interface UpstashVectorQueryOptions {
	/** The query embedding vector. */
	vector: number[];
	/** Maximum number of results to return. */
	topK: number;
	/** Optional filter string for metadata filtering. */
	filter?: string;
	/** Whether to include metadata in the response. Defaults to false. */
	includeMetadata?: boolean;
	/** Whether to include data payload in the response. Defaults to false. */
	includeData?: boolean;
}

/**
 * A single item in the query result from Upstash Vector.
 *
 * @public
 */
export interface UpstashVectorQueryResultItem {
	/** The point identifier (string or numeric). */
	id: string | number;
	/** Similarity score between 0 and 1. */
	score?: number;
	/** The data payload, if requested. */
	data?: unknown;
	/** The metadata payload, if requested. */
	metadata?: unknown;
}

/**
 * Request-level options for Upstash operations, such as namespace targeting.
 *
 * @public
 */
export interface UpstashVectorRequestOptions {
	/** The namespace to target for the operation. */
	namespace?: string;
}

/**
 * Interface describing the minimal Upstash Vector index API required by TekMemo.
 *
 * @remarks
 * Any object implementing this interface can be used as the backing store
 * for {@link UpstashRecallStore}.
 *
 * @public
 */
export interface UpstashLikeIndex {
	/**
	 * Upserts (inserts or updates) vectors into the index.
	 *
	 * @param points - The vector points to upsert.
	 * @param options - Optional request options including namespace.
	 * @returns A promise that resolves when the operation completes.
	 */
	upsert(
		points: UpstashVectorPoint[],
		options?: UpstashVectorRequestOptions,
	): Promise<unknown>;
	/**
	 * Queries the index for similar vectors.
	 *
	 * @param options - Query options including the vector and topK.
	 * @param requestOptions - Optional request options including namespace.
	 * @returns A promise resolving to the matching result items.
	 */
	query(
		options: UpstashVectorQueryOptions,
		requestOptions?: UpstashVectorRequestOptions,
	): Promise<UpstashVectorQueryResultItem[]>;
	/**
	 * Deletes vectors from the index by their IDs.
	 *
	 * @param ids - A single ID or array of IDs to delete.
	 * @param options - Optional request options including namespace.
	 * @returns A promise that resolves when the operation completes.
	 */
	delete(
		ids: string[] | string,
		options?: UpstashVectorRequestOptions,
	): Promise<unknown>;
}

/**
 * Asserts that a value conforms to the {@link UpstashLikeIndex} interface.
 *
 * @param value - The value to check.
 * @throws {TypeError} If the value does not implement the required methods.
 *
 * @public
 */
export function assertUpstashLikeIndex(
	value: unknown,
): asserts value is UpstashLikeIndex {
	if (typeof value !== "object" || value === null) {
		throw new TypeError("Upstash index must be an object.");
	}
	const candidate = value as Partial<Record<keyof UpstashLikeIndex, unknown>>;
	if (typeof candidate.upsert !== "function") {
		throw new TypeError("Upstash index must expose an upsert method.");
	}
	if (typeof candidate.query !== "function") {
		throw new TypeError("Upstash index must expose a query method.");
	}
	if (typeof candidate.delete !== "function") {
		throw new TypeError("Upstash index must expose a delete method.");
	}
}
