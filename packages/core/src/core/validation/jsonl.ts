/**
 * Utilities for parsing and stringifying JSONL (JSON Lines) content.
 *
 * @remarks
 * JSONL is used for all append-only log files in TekMemo (.jsonl files).
 * This module provides safe parsing with error handling and line-by-line validation.
 *
 * @public
 */

import { MemoryParseError, MemoryValidationError } from "../errors/errors";

/**
 * Describes a single parse issue encountered while reading JSONL.
 */
export interface JsonlParseIssue {
	/** The 1-based line number where the issue occurred. */
	lineNumber: number;
	/** The raw line content that failed to parse. */
	line: string;
	/** Human-readable error message. */
	message: string;
}

/**
 * Strategy for handling malformed lines during JSONL parsing.
 */
export type MalformedJsonlMode = "throw" | "skip";

/**
 * Options for the {@link parseJsonl} function.
 */
export interface ParseJsonlOptions<T> {
	/** How to handle malformed lines. @defaultValue "throw" */
	mode?: MalformedJsonlMode;
	/** Optional validator to run on each parsed value. */
	validate?: (value: unknown, lineNumber: number) => T;
}

/**
 * Result returned from {@link parseJsonl}.
 */
export interface ParseJsonlResult<T> {
	/** Successfully parsed entries. */
	entries: T[];
	/** Any parse issues encountered (only populated when mode is "skip"). */
	issues: JsonlParseIssue[];
}

/**
 * Parses a JSONL string into typed entries.
 *
 * @param content - The JSONL content to parse.
 * @param options - Parse options including mode and validator.
 * @returns Object with entries and any parse issues.
 * @throws {@link MemoryParseError} If mode is "throw" and parsing fails.
 */
export function parseJsonl<T = unknown>(
	content: string,
	options: ParseJsonlOptions<T> = {},
): ParseJsonlResult<T> {
	const mode = options.mode ?? "throw";
	const entries: T[] = [];
	const issues: JsonlParseIssue[] = [];
	const lines = content.split(/\r?\n/);

	for (let index = 0; index < lines.length; index += 1) {
		const line = lines[index]?.trim() ?? "";
		if (!line) continue;

		try {
			const parsed = JSON.parse(line) as unknown;
			const value = options.validate
				? options.validate(parsed, index + 1)
				: (parsed as T);
			entries.push(value);
		} catch (error) {
			const issue: JsonlParseIssue = {
				lineNumber: index + 1,
				line,
				message: error instanceof Error ? error.message : String(error),
			};
			issues.push(issue);

			if (mode === "throw") {
				throw new MemoryParseError(
					`Invalid JSONL at line ${issue.lineNumber}: ${issue.message}`,
					{
						lineNumber: issue.lineNumber,
						line: issue.line,
					},
					error,
				);
			}
		}
	}

	return { entries, issues };
}

/**
 * Stringifies a value as a JSONL entry (one JSON object per line).
 *
 * @param value - The value to stringify.
 * @returns The JSONL entry string (with trailing newline).
 * @throws {@link MemoryValidationError} If the value is not serializable.
 */
export function stringifyJsonlEntry(value: unknown): string {
	try {
		return `${JSON.stringify(value)}\n`;
	} catch (error) {
		throw new MemoryValidationError("JSONL entry must be serializable.", {
			error: error instanceof Error ? error.message : String(error),
		});
	}
}
