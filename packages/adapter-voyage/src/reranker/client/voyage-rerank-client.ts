/**
 * @file REST client for the Voyage AI rerank API.
 *
 * @remarks
 * This module provides a REST client implementation for Voyage AI's rerank endpoint.
 * It handles authentication, request formatting, response parsing, and error handling
 * with automatic retry support.
 *
 * @internal
 */

import {
	VoyageRerankApiError,
	VoyageRerankNetworkError,
	VoyageRerankResponseError,
	VoyageRerankTimeoutError,
} from "../errors/voyage-rerank-errors";
import { VOYAGE_RERANK_PATH } from "../models/models";
import type {
	VoyageRerankClient,
	VoyageRerankClientConfig,
	VoyageRerankRequest,
	VoyageRerankResponse,
} from "../types";
import { withRetry } from "../utils/retry";
import { assertValidApiKey, normalizeBaseUrl } from "../utils/validation";

/**
 * REST client for the Voyage AI rerank API.
 *
 * @public
 * @remarks
 * This client handles HTTP communication with the Voyage AI rerank endpoint,
 * including authentication via Bearer tokens, timeout management, and automatic
 * retries for retryable errors.
 */
export class VoyageRerankRestClient implements VoyageRerankClient {
	/** API key for authenticating with Voyage AI. */
	private readonly apiKey: string;
	/** Base URL for the Voyage AI API. */
	private readonly baseUrl: string;
	/** Fetch implementation used for HTTP requests. */
	private readonly fetchImpl: NonNullable<VoyageRerankClientConfig["fetch"]>;
	/** Request timeout in milliseconds. */
	private readonly timeoutMs: number;
	/** Retry configuration for failed requests. */
	private readonly retry: VoyageRerankClientConfig["retry"];
	/** Custom User-Agent header value. */
	private readonly userAgent: string | undefined;

	/**
	 * Creates a new VoyageRerankRestClient instance.
	 *
	 * @param config - Client configuration including API key and optional settings.
	 * @throws {VoyageRerankConfigError} When the API key is invalid.
	 */
	constructor(config: VoyageRerankClientConfig) {
		assertValidApiKey(config.apiKey);

		this.apiKey = config.apiKey;
		this.baseUrl = normalizeBaseUrl(config.baseUrl);
		this.fetchImpl = config.fetch ?? fetch;
		this.timeoutMs = config.timeoutMs ?? 30_000;
		this.retry = config.retry;
		this.userAgent = config.userAgent;
	}

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
	async rerank(request: VoyageRerankRequest): Promise<VoyageRerankResponse> {
		return withRetry(() => this.rerankOnce(request), this.retry);
	}

	/**
	 * Executes a single rerank request without retry logic.
	 *
	 * @internal
	 * @param request - The rerank request to execute.
	 * @returns A promise that resolves to the rerank response.
	 * @throws {VoyageRerankApiError} When the API returns an error status.
	 * @throws {VoyageRerankNetworkError} When the request fails due to network issues.
	 * @throws {VoyageRerankTimeoutError} When the request times out.
	 * @throws {VoyageRerankResponseError} When the response is malformed.
	 */
	private async rerankOnce(
		request: VoyageRerankRequest,
	): Promise<VoyageRerankResponse> {
		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

		try {
			const response = await this.fetchImpl(
				`${this.baseUrl}${VOYAGE_RERANK_PATH}`,
				{
					method: "POST",
					headers: this.headers(),
					body: JSON.stringify(request),
					signal: controller.signal,
				},
			);

			const payload = await parseJsonSafely(response);

			if (!response.ok) {
				const provider = extractProviderError(payload);
				throw new VoyageRerankApiError(
					provider.message ??
						`Voyage rerank request failed with status ${response.status}.`,
					{
						status: response.status,
						providerCode: provider.code,
						providerBody: payload,
					},
				);
			}

			if (typeof payload !== "object" || payload === null) {
				throw new VoyageRerankResponseError(
					"Voyage rerank API returned a non-object JSON response.",
				);
			}

			return payload as VoyageRerankResponse;
		} catch (error) {
			if (isAbortError(error)) {
				throw new VoyageRerankTimeoutError(
					`Voyage rerank request timed out after ${this.timeoutMs}ms.`,
					{ cause: error },
				);
			}

			if (
				error instanceof VoyageRerankApiError ||
				error instanceof VoyageRerankResponseError ||
				error instanceof VoyageRerankTimeoutError
			) {
				throw error;
			}

			throw new VoyageRerankNetworkError(
				"Voyage rerank request failed before receiving a valid response.",
				{ cause: error },
			);
		} finally {
			clearTimeout(timeout);
		}
	}

	/**
	 * Builds the HTTP headers for API requests.
	 *
	 * @internal
	 * @returns Headers object with authorization, content-type, and optional user-agent.
	 */
	private headers(): HeadersInit {
		const headers: Record<string, string> = {
			authorization: `Bearer ${this.apiKey}`,
			"content-type": "application/json",
			accept: "application/json",
		};

		if (this.userAgent) {
			headers["user-agent"] = this.userAgent;
		}

		return headers;
	}
}

/**
 * Creates a new Voyage AI rerank client.
 *
 * @public
 * @param config - Client configuration including API key and optional settings.
 * @returns A configured VoyageRerankClient instance.
 * @throws {VoyageRerankConfigError} When the API key is invalid.
 */
export function createVoyageRerankClient(
	config: VoyageRerankClientConfig,
): VoyageRerankClient {
	return new VoyageRerankRestClient(config);
}

/**
 * Parses a response body as JSON, handling empty responses and invalid JSON.
 *
 * @internal
 * @param response - The HTTP response to parse.
 * @returns The parsed JSON value, or null for empty responses.
 * @throws {VoyageRerankResponseError} When the response contains invalid JSON.
 */
async function parseJsonSafely(response: Response): Promise<unknown> {
	const text = await response.text();

	if (text.trim().length === 0) {
		return null;
	}

	try {
		return JSON.parse(text) as unknown;
	} catch (error) {
		throw new VoyageRerankResponseError(
			"Voyage rerank API returned invalid JSON.",
			{ cause: error },
		);
	}
}

/**
 * Extracts error details from a Voyage AI API error response.
 *
 * @internal
 * @param payload - The parsed JSON response body.
 * @returns An object containing the error code and message, if available.
 */
function extractProviderError(payload: unknown): {
	code: string | undefined;
	message: string | undefined;
} {
	if (typeof payload !== "object" || payload === null)
		return { code: undefined, message: undefined };
	const record = payload as Record<string, unknown>;

	if (typeof record.error === "object" && record.error !== null) {
		const error = record.error as Record<string, unknown>;
		return {
			code: typeof error.code === "string" ? error.code : undefined,
			message: typeof error.message === "string" ? error.message : undefined,
		};
	}

	return {
		code: typeof record.code === "string" ? record.code : undefined,
		message: typeof record.message === "string" ? record.message : undefined,
	};
}

/**
 * Checks if an error is an abort error (typically from a timeout).
 *
 * @internal
 * @param error - The error to check.
 * @returns True if the error is a DOMException with name "AbortError".
 */
function isAbortError(error: unknown): boolean {
	return error instanceof DOMException && error.name === "AbortError";
}
