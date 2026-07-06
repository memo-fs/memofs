import { chunkArray } from "@repo/utils";
import { createOpenAIClient } from "../client/openai-client";
import {
	OpenAIConfigError,
	OpenAIValidationError,
} from "../errors/openai-errors";
import { assertValidDimensions, expectedVectorLength } from "../models/models";
import type {
	EmbeddingRecord,
	EmbedTextsInput,
	EmbedTextsResult,
	MemoryEmbedder,
	OpenAIEmbedderConfig,
	OpenAIEmbeddingsClient,
} from "../types";
import {
	normalizeBatchSize,
	resolveApiKeyOrClient,
	validateEmbeddingsResponse,
	validateModel,
	validateTexts,
	validateUser,
} from "../utils/validation";

/**
 * @file OpenAI Embedder implementation for MemoFS's memory system.
 *
 * @remarks
 * This module provides the {@link OpenAIEmbedder} class that implements the
 * {@link MemoryEmbedder} interface for generating text embeddings using OpenAI's API.
 *
 * @public
 */

/**
 * OpenAI implementation of the MemoryEmbedder interface.
 *
 * @remarks
 * This class handles batching, validation, and error handling for OpenAI embeddings.
 * It supports both API key and pre-configured client authentication.
 *
 * @public
 */
export class OpenAIEmbedder implements MemoryEmbedder {
	private readonly client: OpenAIEmbeddingsClient;
	private readonly defaultModel: string;
	private readonly config: OpenAIEmbedderConfig;

	/**
	 * Creates a new OpenAIEmbedder instance.
	 *
	 * @param config - The embedder configuration options.
	 * @throws {OpenAIConfigError} If the API key is missing and no client is provided.
	 * @throws {OpenAIValidationError} If the model is invalid or dimensions are invalid.
	 */
	constructor(config: OpenAIEmbedderConfig) {
		resolveApiKeyOrClient(config);

		if (config.client) {
			this.client = config.client;
		} else {
			const apiKey = config.apiKey;
			if (!apiKey) {
				throw new OpenAIConfigError("OpenAI apiKey is required.");
			}
			this.client = createOpenAIClient({
				apiKey,
				baseUrl: config.baseUrl,
				organization: config.organization,
				project: config.project,
				fetch: config.fetch,
				timeoutMs: config.timeoutMs,
				retry: config.retry,
				userAgent: config.userAgent,
			});
		}

		this.defaultModel = config.model ?? "text-embedding-3-small";
		validateModel(this.defaultModel);
		this.config = config;
	}

	/**
	 * Generates an embedding for a single text string.
	 *
	 * @param text - The text to generate an embedding for.
	 * @param options - Optional embedding options (excluding texts).
	 * @returns A promise that resolves to the embedding record.
	 * @throws {OpenAIValidationError} If the text is invalid or model/dimensions are invalid.
	 * @throws {OpenAIAPIError} If the API returns an error.
	 */
	/**
	 * Generates an embedding for a single text string.
	 *
	 * @param text - The text to generate an embedding for.
	 * @param options - Optional embedding options (excluding texts).
	 * @returns A promise that resolves to the embedding record.
	 * @throws {@link OpenAIValidationError} If the text is invalid or model/dimensions are invalid.
	 * @throws {@link OpenAIAPIError} If the API returns an error.
	 */
	async embedText(
		text: string,
		options?: Omit<EmbedTextsInput, "texts">,
	): Promise<EmbeddingRecord> {
		const result = await this.embedTexts({ ...options, texts: [text] });
		const first = result.embeddings[0];
		if (!first) {
			throw new OpenAIValidationError(
				"OpenAI returned no embedding for single input.",
			);
		}
		return first;
	}

