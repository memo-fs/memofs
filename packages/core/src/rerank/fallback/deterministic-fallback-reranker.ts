import { cloneJson } from "../../core/internal/clone";
import {
	tokenOverlapScore,
	tokenizeSimple,
} from "../../core/internal/lexical";
import { applyTopK } from "../sort/sort";
import type { Reranker, RerankInput, RerankResult } from "../types";
import { normalizeRerankInput } from "../validation/validation";

/**
 * A deterministic fallback reranker that uses lexical matching to score documents.
 * Useful when external reranking providers are unavailable.
 *
 * @remarks
 * This reranker tokenizes both query and document text, then scores based on:
 * - Exact term matches (full point per match)
 * - Partial matches where one term contains another (0.25 points per match)
 *
 * The final score is normalized by the number of query terms, producing a value between 0 and 1.
 *
 * @public
 */
export class DeterministicFallbackReranker implements Reranker {
	/**
	 * Reranks documents using lexical similarity scoring.
	 *
	 * @param input - The rerank input containing query and documents.
	 * @returns A promise that resolves to reranked results sorted by relevance score.
	 *
	 * @throws {@link RerankValidationError} If the input fails validation.
	 */
	async rerank(input: RerankInput): Promise<RerankResult[]> {
		const normalized = normalizeRerankInput(input);

		if (normalized.documents.length === 0) {
			return [];
		}

		const queryTerms = tokenizeSimple(normalized.query);
		const results = normalized.documents.map((document): RerankResult => {
			const documentTerms = tokenizeSimple(document.text);
			const score = tokenOverlapScore(queryTerms, documentTerms);

			return {
				id: document.id,
				text: document.text,
				score,
				rank: 0,
				metadata: document.metadata
					? cloneJson(document.metadata)
					: undefined,
			};
		});

		return applyTopK(results, normalized.topK);
	}
}

/**
 * Creates a new instance of DeterministicFallbackReranker.
 *
 * @returns A new DeterministicFallbackReranker instance.
 *
 * @public
 */
export function createDeterministicFallbackReranker(): DeterministicFallbackReranker {
	return new DeterministicFallbackReranker();
}
