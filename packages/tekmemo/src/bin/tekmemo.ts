#!/usr/bin/env node
/**
 * Executable entry point for the TekMemo CLI tool.
 *
 * @module tekmemo-bin
 */

import { runTekMemoCli } from "../runner";

/**
 * Main execution function parsing process arguments, invoking CLI runner, and formatting stdout/stderr.
 */
async function main() {
	const result = await runTekMemoCli({
		argv: process.argv.slice(2),
		cwd: process.cwd(),
	});

	for (const line of result.stdout) {
		console.log(line);
	}

	for (const line of result.stderr) {
		console.error(line);
	}

	process.exitCode = result.exitCode;
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
