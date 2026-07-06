/**
 * Label validation and safe identifier creation utilities.
 *
 * @module labels
 */

import { CliUsageError } from "../errors/cli-errors";

/**
 * Validates a snapshot label, ensuring it is within constraints and safe.
 *
 * @param label - The input snapshot label.
 * @returns The trimmed, validated label.
 * @throws {CliUsageError} If the label is empty, exceeds 80 characters, contains null bytes, or has invalid characters.
 */
export function validateSnapshotLabel(label: string): string {
	if (typeof label !== "string" || label.trim().length === 0) {
		throw new CliUsageError("Snapshot label must be a non-empty string.");
	}

	const normalized = label.trim();
	if (normalized.length > 80) {
		throw new CliUsageError("Snapshot label must be 80 characters or fewer.");
	}

	if (normalized.includes("\0")) {
		throw new CliUsageError("Snapshot label must not contain null bytes.");
	}

	if (!/^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/.test(normalized)) {
		throw new CliUsageError(
			"Snapshot label may only contain letters, numbers, dots, underscores, and hyphens, and must start with a letter or number.",
		);
	}

	return normalized;
}

/**
 * Creates a unique safe snapshot ID string by combining a validated label and timestamp.
 *
 * @param label - The snapshot label to sanitize.
 * @param timestamp - The timestamp string (defaults to current date ISO string).
 * @returns The unique safe identifier string.
 */
export function createSafeIdFromLabel(
	label: string,
	timestamp = new Date().toISOString(),
): string {
	const safeLabel = validateSnapshotLabel(label);
	const safeTimestamp = timestamp.replace(/[:.]/g, "-");
	return `${safeLabel}-${safeTimestamp}`.slice(0, 120);
}
