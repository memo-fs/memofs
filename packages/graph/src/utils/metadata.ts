import { GraphValidationError } from "../errors/graph-errors.js";
import type { GraphMetadata, GraphMetadataValue } from "../types.js";
import { cloneJson, isPlainObject } from "./clone.js";

const MAX_METADATA_DEPTH = 6;
const MAX_METADATA_KEYS = 100;
const MAX_STRING_LENGTH = 16_384;
const FORBIDDEN_KEYS = new Set(["__proto__", "prototype", "constructor"]);

export function cloneAndValidateMetadata(
	input: unknown,
	fieldName = "metadata",
): GraphMetadata | undefined {
	if (input === undefined) return undefined;
	if (!isPlainObject(input)) {
		throw new GraphValidationError(`${fieldName} must be a plain JSON object.`);
	}

	validateMetadataValue(input, fieldName, 0, new WeakSet<object>());
	return cloneJson(input as GraphMetadata);
}

export function mergeMetadata(
	...items: Array<GraphMetadata | undefined>
): GraphMetadata | undefined {
	const output: GraphMetadata = {};

	for (const item of items) {
		if (!item) continue;
		const safe = cloneAndValidateMetadata(item);
		Object.assign(output, safe);
	}

	return Object.keys(output).length > 0 ? output : undefined;
}

function validateMetadataValue(
	value: unknown,
	path: string,
	depth: number,
	seen: WeakSet<object>,
): asserts value is GraphMetadataValue {
	if (depth > MAX_METADATA_DEPTH) {
		throw new GraphValidationError(
			`${path} exceeds max depth ${MAX_METADATA_DEPTH}.`,
		);
	}

	if (value === null || typeof value === "boolean") return;

	if (typeof value === "number") {
		if (!Number.isFinite(value))
			throw new GraphValidationError(`${path} must be a finite number.`);
		return;
	}

	if (typeof value === "string") {
		if (value.length > MAX_STRING_LENGTH) {
			throw new GraphValidationError(
				`${path} string exceeds ${MAX_STRING_LENGTH} characters.`,
			);
		}
		return;
	}

	if (Array.isArray(value)) {
		if (seen.has(value))
			throw new GraphValidationError(`${path} contains a circular reference.`);
		seen.add(value);
		if (value.length > MAX_METADATA_KEYS) {
			throw new GraphValidationError(`${path} array has too many values.`);
		}
		for (let index = 0; index < value.length; index++) {
			validateMetadataValue(value[index], `${path}[${index}]`, depth + 1, seen);
		}
		seen.delete(value);
		return;
	}

	if (isPlainObject(value)) {
		if (seen.has(value))
			throw new GraphValidationError(`${path} contains a circular reference.`);
		seen.add(value);
		const entries = Object.entries(value);
		if (entries.length > MAX_METADATA_KEYS) {
			throw new GraphValidationError(`${path} has too many keys.`);
		}
		for (const [key, nested] of entries) {
			if (!key || key.length > 128 || FORBIDDEN_KEYS.has(key)) {
				throw new GraphValidationError(`${path} contains an invalid key.`);
			}
			validateMetadataValue(nested, `${path}.${key}`, depth + 1, seen);
		}
		seen.delete(value);
		return;
	}

	throw new GraphValidationError(`${path} must be JSON-serializable.`);
}
