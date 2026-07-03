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
	OpenAIConfigError,
	OpenAIResponseError,
	OpenAIValidationError,
} from "../errors/openai-errors";
import {
	OPENAI_DEFAULT_BASE_URL,
	OPENAI_MAX_BATCH_SIZE,
} from "../models/models";
import type { OpenAIEmbedderConfig, OpenAIEmbeddingsResponse } from "../types";

export function assertNonEmptyString(
	value: unknown,
	name: string,
): asserts value is string {
	baseAssertNonEmptyString(value, name, OpenAIValidationError);
}

export function assertValidApiKey(apiKey: unknown): asserts apiKey is string {
	baseAssertValidApiKey(apiKey, "OpenAI", OpenAIConfigError);
}

export function normalizeBaseUrl(baseUrl: string | undefined): string {
	return baseNormalizeBaseUrl(
		baseUrl,
		OPENAI_DEFAULT_BASE_URL,
		OpenAIConfigError,
	);
}

export function normalizeBatchSize(value: number | undefined): number {
	return baseNormalizeBatchSize(
		value,
		1,
		OPENAI_MAX_BATCH_SIZE,
		128,
		OpenAIValidationError,
	);
}

export function validateTexts(
	texts: unknown,
	options?: { allowEmptyText?: boolean | undefined },
): asserts texts is string[] {
	baseValidateTexts(texts, options, OpenAIValidationError);
}

export function validateModel(model: unknown): asserts model is string {
	baseValidateModel(model, OpenAIValidationError);
}

export function validateUser(value: string | undefined): void {
	if (value === undefined) return;
	assertNonEmptyString(value, "user");

	if (value.length > 256) {
		throw new OpenAIValidationError("user is too long.");
	}
}

export function validateVector(
	vector: unknown,
	input: { expectedDimensions?: number | undefined; label: string },
): asserts vector is number[] {
	baseValidateVector(vector, input, OpenAIResponseError);
}

export function validateEmbeddingsResponse(
	response: unknown,
	input: { expectedCount: number; expectedDimensions?: number | undefined },
): asserts response is OpenAIEmbeddingsResponse {
	if (typeof response !== "object" || response === null) {
		throw new OpenAIResponseError(
			"OpenAI embeddings response must be an object.",
		);
	}

	const maybe = response as { data?: unknown };
	if (!Array.isArray(maybe.data)) {
		throw new OpenAIResponseError(
			"OpenAI embeddings response.data must be an array.",
		);
	}

	if (maybe.data.length !== input.expectedCount) {
		throw new OpenAIResponseError(
			`OpenAI returned ${maybe.data.length} embeddings for ${input.expectedCount} input texts.`,
		);
	}

	for (let i = 0; i < maybe.data.length; i += 1) {
		const item = maybe.data[i] as
			| { embedding?: unknown; index?: unknown }
			| undefined;

		if (typeof item !== "object" || item === null) {
			throw new OpenAIResponseError(
				`OpenAI response.data[${i}] must be an object.`,
			);
		}

		if (typeof item.index !== "number") {
			throw new OpenAIResponseError(
				`OpenAI response.data[${i}].index must be a number.`,
			);
		}

		validateVector(item.embedding, {
			expectedDimensions: input.expectedDimensions,
			label: `OpenAI response.data[${i}]`,
		});
	}
}

export function resolveApiKeyOrClient(config: OpenAIEmbedderConfig): void {
	if (config.client) {
		if (typeof config.client.createEmbeddings !== "function") {
			throw new OpenAIConfigError(
				"client must implement createEmbeddings(request).",
			);
		}
		return;
	}

	assertValidApiKey(config.apiKey);
}
