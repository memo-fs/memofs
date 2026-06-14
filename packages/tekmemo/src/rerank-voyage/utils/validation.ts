/**
 * @file Validation utilities for Voyage AI rerank operations.
 *
 * @remarks
 * This module provides validation functions for API keys, URLs, models,
 * and API responses. It ensures that inputs meet the requirements before
 * making requests to the Voyage AI API.
 *
 * @internal
 */

import {
	VoyageRerankConfigError,
	VoyageRerankResponseError,
	VoyageRerankValidationError,
} from "../errors/voyage-rerank-errors";
import {
	VOYAGE_RERANK_DEFAULT_BASE_URL,
	VOYAGE_RERANK_MAX_DOCUMENTS,
	VOYAGE_RERANK_MODELS,
} from "../models/models";
import type { VoyageRerankerConfig, VoyageRerankResponse } from "../types";

/**
 * Validates that an API key is a non-empty string without null bytes.
 *
 * @internal
 * @param value - The value to validate as an API key.
 * @throws {VoyageRerankConfigError} When the API key is invalid (empty, not a string, or contains null bytes).
 */
export function assertValidApiKey(value: unknown): asserts value is string {
	if (typeof value !== "string" || value.trim().length === 0) {
		throw new VoyageRerankConfigError("Voyage apiKey is required.");
	}

	if (value.includes("\0")) {
		throw new VoyageRerankConfigError(
			"Voyage apiKey must not contain null bytes.",
		);
	}
}

/**
 * Normalizes and validates a base URL for the Voyage AI API.
 *
 * @internal
 * @param value - The base URL to normalize, or undefined to use the default.
 * @returns The normalized base URL without trailing slashes.
 * @throws {VoyageRerankConfigError} When the URL is invalid or doesn't use HTTPS (except for localhost).
 */
export function normalizeBaseUrl(value: string | undefined): string {
	const raw = value ?? VOYAGE_RERANK_DEFAULT_BASE_URL;

	if (typeof raw !== "string" || raw.trim().length === 0) {
		throw new VoyageRerankConfigError("baseUrl must be a non-empty string.");
	}

	let url: URL;
	try {
		url = new URL(raw);
	} catch (error) {
		throw new VoyageRerankConfigError("baseUrl must be a valid URL.", {
			cause: error,
		});
	}

	if (
		url.protocol !== "https:" &&
		url.hostname !== "localhost" &&
		url.hostname !== "127.0.0.1"
	) {
		throw new VoyageRerankConfigError(
			"baseUrl must use https unless targeting localhost for tests.",
		);
	}

	return url.toString().replace(/\/+$/, "");
}

/**
 * Validates a Voyage AI rerank model identifier.
 *
 * @internal
 * @param model - The model identifier to validate.
 * @param allowUnknownModel - Whether to allow models not in the known models list.
 * @throws {VoyageRerankValidationError} When the model is invalid or not supported.
 */
export function validateModel(
	model: string,
	allowUnknownModel: boolean | undefined,
): void {
	if (typeof model !== "string" || model.trim().length === 0) {
		throw new VoyageRerankValidationError("model must be a non-empty string.");
	}

	if (model.length > 128) {
		throw new VoyageRerankValidationError("model is too long.");
	}

	if (!allowUnknownModel && !VOYAGE_RERANK_MODELS.has(model)) {
		throw new VoyageRerankValidationError(
			`Unsupported Voyage rerank model "${model}".`,
		);
	}
}

/**
 * Normalizes and validates the maximum documents setting.
 *
 * @internal
 * @param value - The maximum documents value, or undefined to use the default.
 * @returns The validated maximum documents value.
 * @throws {VoyageRerankValidationError} When the value is not a positive integer or exceeds the API limit.
 */
export function normalizeMaxDocuments(value: number | undefined): number {
	const maxDocuments = value ?? VOYAGE_RERANK_MAX_DOCUMENTS;

	if (!Number.isInteger(maxDocuments) || maxDocuments <= 0) {
		throw new VoyageRerankValidationError(
			"maxDocuments must be a positive integer.",
		);
	}

	if (maxDocuments > VOYAGE_RERANK_MAX_DOCUMENTS) {
		throw new VoyageRerankValidationError(
			`maxDocuments must be <= ${VOYAGE_RERANK_MAX_DOCUMENTS}.`,
		);
	}

	return maxDocuments;
}

/**
 * Resolves and validates the API key or client from the reranker configuration.
 *
 * @internal
 * @param config - The reranker configuration to validate.
 * @throws {VoyageRerankConfigError} When neither a valid client nor API key is provided, or the client is invalid.
 */
export function resolveApiKeyOrClient(config: VoyageRerankerConfig): void {
	if (config.client) {
		if (typeof config.client.rerank !== "function") {
			throw new VoyageRerankConfigError(
				"client must implement rerank(request).",
			);
		}
		return;
	}

	assertValidApiKey(config.apiKey);
}

/**
 * Validates a Voyage AI rerank API response.
 *
 * @internal
 * @param response - The response to validate.
 * @param input - Validation parameters including max index and max results.
 * @throws {VoyageRerankResponseError} When the response is invalid (not an object, missing data, invalid items).
 */
export function validateVoyageResponse(
	response: unknown,
	input: { maxIndexExclusive: number; maxResults: number },
): asserts response is VoyageRerankResponse {
	if (typeof response !== "object" || response === null) {
		throw new VoyageRerankResponseError(
			"Voyage rerank response must be an object.",
		);
	}

	const maybe = response as { data?: unknown };

	if (!Array.isArray(maybe.data)) {
		throw new VoyageRerankResponseError(
			"Voyage rerank response.data must be an array.",
		);
	}

	if (maybe.data.length > input.maxResults) {
		throw new VoyageRerankResponseError(
			"Voyage rerank response returned more results than requested.",
		);
	}

	const seen = new Set<number>();

	maybe.data.forEach((item, position) => {
		if (typeof item !== "object" || item === null) {
			throw new VoyageRerankResponseError(
				`Voyage response.data[${position}] must be an object.`,
			);
		}

		const record = item as Record<string, unknown>;

		if (!Number.isInteger(record.index) || typeof record.index !== "number") {
			throw new VoyageRerankResponseError(
				`Voyage response.data[${position}].index must be an integer.`,
			);
		}

		if (record.index < 0 || record.index >= input.maxIndexExclusive) {
			throw new VoyageRerankResponseError(
				`Voyage response.data[${position}].index is out of range.`,
			);
		}

		if (seen.has(record.index)) {
			throw new VoyageRerankResponseError(
				`Voyage response.data contains duplicate index ${record.index}.`,
			);
		}
		seen.add(record.index);

		if (
			typeof record.relevance_score !== "number" ||
			!Number.isFinite(record.relevance_score)
		) {
			throw new VoyageRerankResponseError(
				`Voyage response.data[${position}].relevance_score must be a finite number.`,
			);
		}

		if (record.document !== undefined && typeof record.document !== "string") {
			throw new VoyageRerankResponseError(
				`Voyage response.data[${position}].document must be a string when present.`,
			);
		}
	});
}
