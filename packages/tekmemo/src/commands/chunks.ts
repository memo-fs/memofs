/**
 * CLI command handler for viewing workspace memory chunks.
 *
 * @module chunks
 */

import type { Tekmemo } from "@tekmemo/core";
import { readTextIfExists } from "../cli/store-helpers";
import type { CliOutput } from "../output/output";
import { TEKMEMO_PATHS } from "../protocol/constants";
import { parseJsonl } from "../protocol/jsonl";

/**
 * Options configuration for the chunks command.
 */
export interface ChunksCommandOptions {
	/**
	 * The Tekmemo client instance.
	 */
	memo: Tekmemo;
	/**
	 * The CLI output console wrapper.
	 */
	output: CliOutput;
	/**
	 * If true, outputs results in structured JSON format.
	 */
	json?: boolean | undefined;
	/**
	 * Maximum number of chunk records to display.
	 */
	limit?: number | undefined;
	/**
	 * If true, throws errors on malformed lines during JSONL parsing.
	 */
	strict?: boolean | undefined;
}

/**
 * Runs the chunks command, listing memory chunk index entries.
 *
 * @param options - Command configuration options.
 * @returns CLI exit code.
 */
export async function runChunksCommand(
	options: ChunksCommandOptions,
): Promise<number> {
	const content = await readTextIfExists(
		options.memo.store,
		TEKMEMO_PATHS.chunks,
	);
	const records = content
		? parseJsonl(content, { strict: options.strict ?? false })
		: [];
	const selected =
		options.limit && options.limit > 0
			? records.slice(-options.limit)
			: records;

	if (options.json) {
		options.output.write(JSON.stringify(selected, null, 2));
		return 0;
	}

	if (selected.length === 0) {
		options.output.write("No chunk records found.");
		return 0;
	}

	options.output.write(
		selected
			.map((record) => {
				const id =
					typeof record.value.id === "string"
						? record.value.id
						: typeof record.value.chunkId === "string"
							? record.value.chunkId
							: `line ${record.line}`;
				const source =
					typeof record.value.sourcePath === "string"
						? record.value.sourcePath
						: "unknown source";
				const status =
					typeof record.value.status === "string"
						? record.value.status
						: typeof record.value.indexStatus === "string"
							? record.value.indexStatus
							: "unknown";
				return `${id} ${status} ${source}`;
			})
			.join("\n"),
	);

	return 0;
}
