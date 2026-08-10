/**
 * CLI command handler for backfilling `AnchorRef` onto existing memory records.
 *
 * @module migrate
 */

import type { MemoFS } from "@memofs/core";
import type { CliOutput } from "../output/output";
import { printJsonEnvelope } from "../output/output";

/**
 * Options configuration for the migrate anchors command.
 */
export interface MigrateAnchorsCommandOptions {
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
}

/**
 * Runs the `memofs migrate anchors` command, backfilling `AnchorRef`
 * onto existing `notes.md` entries by detecting file-path references
 * in each note's content.
 *
 * @param options - Command configuration options.
 * @returns CLI exit code.
 */
export async function runMigrateAnchorsCommand(
	options: MigrateAnchorsCommandOptions,
): Promise<number> {
	const spinner = options.output.spinner({ json: options.json });
	spinner.start("Backfilling code anchors onto existing memories...");

	try {
		const result = await options.memo.migrateAnchors();

		spinner.stop();

		if (options.json) {
			printJsonEnvelope(options.output, "migrate.anchors", result);
		} else {
			const summary = [
				`Scanned ${result.scanned} note(s)`,
				`Anchored ${result.anchored}`,
				`Skipped (already anchored) ${result.skipped}`,
				`No file reference found ${result.noRef}`,
			].join(" — ");
			if (result.anchored > 0) {
				options.output.success(summary);
			} else if (result.skipped > 0) {
				options.output.success(
					`${summary}\nAll anchorable memories already carry an anchor — idempotent no-op.`,
				);
			} else {
				options.output.write(summary);
			}
		}

		return 0;
	} catch (error) {
		spinner.fail("Migrate anchors encountered an unexpected error");
		throw error;
	}
}
