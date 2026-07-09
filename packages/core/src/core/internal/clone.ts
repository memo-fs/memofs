/**
 * Pure JSON deep-clone primitive — the single source of truth for
 * `JSON.parse(JSON.stringify(...))` cloning across the package.
 *
 * @remarks
 * Domain-specific callers that need to wrap parse failures in a typed error
 * (e.g. `GraphValidationError`) should call this and catch, rather than
 * re-implementing the round-trip.
 *
 * @internal
 */

/**
 * Creates a deep clone of a JSON-serializable value.
 *
 * @remarks
 * `undefined` is passed through unchanged (it is not a valid JSON value but
 * is a common sentinel in this codebase). All other values are round-tripped
 * through `JSON`.
 *
 * @typeParam T - The value type.
 * @param value - The value to clone.
 * @returns A deep clone of the value.
 *
 * @internal
 */
export function cloneJson<T>(value: T): T {
	if (value === undefined) return value;
	return JSON.parse(JSON.stringify(value)) as T;
}
