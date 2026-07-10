/**
 * CLI command handler for performing text or regex searches across local memory files.
 *
 * @module search
 */

import type { MemoFS } from "@memofs/core";
import { readTextIfExists } from "../cli/store-helpers";
import type { CliOutput } from "../output/output";
import { MEMOFS_CLI_PATHS } from "../protocol/constants";

/**
 * Options configuration for the search command.
 */
export interface SearchCommandOptions {
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
	 * The text query or regex pattern to search for.
	 */
	query: string;
	/**
	 * If true, treats the query string as a regular expression.
	 */
	regex?: boolean | undefined;
}

/**
 * Represents a matched line with details on line number and parent file path.
 */
interface SearchMatch {
	file: string;
	line: number;
	content: string;
}

/**
 * Runs the search command, searching local memory database files for a pattern.
 *
 * @param options - Command configuration options.
 * @returns CLI exit code.
 */
export async function runSearchCommand(
	options: SearchCommandOptions,
): Promise<number> {
	const matches: SearchMatch[] = [];

	const filesToSearch = [
		MEMOFS_CLI_PATHS.coreMemory,
		MEMOFS_CLI_PATHS.notesMemory,
		MEMOFS_CLI_PATHS.conversations,
	];

	let matcher: (line: string) => boolean;

	if (options.regex) {
		let pattern: RegExp;
		try {
			pattern = new RegExp(options.query, "i");
		} catch {
			options.output.error(`Invalid regular expression: ${options.query}`);
			return 1;
		}
		matcher = (line) => pattern.test(line);
	} else {
		const query = options.query.toLowerCase();
		matcher = (line) => line.toLowerCase().includes(query);
	}

	for (const file of filesToSearch) {
		const content = await readTextIfExists(options.memo.store, file);
		if (!content) continue;

		const lines = content.split(/\r?\n/);
		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];
			if (line !== undefined && matcher(line)) {
				matches.push({
					file,
					line: i + 1,
					content: line.trim(),
				});
			}
		}
	}

	if (options.json) {
		options.output.write(
			JSON.stringify({ query: options.query, matches }, null, 2),
		);
		return 0;
	}

	if (matches.length === 0) {
		options.output.write(`No matches found for "${options.query}".`);
		return 0;
	}

	for (const match of matches) {
		options.output.write(`${match.file}:${match.line}: ${match.content}`);
	}
	options.output.success(`Found ${matches.length} match(es).`);

	return 0;
}
