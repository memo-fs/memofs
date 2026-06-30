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

/**
 * Structural subset of the graph source-ref every extractor stamps onto the
 * nodes/edges it emits. Kept minimal so adapter packages don't need to depend
 * on `@tekbreed/tekmemo` to satisfy the contract — the real `GraphSourceRef`
 * (a strict superset) is assignable to this.
 */
export interface MinimalGraphSourceRef {
	sourceType: string;
	sourceId?: string;
	path?: string;
	title?: string;
	url?: string;
}

/**
 * Structural subset of {@link MinimalExtractionResult}`.nodes`. The real
 * `GraphNode` carries additional optional fields; both shapes are mutually
 * assignable at the contract boundary.
 */
export interface MinimalGraphNode {
	id: string;
	type: string;
	label: string;
	aliases?: string[];
	summary?: string;
	sourceRefs?: MinimalGraphSourceRef[];
	confidence?: number;
	importance?: number;
	status?: string;
	validFrom?: string;
	validUntil?: string;
	createdAt?: string;
	updatedAt?: string;
}

/**
 * Structural subset of {@link MinimalExtractionResult}`.edges`.
 */
export interface MinimalGraphEdge {
	id?: string;
	from: string;
	to: string;
	type: string;
	directed?: boolean;
	weight?: number;
	confidence?: number;
	status?: string;
	validFrom?: string;
	validUntil?: string;
	sourceRefs?: MinimalGraphSourceRef[];
	createdAt?: string;
	updatedAt?: string;
}

/** Structural subset of the contradiction signal extractors may emit. */
export interface MinimalExtractionContradiction {
	from: string;
	to: string;
	type: string;
}

/** Input to a {@link MinimalExtractor.extract} call. */
export interface MinimalExtractionInput {
	text: string;
	sourceRef?: MinimalGraphSourceRef;
	defaultNodeType?: string;
	maxFacts?: number;
	mode?: "fast" | "balanced" | "quality";
}

/** Output of a {@link MinimalExtractor.extract} call. */
export interface MinimalExtractionResult {
	nodes: MinimalGraphNode[];
	edges: MinimalGraphEdge[];
	contradictions?: MinimalExtractionContradiction[];
	model?: string;
	usage?: {
		promptTokens?: number;
		totalTokens?: number;
	};
}

/**
 * Provider-neutral graph extractor contract — the minimal surface adapter
 * packages must satisfy (mirrors the embedder/reranker pattern). Any concrete
 * `Extractor` from `@tekbreed/tekmemo` is assignable to this.
 */
export interface MinimalExtractor {
	readonly name: string;
	extract(input: MinimalExtractionInput): Promise<MinimalExtractionResult>;
}

/**
 * A JSON Schema describing the desired structured output of an LLM completion.
 * Provider-neutral — typed as a plain object so the contract carries no
 * schema-library dependency. Any concrete `LlmStructuredSchema` from
 * `@tekbreed/tekmemo` is assignable to this.
 */
export interface MinimalLlmStructuredSchema {
	[key: string]: unknown;
}

/** Input to a {@link MinimalLlmClient.complete} call. */
export interface MinimalLlmCompletionInput {
	system?: string;
	user: string;
	schema?: MinimalLlmStructuredSchema;
	mode?: "fast" | "balanced" | "quality";
}

/** Output of a {@link MinimalLlmClient.complete} call. */
export interface MinimalLlmCompletionResult {
	text: string;
	structured?: Record<string, unknown>;
	model?: string;
	usage?: {
		promptTokens?: number;
		totalTokens?: number;
	};
}

/**
 * Provider-neutral LLM transport contract — the minimal surface adapter
 * packages must satisfy (the fourth member of the embedder/reranker/extractor
 * family). Any concrete `LlmClient` from `@tekbreed/tekmemo` is assignable to
 * this. Has no core default impl: the deterministic-default seam is "field
 * absent → feature runs its deterministic path" (ADR 0014).
 */
export interface MinimalLlmClient {
	readonly name: string;
	complete(
		input: MinimalLlmCompletionInput,
	): Promise<MinimalLlmCompletionResult>;
}
