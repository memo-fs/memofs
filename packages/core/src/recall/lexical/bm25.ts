/**
 * @file BM25 lexical store for local-first recall.
 *
 * @remarks
 * An in-memory Okapi BM25 implementation with no external dependencies.
 * Designed to run alongside the vector recall path inside the existing
 * {@link RecallStore} contract and merge results through the reranker.
 *
 * BM25 scores term relevance using term frequency, inverse document frequency,
 * and document length normalization. A small fuzzy-boost term is folded in so
 * typo/partial matches still surface. Scores are normalized to roughly `[0, 1]`
 * via a saturating function so they can be merged with cosine scores.
 *
 * @public
 */

import { RecallValidationError } from "../errors/errors";
import { fuzzyOverlapScore } from "./fuzzy";
import { termFrequency, tokenize } from "./tokenize";

/**
 * A document indexable by the BM25 store.
 *
 * @public
 */
export interface LexicalDocument {
	/** Unique document identifier. */
	id: string;
	/** The text content to tokenize and index. */
	text: string;
	/** Optional namespace for scoping (must match the store's namespace). */
	namespace?: string;
}

/**
 * A single BM25 search result.
 *
 * @public
 */
export interface LexicalSearchResult {
	/** Document identifier. */
	id: string;
	/** Normalized relevance score in roughly `[0, 1]`. */
	score: number;
}

export interface LexicalStoreOptions {
	/**
	 * BM25 term-frequency saturation (`k1`). Higher values flatten the effect
	 * of repeated terms. @defaultValue `1.2`
	 */
	k1?: number;
	/**
	 * BM25 length-normalization bias (`b`). `0` disables length normalization,
	 * `1` applies it fully. @defaultValue `0.75`
	 */
	b?: number;
	/** Default namespace when documents omit one. @defaultValue `"default"` */
	defaultNamespace?: string;
	/**
	 * Weight of the fuzzy-boost term mixed into the final score.
	 * @defaultValue `0.15`
	 */
	fuzzyBoost?: number;
}

interface IndexedDoc {
	id: string;
	tokens: string[];
	termCounts: Map<string, number>;
	length: number;
}

/**
 * In-memory BM25 lexical store.
 *
 * @public
 */
export class BM25Store {
	private readonly k1: number;
	private readonly b: number;
	private readonly defaultNamespace: string;
	private readonly fuzzyBoost: number;

	private docsByNamespace = new Map<string, Map<string, IndexedDoc>>();
	private dfByNamespace = new Map<string, Map<string, number>>();
	private totalLengthByNamespace = new Map<string, number>();

	constructor(options: LexicalStoreOptions = {}) {
		this.k1 = options.k1 ?? 1.2;
		this.b = options.b ?? 0.75;
		this.defaultNamespace = options.defaultNamespace ?? "default";
		this.fuzzyBoost = options.fuzzyBoost ?? 0.15;
	}

	/**
	 * Index (or re-index) a batch of documents within a namespace.
	 *
	 * Re-indexing a document id replaces its prior content.
	 *
	 * @param documents - Documents to index.
	 */
	upsert(documents: LexicalDocument[]): void {
		if (!Array.isArray(documents)) {
			throw new RecallValidationError("documents must be an array.");
		}
		for (const doc of documents) {
			if (!doc || typeof doc.id !== "string" || typeof doc.text !== "string") {
				throw new RecallValidationError(
					"Each document requires string id and text.",
				);
			}
			const namespace = doc.namespace ?? this.defaultNamespace;
			const tokens = tokenize(doc.text);
			const termCounts = termFrequency(tokens);
			const indexed: IndexedDoc = {
				id: doc.id,
				tokens,
				termCounts,
				length: tokens.length,
			};

			const docs = this.getOrCreate(this.docsByNamespace, namespace);
			const df = this.getOrCreate(this.dfByNamespace, namespace);
			const previous = docs.get(doc.id);
			if (previous) {
				this.subtractDocumentFrequencies(df, previous.termCounts);
				this.totalLengthByNamespace.set(
					namespace,
					(this.totalLengthByNamespace.get(namespace) ?? 0) - previous.length,
				);
			}

			docs.set(doc.id, indexed);
			for (const term of termCounts.keys()) {
				df.set(term, (df.get(term) ?? 0) + 1);
			}
			this.totalLengthByNamespace.set(
				namespace,
				(this.totalLengthByNamespace.get(namespace) ?? 0) + indexed.length,
			);
		}
	}

