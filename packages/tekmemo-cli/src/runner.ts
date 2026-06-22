/**
 * CLI runner orchestrating options parsing, command registration, and execution via Commander.
 *
 * @module runner
 */

import type { Tekmemo } from "@tekbreed/tekmemo";
import { Command, CommanderError } from "commander";
import pkg from "../package.json" with { type: "json" };
import { createTekmemoFromCli } from "./cli/tekmemo";
import {
	runAgentCompleteCommand,
	runAgentExtractCommand,
	runAgentPathsCommand,
	runAgentStartCommand,
	runChunksCommand,
	runCloudHealthCommand,
	runCloudReadinessCommand,
	runCloudSyncPullCommand,
	runCloudSyncPushCommand,
	runCloudSyncStatusCommand,
	runConnectorsAddCommand,
	runConnectorsListCommand,
	runConnectorsRemoveCommand,
	runConnectorsRunCommand,
	runContextCommand,
	runDiffCommand,
	runDoctorCommand,
	runEventsCommand,
	runGenerateAgentRulesCommand,
	runInitCommand,
	runInspectCommand,
	runReadCommand,
	runRememberCommand,
	runSearchCommand,
	runSnapshotCommand,
	runValidateCommand,
} from "./commands";
import type { TekMemoConfigFile } from "./config";
import { configSchemaUrl, writeDefaultCliConfig } from "./config";
import { CliError, CliUsageError } from "./errors/cli-errors";
import {
	type CliOutput,
	createBufferedOutput,
	printJsonEnvelope,
	printJsonError,
} from "./output/output";
import { parseNonNegativeInteger, parsePositiveInteger } from "./utils/numbers";

/**
 * Helper constant mapping positive integer parser.
 */
const parsePositiveOption = parsePositiveInteger as unknown as (
	value: string,
	previous: string | undefined,
) => string;

/**
 * Helper constant mapping non-negative integer parser.
 */
const parseNonNegativeOption = parseNonNegativeInteger as unknown as (
	value: string,
	previous: string | undefined,
) => string;

/**
 * Input configuration variables for invoking the CLI runner programmatically.
 */
export interface RunTekMemoCliInput {
	/**
	 * Raw command line arguments (e.g. process.argv.slice(2)).
	 */
	argv: string[];
	/**
	 * Current working directory to resolve relative paths from.
	 */
	cwd?: string;
	/**
	 * Custom CLI output console wrapper.
	 */
	output?: CliOutput;
	/**
	 * If true, enables verbose debugging output.
	 */
	verbose?: boolean;
	/**
	 * If true, silences non-error messages.
	 */
	quiet?: boolean;
	/**
	 * If true, disables ANSI colored text formats in stdout/stderr.
	 */
	noColor?: boolean;
	/**
	 * Optional prefetched stdin content, if available.
	 */
	stdinContent?: string;
}

/**
 * Results returned by running the CLI runner.
 */
export interface RunTekMemoCliResult {
	/**
	 * Exit code status (0 for success, non-zero for failures).
	 */
	exitCode: number;
	/**
	 * Array of lines captured from standard output.
	 */
	stdout: string[];
	/**
	 * Array of lines captured from standard error.
	 */
	stderr: string[];
}

/**
 * Instantiates a Tekmemo client from CLI flags and environment.
 *
 * @param root - Absolute path to workspace root.
 * @param opts - CLI option flags.
 * @returns Instantiated Tekmemo client.
 */
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
): Tekmemo {
	return createTekmemoFromCli({
		root,
		...opts,
	});
}

/**
 * Parses parameters and executes command line instructions.
 *
 * @param input - Setup inputs including command line argument vectors.
 * @returns Executed command results stdout, stderr and exit code.
 */
