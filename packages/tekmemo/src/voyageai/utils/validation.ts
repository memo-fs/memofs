import {
	assertNonEmptyString as baseAssertNonEmptyString,
	assertValidApiKey as baseAssertValidApiKey,
	normalizeBaseUrl as baseNormalizeBaseUrl,
	normalizeBatchSize as baseNormalizeBatchSize,
	validateModel as baseValidateModel,
	validateTexts as baseValidateTexts,
	validateVector as baseValidateVector,
} from "@repo/utils";
import {
	VoyageConfigError,
	VoyageResponseError,
	VoyageValidationError,
} from "../errors/voyage-errors";
import {
	VOYAGE_DEFAULT_BASE_URL,
	VOYAGE_MAX_BATCH_SIZE,
} from "../models/models";
import type { VoyageEmbedderConfig, VoyageEmbeddingsResponse } from "../types";

export function assertNonEmptyString(
	value: unknown,
	name: string,
): asserts value is string {
	baseAssertNonEmptyString(value, name, VoyageValidationError);
}

export function normalizeBaseUrl(baseUrl: string | undefined): string {
	return baseNormalizeBaseUrl(
		baseUrl,
		VOYAGE_DEFAULT_BASE_URL,
		VoyageConfigError,
	);
}

export function assertValidApiKey(apiKey: unknown): asserts apiKey is string {
	baseAssertValidApiKey(apiKey, "Voyage", VoyageConfigError);
}

export function normalizeBatchSize(value: number | undefined): number {
	return baseNormalizeBatchSize(
		value,
		1,
		VOYAGE_MAX_BATCH_SIZE,
		128,
		VoyageValidationError,
	);
}

export function validateTexts(
	texts: unknown,
	options?: { allowEmptyText?: boolean },
): asserts texts is string[] {
	baseValidateTexts(texts, options, VoyageValidationError);
}

export function validateModel(model: unknown): asserts model is string {
	baseValidateModel(model, VoyageValidationError);
}

export function validateVector(
	vector: unknown,
	input: { expectedDimensions?: number; label: string },
): asserts vector is number[] {
	baseValidateVector(vector, input, VoyageResponseError);
}

export function validateEmbeddingsResponse(
	response: unknown,
	input: { expectedCount: number; expectedDimensions?: number },
): asserts response is VoyageEmbeddingsResponse {
	if (typeof response !== "object" || response === null) {
		throw new VoyageResponseError(
			"Voyage embeddings response must be an object.",
		);
	}

	const maybe = response as { data?: unknown };
	if (!Array.isArray(maybe.data)) {
		throw new VoyageResponseError(
			"Voyage embeddings response.data must be an array.",
		);
	}

	if (maybe.data.length !== input.expectedCount) {
		throw new VoyageResponseError(
			`Voyage returned ${maybe.data.length} embeddings for ${input.expectedCount} input texts.`,
		);
	}

	for (let i = 0; i < maybe.data.length; i += 1) {
		const item = maybe.data[i] as { embedding?: unknown } | undefined;

		if (typeof item !== "object" || item === null) {
			throw new VoyageResponseError(
				`Voyage response.data[${i}] must be an object.`,
			);
		}

		validateVector(item.embedding, {
			expectedDimensions: input.expectedDimensions,
			label: `Voyage response.data[${i}]`,
		});
	}
}

export function resolveApiKeyOrClient(config: VoyageEmbedderConfig): void {
	if (config.client) {
		if (typeof config.client.createEmbeddings !== "function") {
			throw new VoyageConfigError(
				"client must implement createEmbeddings(request).",
			);
		}
		return;
	}

	assertValidApiKey(config.apiKey);
}
