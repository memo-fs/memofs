import OpenAI from "openai";
import {
	OpenAIAPIError,
	OpenAINetworkError,
	OpenAIResponseError,
	OpenAITimeoutError,
} from "../errors/openai-errors";
import type {
	OpenAIClientConfig,
	OpenAIEmbeddingsClient,
	OpenAIEmbeddingsRequest,
	OpenAIEmbeddingsResponse,
} from "../types";
import { assertValidApiKey, normalizeBaseUrl } from "../utils/validation";

/**
 * @file OpenAI client implementation for embeddings.
 *
 * @remarks
 * This module provides the {@link OpenAIEmbeddingsClient} class that wraps the official OpenAI SDK
 * to create embeddings. It handles authentication, request formatting, and error mapping.
 *
 * @internal
 */

/**
 * Internal interface representing the OpenAI SDK embeddings API.
 *
 * @internal
 */
interface OpenAIEmbeddingsSdk {
	embeddings: {
		create(request: unknown): Promise<unknown>;
	};
}

/**
 * Configuration for the OpenAI SDK embeddings client.
 *
 * @public
 */
export interface OpenAISdkClientConfig extends OpenAIClientConfig {
	/** Optional preconstructed official OpenAI SDK client, useful for tests. */
	sdkClient?: OpenAIEmbeddingsSdk | undefined;
}

/**
 * OpenAI SDK-based embeddings client.
 *
 * @public
 * @remarks
 * This client wraps the official OpenAI SDK to provide embedding functionality.
 * It handles API authentication, request formatting, and error mapping.
 */
export class OpenAISdkEmbeddingsClient implements OpenAIEmbeddingsClient {
	private readonly sdk: OpenAIEmbeddingsSdk;

	/**
	 * Creates a new OpenAI SDK embeddings client.
	 *
	 * @param config - The client configuration options.
	 * @throws {OpenAIConfigError} If the API key is invalid or missing.
	 * @throws {OpenAIConfigError} If the base URL is invalid.
	 */
	constructor(config: OpenAISdkClientConfig) {
		assertValidApiKey(config.apiKey);
		normalizeBaseUrl(config.baseUrl);

		this.sdk =
			config.sdkClient ??
			(new OpenAI({
				apiKey: config.apiKey,
				baseURL: normalizeBaseUrl(config.baseUrl),
				...(config.organization === undefined
					? {}
					: { organization: config.organization }),
				...(config.project === undefined ? {} : { project: config.project }),
				...(config.fetch === undefined ? {} : { fetch: config.fetch }),
				timeout: config.timeoutMs ?? 30_000,
				maxRetries: config.retry?.maxRetries ?? 2,
				...(config.userAgent === undefined
					? {}
					: { defaultHeaders: { "user-agent": config.userAgent } }),
			}) as unknown as OpenAIEmbeddingsSdk);
	}

	/**
	 * Creates embeddings for the given request.
	 *
	 * @param request - The embeddings request containing input texts and model configuration.
	 * @returns A promise that resolves to the embeddings response.
	 * @throws {OpenAIResponseError} If the SDK returns a non-object response.
	 * @throws {OpenAIAPIError} If the API returns an error status.
	 * @throws {OpenAITimeoutError} If the request times out.
	 * @throws {OpenAINetworkError} If a network error occurs.
	 */
	async createEmbeddings(
		request: OpenAIEmbeddingsRequest,
	): Promise<OpenAIEmbeddingsResponse> {
		try {
			const payload = await this.sdk.embeddings.create(request);
			if (typeof payload !== "object" || payload === null) {
				throw new OpenAIResponseError(
					"OpenAI SDK returned a non-object embeddings response.",
				);
			}
			return payload as OpenAIEmbeddingsResponse;
		} catch (error) {
			if (
				error instanceof OpenAIAPIError ||
				error instanceof OpenAIResponseError ||
				error instanceof OpenAITimeoutError
			) {
				throw error;
			}

			throw mapOpenAIError(error);
		}
	}
}

/**
 * @deprecated Use {@link OpenAISdkEmbeddingsClient} instead.
 * @public
 */
export const OpenAIRestClient = OpenAISdkEmbeddingsClient;

/**
 * Creates a new OpenAI embeddings client.
 *
 * @param config - The client configuration options.
 * @returns A new OpenAI embeddings client instance.
 * @throws {OpenAIConfigError} If the API key is invalid or missing.
 * @public
 */
export function createOpenAIClient(
	config: OpenAIClientConfig,
): OpenAIEmbeddingsClient {
	return new OpenAISdkEmbeddingsClient(config);
}

/**
 * Maps an unknown error from the OpenAI SDK to a typed TekMemo error.
 *
 * @param error - The unknown error from the OpenAI SDK.
 * @returns A typed error (OpenAIAPIError, OpenAITimeoutError, or OpenAINetworkError).
 * @internal
 */
function mapOpenAIError(error: unknown): Error {
	const record =
		typeof error === "object" && error !== null
			? (error as Record<string, unknown>)
			: {};
	const name = typeof record.name === "string" ? record.name : "";
	const message =
		typeof record.message === "string"
			? redactApiKeys(record.message)
			: "OpenAI SDK request failed.";
	const status =
		typeof record.status === "number" && Number.isInteger(record.status)
			? record.status
			: undefined;

	if (status !== undefined) {
		return new OpenAIAPIError(message, {
			status,
			providerCode: typeof record.code === "string" ? record.code : undefined,
			providerType: typeof record.type === "string" ? record.type : undefined,
			cause: error,
		});
	}

	if (name.includes("Timeout")) {
		return new OpenAITimeoutError(message, { cause: error });
	}

	return new OpenAINetworkError(message, { cause: error });
}

/**
 * Redacts API keys from error messages to prevent secret leakage.
 *
 * @param value - The string potentially containing API keys.
 * @returns The string with API keys redacted.
 * @internal
 */
function redactApiKeys(value: string): string {
	return value.replace(/sk-[A-Za-z0-9_-]+/g, "sk-***");
}
