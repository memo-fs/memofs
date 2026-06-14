import { RerankValidationError } from "../errors/rerank-errors";
import type {
	NormalizedRerankInput,
	RerankDocument,
	RerankInput,
	RerankResult,
} from "../types";
import { cloneAndValidateMetadata } from "./metadata";

/** Regular expression for validating safe document IDs. Allows alphanumeric, dots, underscores, colons, and hyphens. */
const SAFE_ID = /^[A-Za-z0-9._:-]{1,256}$/;

/**
 * Asserts that a value is a safe rerank document ID.
 *
 * @param value - The value to check.
 * @param name - The name to use in error messages (e.g., "documents[0].id").
 * @throws {@link RerankValidationError} If the value is not a non-empty string, contains unsafe characters, or doesn't match the safe ID pattern.
 *
 * @public
 */
export function assertSafeRerankId(
	value: unknown,
	name: string,
): asserts value is string {
	if (typeof value !== "string" || value.trim().length === 0) {
		throw new RerankValidationError(`${name} must be a non-empty string.`);
	}

	if (
		value.includes("\0") ||
		value.includes("/") ||
		value.includes("\\") ||
		value.includes("..")
	) {
		throw new RerankValidationError(`${name} is unsafe.`);
	}

	if (!SAFE_ID.test(value)) {
		throw new RerankValidationError(`${name} contains unsupported characters.`);
	}
}

/**
 * Asserts that a value is a non-empty string without null bytes.
 *
 * @param value - The value to check.
 * @param name - The name to use in error messages (e.g., "query" or "documents[0].text").
 * @throws {@link RerankValidationError} If the value is not a non-empty string or contains null bytes.
 *
 * @public
 */
export function assertNonEmptyString(
	value: unknown,
	name: string,
): asserts value is string {
	if (typeof value !== "string" || value.trim().length === 0) {
		throw new RerankValidationError(`${name} must be a non-empty string.`);
	}

	if (value.includes("\0")) {
		throw new RerankValidationError(`${name} must not contain null bytes.`);
	}
}

/**
 * Normalizes the topK parameter to a valid number.
 *
 * @param topK - The topK value to normalize (may be undefined).
 * @param documentCount - The total number of documents available.
 * @returns The normalized topK value, clamped to documentCount if necessary.
 * @throws {@link RerankValidationError} If topK is defined but not a positive integer.
 *
 * @public
 */
export function normalizeTopK(topK: unknown, documentCount: number): number {
	if (topK === undefined) return documentCount;

	if (!Number.isInteger(topK) || typeof topK !== "number" || topK <= 0) {
		throw new RerankValidationError("topK must be a positive integer.");
	}

	return Math.min(topK, documentCount);
}

/**
 * Normalizes and validates rerank input, ensuring all fields are valid.
 *
 * @param input - The raw rerank input to normalize.
 * @returns A normalized rerank input with defaults applied and all documents validated.
 * @throws {@link RerankValidationError} If the input or any document is invalid.
 *
 * @public
 */
export function normalizeRerankInput(
	input: RerankInput,
): NormalizedRerankInput {
	if (typeof input !== "object" || input === null) {
		throw new RerankValidationError("input must be an object.");
	}

	assertNonEmptyString(input.query, "query");

	if (!Array.isArray(input.documents)) {
		throw new RerankValidationError("documents must be an array.");
	}

	const ids = new Set<string>();
	const documents: RerankDocument[] = input.documents.map((document, index) => {
		if (typeof document !== "object" || document === null) {
			throw new RerankValidationError(`documents[${index}] must be an object.`);
		}

		assertSafeRerankId(document.id, `documents[${index}].id`);
		assertNonEmptyString(document.text, `documents[${index}].text`);

		if (ids.has(document.id)) {
			throw new RerankValidationError(
				`Duplicate document id "${document.id}".`,
			);
		}
		ids.add(document.id);

		return {
			id: document.id,
			text: document.text,
			metadata: cloneAndValidateMetadata(document.metadata),
		};
	});

	return {
		query: input.query,
		documents,
		topK: normalizeTopK(input.topK, documents.length),
	};
}

/**
 * Validates a single rerank result.
 *
 * @param result - The rerank result to validate.
 * @param index - The index of the result in the results array (used for error messages).
 * @throws {@link RerankValidationError} If the result has invalid id, text, score, rank, or metadata.
 *
 * @public
 */
export function validateRerankResult(
	result: RerankResult,
	index: number,
): void {
	assertSafeRerankId(result.id, `results[${index}].id`);
	assertNonEmptyString(result.text, `results[${index}].text`);

	if (typeof result.score !== "number" || !Number.isFinite(result.score)) {
		throw new RerankValidationError(
			`results[${index}].score must be a finite number.`,
		);
	}

	if (!Number.isInteger(result.rank) || result.rank <= 0) {
		throw new RerankValidationError(
			`results[${index}].rank must be a positive integer.`,
		);
	}

	cloneAndValidateMetadata(result.metadata);
}
