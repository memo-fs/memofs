/**
 * JSON Lines (JSONL) utility functions for reading and writing structured event data.
 *
 * @module jsonl
 */

import { CliJsonlError } from "../errors/cli-errors";

/**
 * Options configuration for parsing JSONL content.
 */
export interface JsonlParseOptions {
	/**
	 * If true, any parse error in a line will immediately throw a CliJsonlError.
	 * If false, malformed lines will be silently ignored.
	 */
	strict?: boolean | undefined;
}

/**
 * Represents a successfully parsed line from a JSONL file.
 */
export interface JsonlRecord {
	/**
	 * The 1-based line number in the original source text.
	 */
	line: number;
	/**
	 * The parsed JSON object representation.
	 */
	value: Record<string, unknown>;
}

/**
 * Parses JSONL formatted content into an array of JsonlRecord objects.
 *
 * @param content - The raw JSONL file content.
 * @param options - Configuration options controlling strict mode parsing.
 * @returns Array of parsed JsonlRecord objects.
 * @throws {CliJsonlError} If strict mode is enabled and a line is malformed or not a JSON object.
 */
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

/**
 * Stringifies an array of objects into a JSONL formatted text block, appending a trailing newline.
 *
 * @param records - Array of records/objects to stringify.
 * @returns Standard newline-delimited JSON string.
 */
export function stringifyJsonl(
	records: readonly Record<string, unknown>[],
): string {
	return (
		records.map((record) => JSON.stringify(record)).join("\n") +
		(records.length > 0 ? "\n" : "")
	);
}