	/**
	 * Remove documents by id within a namespace.
	 *
	 * @param ids - Document ids to remove.
	 * @param namespace - Optional namespace scope.
	 */
	delete(ids: string[], namespace?: string): void {
		const ns = namespace ?? this.defaultNamespace;
		const docs = this.docsByNamespace.get(ns);
		const df = this.dfByNamespace.get(ns);
		if (!docs || !df) return;
		for (const id of ids) {
			const doc = docs.get(id);
			if (!doc) continue;
			this.subtractDocumentFrequencies(df, doc.termCounts);
			this.totalLengthByNamespace.set(
				ns,
				(this.totalLengthByNamespace.get(ns) ?? 0) - doc.length,
			);
			docs.delete(id);
		}
	}

	/**
	 * Drop all documents in a namespace (or everything when omitted).
	 *
	 * @param namespace - Optional namespace to clear.
	 */
	clear(namespace?: string): void {
		if (namespace === undefined) {
			this.docsByNamespace.clear();
			this.dfByNamespace.clear();
			this.totalLengthByNamespace.clear();
			return;
		}
		this.docsByNamespace.delete(namespace);
		this.dfByNamespace.delete(namespace);
		this.totalLengthByNamespace.delete(namespace);
	}

	/**
	 * Count documents, optionally scoped to a namespace.
	 *
	 * @param namespace - Optional namespace scope.
	 */
	count(namespace?: string): number {
		if (namespace === undefined) {
			let total = 0;
			for (const docs of this.docsByNamespace.values()) total += docs.size;
			return total;
		}
		return this.docsByNamespace.get(namespace)?.size ?? 0;
	}

	/**
	 * Search the store for documents matching the query.
	 *
	 * @param query - Raw query text.
	 * @param options - Search options (topK, namespace).
	 * @returns Ranked results, highest score first.
	 *
	 * @public
	 */
	search(
		query: string,
		options: { topK?: number; namespace?: string } = {},
	): LexicalSearchResult[] {
		const namespace = options.namespace ?? this.defaultNamespace;
		const topK = options.topK ?? 10;
		const docs = this.docsByNamespace.get(namespace);
		if (!docs || docs.size === 0) return [];

		const queryTerms = tokenize(query);
		if (queryTerms.length === 0) return [];

		const df = this.dfByNamespace.get(namespace) ?? new Map<string, number>();
		const n = docs.size;
		const avgLength =
			n > 0 ? (this.totalLengthByNamespace.get(namespace) ?? 0) / n : 0;
		const querySet = new Set(queryTerms);

		const scored: LexicalSearchResult[] = [];
		for (const doc of docs.values()) {
			let rawScore = 0;
			for (const term of querySet) {
				const tf = doc.termCounts.get(term);
				if (tf === undefined) continue;
				const documentFrequency = df.get(term) ?? 0;
				// Okapi BM25 IDF, floored at 0 to avoid negative contributions
				// for very common terms across a small corpus.
				const idf = Math.max(
					0,
					Math.log(
						1 + (n - documentFrequency + 0.5) / (documentFrequency + 0.5),
					),
				);
				const denominator =
					(tf * (this.k1 + 1)) /
					(tf +
						this.k1 *
							(1 -
								this.b +
								this.b * (avgLength > 0 ? doc.length / avgLength : 1)));
				rawScore += idf * denominator;
			}

			// Fold in a small fuzzy-boost for partial/typo overlap so BM25 misses
			// (e.g. "auth" vs "authentication") still contribute.
			if (this.fuzzyBoost > 0) {
				const fuzzy = fuzzyOverlapScore(queryTerms, doc.tokens);
				rawScore += this.fuzzyBoost * fuzzy;
			}

			if (rawScore <= 0) continue;
			scored.push({ id: doc.id, score: saturate(rawScore) });
		}

		scored.sort((a, b) => b.score - a.score);
		return scored.slice(0, topK);
	}

	private getOrCreate<K, V>(map: Map<K, V>, key: K): V {
		let value = map.get(key);
		if (!value) {
			value = new Map() as V;
			map.set(key, value);
		}
		return value;
	}

	private subtractDocumentFrequencies(
		df: Map<string, number>,
		termCounts: Map<string, number>,
	): void {
		for (const [term, count] of termCounts) {
			const next = (df.get(term) ?? 0) - 1;
			if (next <= 0) df.delete(term);
			else df.set(term, next);
			void count;
		}
	}
}

/**
 * Factory for {@link BM25Store}.
 *
 * @param options - Store options.
 * @returns A new BM25Store instance.
 *
 * @public
 */
export function createBM25Store(options?: LexicalStoreOptions): BM25Store {
	return new BM25Store(options);
}

/**
 * Saturate a positive BM25 raw score into roughly `[0, 1]`.
 *
 * BM25 scores are unbounded and corpus-dependent. A `x / (x + k)` curve maps
 * them into a stable range so they can be merged with cosine similarity
 * (already in `[-1, 1]`) by the hybrid recall layer.
 *
 * @internal
 */
function saturate(score: number): number {
	if (score <= 0) return 0;
	return score / (score + 2);
}
