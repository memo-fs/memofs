/**
 * @file Metadata filter matching utilities for recall queries.
 *
 * @remarks
 * Provides functions to normalize and match recall filters against document metadata.
 * Supports dot notation for nested access and various comparison operators.
 *
 * @public
 */

import type { JsonPrimitive, JsonValue, RecallFilter } from "../types";
import { validateRecallFilter } from "../validation/assertions";

/**
 * Normalizes a recall filter by validating and returning a clean version.
 *
 * @param filter - The filter to normalize, or undefined
 * @returns Normalized filter, or undefined if input was undefined
 *
 * @public
 */
export function normalizeRecallFilter(
	filter: RecallFilter | undefined,
): RecallFilter | undefined {
	if (filter === undefined) return undefined;
	return validateRecallFilter(filter) as RecallFilter;
}

/**
 * Checks if document metadata matches the given filter criteria.
 *
 * @remarks
 * All filter conditions must match (AND logic). Returns true if filter is undefined.
 * Supports dot notation for nested metadata access.
 *
 * @param metadata - The document metadata to check against
 * @param filter - The filter criteria, or undefined to match all
 * @returns true if metadata matches the filter, false otherwise
 *
 * @public
 */
export function matchesRecallFilter(
	metadata: Record<string, unknown>,
	filter: RecallFilter | undefined,
): boolean {
	if (filter === undefined) return true;
	const normalized = normalizeRecallFilter(filter);
	if (normalized === undefined) return true;

	for (const [key, expected] of Object.entries(normalized)) {
		const actual = getByPath(metadata, key);
		if (!matchesFilterValue(actual, expected)) return false;
	}

	return true;
}

/**
 * Matches an actual value against an expected filter value or operator.
 *
 * @param actual - The actual value from metadata
 * @param expected - The expected value or operator object
 * @returns true if the value matches, false otherwise
 *
 * @internal
 */
function matchesFilterValue(actual: unknown, expected: unknown): boolean {
	if (isOperatorObject(expected)) {
		const [operator, operand] = Object.entries(expected)[0] as [
			string,
			unknown,
		];
		switch (operator) {
			case "$eq":
				return deepEqual(actual, operand);
			case "$ne":
				return !deepEqual(actual, operand);
			case "$in":
				return (
					Array.isArray(operand) &&
					operand.some((item) => deepEqual(actual, item))
				);
			case "$nin":
				return (
					Array.isArray(operand) &&
					!operand.some((item) => deepEqual(actual, item))
				);
			case "$gt":
				return (
					typeof actual === "number" &&
					typeof operand === "number" &&
					actual > operand
				);
			case "$gte":
				return (
					typeof actual === "number" &&
					typeof operand === "number" &&
					actual >= operand
				);
			case "$lt":
				return (
					typeof actual === "number" &&
					typeof operand === "number" &&
					actual < operand
				);
			case "$lte":
				return (
					typeof actual === "number" &&
					typeof operand === "number" &&
					actual <= operand
				);
			case "$exists":
				return operand ? actual !== undefined : actual === undefined;
			case "$contains":
				return contains(actual, operand as JsonPrimitive);
			default:
				return false;
		}
	}

	return deepEqual(actual, expected);
}

/**
 * Checks if a value is an operator object (contains keys starting with $).
 *
 * @param value - The value to check
 * @returns true if the value is an operator object
 *
 * @internal
 */
function isOperatorObject(value: unknown): value is Record<string, unknown> {
	return (
		typeof value === "object" &&
		value !== null &&
		!Array.isArray(value) &&
		Object.keys(value).some((key) => key.startsWith("$"))
	);
}

/**
 * Checks if a value contains an expected primitive.
 *
 * @remarks
 * For strings, checks if the string includes the expected substring.
 * For arrays, checks if any element deeply equals the expected value.
 *
 * @param actual - The actual value (string or array)
 * @param expected - The expected primitive to find
 * @returns true if the value contains the expected primitive
 *
 * @internal
 */
function contains(actual: unknown, expected: JsonPrimitive): boolean {
	if (typeof actual === "string")
		return typeof expected === "string" && actual.includes(expected);
	if (Array.isArray(actual))
		return actual.some((item) => deepEqual(item, expected));
	return false;
}

/**
 * Gets a value from an object using dot notation path.
 *
 * @param value - The object to access
 * @param key - The dot-separated path (e.g., "metadata.sourceType")
 * @returns The value at the path, or undefined if not found
 *
 * @internal
 */
function getByPath(value: Record<string, unknown>, key: string): unknown {
	if (!key.includes(".")) return value[key];
	return key.split(".").reduce<unknown>((current, part) => {
		if (
			typeof current !== "object" ||
			current === null ||
			Array.isArray(current)
		)
			return undefined;
		return (current as Record<string, unknown>)[part];
	}, value);
}

/**
 * Performs a deep equality check between two values.
 *
 * @remarks
 * Uses JSON serialization with stable key ordering for comparison.
 *
 * @param a - First value
 * @param b - Second value
 * @returns true if values are deeply equal
 *
 * @internal
 */
function deepEqual(a: unknown, b: unknown): boolean {
	return JSON.stringify(stable(a)) === JSON.stringify(stable(b));
}

/**
 * Creates a stable representation of a value by sorting object keys.
 *
 * @param value - The value to stabilize
 * @returns A new value with object keys sorted
 *
 * @internal
 */
function stable(value: unknown): unknown {
	if (Array.isArray(value)) return value.map(stable);
	if (typeof value === "object" && value !== null) {
		const output: Record<string, unknown> = {};
		for (const key of Object.keys(value).sort()) {
			output[key] = stable((value as Record<string, unknown>)[key]);
		}
		return output;
	}
	return value as JsonValue;
}
