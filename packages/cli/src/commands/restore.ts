/**
 * CLI command handler for restoring an archived memory.
 *
 * @module restore
 */

import type { MemoFS } from "@memofs/core";
import type { CliOutput } from "../output/output";
import { printJsonEnvelope } from "../output/output";

/**
 * Options configuration for the restore command.
 */
export interface RestoreCommandOptions {
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
	 * The memory id to restore from `.memofs/archive/<id>.json`.
	 */
	id: string;
}

/**
 * Runs the `memofs restore <id>` command, reversing an archive move:
 * reads `.memofs/archive/<id>.json`, writes the note block back to
 * `notes.md`, transitions the bound graph nodes from `archived` to
 * `active`, deletes the archive file, and appends a `memory.restored`
 * event.
 *
 * @param options - Command configuration options.
 * @returns CLI exit code.
 */
export async function runRestoreCommand(
	options: RestoreCommandOptions,
): Promise<number> {
	const spinner = options.output.spinner({ json: options.json });
	spinner.start(`Restoring memory ${options.id}...`);

	try {
		const result = await options.memo.restoreMemory(options.id);

		spinner.stop();

		if (options.json) {
			printJsonEnvelope(options.output, "restore", result);
		} else if (result.restored) {
			options.output.success(
				`Restored memory ${result.id} — ${result.nodesRestored} graph node(s) reactivated.`,
			);
		} else {
			options.output.write(
				`No archive file found for memory ${options.id} — nothing to restore.`,
			);
		}

		return 0;
	} catch (error) {
		spinner.fail("Restore encountered an unexpected error");
		throw error;
	}
}
