import { McpValidationError } from "../errors.js";
import type { JsonObject, JsonValue } from "../types.js";

const BLOCKED_KEYS = new Set(["__proto__", "prototype", "constructor"]);

export function isPlainObject(
	value: unknown,
): value is Record<string, unknown> {
	if (value === null || typeof value !== "object") return false;
	const proto = Object.getPrototypeOf(value);
	return proto === Object.prototype || proto === null;
}

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

export function asObject(
	value: unknown,
	name = "value",
): Record<string, unknown> {
	if (!isPlainObject(value))
		throw new McpValidationError(`${name} must be an object.`);
	return value;
}

export function toJsonObject(value: unknown, path = "value"): JsonObject {
	assertJsonValue(value, path);
	if (!isPlainObject(value))
		throw new McpValidationError(`${path} must be a JSON object.`);
	return value as JsonObject;
}

export function safeJsonStringify(value: unknown, spacing = 2): string {
	assertJsonValue(value, "result");
	return JSON.stringify(value, null, spacing);
}

export function byteLength(value: string): number {
	return Buffer.byteLength(value, "utf8");
}
