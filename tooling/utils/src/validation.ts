/**
 * Validation utilities for MemoFS packages.
 *
 * @remarks
 * Provides assertion functions for common types (strings, numbers, URLs, etc.).
 * Supports custom error classes for different packages (MemoFsError vs BaseError).
 *
 * @internal
 */

import { BaseError, ErrorCodes } from "./errors";

/**
 * Asserts that a value is a non-empty string.
 * Checks for string type, non-empty after trim, and no null bytes.
 *
 * @param value - The value to check.
 * @param name - Field name for error messages.
 * @param ErrorClass - Error class to throw (defaults to BaseError).
 * @throws {ErrorClass} If validation fails.
 */
export function assertNonEmptyString(
	value: unknown,
	name: string,
	ErrorClass: typeof BaseError = BaseError,
): asserts value is string {
	if (typeof value !== "string" || value.trim().length === 0) {
		throw new ErrorClass(`${name} must be a non-empty string.`, {
			code: ErrorCodes.VALIDATION,
			details: { fieldName: name, actualType: typeof value },
		});
	}

	if (value.includes("\0")) {
		throw new ErrorClass(`${name} must not contain null bytes.`, {
			code: ErrorCodes.VALIDATION,
			details: { fieldName: name },
		});
	}
}

/**
 * Asserts that a value is a string.
 *
 * @param value - The value to check.
 * @param fieldName - Field name for error messages.
 * @param ErrorClass - Error class to throw (defaults to BaseError).
 * @throws {ErrorClass} If validation fails.
 */
export function assertString(
	value: unknown,
	fieldName: string,
	ErrorClass: typeof BaseError = BaseError,
): asserts value is string {
	if (typeof value !== "string") {
		throw new ErrorClass(`${fieldName} must be a string.`, {
			code: ErrorCodes.VALIDATION,
			details: { fieldName, actualType: typeof value },
		});
	}
}

/**
 * Asserts that a value is a positive integer.
 *
 * @param value - The value to check.
 * @param fieldName - Field name for error messages.
 * @param ErrorClass - Error class to throw (defaults to BaseError).
 * @throws {ErrorClass} If validation fails.
 */
export function assertPositiveInteger(
	value: unknown,
	fieldName: string,
	ErrorClass: typeof BaseError = BaseError,
): asserts value is number {
	if (!Number.isInteger(value) || typeof value !== "number" || value <= 0) {
		throw new ErrorClass(`${fieldName} must be a positive integer.`, {
			code: ErrorCodes.VALIDATION,
			details: { fieldName, value },
		});
	}
}

/**
 * Asserts that a value is a finite number.
 *
 * @param value - The value to check.
 * @param fieldName - Field name for error messages.
 * @param ErrorClass - Error class to throw (defaults to BaseError).
 * @throws {ErrorClass} If validation fails.
 */
export function assertFiniteNumber(
	value: unknown,
	fieldName: string,
	ErrorClass: typeof BaseError = BaseError,
): asserts value is number {
	if (typeof value !== "number" || !Number.isFinite(value)) {
		throw new ErrorClass(`${fieldName} must be a finite number.`, {
			code: ErrorCodes.VALIDATION,
			details: { fieldName, value },
		});
	}
}

/**
 * Normalizes a base URL: validates, enforces HTTPS (except localhost), removes trailing slashes.
 *
 * @param baseUrl - The URL to normalize (or undefined to use default).
 * @param defaultUrl - Default URL to use if baseUrl is undefined.
 * @param ErrorClass - Error class to throw (defaults to BaseError).
 * @returns The normalized URL string.
 * @throws {ErrorClass} If validation fails.
 */
export function normalizeBaseUrl(
	baseUrl: string | undefined,
	defaultUrl: string,
	ErrorClass: typeof BaseError = BaseError,
): string {
	const value = baseUrl ?? defaultUrl;
	assertNonEmptyString(value, "baseUrl", ErrorClass);

	let url: URL;
	try {
		url = new URL(value);
	} catch (error) {
		throw new ErrorClass("baseUrl must be a valid URL.", {
			code: ErrorCodes.CONFIG,
			cause: error,
		});
	}

	if (
		url.protocol !== "https:" &&
		url.hostname !== "localhost" &&
		url.hostname !== "127.0.0.1"
	) {
		throw new ErrorClass(
			"baseUrl must use https unless targeting localhost for tests.",
			{ code: ErrorCodes.CONFIG },
		);
	}

	url.pathname = url.pathname.replace(/\/+$/, "");
	return url.toString().replace(/\/+$/, "");
}

/**
 * Asserts that an API key is a non-empty string without null bytes.
 *
 * @param apiKey - The API key to check.
 * @param provider - Provider name for error messages (defaults to "API").
 * @param ErrorClass - Error class to throw (defaults to BaseError).
 * @throws {ErrorClass} If validation fails.
 */
export function assertValidApiKey(
	apiKey: unknown,
	provider = "API",
	ErrorClass: typeof BaseError = BaseError,
): asserts apiKey is string {
	if (typeof apiKey !== "string" || apiKey.trim().length === 0) {
		throw new ErrorClass(`${provider} apiKey is required.`, {
			code: ErrorCodes.CONFIG,
		});
	}

	if (apiKey.includes("\0")) {
		throw new ErrorClass(`${provider} apiKey must not contain null bytes.`, {
			code: ErrorCodes.CONFIG,
		});
	}
}

