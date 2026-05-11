import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runTekMemoCli } from "@tekmemo/cli";

const cwd = await mkdtemp(join(tmpdir(), "tekmemo-cli-"));

try {
	await runTekMemoCli({
		cwd,
		argv: ["init", "--no-input", "--project-id", "cli-example"],
	});
	await runTekMemoCli({
		cwd,
		argv: [
			"remember",
			"Use TekMemo CLI for agent-readable memory.",
			"--kind",
			"decision",
			"--tag",
			"cli",
		],
	});
	const result = await runTekMemoCli({
		cwd,
		argv: ["context", "--query", "agent memory", "--json"],
	});

	console.log(result.stdout.join("\n"));
	if (result.exitCode !== 0) process.exitCode = result.exitCode;
} finally {
	await rm(cwd, { recursive: true, force: true });
}
