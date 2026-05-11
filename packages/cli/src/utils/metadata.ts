import { CliUsageError } from "../errors/cli-errors";

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

export function assertJsonSerializable(value: unknown, name = "value"): void {
	try {
		JSON.stringify(value);
	} catch (error) {
		throw new CliUsageError(`${name} must be JSON serializable.`, {
			cause: error,
		});
	}
}
