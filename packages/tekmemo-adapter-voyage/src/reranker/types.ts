/**
 * A fetch-compatible function type for making HTTP requests.
 *
 * @public
 * @remarks
 * Use this type to inject a custom fetch implementation (e.g., for testing or custom agents).
 */
export type VoyageRerankFetchLike = (
	input: string | URL | Request,
	init?: RequestInit,
) => Promise<Response>;

/**
 * Configuration options for retry behavior when making Voyage AI requests.
 *
 * @public
 */
export interface VoyageRerankRetryOptions {
	/** Maximum number of retry attempts. Defaults to 3. */
	maxRetries?: number;
	/** Base delay in milliseconds between retries. Defaults to 1000ms. */
	baseDelayMs?: number;
	/** Maximum delay in milliseconds between retries. Defaults to 30000ms. */
	maxDelayMs?: number;
	/** Whether to add random jitter to retry delays. Defaults to true. */
	jitter?: boolean;
	/** HTTP status codes that should trigger a retry. Defaults to common retryable statuses. */
	retryableStatuses?: readonly number[];
}

/**
 * Configuration for creating a Voyage AI rerank HTTP client.
 *
 * @public
 */
export interface VoyageRerankClientConfig {
	/** Voyage AI API key for authentication. */
	apiKey: string;
	/** Base URL for the Voyage AI API. Defaults to https://api.voyageai.com. */
	baseUrl?: string | undefined;
	/** Custom fetch implementation. Defaults to the global fetch. */
	fetch?: VoyageRerankFetchLike | undefined;
	/** Request timeout in milliseconds. Defaults to 30000ms. */
	timeoutMs?: number | undefined;
	/** Retry configuration for failed requests. */
	retry?: VoyageRerankRetryOptions | undefined;
	/** Custom User-Agent header value for requests. */
	userAgent?: string | undefined;
}

/**
 * Request payload for the Voyage AI rerank API.
 *
 * @public
 */
export interface VoyageRerankRequest {
	/** The query text to rank documents against. */
	query: string;
	/** Array of document texts to be ranked. */
	documents: string[];
	/** The model to use for reranking (e.g., "rerank-2.5-lite"). */
	model: string;
	/** Maximum number of results to return. */
	top_k?: number | undefined;
	/** Whether to truncate documents that exceed the model's context limit. Defaults to true. */
	truncation?: boolean | undefined;
}

/**
 * A single reranking result item returned by the Voyage AI API.
 *
 * @public
 */
export interface VoyageRerankResponseItem {
	/** The index of the document in the original request array. */
	index: number;
	/** The relevance score indicating how well the document matches the query. */
	relevance_score: number;
	/** The document text, returned only when truncation is enabled and the document was truncated. */
	document?: string | undefined;
}

/**
 * Response from the Voyage AI rerank API.
 *
 * @public
 */
export interface VoyageRerankResponse {
	/** The object type identifier. Usually "list". */
	object?: string;
	/** Array of reranked results, sorted by relevance score in descending order. */
	data: VoyageRerankResponseItem[];
	/** The model used for reranking. */
	model?: string | undefined;
	/** Token usage information for the request. */
	usage?: {
		/** Total number of tokens used. */
		total_tokens?: number | undefined;
		[key: string]: unknown;
	};
	[key: string]: unknown;
}

/**
 * Interface for a Voyage AI rerank client.
 *
 * @public
 */
export interface VoyageRerankClient {
	/**
	 * Reranks documents against a query using the Voyage AI API.
	 *
	 * @param request - The rerank request containing query, documents, and options.
	 * @returns A promise that resolves to the rerank response with ranked documents.
	 * @throws {VoyageRerankApiError} When the API returns an error status.
	 * @throws {VoyageRerankNetworkError} When the request fails due to network issues.
	 * @throws {VoyageRerankTimeoutError} When the request times out.
	 * @throws {VoyageRerankResponseError} When the response is malformed.
	 */
	rerank(request: VoyageRerankRequest): Promise<VoyageRerankResponse>;
}

/**
 * Configuration for creating a VoyageReranker instance.
 *
 * @public
 * @remarks
 * Either `apiKey` or `client` must be provided. If `client` is provided,
 * it will be used directly instead of creating a new HTTP client.
 */
export interface VoyageRerankerConfig {
	/** Voyage AI API key. Required if `client` is not provided. */
	apiKey?: string | undefined;
	/** Pre-configured Voyage rerank client. If provided, `apiKey` is not required. */
	client?: VoyageRerankClient | undefined;
	/** The model to use for reranking. Defaults to "rerank-2.5-lite". */
	model?: string | undefined;
	/** Base URL for the Voyage AI API. Defaults to https://api.voyageai.com. */
	baseUrl?: string | undefined;
	/** Custom fetch implementation. Defaults to the global fetch. */
	fetch?: VoyageRerankFetchLike | undefined;
	/** Request timeout in milliseconds. Defaults to 30000ms. */
	timeoutMs?: number | undefined;
	/** Retry configuration for failed requests. */
	retry?: VoyageRerankRetryOptions | undefined;
	/** Custom User-Agent header value for requests. */
	userAgent?: string | undefined;
	/** Whether to truncate documents that exceed the model's context limit. Defaults to true. */
	truncation?: boolean | undefined;
	/** Maximum number of documents allowed per request. Defaults to 1000. */
	maxDocuments?: number | undefined;
	/** Whether to allow models not in the known models list. Defaults to true. */
	allowUnknownModel?: boolean | undefined;
}
