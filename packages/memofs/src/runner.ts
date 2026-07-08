/**
 * CLI runner orchestrating options parsing, command registration, and execution via Commander.
 *
 * @module runner
 */

import type { MemoFS } from "@memofs/core";
import { Command, CommanderError } from "commander";
import pkg from "../package.json" with { type: "json" };
import { createMemoFSFromCli } from "./cli/memofs";
import { CliError } from "./errors/cli-errors";
import {
	type CliOutput,
	createBufferedOutput,
	printJsonError,
} from "./output/output";
import { registerAllCommands } from "./runner/register";
import { parseNonNegativeInteger, parsePositiveInteger } from "./utils/numbers";

/**
 * Commander-compatible option parser for positive integers.
 * Commander's `option()` generic overload matches `(value: string, previous: T) => T`.
 * These wrappers satisfy that signature while delegating to the core parsers.
 */
function parsePositiveOption(value: string, _previous: number): number {
	return parsePositiveInteger(value);
}

function parseNonNegativeOption(value: string, _previous: number): number {
	return parseNonNegativeInteger(value);
}

/**
 * Input configuration variables for invoking the CLI runner programmatically.
 */
export interface RunMemoFSCliInput {
	argv: string[];
	cwd?: string;
	output?: CliOutput;
	verbose?: boolean;
	quiet?: boolean;
	noColor?: boolean;
	stdinContent?: string;
}

/**
 * Results returned by running the CLI runner.
 */
export interface RunMemoFSCliResult {
	exitCode: number;
	stdout: string[];
	stderr: string[];
}

function createMemo(
	root: string,
	opts: {
		runtime?: string;
		cloudUrl?: string;
		apiKey?: string;
		workspaceId?: string;
		projectId?: string;
		timeoutMs?: number;
		readPolicy?: string;
		writePolicy?: string;
	},
): MemoFS {
	return createMemoFSFromCli({
		root,
		...opts,
	});
}

export async function runMemoFsCli(
	input: RunMemoFSCliInput,
): Promise<RunMemoFSCliResult> {
	const output =
		input.output ??
		createBufferedOutput(
			input.noColor === undefined ? undefined : { noColor: input.noColor },
		);
	let exitCode = 0;
	let currentCommand = "memofs";
	let wantsJson = input.argv.includes("--json") || input.argv.includes("-j");
	let activeMemo: MemoFS | undefined;

	const program = new Command();
	program
		.name("memofs")
		.description("CLI for MemoFS")
		.version(pkg.version)
		.option(
			"-r, --root <path>",
			"project root containing .memofs/",
			input.cwd ?? process.cwd(),
		)
		.option("--runtime <mode>", "runtime mode: local, hybrid, or memory")
		.option("--cloud-url <url>", "MemoFS Cloud API URL")
		.option("--api-key <key>", "MemoFS Cloud API key")
		.option("--workspace-id <id>", "default cloud workspace ID")
		.option("--project-id <id>", "default cloud project ID")
		.option(
			"--timeout-ms <n>",
			"cloud request timeout in milliseconds",
			parsePositiveOption,
		)
		.option("--read-policy <policy>", "hybrid read policy")
		.option("--write-policy <policy>", "hybrid write policy")
		.option("-j, --json", "output machine-readable JSON", false)
		.option("-v, --verbose", "show detailed output", input.verbose ?? false)
		.option(
			"-q, --quiet",
			"suppress all output except errors",
			input.quiet ?? false,
		)
		.option("--no-color", "disable colored output", input.noColor ?? false)
		.exitOverride()
		.showHelpAfterError()
		.configureOutput({
			writeOut: (str) => {
				if (!program.opts().quiet) output.write(str.trim());
			},
			writeErr: (str) => output.error(str.trim()),
			getOutHelpWidth: () => 100,
			getErrHelpWidth: () => 100,
		});

	async function globals(): Promise<{
		root: string;
		json: boolean;
		verbose: boolean;
		quiet: boolean;
		memo: MemoFS;
	}> {
		const opts = program.opts() as {
			root?: string;
			json?: boolean;
			verbose?: boolean;
			quiet?: boolean;
			runtime?: string;
			cloudUrl?: string;
			apiKey?: string;
			workspaceId?: string;
			projectId?: string;
			timeoutMs?: number;
			readPolicy?: string;
			writePolicy?: string;
		};
		wantsJson = Boolean(opts.json);
		const root = opts.root ?? input.cwd ?? process.cwd();
		const memo = createMemo(root, {
			runtime: opts.runtime,
			cloudUrl: opts.cloudUrl,
			apiKey: opts.apiKey,
			workspaceId: opts.workspaceId,
			projectId: opts.projectId,
			timeoutMs: opts.timeoutMs,
			readPolicy: opts.readPolicy,
			writePolicy: opts.writePolicy,
		});
		activeMemo = memo;
		return {
			root,
			json: Boolean(opts.json),
			verbose: Boolean(opts.verbose),
			quiet: Boolean(opts.quiet),
			memo,
		};
	}

	registerAllCommands(program, {
		globals,
		setExitCode: (code) => {
			exitCode = code;
		},
		setCurrentCommand: (cmd) => {
			currentCommand = cmd;
		},
		output,
		stdinContent: input.stdinContent,
		cwd: input.cwd,
		parsePositiveOption,
		parseNonNegativeOption,
	});

	try {
		const args = normalizeArgv(input.argv);
		await program.parseAsync(args);
		return { exitCode, stdout: output.stdout, stderr: output.stderr };
	} catch (error) {
		if (error instanceof CliError) {
			exitCode = error.exitCode;
			if (wantsJson)
				printJsonError(output, currentCommand, error.code, error.message);
			else output.error(error.message);
		} else if (isCommanderError(error)) {
			exitCode = typeof error.exitCode === "number" ? error.exitCode : 1;
		} else {
			exitCode = 1;
			const message = error instanceof Error ? error.message : String(error);
			if (wantsJson)
				printJsonError(output, currentCommand, "CLI_UNEXPECTED_ERROR", message);
			else output.error(message);
		}
		return { exitCode, stdout: output.stdout, stderr: output.stderr };
	} finally {
		const store = activeMemo?.store as
			| { dispose?: () => Promise<void> }
			| undefined;
		await store?.dispose?.();
		activeMemo = undefined;
	}
}

function normalizeArgv(argv: string[]): string[] {
	if (
		argv.length > 0 &&
		!argv[0]?.endsWith("node") &&
		!argv[0]?.includes("/") &&
		argv[0] !== "memofs"
	) {
		return ["node", "memofs", ...argv];
	}
	if (argv[0] === "memofs") return ["node", ...argv];
	return [...argv];
}

function isCommanderError(error: unknown): error is CommanderError {
	return error instanceof CommanderError;
}
