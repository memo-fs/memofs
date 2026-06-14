import type { TekMemoFileSystem } from "../fs/tekmemo-fs";
import type { CliOutput } from "../output/output";
import { printJsonEnvelope } from "../output/output";
import { TEKMEMO_PATHS } from "../protocol/constants";

export interface ReadCommandOptions {
	fs: TekMemoFileSystem;
	output: CliOutput;
	json?: boolean | undefined;
	target: "core" | "notes" | "manifest";
}

const TARGET_PATHS = {
	core: TEKMEMO_PATHS.coreMemory,
	notes: TEKMEMO_PATHS.notesMemory,
	manifest: TEKMEMO_PATHS.manifest,
} as const;

export async function runReadCommand(
	options: ReadCommandOptions,
): Promise<number> {
	const path = TARGET_PATHS[options.target];
	const content = await options.fs.readTextIfExists(path);
	if (content === undefined) {
		options.output.error(`${path} does not exist. Run tekmemo init first.`);
		return 1;
	}
	if (options.json)
		printJsonEnvelope(options.output, "read", {
			target: options.target,
			path,
			content,
		});
	else options.output.write(content.trimEnd());
	return 0;
}
