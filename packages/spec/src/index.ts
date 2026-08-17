/**
 * Versioned JSON Schema validation for portable MemoFS memory data.
 *
 * The schemas in this package are generated from the runtime's TypeScript
 * interfaces. This module compiles the published schema set once and exposes
 * a small validation surface for consumers outside the core runtime.
 */

import Ajv, { type ErrorObject, type ValidateFunction } from "ajv";
import manifestSchema from "../schema/v1/manifest.json" with { type: "json" };

/** A schema name published by this package. */
export type SchemaName = "manifest";

/** A structural validation error returned by AJV. */
export type ValidationError = ErrorObject;

/** Compiled validators keyed by their published schema name. */
const validators: Record<SchemaName, ValidateFunction> = {
	manifest: new Ajv({ allErrors: true }).compile(manifestSchema),
};

/**
 * Validates untrusted data against a published MemoFS JSON Schema.
 *
 * @param input - The data to validate.
 * @param schema - The published schema to apply.
 * @returns `true` when valid; otherwise, the structural validation errors.
 */
export function validate(
	input: unknown,
	schema: SchemaName,
): true | ValidationError[] {
	const validator = validators[schema];
	if (validator(input)) {
		return true;
	}

	return validator.errors?.slice() ?? [];
}
