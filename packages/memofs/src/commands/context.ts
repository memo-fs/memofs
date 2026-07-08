/**
 * CLI command handler for retrieving localized workspace memory context.
 *
 * @module context
 */

import type { MemoFS } from "@memofs/core";
import { getRootDir, readTextIfExists } from "../cli/store-helpers";
import type { CliOutput } from "../output/output";
import { printJsonEnvelope } from "../output/output";
import { MEMOFS_PATHS } from "../protocol/constants";
import { parseJsonl } from "../protocol/jsonl";
import { parsePositiveInteger } from "../utils/numbers";

/**
 * Options configuration for the context command.
 */
export interface ContextCommandOptions {
	/**
	 * The MemoFS client instance.
	 */
	memo: MemoFS;
	/**
	 * The CLI output console wrapper.
	 */
	output: CliOutput;
	/**
	 * If true, outputs results in structured JSON format.
	 */
	json?: boolean | undefined;
	/**
	 * Optional text query to filter matching memory files.
	 */
	query?: string | undefined;
	/**
	 * Maximum characters allowed in the formatted context output.
	 */
	maxChars?: number | string | undefined;
	/**
	 * If true, lists recent memory events.
	 */
	includeEvents?: boolean | undefined;
	/**
	 * If true, lists recent memory chunk index records.
	 */
	includeChunks?: boolean | undefined;
}

/**
 * Represents a matching text line found during query lookup.
 */
interface ContextSearchMatch {
	/**
	 * Relative path of the file containing the match.
	 */
	file: string;
	/**
	 * Line number where the match was found.
	 */
	line: number;
	/**
	 * Matching line text content.
	 */
	content: string;
}

/**
 * Truncates string content to a maximum number of characters, appending a truncated notice.
 *
 * @param value - Target string content.
 * @param maxChars - Maximum character length.
 * @returns The truncated or original string.
 */
function truncate(value: string, maxChars: number): string {
	if (value.length <= maxChars) return value;
	return `${value.slice(0, Math.max(0, maxChars - 20)).trimEnd()}\n\n[truncated]`;
}

/**
 * Scans content lines for a target search query.
 *
 * @param file - Path descriptor of the source file.
 * @param content - File contents to search.
 * @param query - Case-insensitive string query.
 * @returns Array of search match details.
 */
function searchText(
	file: string,
	content: string,
	query: string,
): ContextSearchMatch[] {
	const lower = query.toLowerCase();
	return content
		.split(/\r?\n/)
		.map((line, index) => ({ file, line: index + 1, content: line.trim() }))
		.filter((entry) => entry.content.toLowerCase().includes(lower));
}

/**
 * Runs the context command, aggregating local memory context for LLMs.
 *
 * @param options - Command configuration options.
 * @returns CLI exit code.
 */
export async function runContextCommand(
	options: ContextCommandOptions,
): Promise<number> {
	const rootDir = getRootDir(options.memo.store);
	const maxChars =
		typeof options.maxChars === "number"
			? options.maxChars
			: options.maxChars
				? parsePositiveInteger(options.maxChars, "max chars")
				: 12000;
	const core =
		(await readTextIfExists(options.memo.store, MEMOFS_PATHS.coreMemory)) ?? "";
	const notes =
		(await readTextIfExists(options.memo.store, MEMOFS_PATHS.notesMemory)) ??
		"";
	const eventContent =
		(await readTextIfExists(options.memo.store, MEMOFS_PATHS.memoryEvents)) ??
		"";
	const chunkContent =
		(await readTextIfExists(options.memo.store, MEMOFS_PATHS.chunks)) ?? "";
	const events = eventContent
		? parseJsonl(eventContent)
				.slice(-10)
				.map((record) => record.value)
		: [];
	const chunks = chunkContent
		? parseJsonl(chunkContent)
				.slice(-10)
				.map((record) => record.value)
		: [];
	const matches = options.query
		? [
				...searchText(MEMOFS_PATHS.coreMemory, core, options.query),
				...searchText(MEMOFS_PATHS.notesMemory, notes, options.query),
			]
		: [];

	const data = {
		rootDir,
		query: options.query ?? null,
		core: truncate(core.trim(), Math.floor(maxChars * 0.45)),
		notes: truncate(notes.trim(), Math.floor(maxChars * 0.35)),
		matches,
		...(options.includeEvents ? { recentEvents: events } : {}),
		...(options.includeChunks ? { recentChunks: chunks } : {}),
	};

	if (options.json) {
		printJsonEnvelope(options.output, "context", data);
		return 0;
	}

	const sections = [
		"# MemoFS Context",
		`Root: ${rootDir}`,
		options.query ? `Query: ${options.query}` : undefined,
		"",
		"## Core Memory",
		data.core || "No core memory found.",
		"",
		"## Notes Memory",
		data.notes || "No notes memory found.",
	];
	if (matches.length > 0) {
		sections.push(
			"",
			"## Text Matches",
			...matches
				.slice(0, 20)
				.map((m) => `- ${m.file}:${m.line} — ${m.content}`),
		);
	}
	if (options.includeEvents && events.length > 0) {
		sections.push(
			"",
			"## Recent Memory Events",
			...events.map((event) =>
				`- ${String(event.timestamp ?? "unknown")} ${String(event.type ?? "unknown")} ${String(event.summary ?? "")}`.trim(),
			),
		);
	}
	options.output.write(
		truncate(
			sections
				.filter((section): section is string => section !== undefined)
				.join("\n"),
			maxChars,
		),
	);
	return 0;
}