	/**
	 * Generates embeddings for multiple text strings.
	 *
	 * @param input - The input containing texts and embedding options.
	 * @returns A promise that resolves to the embeddings result with usage information.
	 * @throws {OpenAIValidationError} If texts are invalid, model is invalid, or dimensions are invalid.
	 * @throws {OpenAIValidationError} If base64 encoding format is requested (not supported).
	 * @throws {OpenAIAPIError} If the API returns an error.
	 * @throws {OpenAIResponseError} If the API response is invalid.
	 */
	/**
	 * Generates embeddings for multiple text strings.
	 *
	 * @param input - The input containing texts and embedding options.
	 * @returns A promise that resolves to the embeddings result with usage information.
	 * @throws {@link OpenAIValidationError} If texts are invalid or model/dimensions are invalid.
	 * @throws {@link OpenAIResponseError} If the API response is invalid.
	 * @throws {@link OpenAIAPIError} If the API returns an error.
	 */
	async embedTexts(input: EmbedTextsInput): Promise<EmbedTextsResult> {
		validateTexts(input.texts, {
			allowEmptyText: input.allowEmptyText ?? this.config.allowEmptyText,
		});

		if (input.texts.length === 0) {
			return {
				embeddings: [],
				model: input.model ?? this.defaultModel,
				usage: { promptTokens: 0, totalTokens: 0 },
			};
		}

		const model = input.model ?? this.defaultModel;
		validateModel(model);

		const dimensions = input.dimensions ?? this.config.dimensions;
		const encodingFormat =
			input.encodingFormat ?? this.config.encodingFormat ?? "float";
		const user = input.user ?? this.config.user;

		if (encodingFormat === "base64") {
			throw new OpenAIValidationError(
				"base64 encoding_format is not supported by OpenAIEmbedder because MemoFS expects numeric vectors.",
			);
		}

		validateUser(user);
		assertValidDimensions({
			model,
			dimensions,
			allowUnknownModelDimensions: this.config.allowUnknownModelDimensions,
		});

		const expectedDimensions =
			input.expectedDimensions ??
			this.config.expectedDimensions ??
			expectedVectorLength({ model, dimensions });
		const batchSize = normalizeBatchSize(
			input.batchSize ?? this.config.batchSize,
		);
		const batches = chunkArray(
			input.texts.map((text, originalIndex) => ({ text, originalIndex })),
			batchSize,
		);
		const all: EmbeddingRecord[] = [];
		let promptTokens = 0;
		let totalTokens = 0;

		for (const batch of batches) {
			const response = await this.client.createEmbeddings({
				input: batch.map((item) => item.text),
				model,
				dimensions,
				encoding_format: encodingFormat,
				user,
			});

			validateEmbeddingsResponse(response, {
				expectedCount: batch.length,
				expectedDimensions,
			});

			promptTokens +=
				typeof response.usage?.prompt_tokens === "number"
					? response.usage.prompt_tokens
					: 0;
			totalTokens +=
				typeof response.usage?.total_tokens === "number"
					? response.usage.total_tokens
					: 0;

			const sorted = [...response.data].sort((a, b) => a.index - b.index);
			sorted.forEach((item) => {
				const original = batch[item.index];
				if (!original) {
					throw new OpenAIValidationError(
						`OpenAI response contained out-of-range index ${item.index}.`,
					);
				}

				all.push({
					text: original.text,
					embedding: [...item.embedding],
					index: original.originalIndex,
					model: response.model ?? model,
					dimensions: item.embedding.length,
				});
			});
		}

		all.sort((a, b) => a.index - b.index);

		return {
			embeddings: all,
			model,
			usage: { promptTokens, totalTokens },
		};
	}
}

/**
 * Factory function to create a new OpenAIEmbedder instance.
 *
 * @param config - The embedder configuration options.
 * @returns A new OpenAIEmbedder instance.
 * @throws {OpenAIConfigError} If the API key is missing and no client is provided.
 * @throws {OpenAIValidationError} If the model is invalid or dimensions are invalid.
 * @public
 */
export function createOpenAIEmbedder(
	config: OpenAIEmbedderConfig,
): OpenAIEmbedder {
	return new OpenAIEmbedder(config);
}
