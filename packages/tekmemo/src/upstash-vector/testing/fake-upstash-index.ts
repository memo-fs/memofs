import type {
	UpstashLikeIndex,
	UpstashVectorPoint,
	UpstashVectorQueryOptions,
	UpstashVectorQueryResultItem,
	UpstashVectorRequestOptions,
} from "../client/upstash-like";

/**
 * @file Fake (mock) Upstash Index for testing purposes.
 *
 * @remarks
 * This module provides a test double that implements the {@link UpstashLikeIndex}
 * interface, allowing unit tests to run without a real Upstash Vector instance.
 *
 * @internal
 */

/**
 * Records a single call made to the {@link FakeUpstashIndex}.
 *
 * @public
 */
export interface FakeUpstashCall {
	/** The operation that was called. */
	operation: "upsert" | "query" | "delete";
	/** The payload passed to the operation. */
	payload: unknown;
	/** Optional request options (e.g., namespace). */
	options?: UpstashVectorRequestOptions;
}

/**
 * A fake implementation of {@link UpstashLikeIndex} for testing.
 *
 * @remarks
 * This class stores points in memory and can be configured to fail
 * on specific operations for error handling tests.
 *
 * @public
 */
export class FakeUpstashIndex implements UpstashLikeIndex {
	/** Record of all calls made to this index. */
	readonly calls: FakeUpstashCall[] = [];
	/** In-memory storage of points organized by namespace. */
	readonly pointsByNamespace = new Map<
		string,
		Map<string, UpstashVectorPoint>
	>();
	/** If set, the specified operation will throw an error. */
	failOperation?: "upsert" | "query" | "delete";
	/** If set, queries will return this fixed response instead of computing results. */
	queryResponse?: UpstashVectorQueryResultItem[];

	/**
	 * Simulates upserting points into the index.
	 *
	 * @param points - The points to upsert.
	 * @param options - Optional request options including namespace.
	 * @throws {Error} If failOperation is set to "upsert".
	 */
	async upsert(
		points: UpstashVectorPoint[],
		options: UpstashVectorRequestOptions = {},
	): Promise<void> {
		this.calls.push({ operation: "upsert", payload: points, options });
		if (this.failOperation === "upsert") throw new Error("fake upsert failure");
		const namespace = options.namespace ?? "default";
		const bucket =
			this.pointsByNamespace.get(namespace) ??
			new Map<string, UpstashVectorPoint>();
		for (const point of points) bucket.set(point.id, point);
		this.pointsByNamespace.set(namespace, bucket);
	}

	/**
	 * Simulates querying the index for similar vectors.
	 *
	 * @param options - Query options including vector and topK.
	 * @param requestOptions - Optional request options including namespace.
	 * @returns Simulated query results, or queryResponse if set.
	 * @throws {Error} If failOperation is set to "query".
	 */
	async query(
		options: UpstashVectorQueryOptions,
		requestOptions: UpstashVectorRequestOptions = {},
	): Promise<UpstashVectorQueryResultItem[]> {
		this.calls.push({
			operation: "query",
			payload: options,
			options: requestOptions,
		});
		if (this.failOperation === "query") throw new Error("fake query failure");
		if (this.queryResponse !== undefined) return this.queryResponse;
		const namespace = requestOptions.namespace ?? "default";
		const bucket =
			this.pointsByNamespace.get(namespace) ??
			new Map<string, UpstashVectorPoint>();
		return Array.from(bucket.values())
			.filter((point) => matchesFilter(point.metadata, options.filter))
			.slice(0, options.topK)
			.map((point, index) => ({
				id: point.id,
				score: 1 - index / 100,
				data: options.includeData ? point.data : undefined,
				metadata: options.includeMetadata ? point.metadata : undefined,
			}));
	}

	/**
	 * Simulates deleting vectors by ID.
	 *
	 * @param ids - A single ID or array of IDs to delete.
	 * @param options - Optional request options including namespace.
	 * @throws {Error} If failOperation is set to "delete".
	 */
	async delete(
		ids: string[] | string,
		options: UpstashVectorRequestOptions = {},
	): Promise<void> {
		this.calls.push({ operation: "delete", payload: ids, options });
		if (this.failOperation === "delete") throw new Error("fake delete failure");
		const namespace = options.namespace ?? "default";
		const bucket = this.pointsByNamespace.get(namespace);
		if (bucket === undefined) return;
		for (const id of Array.isArray(ids) ? ids : [ids]) bucket.delete(id);
	}

	/**
	 * Returns the last call made to this index, optionally filtered by operation.
	 *
	 * @param operation - Optional operation type to filter by.
	 * @returns The last matching call, or undefined if none found.
	 */
	lastCall(
		operation?: FakeUpstashCall["operation"],
	): FakeUpstashCall | undefined {
		const calls =
			operation === undefined
				? this.calls
				: this.calls.filter((call) => call.operation === operation);
		return calls.at(-1);
	}
}

function matchesFilter(
	metadata: Record<string, unknown> | undefined,
	filter: string | undefined,
): boolean {
	if (filter === undefined || filter.trim().length === 0) return true;
	if (metadata === undefined) return false;

	return filter
		.split(/\s+AND\s+/)
		.every((part) => matchesEqualityPart(metadata, part));
}

function matchesEqualityPart(
	metadata: Record<string, unknown>,
	part: string,
): boolean {
	const match = part.match(/^([A-Za-z0-9_.:@#/-]+)\s*=\s*(.+)$/);
	if (match === null) return true;

	const [, field, rawValue] = match;
	if (field === undefined || rawValue === undefined) return true;
	return metadata[field] === parseFilterValue(rawValue);
}

function parseFilterValue(rawValue: string): unknown {
	const trimmed = rawValue.trim();
	try {
		return JSON.parse(trimmed);
	} catch {
		return trimmed;
	}
}
