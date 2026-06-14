/**
 * Custom assertion functions for TekMemo validation.
 *
 * @remarks
 * These assertions throw {@link MemoryValidationError} on failure and are
 * used throughout the codebase to validate inputs before processing.
 *
 * @public
 */

import {
	assertNonEmptyString as baseAssertNonEmptyString,
	assertPositiveInteger as baseAssertPositiveInteger,
	assertString as baseAssertString,
} from "@repo/utils";
import { MemoryValidationError } from "../errors/errors";

/**
 * Asserts that a value is a string.
 * @param value - The value to check.
 * @param fieldName - The name of the field (used in error messages).
 */
export function assertString(
	value: unknown,
	fieldName: string,
): asserts value is string {
	baseAssertString(value, fieldName, MemoryValidationError);
}

/**
 * Asserts that a value is a non-empty string.
 * @param value - The value to check.
 * @param fieldName - The name of the field (used in error messages).
 */
export function assertNonEmptyString(
	value: unknown,
	fieldName: string,
): asserts value is string {
	baseAssertNonEmptyString(value, fieldName, MemoryValidationError);
}

/**
 * Asserts that a value is a positive integer.
 * @param value - The value to check.
 * @param fieldName - The name of the field (used in error messages).
 */
export function assertPositiveInteger(
	value: unknown,
	fieldName: string,
): asserts value is number {
	baseAssertPositiveInteger(value, fieldName, MemoryValidationError);
}

/**
 * Asserts that a value is a non-negative integer (0 or positive).
 * @param value - The value to check.
 * @param fieldName - The name of the field (used in error messages).
 */
export function assertNonNegativeInteger(
	value: unknown,
	fieldName: string,
): asserts value is number {
	if (!Number.isInteger(value) || typeof value !== "number" || value < 0) {
		throw new MemoryValidationError(
			`${fieldName} must be a non-negative integer.`,
			{
				fieldName,
				value,
			},
		);
	}
}

/**
 * Asserts that a value is a valid ISO-compatible timestamp string.
 * @param value - The value to check.
 * @param fieldName - The name of the field (used in error messages).
 */
export function assertIsoTimestamp(
	value: unknown,
	fieldName: string,
): asserts value is string {
	assertNonEmptyString(value, fieldName);
	const time = Date.parse(value);
	if (Number.isNaN(time)) {
		throw new MemoryValidationError(
			`${fieldName} must be a valid ISO-compatible timestamp.`,
			{
				fieldName,
				value,
			},
		);
	}
}

/**
 * Asserts that a value is a number between 0 and 1 (inclusive).
 * @param value - The value to check.
 * @param fieldName - The name of the field (used in error messages).
 */
export function assertConfidence(
	value: unknown,
	fieldName = "confidence",
): asserts value is number {
	if (
		typeof value !== "number" ||
		Number.isNaN(value) ||
		value < 0 ||
		value > 1
	) {
		throw new MemoryValidationError(
			`${fieldName} must be a number between 0 and 1.`,
			{
				fieldName,
				value,
			},
		);
	}
}

/**
 * Asserts that a value is JSON serializable.
 * @param value - The value to check.
 * @param fieldName - The name of the field (used in error messages).
 */
export function assertJsonSerializable(
	value: unknown,
	fieldName: string,
): void {
	validateJsonValue(value, fieldName, new WeakSet<object>());
}

/**
 * Recursively validates that a value is representable as JSON without lossy
 * coercion.
 *
 * @param value - The value to validate.
 * @param fieldPath - Dot/bracket path used in error details.
 * @param seen - Objects already visited while walking this value.
 */
function validateJsonValue(
	value: unknown,
	fieldPath: string,
	seen: WeakSet<object>,
): void {
	if (
		value === null ||
		typeof value === "string" ||
		typeof value === "boolean"
	) {
		return;
	}

	if (typeof value === "number") {
		if (Number.isFinite(value)) return;
		throw new MemoryValidationError(
			`${fieldPath} must be a finite JSON number.`,
			{ fieldPath, value },
		);
	}

	if (typeof value !== "object") {
		throw new MemoryValidationError(`${fieldPath} must be JSON serializable.`, {
			fieldPath,
			actualType: typeof value,
		});
	}

	if (seen.has(value)) {
		throw new MemoryValidationError(
			`${fieldPath} must not contain circular references.`,
			{ fieldPath },
		);
	}
	seen.add(value);

	if (Array.isArray(value)) {
		for (let index = 0; index < value.length; index += 1) {
			validateJsonValue(value[index], `${fieldPath}[${index}]`, seen);
		}
		seen.delete(value);
		return;
	}

	const prototype = Object.getPrototypeOf(value);
	if (prototype !== Object.prototype && prototype !== null) {
		throw new MemoryValidationError(
			`${fieldPath} must be a plain JSON object.`,
			{ fieldPath, actualType: prototype?.constructor?.name ?? "object" },
		);
	}

	for (const [key, nestedValue] of Object.entries(value)) {
		validateJsonValue(nestedValue, `${fieldPath}.${key}`, seen);
	}
	seen.delete(value);
}

/**
 * Normalizes an array of strings: trims, deduplicates (case-insensitive), removes empty entries.
 * @param values - The array of strings to normalize, or undefined.
 * @param fieldName - The name of the field (used in error messages).
 * @returns Normalized array, or undefined if result is empty.
 */
export function normalizeStringArray(
	values: readonly string[] | undefined,
	fieldName: string,
): string[] | undefined {
	if (values === undefined) return undefined;

	if (!Array.isArray(values)) {
		throw new MemoryValidationError(
			`${fieldName} must be an array of strings.`,
			{ fieldName },
		);
	}

	const seen = new Set<string>();
	const normalized: string[] = [];

	for (const value of values) {
		assertString(value, `${fieldName}[]`);
		const clean = value.trim();
		if (clean.length === 0) continue;
		const key = clean.toLowerCase();
		if (!seen.has(key)) {
			seen.add(key);
			normalized.push(clean);
		}
	}

	return normalized.length > 0 ? normalized : undefined;
}

/**
 * Collapses multiline text into a single line by replacing line breaks and extra whitespace.
 * @param value - The string to collapse.
 * @returns A single-line version of the input.
 */
export function singleLine(value: string): string {
	return value
		.replace(/[\r\n]+/g, " ")
		.replace(/\s+/g, " ")
		.trim();
}
