/**
 * Shared embedding types for MemoFS.
 *
 * @public
 */

/**
 * Default local embedding model id used when none is configured.
 *
 * Single source of truth shared by the lazy local embedder, the resolved
 * config, and the Transformers.js adapter — the three default sites must
 * never drift apart.
 *
 * @public
 */
export const DEFAULT_LOCAL_EMBEDDING_MODEL = "Xenova/bge-small-en-v1.5";

export interface EmbeddingRecord {
	text: string;
	embedding: number[];
	index: number;
	model: string;
	dimensions: number;
}

export interface EmbedTextsInput {
	texts: string[];
	model?: string | undefined;
	/**
	 * Which side of retrieval the text belongs to. Adapters that wrap
	 * instruction-tuned models (bge, e5, nomic) use this to apply the
	 * model's asymmetric prefix (`query:`/`passage:`, etc.). Callers indexing
	 * documents can leave it unset — `"document"` is the default.
	 */
	purpose?: "query" | "document" | undefined;
	dimensions?: number | undefined;
	encodingFormat?: string | undefined;
	user?: string | undefined;
	batchSize?: number | undefined;
	expectedDimensions?: number | undefined;
	allowEmptyText?: boolean | undefined;
}

export interface EmbedTextsResult {
	embeddings: EmbeddingRecord[];
	model: string;
	usage?: {
		promptTokens?: number;
		totalTokens?: number;
	};
}

export interface MemoryEmbedder {
	embedTexts(input: EmbedTextsInput): Promise<EmbedTextsResult>;
	embedText(
		text: string,
		options?: Omit<EmbedTextsInput, "texts">,
	): Promise<EmbeddingRecord>;
	/**
	 * Embed a retrieval query. Adapters for instruction-tuned models apply
	 * the model's query-side prefix here (e.g. bge's "Represent this
	 * sentence for searching relevant passages: "). Falls back to
	 * {@link MemoryEmbedder.embedText} when not implemented.
	 */
	embedQuery?(
		text: string,
		options?: Omit<EmbedTextsInput, "texts" | "purpose">,
	): Promise<EmbeddingRecord>;
	prewarm?(): Promise<void>;
}
