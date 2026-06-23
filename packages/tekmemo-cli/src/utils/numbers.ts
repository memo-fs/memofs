/**
 * Utility functions for parsing and validating integer and floating point inputs.
 *
 * @module numbers
 */

import { CliUsageError } from "../errors/cli-errors";

/**
 * Parses a string to a non-negative integer.
 *
 * @param value - The input string.
 * @param name - The field name for error reporting.
 * @returns The parsed integer.
 * @throws {CliUsageError} If the value is not a valid non-negative integer.
 */
export function parseNonNegativeInteger(value: string, name = "value"): number {
	const parsed = Number.parseInt(value, 10);
	if (
		!Number.isFinite(parsed) ||
		parsed < 0 ||
		String(parsed) !== String(value).trim()
	) {
		throw new CliUsageError(`${name} must be a non-negative integer.`);
	}
	return parsed;
}

/**
 * Parses a string to a positive integer (greater than 0).
 *
 * @param value - The input string.
 * @param name - The field name for error reporting.
 * @returns The parsed integer.
 * @throws {CliUsageError} If the value is not a positive integer.
 */
export function parsePositiveInteger(value: string, name = "value"): number {
	const parsed = parseNonNegativeInteger(value, name);
	if (parsed === 0) throw new CliUsageError(`${name} must be greater than 0.`);
	return parsed;
}

/**
 * Parses a string to a confidence score between 0 and 1.
 *
 * @param value - The input string.
 * @returns The parsed floating-point number.
 * @throws {CliUsageError} If the value is not a valid score between 0 and 1.
 */
export function parseConfidence(value: string): number {
	const parsed = Number.parseFloat(value);
	if (!Number.isFinite(parsed) || parsed < 0 || parsed > 1) {
		throw new CliUsageError("confidence must be a number between 0 and 1.");
	}
	return parsed;
}
