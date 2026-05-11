import type { TekMemoFileSystem } from "../fs/tekmemo-fs";
import type { CliOutput } from "../output/output";
import { TEKMEMO_PATHS } from "../protocol/constants";

export interface SearchCommandOptions {
	fs: TekMemoFileSystem;
	output: CliOutput;
	json?: boolean | undefined;
	query: string;
	regex?: boolean | undefined;
}

interface SearchMatch {
	file: string;
	line: number;
	content: string;
}

export async function runSearchCommand(
	options: SearchCommandOptions,
): Promise<number> {
	const matches: SearchMatch[] = [];

	const filesToSearch = [
		TEKMEMO_PATHS.coreMemory,
		TEKMEMO_PATHS.notesMemory,
		TEKMEMO_PATHS.conversations,
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
		const content = await options.fs.readTextIfExists(file);
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