export async function runTekMemoCli(
	input: RunTekMemoCliInput,
): Promise<RunTekMemoCliResult> {
	const output =
		input.output ??
		createBufferedOutput(
			input.noColor === undefined ? undefined : { noColor: input.noColor },
		);
	let exitCode = 0;
	let currentCommand = "tekmemo";
	let wantsJson = input.argv.includes("--json") || input.argv.includes("-j");

	// Tracks the Tekmemo instance constructed per command action so we can
	// release its underlying store (and the Q28 advisory lock) when the CLI
	// invocation finishes. The local single-writer contract (Q28) holds the
	// `.tekmemo/.lock` for the lifetime of a process; disposing here lets a
	// subsequent CLI call — or a direct Tekmemo on the same root — acquire it.
	let activeMemo: Tekmemo | undefined;

	const program = new Command();
	program
		.name("tekmemo")
		.description(
			"CLI for TekMemo .tekmemo/ memory, context, validation, snapshots, and agent tools.",
		)
		.version(pkg.version)
		.option(
			"-r, --root <path>",
			"project root containing .tekmemo/",
			input.cwd ?? process.cwd(),
		)
		.option("--runtime <mode>", "runtime mode: local, hybrid, or memory")
		.option(
			"--cloud-url <url>",
			"TekMemo Cloud API URL; defaults to config or TEKMEMO_CLOUD_URL",
		)
		.option(
			"--api-key <key>",
			"TekMemo Cloud API key; defaults to TEKMEMO_API_KEY",
		)
		.option("--workspace-id <id>", "default cloud workspace ID")
		.option("--project-id <id>", "default cloud project ID")
		.option(
			"--timeout-ms <n>",
			"cloud request timeout in milliseconds",
			parsePositiveOption,
		)
		.option(
			"--read-policy <policy>",
			"hybrid read policy: local-first, cloud-first, or local-only",
		)
		.option(
			"--write-policy <policy>",
			"hybrid write policy: local-first, cloud-first, or local-only",
		)
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
		memo: Tekmemo;
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

	program
		.command("init")
		.description("initialize canonical .tekmemo/ files")
		.option("-f, --force", "overwrite existing seed files", false)
		.option("-p, --project-id <id>", "explicit project ID")
		.option("--no-input", "skip interactive prompts", false)
		.action(async (options) => {
			currentCommand = "init";
			const g = await globals();
			exitCode = await runInitCommand({
				memo: g.memo,
				output,
				json: g.json,
				force: options.force,
				projectId: options.projectId,
				noInput: options.noInput ?? !process.stdout.isTTY,
			});
		});

	program
		.command("inspect")
		.description("summarize local TekMemo memory state")
		.action(async () => {
			currentCommand = "inspect";
			const g = await globals();
			exitCode = await runInspectCommand({
				memo: g.memo,
				output,
				json: g.json,
			});
		});

	program
		.command("context")
		.description("pack project memory into an agent-friendly context block")
		.option("-q, --query <query>", "prioritize lines matching a task/query")
		.option(
			"--max-chars <n>",
			"maximum output characters",
			parsePositiveOption,
			12000 as unknown as string,
		)
		.option("--include-events", "include recent memory events", false)
		.option("--include-chunks", "include recent chunk records", false)
		.action(async (options) => {
			currentCommand = "context";
			const g = await globals();
			exitCode = await runContextCommand({
				memo: g.memo,
				output,
				json: g.json,
				query: options.query,
				maxChars: options.maxChars,
				includeEvents: options.includeEvents,
				includeChunks: options.includeChunks,
			});
		});

	program
		.command("remember")
		.description("store a durable note for humans or coding agents")
		.argument("[content]", "memory content")
		.option("--stdin", "read memory content from stdin", false)
		.option(
			"--file <path>",
			"read memory content from a file inside the selected root",
		)
		.option(
			"-k, --kind <kind>",
			"decision | constraint | goal | preference | reference | summary | note",
			"note",
		)
		.option("--title <title>", "optional note title")
		.option("-t, --tag <tag>", "tag to attach; repeatable", collect, [])
		.option("--confidence <n>", "confidence from 0 to 1")
		.option("--source <source>", "source identifier, file, URL, or agent name")
		.option(
			"--actor <actor>",
			"actor type or type:id, e.g. agent:claude-code",
			"user",
		)
		.option("--metadata-json <json>", "metadata JSON object")
		.option(
			"--allow-secrets",
			"allow content that looks like a secret after manual review",
			false,
		)
		.action(async (content, options) => {
			currentCommand = "remember";
			const g = await globals();
			exitCode = await runRememberCommand({
				memo: g.memo,
				output,
				json: g.json,
				content,
				stdin: options.stdin,
				file: options.file,
				stdinContent: input.stdinContent,
				kind: options.kind,
				title: options.title,
				tags: options.tag,
				confidence: options.confidence,
				source: options.source,
				actor: options.actor,
				metadata: options.metadataJson,
				allowSecrets: options.allowSecrets,
			});
		});

	program
		.command("read")
		.description("read a canonical memory document")
		.argument("<target>", "core | notes | manifest")
		.action(async (target) => {
			currentCommand = "read";
			const g = await globals();
			if (target !== "core" && target !== "notes" && target !== "manifest") {
				output.error("read target must be core, notes, or manifest");
				exitCode = 1;
				return;
			}
			exitCode = await runReadCommand({
				memo: g.memo,
				output,
				json: g.json,
				target,
			});
		});

	program
		.command("events")
		.description("read memory event log")
		.option(
			"-l, --limit <n>",
			"limit number of events",
			parseNonNegativeOption,
			0 as unknown as string,
		)
		.option("-s, --strict", "strict protocol validation", false)
		.action(async (options) => {
			currentCommand = "events";
			const g = await globals();
			exitCode = await runEventsCommand({
				memo: g.memo,
				output,
				json: g.json,
				limit: options.limit,
				strict: options.strict,
			});
		});

	program
		.command("chunks")
		.description("read local chunk index")
		.option(
			"-l, --limit <n>",
			"limit number of chunks",
			parseNonNegativeOption,
			0 as unknown as string,
		)
		.option("-s, --strict", "strict protocol validation", false)
		.action(async (options) => {
			currentCommand = "chunks";
			const g = await globals();
			exitCode = await runChunksCommand({
				memo: g.memo,
				output,
				json: g.json,
				limit: options.limit,
				strict: options.strict,
			});
		});

	program
		.command("snapshot")
		.description("create local memory snapshot bundle")
		.option("-l, --label <name>", "snapshot label", "manual")
		.action(async (options) => {
			currentCommand = "snapshot";
			const g = await globals();
			exitCode = await runSnapshotCommand({
				memo: g.memo,
				output,
				json: g.json,
				label: options.label,
			});
		});

	program
		.command("doctor")
		.description("find missing or corrupt memory files")
		.option("-s, --strict", "strict protocol validation", false)
		.action(async (options) => {
			currentCommand = "doctor";
			const g = await globals();
			exitCode = await runDoctorCommand({
				memo: g.memo,
				output,
				json: g.json,
				strict: options.strict,
			});
		});

	program
		.command("validate")
		.description("strict protocol validation for CI")
		.action(async () => {
			currentCommand = "validate";
			const g = await globals();
			exitCode = await runValidateCommand({
				memo: g.memo,
				output,
				json: g.json,
			});
		});

	program
		.command("search")
		.description("search memory files for a query")
		.argument("<query>", "text to search for")
		.option("-e, --regex", "treat query as a regular expression", false)
		.action(async (query, options) => {
			currentCommand = "search";
			const g = await globals();
			exitCode = await runSearchCommand({
				memo: g.memo,
				output,
				json: g.json,
				query,
				regex: options.regex,
			});
		});

	program
		.command("diff")
		.description("compare two memory snapshots by ID or label")
		.argument("<labelA>", "first snapshot ID or label")
		.argument("<labelB>", "second snapshot ID or label")
		.action(async (labelA, labelB) => {
			currentCommand = "diff";
			const g = await globals();
			exitCode = await runDiffCommand({
				memo: g.memo,
				output,
				json: g.json,
				labelA,
				labelB,
			});
		});

	const generate = program
		.command("generate")
		.description(
			"generate agent instruction files that enforce the TekMemo workflow",
		);

	generate
		.command("agent-rules")
		.description(
			"emit a TekMemo-enforcing instructions file for an agent platform",
		)
		.argument(
			"[target]",
			"agents | claude | gemini | copilot | cursor (omit with --list)",
		)
		.option("--project-name <name>", "project name in the header")
		.option("-f, --force", "overwrite an existing instructions file", false)
		.option(
			"--list",
			"list supported targets and their MCP config locations",
			false,
		)
		.action(async (target, options) => {
			currentCommand = "generate.agent-rules";
			const g = await globals();
			exitCode = await runGenerateAgentRulesCommand({
				memo: g.memo,
				output,
				json: g.json,
				target,
				projectName: options.projectName,
				force: options.force,
				list: options.list,
			});
		});

	const agent = program
		.command("agent")
		.description("manage AgentFS-backed TekMemo coding sessions");

	agent
		.command("start")
		.description(
			"start an AgentFS-style workspace for Codex, Claude Code, or another coding agent",
		)
		.requiredOption("--task <task>", "agent task or brief")
		.option("--project <id>", "project ID")
		.option("--actor <id>", "actor ID, e.g. assistant:codex")
		.option("--session <id>", "explicit safe session ID")
		.action(async (options) => {
			currentCommand = "agent.start";
			const g = await globals();
			exitCode = await runAgentStartCommand({
				memo: g.memo,
				output,
				json: g.json,
				task: options.task,
				projectId: options.project ?? g.memo.projectId,
				actorId: options.actor,
				sessionId: options.session,
			});
		});

	agent
		.command("paths")
		.description("print paths for the latest or selected agent session")
		.option("--session <id>", "session ID or latest", "latest")
		.action(async (options) => {
			currentCommand = "agent.paths";
			const g = await globals();
			exitCode = await runAgentPathsCommand({
				memo: g.memo,
				output,
				json: g.json,
				session: options.session,
			});
		});

	agent
		.command("extract")
		.description(
			"extract summary, durable memory, and follow-ups from an agent session",
		)
		.option("--session <id>", "session ID or latest", "latest")
		.action(async (options) => {
			currentCommand = "agent.extract";
			const g = await globals();
			exitCode = await runAgentExtractCommand({
				memo: g.memo,
				output,
				json: g.json,
				session: options.session,
			});
		});

	agent
		.command("complete")
		.description(
			"complete an agent session and optionally persist durable memory",
		)
		.option("--session <id>", "session ID or latest", "latest")
		.option(
			"--extract",
			"append output/durable-memory.md to TekMemo notes",
			false,
		)
		.option("--checkpoint-label <label>", "checkpoint label")
		.action(async (options) => {
			currentCommand = "agent.complete";
			const g = await globals();
			exitCode = await runAgentCompleteCommand({
				memo: g.memo,
				output,
				json: g.json,
				session: options.session,
				extract: options.extract,
				checkpointLabel: options.checkpointLabel,
			});
		});

	const connectors = program
		.command("connectors")
		.description(
			"manage local connectors: add, remove, list, run ingestion into .tekmemo/",
		);

	connectors
		.command("list")
		.description("list configured connectors from .tekmemo/connectors.json")
		.action(async () => {
			currentCommand = "connectors.list";
			const g = await globals();
			exitCode = await runConnectorsListCommand({
				memo: g.memo,
				output,
				json: g.json,
			});
		});

	connectors
		.command("add")
		.description(
			"add a connector row to .tekmemo/connectors.json (never the token — use --secret-ref)",
		)
		.requiredOption("--type <type>", "connector type (github, notion, ...)")
		.requiredOption(
			"--secret-ref <ref>",
			"opaque pointer to a token stored server-side (ADR 0002); never the token itself",
		)
		.option("--id <id>", "connector id (defaults to <type> or <type>-<n>)")
		.option("--schedule <schedule>", "schedule hint (not enforced in v1)")
		.option(
			"--source-mapping <json>",
			'source-specific config as JSON, e.g. \'{"repository":"owner/repo"}\'',
		)
		.option("--disabled", "add the connector in disabled state", false)
		.action(async (options) => {
			currentCommand = "connectors.add";
			const g = await globals();
			exitCode = await runConnectorsAddCommand({
				memo: g.memo,
				output,
				json: g.json,
				type: options.type,
				secretRef: options.secretRef,
				...(options.id === undefined ? {} : { id: options.id }),
				...(options.schedule === undefined
					? {}
					: { schedule: options.schedule }),
				...(options.sourceMapping === undefined
					? {}
					: { sourceMapping: options.sourceMapping }),
				enabled: !options.disabled,
			});
		});

	connectors
		.command("remove")
		.description("remove a connector by id from .tekmemo/connectors.json")
		.argument("<id>", "connector id to remove")
		.action(async (id) => {
			currentCommand = "connectors.remove";
			const g = await globals();
			exitCode = await runConnectorsRemoveCommand({
				memo: g.memo,
				output,
				json: g.json,
				id,
			});
		});

	connectors
		.command("run")
		.description(
			"run enabled connectors, ingesting external sources into .tekmemo/ (secrets resolved at run time)",
		)
		.option("--type <type>", "run only connectors of this type")
		.action(async (options) => {
			currentCommand = "connectors.run";
			const g = await globals();
			exitCode = await runConnectorsRunCommand({
				memo: g.memo,
				output,
				json: g.json,
				...(options.type === undefined ? {} : { onlyType: options.type }),
			});
		});

	const cloud = program
		.command("cloud")
		.description(
			"use TekMemo Cloud file-replica sync through @tekbreed/tekmemo/cloud",
		);

	async function cloudGlobals() {
		const g = await globals();
		if (!g.memo.cloud) {
			throw new CliUsageError(
				"Cloud sync requires --cloud-url and --api-key or TEKMEMO_CLOUD_URL/TEKMEMO_API_KEY",
			);
		}
		return {
			...g,
			client: g.memo.cloud,
		};
	}

	cloud
		.command("health")
		.description("check TekMemo Cloud health")
		.action(async () => {
			currentCommand = "cloud.health";
			const g = await cloudGlobals();
			exitCode = await runCloudHealthCommand({
				output,
				json: g.json,
				client: g.client,
			});
		});

	cloud
		.command("readiness")
		.description("check TekMemo Cloud readiness")
		.action(async () => {
			currentCommand = "cloud.readiness";
			const g = await cloudGlobals();
			exitCode = await runCloudReadinessCommand({
				output,
				json: g.json,
				client: g.client,
			});
		});

	const sync = cloud
		.command("sync")
		.description("use TekMemo Cloud file-replica sync APIs");

	sync
		.command("status")
		.description("read cloud sync status (manifest, cursor, storage)")
		.action(async () => {
			currentCommand = "cloud.sync.status";
			const g = await cloudGlobals();
			exitCode = await runCloudSyncStatusCommand({
				output,
				json: g.json,
				client: g.client,
			});
		});

	sync
		.command("pull")
		.description("pull file replicas from the cloud")
		.option("--since <cursor>", "pull everything changed since this cursor")
		.action(async (options) => {
			currentCommand = "cloud.sync.pull";
			const g = await cloudGlobals();
			exitCode = await runCloudSyncPullCommand({
				output,
				json: g.json,
				rootDir: g.root,
				client: g.client,
				since: options.since,
			});
		});

	sync
		.command("push")
		.description(
			"push local .tekmemo/ file replicas to the cloud (two-phase push→complete)",
		)
		.option("--base-cursor <cursor>", "cursor the client last synced at")
		.action(async (options) => {
			currentCommand = "cloud.sync.push";
			const g = await cloudGlobals();
			exitCode = await runCloudSyncPushCommand({
				output,
				json: g.json,
				rootDir: g.root,
				stdinContent: input.stdinContent,
				client: g.client,
				baseCursor: options.baseCursor,
			});
		});

	const config = program
		.command("config")
		.description("inspect or create .tekmemo/config.json");

	config
		.command("get")
		.description("print resolved CLI configuration")
		.action(async () => {
			currentCommand = "config.get";
			const g = await globals();
			const safeConfig = {
				mode: g.memo.mode,
				projectId: g.memo.projectId,
				...(g.memo.workspaceId !== undefined
					? { workspaceId: g.memo.workspaceId }
					: {}),
				readPolicy: g.memo.readPolicy,
				writePolicy: g.memo.writePolicy,
				...(g.memo.cloud
					? { cloud: { configured: true } }
					: { cloud: { configured: false } }),
			};
			if (g.json) printJsonEnvelope(output, "config.get", safeConfig);
			else output.write(JSON.stringify(safeConfig, null, 2));
		});

	config
		.command("init")
		.description("create .tekmemo/config.json without storing secrets")
		.option("-f, --force", "overwrite existing config", false)
		.option(
			"--runtime <mode>",
			"runtime mode: local, hybrid, or memory",
			"local",
		)
		.option("--cloud-url <url>", "TekMemo Cloud API URL")
		.option("--workspace-id <id>", "cloud workspace ID")
		.option("--project-id <id>", "cloud project ID")
		.option("--read-policy <policy>", "hybrid read policy", "local-first")
		.option("--write-policy <policy>", "hybrid write policy", "local-first")
		.action(async (options) => {
			currentCommand = "config.init";
			const g = await globals();
			const result = await writeDefaultCliConfig({
				cwd: input.cwd ?? process.cwd(),
				root: g.root,
				force: options.force,
				config: {
					$schema: configSchemaUrl(pkg.version),
					runtime: options.runtime,
					root: ".",
					cloud: {
						...(options.cloudUrl ? { baseUrl: options.cloudUrl } : {}),
						...(options.workspaceId
							? { workspaceId: options.workspaceId }
							: {}),
						...(options.projectId ? { projectId: options.projectId } : {}),
					},
					hybrid: {
						readPolicy: options.readPolicy,
						writePolicy: options.writePolicy,
					},
				} satisfies TekMemoConfigFile,
			});
			if (g.json) printJsonEnvelope(output, "config.init", result);
			else if (result.created) output.success(`Created ${result.path}`);
			else if (result.overwritten) output.success(`Overwrote ${result.path}`);
			else
				output.warn(`${result.path} already exists. Use --force to overwrite.`);
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
		// Release the Q28 advisory lock held by this invocation's store so a
		// subsequent CLI call or a direct Tekmemo on the same root can acquire
		// it. `dispose` is only present on the concrete fs store (not the
		// MemoryStore contract), so it is optional here.
		const store = activeMemo?.store as
			| { dispose?: () => Promise<void> }
			| undefined;
		await store?.dispose?.();
		activeMemo = undefined;
	}
}

/**
 * Accumulates string options into an array for multi-value CLI flags.
 *
 * @param value - Newly parsed option string value.
 * @param previous - Cumulative array of parsed values.
 * @returns Updated array containing all parsed values.
 */
function collect(value: string, previous: string[]): string[] {
	previous.push(value);
	return previous;
}

/**
 * Normalizes command line arguments to ensure a valid node execution prefix is present.
 *
 * @param argv - Raw string arguments.
 * @returns Normalized arguments array.
 */
function normalizeArgv(argv: string[]): string[] {
	if (
		argv.length > 0 &&
		!argv[0]?.endsWith("node") &&
		!argv[0]?.includes("/") &&
		argv[0] !== "tekmemo"
	) {
		return ["node", "tekmemo", ...argv];
	}
	if (argv[0] === "tekmemo") return ["node", ...argv];
	return [...argv];
}

/**
 * Asserts whether a given error is a CommanderError instance.
 *
 * @param error - The caught error object.
 * @returns True if error is a CommanderError.
 */
function isCommanderError(error: unknown): error is CommanderError {
	return error instanceof CommanderError;
}
