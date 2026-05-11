import type { TekMemoFileSystem } from "../fs/tekmemo-fs";
import type { CliOutput } from "../output/output";
import { TEKMEMO_PATHS } from "../protocol/constants";
import { parseJsonl } from "../protocol/jsonl";

export interface ChunksCommandOptions {
	fs: TekMemoFileSystem;
	output: CliOutput;
	json?: boolean | undefined;
	limit?: number | undefined;
	strict?: boolean | undefined;
}

export async function runChunksCommand(
	options: ChunksCommandOptions,
): Promise<number> {
	const content = await options.fs.readTextIfExists(TEKMEMO_PATHS.chunks);
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
