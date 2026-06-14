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

		const queryTerms = tokenize(normalized.query);
		const results = normalized.documents.map((document): RerankResult => {
			const documentTerms = tokenize(document.text);
			const score = lexicalScore(queryTerms, documentTerms);

			return {
				id: document.id,
				text: document.text,
				score,
				rank: 0,
				metadata: document.metadata
					? structuredCloneSafe(document.metadata)
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

/**
 * Splits a string into individual terms by non-alphanumeric characters.
 *
 * @param value - The string to tokenize.
 * @returns An array of lowercase terms with whitespace trimmed.
 *
 * @internal
 */
function tokenize(value: string): string[] {
	return value
		.toLowerCase()
		.split(/[^a-z0-9]+/i)
		.map((term) => term.trim())
		.filter(Boolean);
}

/**
 * Computes a lexical similarity score between query terms and document terms.
 *
 * @param queryTerms - The tokenized query terms.
 * @param documentTerms - The tokenized document terms.
 * @returns A score between 0 and 1, where 1 means all query terms exactly match.
 *
 * @internal
 */
function lexicalScore(queryTerms: string[], documentTerms: string[]): number {
	if (queryTerms.length === 0 || documentTerms.length === 0) {
		return 0;
	}

	const docSet = new Set(documentTerms);
	let exact = 0;
	let partial = 0;

	for (const term of queryTerms) {
		if (docSet.has(term)) {
			exact += 1;
			continue;
		}

		if (
			documentTerms.some(
				(docTerm) => docTerm.includes(term) || term.includes(docTerm),
			)
		) {
			partial += 0.25;
		}
	}

	return (exact + partial) / queryTerms.length;
}

/**
 * Creates a deep clone of a value using JSON serialization.
 *
 * @param value - The value to clone.
 * @returns A deep clone of the value.
 *
 * @internal
 */
function structuredCloneSafe<T>(value: T): T {
	return JSON.parse(JSON.stringify(value)) as T;
}
