import { AgentfsConfigError } from "../errors/agentfs-error";

const SAFE_SEGMENT_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_.-]{0,127}$/;

/**
 * Validates that a value is a safe single path segment.
 *
 * @remarks
 * A safe segment must:
 * - Be a non-empty string
 * - Not contain null bytes, slashes, or backslashes
 * - Not be `.` or `..`
 * - Match the pattern: alphanumeric start, then alphanumeric, underscore, dot, or hyphen (max 128 chars)
 *
 * @param value - The value to validate.
 * @param label - A descriptive label for error messages.
 * @returns The validated and trimmed string.
 * @throws {@link AgentfsConfigError} If the value is not a safe segment.
 *
 * @public
 */
export function validateSafeSegment(value: unknown, label: string): string {
	if (typeof value !== "string") {
		throw new AgentfsConfigError(`${label} must be a string.`, {
			label,
			valueType: typeof value,
		});
	}

	const normalized = value.trim();

	if (normalized.length === 0) {
		throw new AgentfsConfigError(`${label} must not be empty.`, { label });
	}

	if (normalized.includes("\0")) {
		throw new AgentfsConfigError(`${label} must not contain null bytes.`, {
			label,
		});
	}

	if (normalized.includes("/") || normalized.includes("\\")) {
		throw new AgentfsConfigError(
			`${label} must be a single safe path segment.`,
			{ label, value },
		);
	}

	if (normalized === "." || normalized === ".." || normalized.includes("..")) {
		throw new AgentfsConfigError(
			`${label} must not contain parent directory semantics.`,
			{ label, value },
		);
	}

	if (!SAFE_SEGMENT_PATTERN.test(normalized)) {
		throw new AgentfsConfigError(`${label} contains unsupported characters.`, {
			label,
			value,
			pattern: SAFE_SEGMENT_PATTERN.source,
		});
	}

	return normalized;
}
