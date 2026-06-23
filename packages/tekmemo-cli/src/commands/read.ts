/**
 * CLI command handler for reading local memory files (core, notes, manifest).
 *
 * @module read
 */

import type { Tekmemo } from "@tekbreed/tekmemo";
import { readTextIfExists } from "../cli/store-helpers";
import type { CliOutput } from "../output/output";
import { printJsonEnvelope } from "../output/output";
import { TEKMEMO_PATHS } from "../protocol/constants";

/**
 * Options configuration for the read command.
 */
export interface ReadCommandOptions {
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
	 * The memory file to target: 'core', 'notes', or 'manifest'.
	 */
	target: "core" | "notes" | "manifest";
}

/**
 * Internal mapping of targets to their respective workspace file paths.
 */
const TARGET_PATHS = {
	core: TEKMEMO_PATHS.coreMemory,
	notes: TEKMEMO_PATHS.notesMemory,
	manifest: TEKMEMO_PATHS.manifest,
} as const;

/**
 * Runs the read command, printing the content of the targeted memory file.
 *
 * @param options - Command configuration options.
 * @returns CLI exit code.
 */
export async function runReadCommand(
	options: ReadCommandOptions,
): Promise<number> {
	const path = TARGET_PATHS[options.target];
	const content =
		options.target === "core"
			? await options.memo.core.read().catch(() => undefined)
			: options.target === "notes"
				? await options.memo.notes.read().catch(() => undefined)
				: await readTextIfExists(options.memo.store, path);
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
