import { AgentfsValidationError } from "../errors/agentfs-error";

/**
 * Asserts that a value is a string.
 *
 * @param value - The value to check.
 * @param label - A descriptive label for error messages (e.g., `"content"`).
 * @throws {@link AgentfsValidationError} If the value is not a string.
 *
 * @public
 */
export function assertString(
	value: unknown,
	label: string,
): asserts value is string {
	if (typeof value !== "string") {
		throw new AgentfsValidationError(`${label} must be a string.`, {
			valueType: typeof value,
		});
	}
}

/**
 * Asserts that a value is a non-empty string.
 *
 * @param value - The value to check.
 * @param label - A descriptive label for error messages.
 * @throws {@link AgentfsValidationError} If the value is not a non-empty string.
 *
 * @public
 */
export function assertNonEmptyString(
	value: unknown,
	label: string,
): asserts value is string {
	assertString(value, label);
	if (value.trim().length === 0) {
		throw new AgentfsValidationError(`${label} must not be empty.`, { value });
	}
}
