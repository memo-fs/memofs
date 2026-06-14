/**
 * @file JSON utility functions for the recall package.
 *
 * @remarks
 * Provides utilities for validating, cloning, and working with JSON-serializable values.
 * Includes protection against prototype pollution and circular references.
 *
 * @internal
 */

import { RecallValidationError } from "../errors/errors";
import type { JsonValue } from "../types";

/**
 * Checks if a value is a plain object (not null, array, or other object type).
 *
 * @param value - The value to check
 * @returns true if the value is a plain object
 *
 * @internal
 */
export function isPlainObject(
	value: unknown,
): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Asserts that a value is JSON-serializable.
 *
 * @remarks
 * Recursively validates that the value and all nested values are valid JSON types.
 * Detects and rejects circular references.
 *
 * @param value - The value to validate
 * @param name - Name to use in error messages (defaults to "value")
 * @param seen - Set of objects already visited (used internally for circular reference detection)
 * @throws {RecallValidationError} If the value is not JSON-serializable or contains circular references
 *
 * @internal
 */
export function assertJsonValue(
	value: unknown,
	name = "value",
	seen = new WeakSet<object>(),
): asserts value is JsonValue {
	if (value === null) return;

	const type = typeof value;
	if (type === "string" || type === "boolean") return;

	if (type === "number") {
		if (!Number.isFinite(value)) {
			throw new RecallValidationError(`${name} must be a finite JSON number.`, {
				name,
				value,
			});
		}
		return;
	}

	if (Array.isArray(value)) {
		if (seen.has(value)) {
			throw new RecallValidationError(
				`${name} must not contain circular references.`,
				{ name },
			);
		}
		seen.add(value);
		for (const [index, item] of value.entries()) {
			assertJsonValue(item, `${name}[${index}]`, seen);
		}
		seen.delete(value);
		return;
	}

	if (isPlainObject(value)) {
		if (seen.has(value)) {
			throw new RecallValidationError(
				`${name} must not contain circular references.`,
				{ name },
			);
		}
		seen.add(value);
		for (const [key, item] of Object.entries(value)) {
			assertSafeObjectKey(key, `${name}.${key}`);
			if (item !== undefined) assertJsonValue(item, `${name}.${key}`, seen);
		}
		seen.delete(value);
		return;
	}

	throw new RecallValidationError(`${name} must be JSON-serializable.`, {
		name,
		type,
	});
}

/**
 * Creates a deep clone of a JSON value using JSON serialization.
 *
 * @remarks
 * Returns undefined unchanged. For other values, uses JSON.parse(JSON.stringify(value))
 * to create a deep clone.
 *
 * @param value - The JSON value to clone
 * @returns A deep clone of the value
 *
 * @public
 */
export function cloneJsonValue<T extends JsonValue | undefined>(value: T): T {
	if (value === undefined) return value;
	return JSON.parse(JSON.stringify(value)) as T;
}

/**
 * Asserts that an object key is safe (not a prototype pollution attempt).
 *
 * @remarks
 * Rejects keys like "__proto__", "constructor", and "prototype".
 *
 * @param key - The key to validate
 * @param name - Name to use in error messages
 * @throws {RecallValidationError} If the key is unsafe
 *
 * @internal
 */
export function assertSafeObjectKey(key: string, name = "key"): void {
	if (key === "__proto__" || key === "constructor" || key === "prototype") {
		throw new RecallValidationError(`${name} is not allowed.`, { key });
	}
}

/**
 * Creates a deep clone of a record using JSON serialization.
 *
 * @remarks
 * Returns undefined unchanged. For objects, uses JSON serialization to create a deep clone.
 *
 * @param value - The record to clone
 * @returns A deep clone of the record
 *
 * @public
 */
export function cloneRecord<T extends Record<string, unknown> | undefined>(
	value: T,
): T {
	if (value === undefined) return value;
	return JSON.parse(JSON.stringify(value)) as T;
}
