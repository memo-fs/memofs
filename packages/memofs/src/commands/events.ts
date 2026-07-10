/**
 * CLI command handler for viewing workspace memory event logs.
 *
 * @module events
 */

import type { MemoFS } from "@memofs/core";
import { readTextIfExists } from "../cli/store-helpers";
import type { CliOutput } from "../output/output";
import { MEMOFS_CLI_PATHS } from "../protocol/constants";
import { parseJsonl } from "../protocol/jsonl";

/**
 * Options configuration for the events command.
 */
export interface EventsCommandOptions {
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
	 * Maximum number of event records to display.
	 */
	limit?: number | undefined;
	/**
	 * If true, throws errors on malformed lines during JSONL parsing.
	 */
	strict?: boolean | undefined;
}

/**
 * Runs the events command, displaying chronological memory log entries.
 *
 * @param options - Command configuration options.
 * @returns CLI exit code.
 */
export async function runEventsCommand(
	options: EventsCommandOptions,
): Promise<number> {
	const content = await readTextIfExists(
		options.memo.store,
		MEMOFS_CLI_PATHS.memoryEvents,
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
		options.output.write("No memory events found.");
		return 0;
	}

	options.output.write(
		selected
			.map((record) => {
				const type =
					typeof record.value.type === "string" ? record.value.type : "unknown";
				const at =
					typeof record.value.timestamp === "string"
						? record.value.timestamp
						: `line ${record.line}`;
				const summary =
					typeof record.value.summary === "string"
						? ` — ${record.value.summary}`
						: "";
				return `${at} ${type}${summary}`;
			})
			.join("\n"),
	);

	return 0;
}
