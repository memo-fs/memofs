import { cloneJson as cloneJsonValue } from "../../core/internal/clone";
import { GraphValidationError } from "../errors/graph-errors";

/**
 * Deep-clones a JSON-serializable graph value.
 *
 * @remarks
 * Delegates to the shared `core/internal` clone primitive and wraps any
 * serialization failure in a {@link GraphValidationError} so callers keep
 * their domain-specific error type. This is the graph-zone public wrapper;
 * the implementation lives once in `core/internal/clone.ts`.
 *
 * @typeParam T - The value type.
 * @param value - The value to clone.
 * @returns A deep clone of the value.
 * @throws {@link GraphValidationError} If the value is not JSON-serializable.
 *
 * @public
 */
export function cloneJson<T>(value: T): T {
	if (value === undefined) return value;
	try {
		return cloneJsonValue(value);
	} catch (error) {
		if (error instanceof GraphValidationError) throw error;
		throw new GraphValidationError("value must be JSON-serializable.", {
			cause: error,
		});
	}
}

export function uniqueStrings(
	values: Array<string | undefined | null>,
): string[] {
	const out: string[] = [];
	const seen = new Set<string>();

	for (const value of values) {
		if (typeof value !== "string") continue;
		const trimmed = value.trim();
		if (!trimmed) continue;
		const key = trimmed.toLowerCase();
		if (seen.has(key)) continue;
		seen.add(key);
		out.push(trimmed);
	}

	return out;
}

export function assertPlainObject(
	value: unknown,
	fieldName: string,
): asserts value is Record<string, unknown> {
	if (!isPlainObject(value)) {
		throw new GraphValidationError(`${fieldName} must be a plain object.`);
	}
}

export function isPlainObject(
	value: unknown,
): value is Record<string, unknown> {
	if (value === null || typeof value !== "object" || Array.isArray(value))
		return false;
	const proto = Object.getPrototypeOf(value);
	return proto === Object.prototype || proto === null;
}
