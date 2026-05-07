import type { GraphMetadata } from "../types.js";

const MAX_FILTER_KEYS = 100;
const MAX_FILTER_DEPTH = 12;

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

function getByPath(input: Record<string, unknown>, path: string): unknown {
	if (!path.includes(".")) return input[path];

	let current: unknown = input;
	for (const part of path.split(".")) {
		if (!isSafeFilterPath(part)) return undefined;
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

function valuesEqual(actual: unknown, expected: unknown): boolean {
	if (Array.isArray(actual))
		return actual.some((value) => valuesEqual(value, expected));

	try {
		return stableStringify(actual) === stableStringify(expected);
	} catch {
		return false;
	}
}

function stableStringify(value: unknown): string {
	return JSON.stringify(
		normalizeForComparison(value, 0, new WeakSet<object>()),
	);
}

function normalizeForComparison(
	value: unknown,
	depth: number,
	seen: WeakSet<object>,
): unknown {
	if (depth > MAX_FILTER_DEPTH) throw new TypeError("filter too deep");
	if (value === null || typeof value !== "object") return value;
	if (seen.has(value)) throw new TypeError("circular filter");
	seen.add(value);
	try {
		if (Array.isArray(value)) {
			return value.map((item) => normalizeForComparison(item, depth + 1, seen));
		}
		const entries = Object.entries(value as Record<string, unknown>).sort(
			([a], [b]) => a.localeCompare(b),
		);
		return Object.fromEntries(
			entries.map(([key, nested]) => [
				key,
				normalizeForComparison(nested, depth + 1, seen),
			]),
		);
	} finally {
		seen.delete(value);
	}
}

function isSafeFilter(input: Record<string, unknown>): boolean {
	const entries = Object.entries(input);
	if (entries.length > MAX_FILTER_KEYS) return false;
	return entries.every(([key]) => isSafeFilterPath(key));
}

function isSafeFilterPath(path: string): boolean {
	if (!path || path.length > 512) return false;
	return !path
		.split(".")
		.some(
			(part) =>
				part === "__proto__" ||
				part === "prototype" ||
				part === "constructor" ||
				part.length === 0,
		);
}
