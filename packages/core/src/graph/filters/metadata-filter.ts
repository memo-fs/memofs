import {
	getByPath,
	stableDeepEqual,
} from "../../core/internal/deep-equal";
import { isForbiddenKey } from "../../core/internal/forbidden-keys";
import type { GraphMetadata } from "../types";

const MAX_FILTER_KEYS = 100;
const MAX_PATH_LENGTH = 512;

/**
 * Tests graph metadata against a filter object.
 *
 * @remarks
 * Path access and deep equality delegate to the shared `core/internal`
 * primitives. The local `valuesEqual` keeps this filter's array-semantics
 * (a filter value matches if ANY element of an array-valued metadata field
 * equals it), wrapping the shared {@link stableDeepEqual} leaf check.
 *
 * @param metadata - The metadata to test.
 * @param filter - The filter to apply (dot-path keys).
 * @returns `true` if the metadata matches the filter.
 *
 * @public
 */
export function matchesMetadataFilter(
	metadata: GraphMetadata | undefined,
	filter: Record<string, unknown> | undefined,
): boolean {
	if (!filter || Object.keys(filter).length === 0) return true;
	if (!isSafeFilter(filter)) return false;
	if (!metadata) return false;

	for (const [key, expected] of Object.entries(filter)) {
		if (!isSafeFilterPath(key)) return false;
		const actual = getByPath(metadata, key);

		if (Array.isArray(expected)) {
			if (!expected.some((value) => valuesEqual(actual, value))) return false;
			continue;
		}

		if (!valuesEqual(actual, expected)) return false;
	}

	return true;
}

/**
 * Deep equality with array-any semantics.
 *
 * @remarks
 * If the actual value is an array, the filter matches when ANY element
 * equals the expected value. Leaf comparison uses the shared
 * {@link stableDeepEqual}.
 */
function valuesEqual(actual: unknown, expected: unknown): boolean {
	if (Array.isArray(actual))
		return actual.some((value) => valuesEqual(value, expected));
	return stableDeepEqual(actual, expected);
}

function isSafeFilter(input: Record<string, unknown>): boolean {
	const entries = Object.entries(input);
	if (entries.length > MAX_FILTER_KEYS) return false;
	return entries.every(([key]) => isSafeFilterPath(key));
}

function isSafeFilterPath(path: string): boolean {
	if (!path || path.length > MAX_PATH_LENGTH) return false;
	return !path
		.split(".")
		.some((part) => isForbiddenKey(part) || part.length === 0);
}
