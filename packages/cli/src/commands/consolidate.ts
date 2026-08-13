/**
 * CLI command handler for memory consolidation.
 *
 * @module consolidate
 */

import type { MemoFS } from "@memofs/core";
import type { CliOutput } from "../output/output";
import { printJsonEnvelope } from "../output/output";

/**
 * Options configuration for the consolidate command.
 */
export interface ConsolidateCommandOptions {
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
	 * If true, physically moves deprecated memories to
	 * `.memofs/archive/<id>.json` after the consolidation pass.
	 */
	archiveDeprecated?: boolean | undefined;
}

/**
 * Runs the `memofs consolidate` command, merging duplicate graph
 * nodes and retiring superseded facts. When `--archive-deprecated`
 * is set, deprecated memories are physically moved to
 * `.memofs/archive/<id>.json` (cold archive) after consolidation.
 *
 * @param options - Command configuration options.
 * @returns CLI exit code.
 */
export async function runConsolidateCommand(
	options: ConsolidateCommandOptions,
): Promise<number> {
	const spinner = options.output.spinner({ json: options.json });
	spinner.start("Consolidating memory graph...");

	try {
		const consolidateResult = await options.memo.consolidate({ apply: true });

		const archiveResult =
			options.archiveDeprecated === true
				? await options.memo.archiveDeprecated()
				: null;

		spinner.stop();

		if (options.json) {
			printJsonEnvelope(options.output, "consolidate", {
				consolidate: consolidateResult,
				...(archiveResult !== null ? { archive: archiveResult } : {}),
			});
		} else {
			const parts = [
				`Merges: ${consolidateResult.mergesApplied}`,
				`Retirements: ${consolidateResult.retirementsApplied}`,
			];
			if (archiveResult !== null) {
				parts.push(`Archived: ${archiveResult.archived}`);
				parts.push(`Nodes archived: ${archiveResult.nodesArchived}`);
				if (archiveResult.archivedIds.length > 0) {
					parts.push(`Archived IDs: ${archiveResult.archivedIds.join(", ")}`);
				}
			}
			const summary = parts.join(" — ");
			if (
				consolidateResult.mergesApplied === 0 &&
				consolidateResult.retirementsApplied === 0 &&
				(archiveResult === null || archiveResult.archived === 0)
			) {
				options.output.write(summary);
			} else {
				options.output.success(summary);
			}
		}

		return 0;
	} catch (error) {
		spinner.fail("Consolidate encountered an unexpected error");
		throw error;
	}
}
