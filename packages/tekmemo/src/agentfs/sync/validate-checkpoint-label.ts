import { AgentfsValidationError } from "../errors/agentfs-error";

/**
 * Validates and normalizes a checkpoint label.
 *
 * @remarks
 * Ensures the label is a non-empty string, does not exceed 128 characters,
 * and does not contain control characters or null bytes.
 *
 * @param label - The label value to validate.
 * @returns The normalized (trimmed) label string.
 * @throws {@link AgentfsValidationError} If the label is invalid.
 *
 * @public
 */
export function validateCheckpointLabel(label: unknown): string {
	if (typeof label !== "string") {
		throw new AgentfsValidationError("Checkpoint label must be a string.", {
			valueType: typeof label,
		});
	}

	const normalized = label.trim();

	if (normalized.length === 0) {
		throw new AgentfsValidationError("Checkpoint label must not be empty.", {
			label,
		});
	}

	if (normalized.length > 128) {
		throw new AgentfsValidationError(
			"Checkpoint label must not exceed 128 characters.",
			{ length: normalized.length },
		);
	}

	if (/[\0\r\n]/.test(normalized)) {
		throw new AgentfsValidationError(
			"Checkpoint label must not contain control characters.",
			{ label },
		);
	}

	return normalized;
}
