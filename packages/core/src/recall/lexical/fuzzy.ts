/**
 * @file Fuzzy token-overlap scoring for lexical recall.
 *
 * @remarks
 * Lightweight prefix/substring matching used to catch typos and partials
 * that exact BM25 term matching would miss. The scoring algorithm is shared
 * with the deterministic fallback reranker via `core/internal/lexical`.
 *
 * @public
 */

import { tokenOverlapScore } from "../../core/internal/lexical";
import { tokenize } from "./tokenize";

/**
 * Score query terms against document terms using exact + partial overlap.
 *
 * @remarks
 * Delegates to the shared `tokenOverlapScore` primitive so recall and the
 * deterministic fallback reranker share one scoring implementation.
 *
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
	return tokenOverlapScore(queryTerms, documentTerms);
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
