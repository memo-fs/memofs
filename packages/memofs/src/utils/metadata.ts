/**
 * Utility functions for parsing and validating JSON metadata.
 *
 * @module metadata
 */

import { CliUsageError } from "../errors/cli-errors";

/**
 * Safely parses metadata input string to a plain JSON object record.
 *
 * @param value - The raw JSON string.
 * @returns The parsed record object, or `undefined` if empty/undefined.
 * @throws {CliUsageError} If the string is invalid JSON or is not a plain JSON object.
 */
export function parseMetadataJson(
	value?: string,
): Record<string, unknown> | undefined {
	if (value === undefined || value.trim().length === 0) return undefined;

	let parsed: unknown;
	try {
		parsed = JSON.parse(value);
	} catch (error) {
		throw new CliUsageError(
			`metadata must be valid JSON: ${error instanceof Error ? error.message : String(error)}`,
		);
	}

	if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
		throw new CliUsageError("metadata must be a JSON object.");
	}

	assertJsonSerializable(parsed, "metadata");
	return parsed as Record<string, unknown>;
}

/**
 * Asserts that a value is JSON serializable.
 *
 * @param value - The value to test.
 * @param name - The field name for the error message.
 * @throws {CliUsageError} If the value contains circular references or cannot be stringified.
 */
export function assertJsonSerializable(value: unknown, name = "value"): void {
	try {
		JSON.stringify(value);
	} catch (error) {
		throw new CliUsageError(`${name} must be JSON serializable.`, {
			cause: error,
		});
	}
}
