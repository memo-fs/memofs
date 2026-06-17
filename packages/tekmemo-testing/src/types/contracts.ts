export interface MinimalMemoryStore {
	read(path: string): Promise<string> | string;
	write(path: string, content: string): Promise<void> | void;
	append(path: string, content: string): Promise<void> | void;
	exists(path: string): Promise<boolean> | boolean;
}

export interface MinimalEmbedder {
	embedTexts(input: {
		texts: string[];
		inputType?: "query" | "document" | null;
		expectedDimensions?: number;
		allowEmptyText?: boolean;
	}): Promise<{
		embeddings: Array<{
			text?: string;
			embedding: number[];
			index?: number;
			dimensions?: number;
		}>;
		model?: string;
		usage?: Record<string, unknown>;
	}>;

	embedText?(
		text: string,
		options?: {
			inputType?: "query" | "document" | null;
			expectedDimensions?: number;
			allowEmptyText?: boolean;
		},
	): Promise<{
		text?: string;
		embedding: number[];
		index?: number;
		dimensions?: number;
	}>;
}

export interface MinimalRecallDocument {
	id: string;
	text: string;
	embedding: number[];
	metadata: Record<string, unknown>;
}

export interface MinimalRecallQuery {
	embedding: number[];
	topK: number;
	filter?: Record<string, unknown>;
	namespace?: string;
}

export interface MinimalRecallResult {
	id: string;
	text?: string;
	score: number;
	metadata?: Record<string, unknown>;
}

export interface MinimalRecallStore {
	upsert(documents: MinimalRecallDocument[]): Promise<void>;
	query(query: MinimalRecallQuery): Promise<MinimalRecallResult[]>;
	delete(ids: string[], options?: { namespace?: string }): Promise<void>;
	deleteBySource(input: {
		projectId: string;
		sourceType: string;
		sourceId: string;
	}): Promise<void>;
}

export interface MinimalRerankDocument {
	id: string;
	text: string;
	metadata?: Record<string, unknown> | undefined;
}

export interface MinimalRerankResult {
	id: string;
	text: string;
	score: number;
	rank: number;
	metadata?: Record<string, unknown> | undefined;
}

export interface MinimalReranker {
	rerank(input: {
		query: string;
		documents: MinimalRerankDocument[];
		topK?: number;
	}): Promise<MinimalRerankResult[]>;
}
