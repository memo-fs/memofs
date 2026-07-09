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

/**
 * Splits text into lowercase alphanumeric tokens.
 *
 * @remarks
 * Minimal tokenizer shared by the deterministic fallback reranker. It
 * intentionally applies no stop-word removal so rerank scoring stays a pure
 * function of the input tokens. Use {@link tokenize} from
 * `recall/lexical/tokenize` when stop-word filtering is desired.
 *
 * @param value - The text to tokenize.
 * @returns Lowercase alphanumeric tokens.
 *
 * @internal
 */
export function tokenizeSimple(value: string): string[] {
	return value
		.toLowerCase()
		.split(/[^a-z0-9]+/i)
		.map((term) => term.trim())
		.filter(Boolean);
}
