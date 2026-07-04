/**
 * @file Fuzzy token-overlap scoring for lexical recall.
 *
 * @remarks
 * Lightweight prefix/substring matching used to catch typos and partials
 * that exact BM25 term matching would miss. Mirrors the scoring philosophy
 * already in {@link DeterministicFallbackReranker} (exact + partial) but
 * operates on token sets without a dependency on a reranker invocation.
 *
 * @public
 */

import { tokenize } from "./tokenize";

/**
 * Score query terms against document terms using exact + partial overlap.
 *
 * @remarks
 * - An exact token match contributes `1`.
 * - A partial match (one token contains the other, e.g. "auth" inside
 * "authentication") contributes `0.25`.
 * - The result is normalized by the number of query terms, yielding a value
 * in `[0, 1]`.
 *
 * @param queryTerms - Tokenized query terms.
 * @param documentTerms - Tokenized document terms.
 * @returns A similarity score between 0 and 1.
 *
 * @public
 */
export function fuzzyOverlapScore(
	queryTerms: string[],
	documentTerms: string[],
): number {
	if (queryTerms.length === 0 || documentTerms.length === 0) return 0;

	const docSet = new Set(documentTerms);
	let exact = 0;
	let partial = 0;

	for (const term of queryTerms) {
		if (docSet.has(term)) {
			exact += 1;
			continue;
		}
		// O(n*m) but terms are short and few — fine for local-scale recall.
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
 * Convenience wrapper that tokenizes raw strings before scoring.
 *
 * @param query - Raw query text.
 * @param document - Raw document text.
 * @returns A fuzzy similarity score between 0 and 1.
 *
 * @public
 */
export function fuzzyScore(query: string, document: string): number {
	return fuzzyOverlapScore(tokenize(query), tokenize(document));
}
