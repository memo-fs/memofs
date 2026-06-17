import { OpenAIValidationError } from "../errors/openai-errors";

/**
 * @file OpenAI model configuration and utilities.
 *
 * @remarks
 * This module defines supported OpenAI embedding models, their default dimensions,
 * and utility functions for model validation and dimension handling.
 *
 * @public
 */

/**
 * Supported OpenAI embedding model identifiers.
 * Can be one of the known models or a custom string for forward compatibility.
 *
 * @public
 */
export type OpenAIEmbeddingModel =
	| "text-embedding-3-small"
	| "text-embedding-3-large"
	| "text-embedding-ada-002"
	| (string & {});
/**
 * Supported encoding formats for OpenAI embeddings.
 *
 * @public
 */
export type OpenAIEncodingFormat = "float" | "base64";

/** Default base URL for the OpenAI API. @public */
export const OPENAI_DEFAULT_BASE_URL = "https://api.openai.com";
/** API path for creating embeddings. @public */
export const OPENAI_EMBEDDINGS_PATH = "/v1/embeddings";
/** Maximum batch size for embeddings API requests. @public */
export const OPENAI_MAX_BATCH_SIZE = 2048;

/**
 * Default embedding dimensions for known OpenAI models.
 *
 * @public
 */
export const OPENAI_MODEL_DEFAULT_DIMENSIONS: Record<string, number> = {
	"text-embedding-3-small": 1536,
	"text-embedding-3-large": 3072,
	"text-embedding-ada-002": 1536,
};

/**
 * Set of OpenAI models that support the dimensions parameter.
 *
 * @public
 */
export const OPENAI_MODELS_SUPPORTING_DIMENSIONS = new Set([
	"text-embedding-3-small",
	"text-embedding-3-large",
]);

/**
 * Set of all known OpenAI embedding models.
 *
 * @public
 */
export const OPENAI_KNOWN_EMBEDDING_MODELS = new Set(
	Object.keys(OPENAI_MODEL_DEFAULT_DIMENSIONS),
);

/**
 * Checks if a model supports the dimensions parameter.
 *
 * @param model - The model identifier to check.
 * @returns True if the model supports custom dimensions, false otherwise.
 * @public
 */
export function supportsDimensions(model: string): boolean {
	return OPENAI_MODELS_SUPPORTING_DIMENSIONS.has(model);
}

/**
 * Returns the default embedding dimensions for a given model.
 *
 * @param model - The model identifier.
 * @returns The default dimensions for the model, or undefined if unknown.
 * @public
 */
export function defaultDimensionsForModel(model: string): number | undefined {
	return OPENAI_MODEL_DEFAULT_DIMENSIONS[model];
}

/**
 * Validates that the dimensions parameter is valid for the given model.
 *
 * @param input - The validation input containing model, dimensions, and options.
 * @throws {@link OpenAIValidationError} If dimensions are invalid or not supported.
 * @public
 */
export function assertValidDimensions(input: {
	model: string;
	dimensions?: number | undefined;
	allowUnknownModelDimensions?: boolean | undefined;
}): void {
	const { model, dimensions, allowUnknownModelDimensions = true } = input;

	if (dimensions === undefined) {
		return;
	}

	if (!Number.isInteger(dimensions) || dimensions <= 0) {
		throw new OpenAIValidationError("dimensions must be a positive integer.");
	}

	if (supportsDimensions(model)) {
		const max = defaultDimensionsForModel(model);
		if (max !== undefined && dimensions > max) {
			throw new OpenAIValidationError(
				`dimensions for ${model} must be <= ${max}.`,
			);
		}
		return;
	}

	if (OPENAI_KNOWN_EMBEDDING_MODELS.has(model)) {
		throw new OpenAIValidationError(
			`Model "${model}" does not support the dimensions parameter.`,
		);
	}

	if (!allowUnknownModelDimensions) {
		throw new OpenAIValidationError(
			`Unknown OpenAI embedding model "${model}". Refusing dimensions because allowUnknownModelDimensions is false.`,
		);
	}
}

/**
 * Computes the expected vector length for a given model and dimension configuration.
 *
 * @param input - The input containing model, dimensions, and expected dimensions.
 * @param input.model - The model identifier.
 * @param input.dimensions - The requested embedding dimensions.
 * @param input.expectedDimensions - Explicit expected dimensions, if known.
 * @returns The expected vector length, or undefined if it cannot be determined.
 * @public
 */
export function expectedVectorLength(input: {
	model: string;
	dimensions?: number | undefined;
	expectedDimensions?: number | undefined;
}): number | undefined {
	return (
		input.expectedDimensions ??
		input.dimensions ??
		defaultDimensionsForModel(input.model)
	);
}
