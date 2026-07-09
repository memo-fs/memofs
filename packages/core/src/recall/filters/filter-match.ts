/**
 * @file Metadata filter matching utilities for recall queries.
 *
 * @remarks
 * Provides functions to normalize and match recall filters against document metadata.
 * Supports dot notation for nested access and various comparison operators.
 *
 * @public
 */

import {
	getByPath,
	stableDeepEqual,
} from "../../core/internal/deep-equal";
import type { JsonPrimitive, RecallFilter } from "../types";
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
				return stableDeepEqual(actual, operand);
			case "$ne":
				return !stableDeepEqual(actual, operand);
			case "$in":
				return (
					Array.isArray(operand) &&
					operand.some((item) => stableDeepEqual(actual, item))
				);
			case "$nin":
				return (
					Array.isArray(operand) &&
					!operand.some((item) => stableDeepEqual(actual, item))
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

	return stableDeepEqual(actual, expected);
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
		return actual.some((item) => stableDeepEqual(item, expected));
	return false;
}
