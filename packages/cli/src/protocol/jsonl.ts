import { CliJsonlError } from "../errors/cli-errors";

export interface JsonlParseOptions {
	strict?: boolean | undefined;
}

export interface JsonlRecord {
	line: number;
	value: Record<string, unknown>;
}

export function parseJsonl(
	content: string,
	options?: JsonlParseOptions,
): JsonlRecord[] {
	const strict = options?.strict ?? false;
	const records: JsonlRecord[] = [];
	const lines = content.split(/\r?\n/);

	lines.forEach((line, index) => {
		const lineNumber = index + 1;
		const trimmed = line.trim();

		if (trimmed.length === 0) return;

		try {
			const parsed = JSON.parse(trimmed) as unknown;

			if (
				typeof parsed !== "object" ||
				parsed === null ||
				Array.isArray(parsed)
			) {
				throw new CliJsonlError(`Line ${lineNumber} is not a JSON object.`);
			}

			records.push({
				line: lineNumber,
				value: parsed as Record<string, unknown>,
			});
		} catch (error) {
			if (strict) {
				if (error instanceof CliJsonlError) throw error;
				throw new CliJsonlError(`Line ${lineNumber} is invalid JSON.`, {
					cause: error,
				});
			}
		}
	});

	return records;
}

export function stringifyJsonl(
	records: readonly Record<string, unknown>[],
): string {
	return (
		records.map((record) => JSON.stringify(record)).join("\n") +
		(records.length > 0 ? "\n" : "")
	);
}
