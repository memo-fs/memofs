import { RerankValidationError } from "../errors/rerank-errors";

/** Keys that are forbidden in metadata to prevent prototype pollution. */
const FORBIDDEN_KEYS = new Set(["__proto__", "prototype", "constructor"]);

/**
 * Validates metadata and returns a deep clone, or undefined if input is undefined.
 *
 * @param value - The metadata value to validate and clone. May be undefined.
 * @returns A deep clone of the metadata, or undefined if input was undefined.
 * @throws {@link RerankValidationError} If metadata contains forbidden keys, circular references, or unsupported value types.
 *
 * @public
 */
export function cloneAndValidateMetadata(
	value: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
	if (value === undefined) return undefined;

	const seen = new WeakSet<object>();
	validateMetadataValue(value, "$", seen);
	return structuredCloneSafe(value) as Record<string, unknown>;
}

/**
 * Recursively validates a metadata value at a given path.
 *
 * @param value - The value to validate.
 * @param path - The current path in the metadata object (for error messages).
 * @param seen - Set of objects already visited (to detect circular references).
 * @throws {@link RerankValidationError} If the value is invalid.
 *
 * @internal
 */
function validateMetadataValue(
	value: unknown,
	path: string,
	seen: WeakSet<object>,
): void {
	if (value === null) return;

	const type = typeof value;
	if (type === "string" || type === "number" || type === "boolean") {
		if (type === "number" && !Number.isFinite(value as number)) {
			throw new RerankValidationError(
				`metadata at ${path} must not contain NaN or Infinity.`,
			);
		}
		return;
	}

	if (Array.isArray(value)) {
		if (seen.has(value)) {
			throw new RerankValidationError(
				`metadata at ${path} contains a circular reference.`,
			);
		}
		seen.add(value);
		value.forEach((item, index) => {
			validateMetadataValue(item, `${path}[${index}]`, seen);
		});
		seen.delete(value);
		return;
	}

	if (type === "object") {
		const object = value as Record<string, unknown>;
		if (seen.has(object)) {
			throw new RerankValidationError(
				`metadata at ${path} contains a circular reference.`,
			);
		}
		seen.add(object);
		for (const [key, nested] of Object.entries(object)) {
			if (FORBIDDEN_KEYS.has(key)) {
				throw new RerankValidationError(
					`metadata key "${key}" is not allowed.`,
				);
			}
			validateMetadataValue(nested, `${path}.${key}`, seen);
		}
		seen.delete(object);
		return;
	}

	throw new RerankValidationError(
		`metadata at ${path} contains unsupported value type ${type}.`,
	);
}

/**
 * Creates a deep clone of a value using JSON serialization.
 *
 * @param value - The value to clone.
 * @returns A deep clone of the value.
 *
 * @internal
 */
function structuredCloneSafe(value: unknown): unknown {
	return JSON.parse(JSON.stringify(value)) as unknown;
}