/**
 * Validates an array of texts for embedding.
 *
 * @param texts - The texts array to validate.
 * @param options - Optional settings (allowEmptyText).
 * @param ErrorClass - Error class to throw (defaults to BaseError).
 * @throws {ErrorClass} If validation fails.
 */
export function validateTexts(
	texts: unknown,
	options?: { allowEmptyText?: boolean | undefined },
	ErrorClass: typeof BaseError = BaseError,
): asserts texts is string[] {
	if (!Array.isArray(texts)) {
		throw new ErrorClass("texts must be an array.", {
			code: ErrorCodes.VALIDATION,
		});
	}

	for (let i = 0; i < texts.length; i += 1) {
		const text = texts[i];

		if (typeof text !== "string") {
			throw new ErrorClass(`texts[${i}] must be a string.`, {
				code: ErrorCodes.VALIDATION,
			});
		}

		if (text.includes("\0")) {
			throw new ErrorClass(`texts[${i}] must not contain null bytes.`, {
				code: ErrorCodes.VALIDATION,
			});
		}

		if (!options?.allowEmptyText && text.trim().length === 0) {
			throw new ErrorClass(
				`texts[${i}] must not be empty or whitespace-only.`,
				{ code: ErrorCodes.VALIDATION },
			);
		}
	}
}

/**
 * Validates a model name string.
 *
 * @param model - The model name to validate.
 * @param ErrorClass - Error class to throw (defaults to BaseError).
 * @throws {ErrorClass} If validation fails.
 */
export function validateModel(
	model: unknown,
	ErrorClass: typeof BaseError = BaseError,
): asserts model is string {
	assertNonEmptyString(model, "model", ErrorClass);

	if (model.length > 128) {
		throw new ErrorClass("model is too long.", {
			code: ErrorCodes.VALIDATION,
		});
	}
}

/**
 * Validates an embedding vector (array of finite numbers).
 *
 * @param vector - The vector to validate.
 * @param input - Options including expected dimensions and label.
 * @param ErrorClass - Error class to throw (defaults to BaseError).
 * @throws {ErrorClass} If validation fails.
 */
export function validateVector(
	vector: unknown,
	input: { expectedDimensions?: number | undefined; label: string },
	ErrorClass: typeof BaseError = BaseError,
): asserts vector is number[] {
	if (!Array.isArray(vector)) {
		throw new ErrorClass(`${input.label} embedding must be an array.`, {
			code: ErrorCodes.API,
		});
	}

	if (vector.length === 0) {
		throw new ErrorClass(`${input.label} embedding must not be empty.`, {
			code: ErrorCodes.API,
		});
	}

	if (
		input.expectedDimensions !== undefined &&
		vector.length !== input.expectedDimensions
	) {
		throw new ErrorClass(
			`${input.label} embedding dimension mismatch. Expected ${input.expectedDimensions}, received ${vector.length}.`,
			{ code: ErrorCodes.API },
		);
	}

	for (let i = 0; i < vector.length; i += 1) {
		const value = vector[i];

		if (typeof value !== "number" || !Number.isFinite(value)) {
			throw new ErrorClass(
				`${input.label} embedding[${i}] must be a finite number.`,
				{ code: ErrorCodes.API },
			);
		}
	}
}

/**
 * Normalizes batch size with limits.
 *
 * @param value - The batch size (or undefined to use default).
 * @param min - Minimum allowed batch size.
 * @param max - Maximum allowed batch size.
 * @param defaultSize - Default batch size if value is undefined.
 * @param ErrorClass - Error class to throw (defaults to BaseError).
 * @returns The normalized batch size.
 * @throws {ErrorClass} If validation fails.
 */
export function normalizeBatchSize(
	value: number | undefined,
	min: number,
	max: number,
	defaultSize: number,
	ErrorClass: typeof BaseError = BaseError,
): number {
	const batchSize = value ?? defaultSize;

	if (!Number.isInteger(batchSize) || batchSize < min) {
		throw new ErrorClass(`batchSize must be an integer >= ${min}.`, {
			code: ErrorCodes.VALIDATION,
		});
	}

	if (batchSize > max) {
		throw new ErrorClass(`batchSize must be <= ${max}.`, {
			code: ErrorCodes.VALIDATION,
		});
	}

	return batchSize;
}

/**
 * Checks if an error is a "not found" type error.
 *
 * @param error - The error to check.
 * @returns `true` if the error indicates a "not found" condition, `false` otherwise.
 */
export function isNotFoundError(error: unknown): boolean {
	if (error instanceof Error) {
		if (
			"code" in error &&
			(error as Record<string, unknown>).code === "ENOENT"
		) {
			return true;
		}
		if (
			"status" in error &&
			(error as Record<string, unknown>).status === 404
		) {
			return true;
		}
		if (
			error.name?.includes("NotFound") ||
			error.message?.includes("not found")
		) {
			return true;
		}
	}
	return false;
}
