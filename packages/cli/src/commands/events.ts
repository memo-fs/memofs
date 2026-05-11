import type { TekMemoFileSystem } from "../fs/tekmemo-fs";
import type { CliOutput } from "../output/output";
import { TEKMEMO_PATHS } from "../protocol/constants";
import { parseJsonl } from "../protocol/jsonl";

export interface EventsCommandOptions {
	fs: TekMemoFileSystem;
	output: CliOutput;
	json?: boolean | undefined;
	limit?: number | undefined;
	strict?: boolean | undefined;
}

export async function runEventsCommand(
	options: EventsCommandOptions,
): Promise<number> {
	const content = await options.fs.readTextIfExists(TEKMEMO_PATHS.memoryEvents);
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
