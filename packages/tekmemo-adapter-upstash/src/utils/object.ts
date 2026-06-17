/**
 * @file Utility functions for plain object manipulation.
 *
 * @remarks
 * These utilities handle common object operations needed by the
 * Upstash Vector adapter.
 *
 * @internal
 */

/**
 * Checks if a value is a plain object (created by Object constructor or null prototype).
 *
 * @param value - The value to check.
 * @returns True if the value is a plain object.
 *
 * @internal
 */
export function isPlainObject(
	value: unknown,
): value is Record<string, unknown> {
	if (typeof value !== "object" || value === null) return false;
	const proto = Object.getPrototypeOf(value);
	return proto === Object.prototype || proto === null;
}

/**
 * Creates a deep clone of a plain record using JSON serialization.
 *
 * @remarks
 * This method only works for JSON-serializable values. Non-serializable
 * properties will be lost.
 *
 * @param value - The record to clone.
 * @returns A deep clone of the input record.
 *
 * @internal
 */
export function clonePlainRecord<T extends Record<string, unknown>>(
	value: T,
): T {
	return JSON.parse(JSON.stringify(value)) as T;
}
