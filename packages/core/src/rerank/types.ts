/**
 * Represents a document to be reranked.
 *
 * @public
 */
export interface RerankDocument {
	/** Unique identifier for the document. Must be a safe string matching /^[A-Za-z0-9._:-]{1,256}$/. */
	id: string;
	/** The text content of the document used for relevance scoring. */
	text: string;
	/** Optional metadata to attach to the document. Cloned during processing to prevent mutations. */
	metadata?: Record<string, unknown> | undefined;
}

/**
 * Input provided to a reranker for scoring document relevance.
 *
 * @public
 */
export interface RerankInput {
	/** The search query to compare documents against. */
	query: string;
	/** The list of documents to rerank by relevance to the query. */
	documents: RerankDocument[];
	/** Optional maximum number of results to return. Defaults to all documents if not specified. */
	topK?: number;
}

/**
 * Result of reranking a document, containing the score and rank.
 *
 * @public
 */
export interface RerankResult {
	/** The unique identifier of the document (matches input document id). */
	id: string;
	/** The text content of the document. */
	text: string;
	/** Relevance score assigned by the reranker. Higher values indicate greater relevance. */
	score: number;
	/** The rank position after sorting by score (1-indexed). */
	rank: number;
	/** Optional metadata from the input document, cloned to prevent mutations. */
	metadata?: Record<string, unknown> | undefined;
}

/**
 * Interface for a reranker that scores documents by relevance to a query.
 *
 * @public
 */
export interface Reranker {
	/**
	 * Reranks documents based on their relevance to the query.
	 *
	 * @param input - The rerank input containing query and documents.
	 * @returns A promise that resolves to an array of rerank results sorted by relevance.
	 */
	rerank(input: RerankInput): Promise<RerankResult[]>;
}

/**
 * Normalized rerank input with all optional fields resolved to defaults.
 *
 * @public
 * @remarks This type is produced by {@link normalizeRerankInput} and guarantees topK is always set.
 */
export interface NormalizedRerankInput {
	/** The search query to compare documents against. */
	query: string;
	/** The list of documents to rerank by relevance to the query. */
	documents: RerankDocument[];
	/** The resolved maximum number of results to return. Defaults to documents.length if not specified. */
	topK: number;
}
