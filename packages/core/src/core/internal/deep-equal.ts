/**
 * Shared path-access and deep-equality primitives.
 *
 * @remarks
 * Single source of truth for dot-notation traversal (`getByPath`) and
 * stable-key deep equality (`stableDeepEqual`). The graph filter previously
 * implemented a hardened version (depth + circular guards, forbidden-key
 * rejection); the recall filter implemented a plain version. The hardened
 * semantics are canonical — every caller gets the safe version.
 *
 * @internal
 */

import { isForbiddenKey } from "./forbidden-keys";

const MAX_PATH_DEPTH = 12;
const MAX_PATH_LENGTH = 512;

/**
 * Reads a value at a dot-separated path on a record.
 *
 * @remarks
 * Traverses `a.b.c` style paths defensively: stops on non-object intermediates,
 * rejects prototype-pollution keys, and caps path length/depth. Returns
 * `undefined` for any unsafe or unresolvable path rather than throwing.
 *
 * @param input - The root record.
 * @param path - The dot-separated path (e.g. `"metadata.sourceType"`).
 *
 * @internal
 */
export function getByPath(
	input: Record<string, unknown>,
	path: string,
): unknown {
	if (!isSafePath(path)) return undefined;
	if (!path.includes(".")) return input[path];

	let current: unknown = input;
	for (const part of path.split(".")) {
		if (
			current === null ||
			typeof current !== "object" ||
			Array.isArray(current)
		)
			return undefined;
		current = (current as Record<string, unknown>)[part];
	}
	return current;
}

/**
 * Performs a deep equality check using stable key ordering.
 *
 * @remarks
 * Serializes both values with sorted object keys and compares the JSON
 * strings. Handles nested objects and arrays. Returns `false` on any
 * serialization failure (cycles, non-serializable values) instead of
 * throwing.
 *
 * @param a - First value.
 * @param b - Second value.
 *
 * @internal
 */
export function stableDeepEqual(a: unknown, b: unknown): boolean {
	try {
		return (
			JSON.stringify(stabilize(a, 0, new WeakSet<object>())) ===
			JSON.stringify(stabilize(b, 0, new WeakSet<object>()))
		);
	} catch {
		return false;
	}
}

/**
 * Stable serialization helper: returns a value with object keys sorted
 * recursively so `JSON.stringify` output is order-independent.
 *
 * @param value - The value to stabilize.
 * @param depth - Current recursion depth (guards against excessive depth).
 * @param seen - Tracks visited objects to detect cycles.
 *
 * @internal
 */
function stabilize(
	value: unknown,
	depth: number,
	seen: WeakSet<object>,
): unknown {
	if (depth > MAX_PATH_DEPTH) throw new TypeError("value too deep");
	if (value === null || typeof value !== "object") return value;
	if (seen.has(value)) throw new TypeError("circular value");
	seen.add(value);
	try {
		if (Array.isArray(value)) {
			return value.map((item) => stabilize(item, depth + 1, seen));
		}
		const entries = Object.entries(value as Record<string, unknown>).sort(
			([a], [b]) => a.localeCompare(b),
		);
		return Object.fromEntries(
			entries.map(([key, nested]) => [key, stabilize(nested, depth + 1, seen)]),
		);
	} finally {
		seen.delete(value);
	}
}

/**
 * Validates that a dot-separated path is safe to traverse.
 *
 * @param path - The path to check.
 *
 * @internal
 */
function isSafePath(path: string): boolean {
	if (!path || path.length > MAX_PATH_LENGTH) return false;
	return !path
		.split(".")
		.some((part) => isForbiddenKey(part) || part.length === 0);
}
