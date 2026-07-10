import { cloneJson } from "../../core/internal/clone";
import { isForbiddenKey } from "../../core/internal/forbidden-keys";
import { RerankValidationError } from "../errors/rerank-errors";

/**
 * Validates rerank metadata and returns a deep clone, or undefined if input is undefined.
 *
 * @remarks
 * Distinct from the graph-zone `cloneAndValidateMetadata`: rerank metadata is
 * a pass-through clone with circular-reference and prototype-pollution guards
 * but no depth/key-count/string-length limits, and it throws
 * {@link RerankValidationError}. Renamed to reflect the different contract.
 *
 * @param value - The metadata value to validate and clone. May be undefined.
 * @returns A deep clone of the metadata, or undefined if input was undefined.
 * @throws {@link RerankValidationError} If metadata contains forbidden keys, circular references, or unsupported value types.
 *
 * @public
 */
export function cloneAndValidateRerankMetadata(
	value: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
	if (value === undefined) return undefined;

	const seen = new WeakSet<object>();
	validateMetadataValue(value, "$", seen);
	return cloneJson(value) as Record<string, unknown>;
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
			if (isForbiddenKey(key)) {
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
