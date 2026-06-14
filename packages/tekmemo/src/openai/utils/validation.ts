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
	if (typeof value !== "string" || value.trim().length === 0) {
		throw new OpenAIValidationError(`${name} must be a non-empty string.`);
	}

	if (value.includes("\0")) {
		throw new OpenAIValidationError(`${name} must not contain null bytes.`);
	}
}

export function assertValidApiKey(apiKey: unknown): asserts apiKey is string {
	if (typeof apiKey !== "string" || apiKey.trim().length === 0) {
		throw new OpenAIConfigError("OpenAI apiKey is required.");
	}

	if (apiKey.includes("\0")) {
		throw new OpenAIConfigError("OpenAI apiKey must not contain null bytes.");
	}
}

export function normalizeBaseUrl(baseUrl: string | undefined): string {
	const value = baseUrl ?? OPENAI_DEFAULT_BASE_URL;
	assertNonEmptyString(value, "baseUrl");

	let url: URL;
	try {
		url = new URL(value);
	} catch (error) {
		throw new OpenAIConfigError("baseUrl must be a valid URL.", {
			cause: error,
		});
	}

	if (
		url.protocol !== "https:" &&
		url.hostname !== "localhost" &&
		url.hostname !== "127.0.0.1"
	) {
		throw new OpenAIConfigError(
			"baseUrl must use https unless targeting localhost for tests.",
		);
	}

	url.pathname = url.pathname.replace(/\/+$/, "");
	return url.toString().replace(/\/+$/, "");
}

export function normalizeBatchSize(value: number | undefined): number {
	const batchSize = value ?? 128;

	if (!Number.isInteger(batchSize) || batchSize <= 0) {
		throw new OpenAIValidationError("batchSize must be a positive integer.");
	}

	if (batchSize > OPENAI_MAX_BATCH_SIZE) {
		throw new OpenAIValidationError(
			`batchSize must be <= ${OPENAI_MAX_BATCH_SIZE}.`,
		);
	}

	return batchSize;
}

export function validateTexts(
	texts: unknown,
	options?: { allowEmptyText?: boolean | undefined },
): asserts texts is string[] {
	if (!Array.isArray(texts)) {
		throw new OpenAIValidationError("texts must be an array.");
	}

	for (let i = 0; i < texts.length; i += 1) {
		const text = texts[i];

		if (typeof text !== "string") {
			throw new OpenAIValidationError(`texts[${i}] must be a string.`);
		}

		if (text.includes("\0")) {
			throw new OpenAIValidationError(
				`texts[${i}] must not contain null bytes.`,
			);
		}

		if (!options?.allowEmptyText && text.trim().length === 0) {
			throw new OpenAIValidationError(
				`texts[${i}] must not be empty or whitespace-only.`,
			);
		}
	}
}

export function validateModel(model: unknown): asserts model is string {
	assertNonEmptyString(model, "model");

	if (model.length > 128) {
		throw new OpenAIValidationError("model is too long.");
	}
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
	if (!Array.isArray(vector)) {
		throw new OpenAIResponseError(`${input.label} embedding must be an array.`);
	}

	if (vector.length === 0) {
		throw new OpenAIResponseError(
			`${input.label} embedding must not be empty.`,
		);
	}

	if (
		input.expectedDimensions !== undefined &&
		vector.length !== input.expectedDimensions
	) {
		throw new OpenAIResponseError(
			`${input.label} embedding dimension mismatch. Expected ${input.expectedDimensions}, received ${vector.length}.`,
		);
	}

	for (let i = 0; i < vector.length; i += 1) {
		const value = vector[i];

		if (typeof value !== "number" || !Number.isFinite(value)) {
			throw new OpenAIResponseError(
				`${input.label} embedding[${i}] must be a finite number.`,
			);
		}
	}
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
