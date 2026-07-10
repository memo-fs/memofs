/**
 * JSON utility functions for safe parsing, validation, and stringification.
 *
 * @module json
 */

import { isPlainObject } from "@memofs/json-rpc";
import { McpValidationError } from "../errors";
import type { JsonObject, JsonValue } from "../types";

export { isPlainObject };

const BLOCKED_KEYS = new Set(["__proto__", "prototype", "constructor"]);

/**
 * Asserts that a value is a valid JSON value.
 * Validates against circular references, extreme depth, unsafe keys, and non-finite numbers.
 *
 * @param value - The value to check.
 * @param path - The property path used for detailed error messages.
 * @param depth - Current recursion depth.
 * @param seen - Set of visited object references to detect circularity.
 * @throws {McpValidationError} If the value is invalid or unsafe for JSON serialization.
 */
export function assertJsonValue(
	value: unknown,
	path = "value",
	depth = 0,
	seen = new WeakSet<object>(),
): asserts value is JsonValue {
	if (depth > 32)
		throw new McpValidationError(`${path} exceeds max JSON depth.`);
	if (value === null) return;
	const type = typeof value;
	if (type === "string" || type === "boolean") return;
	if (type === "number") {
		if (!Number.isFinite(value))
			throw new McpValidationError(`${path} must be a finite number.`);
		return;
	}
	if (Array.isArray(value)) {
		if (seen.has(value))
			throw new McpValidationError(`${path} contains a circular reference.`);
		seen.add(value);
		if (value.length > 10_000)
			throw new McpValidationError(`${path} array is too large.`);
		for (let index = 0; index < value.length; index += 1)
			assertJsonValue(value[index], `${path}[${index}]`, depth + 1, seen);
		return;
	}
	if (type === "object") {
		if (!isPlainObject(value))
			throw new McpValidationError(`${path} must be a plain JSON object.`);
		if (seen.has(value))
			throw new McpValidationError(`${path} contains a circular reference.`);
		seen.add(value);
		const entries = Object.entries(value);
		if (entries.length > 10_000)
			throw new McpValidationError(`${path} object has too many keys.`);
		for (const [key, child] of entries) {
			if (BLOCKED_KEYS.has(key))
				throw new McpValidationError(`${path} contains unsafe key ${key}.`);
			if (key.length > 256)
				throw new McpValidationError(`${path} contains an oversized key.`);
			assertJsonValue(child, `${path}.${key}`, depth + 1, seen);
		}
		return;
	}
	throw new McpValidationError(`${path} must be JSON serializable.`);
}

/**
 * Asserts that a value is a plain object and returns it.
 *
 * @param value - The value to assert.
 * @param name - The field name for the error message.
 * @returns The casted record object.
 * @throws {McpValidationError} If the value is not a plain object.
 */
export function asObject(
	value: unknown,
	name = "value",
): Record<string, unknown> {
	if (!isPlainObject(value))
		throw new McpValidationError(`${name} must be an object.`);
	return value;
}

/**
 * Asserts that a value is a valid JSON object.
 *
 * @param value - The value to check.
 * @param path - The property path for the error message.
 * @returns The validated JsonObject.
 * @throws {McpValidationError} If the value is not a valid JSON object.
 */
export function toJsonObject(value: unknown, path = "value"): JsonObject {
	assertJsonValue(value, path);
	if (!isPlainObject(value))
		throw new McpValidationError(`${path} must be a JSON object.`);
	return value as JsonObject;
}

/**
 * Safely stringifies a value to JSON, validating it first.
 *
 * @param value - The value to stringify.
 * @param spacing - The spacing format count.
 * @returns The JSON string representation.
 * @throws {McpValidationError} If the value has serialization issues.
 */
export function safeJsonStringify(value: unknown, spacing = 2): string {
	assertJsonValue(value, "result");
	return JSON.stringify(value, null, spacing);
}

/**
 * Returns the UTF-8 byte length of a string.
 *
 * @param value - The string to measure.
 * @returns The length in bytes.
 */
export function byteLength(value: string): number {
	return Buffer.byteLength(value, "utf8");
}
