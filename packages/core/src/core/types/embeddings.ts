/**
 * Shared embedding types for TekMemo.
 *
 * @public
 */

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
}
