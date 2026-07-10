#!/usr/bin/env node
/**
 * Executable entry point for the MemoFS CLI tool.
 *
 * @module memofs-bin
 */

import { runMemoFsCli } from "../runner";

/**
 * Main execution function parsing process arguments, invoking CLI runner, and formatting stdout/stderr.
 */
async function main() {
	const result = await runMemoFsCli({
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
