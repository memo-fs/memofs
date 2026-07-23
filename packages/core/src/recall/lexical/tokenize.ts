/**
 * @file Tokenization utilities for lexical recall (BM25 + fuzzy matching).
 *
 * @remarks
 * Language-agnostic tokenizer: lowercases, splits on non-alphanumeric
 * boundaries, trims, and drops empties and stop words. Intentionally simple
 * (no stemming library dependency) — keeps the lexical module pure-TS so it
 * can run with zero config behind the existing recall contracts.
 *
 * @public
 */

/**
 * English stop-word list — the single source of truth for lexical filtering
 * across BM25, the retrieval strategist, and the fallback reranker.
 *
 * - BM25 (`tokenize` with `dropStopWords:true`) drops these to reduce index noise.
 * - Strategist rewrite reuses `tokenize` so `what is auth` → `["auth"]` matches BM25.
 * - `tokenizeSimple` in `core/internal/lexical` reuses this tokenizer with
 *   `dropStopWords:false` to keep a pure overlap score, but shares the same
 *   split regex and lower-casing. See that file for alignment notes.
 *
 * @public
 */
export const STOP_WORDS = new Set([
	"a",
	"an",
	"and",
	"are",
	"as",
	"at",
	"be",
	"but",
	"by",
	"for",
	"from",
	"has",
	"have",
	"he",
	"in",
	"is",
	"it",
	"its",
	"of",
	"on",
	"or",
	"that",
	"the",
	"this",
	"to",
	"was",
	"were",
	"will",
	"with",
	"i",
	"you",
	"we",
	"they",
	"them",
	"our",
	"your",
	"their",
	"me",
	"my",
	"do",
	"does",
	"did",
	"can",
	"could",
	"would",
	"should",
	"shall",
	"may",
	"might",
	"must",
	"how",
	"what",
	"when",
	"where",
	"who",
	"why",
	"which",
	"if",
	"then",
	"so",
	"than",
	"too",
	"very",
	"about",
	"into",
	"over",
	"under",
	"again",
]);

export interface TokenizeOptions {
	/** Drop common stop words from the result. @defaultValue `true` */
	dropStopWords?: boolean;
	/** Minimum token length to keep. @defaultValue `1` */
	minLength?: number;
}

/**
 * Tokenize a string into normalized terms.
 *
 * @param value - The text to tokenize.
 * @param options - Tokenization options.
 * @returns An array of lowercase terms.
 *
 * @public
 */
export function tokenize(
	value: string,
	options: TokenizeOptions = {},
): string[] {
	const dropStopWords = options.dropStopWords ?? true;
	const minLength = options.minLength ?? 1;

	return value
		.toLowerCase()
		.split(/[^a-z0-9]+/i)
		.map((term) => term.trim())
		.filter((term) => term.length >= minLength)
		.filter((term) => !dropStopWords || !STOP_WORDS.has(term));
}

/**
 * Build a term-frequency map from a token list.
 *
 * @param tokens - The tokens to count.
 * @returns A map of term to occurrence count.
 *
 * @public
 */
export function termFrequency(tokens: string[]): Map<string, number> {
	const counts = new Map<string, number>();
	for (const token of tokens) {
		counts.set(token, (counts.get(token) ?? 0) + 1);
	}
	return counts;
}
