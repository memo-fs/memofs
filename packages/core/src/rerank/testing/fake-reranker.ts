import { cloneJson } from "../../core/internal/clone";
import { applyTopK } from "../sort/sort";
import type { Reranker, RerankInput, RerankResult } from "../types";
import { normalizeRerankInput } from "../validation/validation";

/**
 * Options for configuring a FakeReranker.
 *
 * @public
 */
export interface FakeRerankerOptions {
	/** Optional map of document IDs to predefined scores. If not provided, defaults to 1/(index+1). */
	scores?: Record<string, number>;
	/** Optional error to throw instead of returning results. Useful for testing error handling. */
	failWith?: Error;
}

/**
 * A fake reranker implementation for testing purposes.
 * Allows predefined scores and can simulate failures.
 *
 * @remarks
 * This reranker records all calls to the `rerank` method, making it useful for asserting
 * that the correct input was passed during tests.
 *
 * @public
 */
export class FakeReranker implements Reranker {
	/** Record of all calls made to the rerank method. */
	readonly calls: RerankInput[] = [];
	private readonly scores: Record<string, number>;
	private readonly failWith: Error | undefined;

	/**
	 * Creates a new FakeReranker.
	 *
	 * @param options - Configuration options for the fake reranker.
	 */
	constructor(options?: FakeRerankerOptions) {
		this.scores = options?.scores ?? {};
		this.failWith = options?.failWith;
	}

	/**
	 * Reranks documents using predefined scores or default scoring.
	 * Records the input in the calls array for test assertions.
	 *
	 * @param input - The rerank input containing query and documents.
	 * @returns A promise that resolves to reranked results sorted by score.
	 * @throws The error specified in failWith option, if configured.
	 *
	 * @throws {@link RerankValidationError} If the input fails validation.
	 */
	async rerank(input: RerankInput): Promise<RerankResult[]> {
		this.calls.push(cloneJson(input));

		if (this.failWith) {
			throw this.failWith;
		}

		const normalized = normalizeRerankInput(input);
		const results = normalized.documents.map((document, index) => ({
			id: document.id,
			text: document.text,
			score: this.scores[document.id] ?? 1 / (index + 1),
			rank: 0,
			metadata: document.metadata
				? cloneJson(document.metadata)
				: undefined,
		}));

		return applyTopK(results, normalized.topK);
	}
}

/**
 * Creates a new FakeReranker instance for testing.
 *
 * @param options - Configuration options for the fake reranker.
 * @returns A new FakeReranker instance.
 *
 * @public
 */
export function createFakeReranker(
	options?: FakeRerankerOptions,
): FakeReranker {
	return new FakeReranker(options);
}
