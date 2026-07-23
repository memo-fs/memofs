/**
 * Shared lexical scoring primitive — exact + partial token overlap.
 *
 * @remarks
 * Single source of truth for the "exact match = 1, partial containment =
 * 0.25, normalized by query term count" scoring used by both the deterministic
 * fallback reranker and the fuzzy recall matcher. Extracting it here keeps the
 * `recall` → `rerank` dependency one-way: rerank no longer re-implements the
 * algorithm and recall does not reach into rerank for it.
 *
 * Tokenization SSOT: this module reuses the central tokenizer from
 * `recall/lexical/tokenize` for split/lower-case behavior. `tokenizeSimple`
 * calls it with `dropStopWords:false` to keep stop words for pure overlap,
 * while BM25 and the strategist use `dropStopWords:true`. The shared
 * `STOP_WORDS` set lives in `recall/lexical/tokenize`.
 *
 * @internal
 */

/**
 * Scores query terms against document terms by token overlap.
 *
 * @remarks
 * - An exact token match contributes `1`.
 * - A partial match (one token contains the other) contributes `0.25`.
 * - The result is normalized by the number of query terms, yielding a value
 * in `[0, 1]`.
 *
 * @param queryTerms - Tokenized query terms.
 * @param documentTerms - Tokenized document terms.
 * @returns A similarity score between 0 and 1.
 *
 * @internal
 */
export function tokenOverlapScore(
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

import { tokenize } from "../../recall/lexical/tokenize";

/**
 * Splits text into lowercase alphanumeric tokens.
 *
 * @remarks
 * Aligned with the central tokenizer in `recall/lexical/tokenize` — same
 * lower-casing and `[^a-z0-9]+` split. Intentionally keeps stop words
 * (`dropStopWords:false`) so the deterministic fallback reranker's overlap
 * score stays a pure function of input tokens, while BM25 and the strategist
 * drop stop words via the same tokenizer. Shared `STOP_WORDS` lives in
 * `recall/lexical/tokenize`.
 *
 * @param value - The text to tokenize.
 * @returns Lowercase alphanumeric tokens, stop words retained.
 *
 * @internal
 */
export function tokenizeSimple(value: string): string[] {
	return tokenize(value, { dropStopWords: false });
}
