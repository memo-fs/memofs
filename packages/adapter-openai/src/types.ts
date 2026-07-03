/**
 * Core types for the @tekmemo/core/openai package.
 *
 * @remarks
 * Defines configuration, request/response, and embedder types
 * used throughout the OpenAI integration.
 *
 * @public
 */

import type {
	OpenAIEmbeddingModel,
	OpenAIEncodingFormat,
} from "./models/models";

/**
 * @file Type definitions for @tekmemo/core/openai.
 *
 * @remarks
 * This module defines the core types used throughout the package including
 * configuration interfaces, request/response types, and the MemoryEmbedder interface.
 *
 * @public
 */

/**
 * A fetch-compatible function type for making HTTP requests.
 *
 * @param input - The URL or Request object.
 * @param init - Optional request initialization options.
 * @returns A promise that resolves to the Response.
 * @public
 */
export type OpenAIFetchLike = (
	input: string | URL | Request,
	init?: RequestInit,
) => Promise<Response>;

/**
 * Configuration options for retry behavior.
 *
 * @public
 */
export interface OpenAIRetryOptions {
	/** Maximum number of retry attempts. @defaultValue 2 */
	maxRetries?: number | undefined;
	/** Base delay between retries in milliseconds. @defaultValue 1000 */
	baseDelayMs?: number | undefined;
	/** Maximum delay between retries in milliseconds. @defaultValue 30000 */
	maxDelayMs?: number | undefined;
	/** Whether to add jitter to retry delays. @defaultValue true */
	jitter?: boolean | undefined;
	/** HTTP status codes that should trigger a retry. @defaultValue [408, 409, 425, 429, 500, 502, 503, 504] */
	retryableStatuses?: readonly number[] | undefined;
}

/**
 * Configuration for creating an OpenAI client.
 *
 * @public
 */
export interface OpenAIClientConfig {
	/** The OpenAI API key. */
	apiKey: string;
	/** The base URL for the OpenAI API. @defaultValue "https://api.openai.com" */
	baseUrl?: string | undefined;
	/** The OpenAI organization ID, if applicable. */
	organization?: string | undefined;
	/** The OpenAI project ID, if applicable. */
	project?: string | undefined;
	/** Custom fetch implementation for making HTTP requests. */
	fetch?: OpenAIFetchLike | undefined;
	/** Request timeout in milliseconds. @defaultValue 30000 */
	timeoutMs?: number | undefined;
	/** Retry configuration options. */
	retry?: OpenAIRetryOptions | undefined;
	/** Custom user agent string for API requests. */
	userAgent?: string | undefined;
}

/**
 * Request payload for creating OpenAI embeddings.
 *
 * @public
 */
export interface OpenAIEmbeddingsRequest {
	/** The input texts to generate embeddings for. */
	input: string[];
	/** The embedding model to use. */
	model: OpenAIEmbeddingModel;
	/** The number of dimensions for the embedding (only for supported models). */
	dimensions?: number | undefined;
	/** The encoding format for the embedding vectors. @defaultValue "float" */
	encoding_format?: OpenAIEncodingFormat | undefined;
	/** A unique identifier representing your end-user. */
	user?: string | undefined;
}

/**
 * An embedding object returned by the OpenAI API.
 *
 * @public
 */
export interface OpenAIEmbeddingObject {
	/** The object type, typically "embedding". */
	object?: string;
	/** The embedding vector. */
	embedding: number[];
	/** The index of the embedding in the request. */
	index: number;
}

/**
 * Response from the OpenAI embeddings API.
 *
 * @public
 */
export interface OpenAIEmbeddingsResponse {
	/** The object type, typically "list". */
	object?: string;
	/** The list of embedding objects. */
	data: OpenAIEmbeddingObject[];
	/** The model used for generating embeddings. */
	model: string;
	/** Usage statistics for the request. */
	usage?: {
		/** Number of prompt tokens used. */
		prompt_tokens?: number;
		/** Total number of tokens used. */
		total_tokens?: number;
		[key: string]: unknown;
	};
	/** Additional properties from the API response. */
	[key: string]: unknown;
}

/**
 * Interface for clients that can create OpenAI embeddings.
 *
 * @public
 */
export interface OpenAIEmbeddingsClient {
	/**
	 * Creates embeddings for the given request.
	 *
	 * @param request - The embeddings request.
	 * @returns A promise that resolves to the embeddings response.
	 */
	createEmbeddings(
		request: OpenAIEmbeddingsRequest,
	): Promise<OpenAIEmbeddingsResponse>;
}

/**
 * Configuration for the OpenAIEmbedder.
 *
 * @public
 */
export interface OpenAIEmbedderConfig {
	/** The OpenAI API key (mutually exclusive with client). */
	apiKey?: string | undefined;
	/** A pre-configured OpenAI embeddings client (mutually exclusive with apiKey). */
	client?: OpenAIEmbeddingsClient | undefined;
	/** The default embedding model to use. @defaultValue "text-embedding-3-small" */
	model?: OpenAIEmbeddingModel | undefined;
	/** The base URL for the OpenAI API. @defaultValue "https://api.openai.com" */
	baseUrl?: string | undefined;
	/** The OpenAI organization ID, if applicable. */
	organization?: string | undefined;
	/** The OpenAI project ID, if applicable. */
	project?: string | undefined;
	/** Custom fetch implementation for making HTTP requests. */
	fetch?: OpenAIFetchLike | undefined;
	/** Request timeout in milliseconds. @defaultValue 30000 */
	timeoutMs?: number | undefined;
	/** Retry configuration options. */
	retry?: OpenAIRetryOptions | undefined;
	/** Custom user agent string for API requests. */
	userAgent?: string | undefined;
	/** The number of dimensions for embeddings (only for supported models). */
	dimensions?: number | undefined;
	/** The encoding format for embedding vectors. @defaultValue "float" */
	encodingFormat?: OpenAIEncodingFormat | undefined;
	/** A unique identifier representing your end-user. */
	user?: string | undefined;
	/** Maximum number of texts to send in a single API request. @defaultValue 128 */
	batchSize?: number | undefined;
	/** Expected embedding dimensions (for validation). */
	expectedDimensions?: number | undefined;
	/** Whether to allow empty text strings in the input. @defaultValue false */
	allowEmptyText?: boolean | undefined;
	/** Whether to allow unknown models when setting dimensions. @defaultValue true */
	allowUnknownModelDimensions?: boolean;
}

import type {
	EmbedTextsInput as BaseEmbedTextsInput,
	EmbeddingRecord,
	EmbedTextsResult,
	MemoryEmbedder,
} from "@tekmemo/core";

export interface EmbedTextsInput extends BaseEmbedTextsInput {
	model?: OpenAIEmbeddingModel | undefined;
	encodingFormat?: OpenAIEncodingFormat | undefined;
}

export type { EmbeddingRecord, EmbedTextsResult, MemoryEmbedder };
