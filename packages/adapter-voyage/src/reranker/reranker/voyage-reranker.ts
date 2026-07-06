/**
 * @file Voyage AI reranker implementation for MemoFS.
 *
 * @remarks
 * This module provides a Voyage AI-based implementation of the MemoFS Reranker
 * interface. It handles document normalization, model validation, and response
 * validation before returning ranked results.
 *
 * @internal
 */

import {
	applyTopK,
	normalizeRerankInput,
	type Reranker,
	type RerankInput,
	type RerankResult,
} from "@memofs/core";
import { createVoyageRerankClient } from "../client/voyage-rerank-client";
import {
	VoyageRerankConfigError,
	VoyageRerankValidationError,
} from "../errors/voyage-rerank-errors";
import { VOYAGE_RERANK_MAX_DOCUMENTS } from "../models/models";
import type { VoyageRerankClient, VoyageRerankerConfig } from "../types";
import {
	normalizeMaxDocuments,
	resolveApiKeyOrClient,
	validateModel,
	validateVoyageResponse,
} from "../utils/validation";

/**
 * Voyage AI implementation of the MemoFS Reranker interface.
 *
 * @public
 * @remarks
 * This reranker uses Voyage AI's rerank API to rank documents by relevance
 * to a query. It supports model selection, truncation, and validates responses
 * before returning results.
 */
export class VoyageReranker implements Reranker {
	/** The Voyage AI client used for API requests. */
	private readonly client: VoyageRerankClient;
	/** The model used for reranking. */
	private readonly model: string;
	/** Whether to truncate documents that exceed the model's context limit. */
	private readonly truncation: boolean;
	/** Maximum number of documents allowed per request. */
	private readonly maxDocuments: number;

	/**
	 * Creates a new VoyageReranker instance.
	 *
	 * @param config - Reranker configuration including API key or client, model, and options.
	 * @throws {VoyageRerankConfigError} When configuration is invalid (e.g., missing API key).
	 * @throws {VoyageRerankValidationError} When the model is not supported and allowUnknownModel is false.
	 */
	constructor(config: VoyageRerankerConfig) {
		resolveApiKeyOrClient(config);

		if (config.client) {
			this.client = config.client;
		} else {
			const apiKey = config.apiKey;
			if (!apiKey) {
				throw new VoyageRerankConfigError("Voyage apiKey is required.");
			}
			this.client = createVoyageRerankClient({
				apiKey,
				baseUrl: config.baseUrl,
				fetch: config.fetch,
				timeoutMs: config.timeoutMs,
				retry: config.retry,
				userAgent: config.userAgent,
			});
		}

		this.model = config.model ?? "rerank-2.5-lite";
		validateModel(this.model, config.allowUnknownModel ?? true);
		this.truncation = config.truncation ?? true;
		this.maxDocuments = normalizeMaxDocuments(config.maxDocuments);
	}

	/**
	 * Reranks documents against a query using Voyage AI's rerank API.
	 *
	 * @param input - The rerank input containing query, documents, and options.
	 * @returns A promise that resolves to an array of ranked results sorted by relevance.
	 * @throws {VoyageRerankValidationError} When validation fails (e.g., too many documents).
	 * @throws {VoyageRerankApiError} When the API returns an error status.
	 * @throws {VoyageRerankNetworkError} When the request fails due to network issues.
	 * @throws {VoyageRerankTimeoutError} When the request times out.
	 */
	async rerank(input: RerankInput): Promise<RerankResult[]> {
		const normalized = normalizeRerankInput(input);

		if (normalized.documents.length === 0) {
			return [];
		}

		if (
			normalized.documents.length > this.maxDocuments ||
			normalized.documents.length > VOYAGE_RERANK_MAX_DOCUMENTS
		) {
			throw new VoyageRerankValidationError(
				`Voyage rerank supports at most ${Math.min(this.maxDocuments, VOYAGE_RERANK_MAX_DOCUMENTS)} documents per request.`,
			);
		}

		const response = await this.client.rerank({
			query: normalized.query,
			documents: normalized.documents.map((document) => document.text),
			model: this.model,
			top_k: normalized.topK,
			truncation: this.truncation,
		});

		validateVoyageResponse(response, {
			maxIndexExclusive: normalized.documents.length,
			maxResults: normalized.topK,
		});

		const results = response.data.map((item): RerankResult => {
			const original = normalized.documents[item.index];
			if (!original) {
				throw new VoyageRerankValidationError(
					`Voyage returned out-of-range index ${item.index}.`,
				);
			}

			return {
				id: original.id,
				text: item.document ?? original.text,
				score: item.relevance_score,
				rank: 0,
				metadata: original.metadata
					? structuredCloneSafe(original.metadata)
					: undefined,
			};
		});

		return applyTopK(results, normalized.topK);
	}
}

/**
 * Creates a new VoyageReranker instance.
 *
 * @public
 * @param config - Reranker configuration including API key or client, model, and options.
 * @returns A configured VoyageReranker instance.
 * @throws {VoyageRerankConfigError} When configuration is invalid.
 * @throws {VoyageRerankValidationError} When the model is not supported.
 */
export function createVoyageReranker(
	config: VoyageRerankerConfig,
): VoyageReranker {
	return new VoyageReranker(config);
}

/**
 * Creates a deep clone of a value using JSON serialization.
 *
 * @internal
 * @param value - The value to clone.
 * @returns A deep clone of the value.
 */
function structuredCloneSafe<T>(value: T): T {
	return JSON.parse(JSON.stringify(value)) as T;
}
