import { createRequire } from "node:module";
import { Command, CommanderError } from "commander";
import {
	runAgentCompleteCommand,
	runAgentExtractCommand,
	runAgentPathsCommand,
	runAgentStartCommand,
	runChunksCommand,
	runCloudBenchmarksRunCommand,
	runCloudContextCommand,
	runCloudContextComposeCommand,
	runCloudEvalsRunCommand,
	runCloudExportsCreateCommand,
	runCloudExportsDownloadCommand,
	runCloudExtractionJobsCommand,
	runCloudExtractionRunCommand,
	runCloudGraphCreateEdgeCommand,
	runCloudGraphCreateNodeCommand,
	runCloudGraphListEdgesCommand,
	runCloudGraphListNodesCommand,
	runCloudGraphNeighborsCommand,
	runCloudGraphPathCommand,
	runCloudHealthCommand,
	runCloudProvidersCreateCommand,
	runCloudProvidersListCommand,
	runCloudProvidersTestCommand,
	runCloudReadCommand,
	runCloudReadinessCommand,
	runCloudRecallCommand,
	runCloudRecallIndexCommand,
	runCloudRecentCommand,
	runCloudRememberCommand,
	runCloudSnapshotCommand,
	runCloudSnapshotsCreateCommand,
	runCloudSnapshotsDownloadCommand,
	runCloudSyncPullCommand,
	runCloudSyncPushCommand,
	runCloudSyncResolveCommand,
	runCloudSyncStatusCommand,
	runCloudUpdateCoreCommand,
	runCloudValidateCommand,
	runDiffCommand,
	runDoctorCommand,
	runEditCommand,
	runEventsCommand,
	runInitCommand,
	runInspectCommand,
	runRuntimeContextCommand,
	runRuntimeReadCommand,
	runRuntimeRememberCommand,
	runRuntimeSnapshotCommand,
	runRuntimeValidateCommand,
	runSearchCommand,
} from "./commands";
import {
	type ResolvedCliRuntimeConfig,
	resolveCliRuntimeConfig,
	type TekMemoConfigFile,
	writeDefaultCliConfig,
} from "./config";
import { CliError } from "./errors/cli-errors";
import { TekMemoFileSystem } from "./fs/tekmemo-fs";
import {
	type CliOutput,
	createBufferedOutput,
	printJsonEnvelope,
	printJsonError,
} from "./output/output";
import { parseNonNegativeInteger, parsePositiveInteger } from "./utils/numbers";

const require = createRequire(import.meta.url);
const pkg = require("../package.json") as { version: string };
const parsePositiveOption = parsePositiveInteger as unknown as (
	value: string,
	previous: string | undefined,
) => string;
const parseNonNegativeOption = parseNonNegativeInteger as unknown as (
	value: string,
	previous: string | undefined,
) => string;

export interface RunTekMemoCliInput {
	argv: string[];
	cwd?: string;
	output?: CliOutput;
	verbose?: boolean;
	quiet?: boolean;
	noColor?: boolean;
	stdinContent?: string;
}

export interface RunTekMemoCliResult {
	exitCode: number;
	stdout: string[];
	stderr: string[];
}

function createFs(root: string): TekMemoFileSystem {
	return new TekMemoFileSystem({ rootDir: root });
}

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

	const program = new Command();
	program
		.name("tekmemo")
		.description(
			"Production-grade CLI for TekMemo .tekmemo/ memory, context, validation, snapshots, and agent tools.",
		)
		.version(pkg.version)
		.option(
			"-r, --root <path>",
			"project root containing .tekmemo/",
			input.cwd ?? process.cwd(),
		)
		.option("--runtime <mode>", "runtime mode: local, cloud, or hybrid")
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
			"hybrid read policy: local-first, cloud-first, local-only, cloud-only",
		)
		.option(
			"--write-policy <policy>",
			"hybrid write policy: local-first, cloud-first, local-only, cloud-only",
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
		config: ResolvedCliRuntimeConfig;
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
		const config = await resolveCliRuntimeConfig({
			cwd: input.cwd ?? process.cwd(),
			flags: {
				root: opts.root,
				runtime: opts.runtime,
				cloudUrl: opts.cloudUrl,
				apiKey: opts.apiKey,
				workspaceId: opts.workspaceId,
				projectId: opts.projectId,
				timeoutMs: opts.timeoutMs,
				readPolicy: opts.readPolicy,
				writePolicy: opts.writePolicy,
			},
		});
		return {
			root: config.root,
			json: Boolean(opts.json),
			verbose: Boolean(opts.verbose),
			quiet: Boolean(opts.quiet),
			config,
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
				fs: createFs(g.root),
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
				fs: createFs(g.root),
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
			exitCode = await runRuntimeContextCommand({
				fs: createFs(g.root),
				output,
				json: g.json,
				config: g.config,
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
			exitCode = await runRuntimeRememberCommand({
				fs: createFs(g.root),
				output,
				json: g.json,
				config: g.config,
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
			exitCode = await runRuntimeReadCommand({
				fs: createFs(g.root),
				output,
				json: g.json,
				config: g.config,
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
				fs: createFs(g.root),
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
				fs: createFs(g.root),
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
			exitCode = await runRuntimeSnapshotCommand({
				fs: createFs(g.root),
				output,
				json: g.json,
				config: g.config,
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
				fs: createFs(g.root),
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
			exitCode = await runRuntimeValidateCommand({
				fs: createFs(g.root),
				output,
				json: g.json,
				config: g.config,
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
				fs: createFs(g.root),
				output,
				json: g.json,
				query,
				regex: options.regex,
			});
		});

	program
		.command("edit")
		.description("legacy alias: append a note or core memory text")
		.argument("<type>", "note or core")
		.argument("<message>", "content to append")
		.option(
			"--allow-secrets",
			"allow content that looks like a secret after manual review",
			false,
		)
		.action(async (type, message, options) => {
			currentCommand = "edit";
			const g = await globals();
			if (type !== "note" && type !== "core") {
				output.error("Edit type must be 'note' or 'core'");
				exitCode = 1;
				return;
			}
			exitCode = await runEditCommand({
				fs: createFs(g.root),
				output,
				json: g.json,
				type,
				message,
				allowSecrets: options.allowSecrets,
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
				fs: createFs(g.root),
				output,
				json: g.json,
				labelA,
				labelB,
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
				fs: createFs(g.root),
				output,
				json: g.json,
				task: options.task,
				projectId: options.project ?? g.config.cloud.projectId,
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
				fs: createFs(g.root),
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
				fs: createFs(g.root),
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
				fs: createFs(g.root),
				output,
				json: g.json,
				session: options.session,
				extract: options.extract,
				checkpointLabel: options.checkpointLabel,
			});
		});

	const cloud = program
		.command("cloud")
		.description("use TekMemo Cloud through @tekmemo/cloud-client")
		.option(
			"--cloud-url <url>",
			"TekMemo Cloud API URL; defaults to TEKMEMO_CLOUD_URL or TEKMEMO_API_URL",
		)
		.option(
			"--api-key <key>",
			"TekMemo Cloud API key; defaults to TEKMEMO_API_KEY",
		)
		.option(
			"--workspace-id <id>",
			"default cloud workspace ID; defaults to TEKMEMO_WORKSPACE_ID",
		)
		.option(
			"--project-id <id>",
			"default cloud project ID; defaults to TEKMEMO_PROJECT_ID",
		)
		.option(
			"--timeout-ms <n>",
			"cloud request timeout in milliseconds",
			parsePositiveOption,
		);

	async function cloudGlobals() {
		const g = await globals();
		const opts = cloud.opts() as {
			cloudUrl?: string;
			apiKey?: string;
			workspaceId?: string;
			projectId?: string;
			timeoutMs?: number;
		};
		return {
			...g,
			cloudUrl: opts.cloudUrl ?? g.config.cloud.cloudUrl,
			apiKey: opts.apiKey ?? g.config.cloud.apiKey,
			workspaceId: opts.workspaceId ?? g.config.cloud.workspaceId,
			projectId: opts.projectId ?? g.config.cloud.projectId,
			timeoutMs: opts.timeoutMs ?? g.config.cloud.timeoutMs,
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
				cloudUrl: g.cloudUrl,
				apiKey: g.apiKey,
				workspaceId: g.workspaceId,
				projectId: g.projectId,
				timeoutMs: g.timeoutMs,
			});
		});

	cloud
		.command("context")
		.description("pack cloud memory into an agent-friendly context block")
		.requiredOption("-q, --query <query>", "task/query used to build context")
		.option("-l, --limit <n>", "maximum recall items", parsePositiveOption)
		.option("--max-bytes <n>", "maximum response bytes", parsePositiveOption)
		.option("--include-core", "include core memory", true)
		.option("--include-notes", "include notes memory", true)
		.option("--include-recent", "include recent memory", true)
		.action(async (options) => {
			currentCommand = "cloud.context";
			const g = await cloudGlobals();
			exitCode = await runCloudContextCommand({
				output,
				json: g.json,
				cloudUrl: g.cloudUrl,
				apiKey: g.apiKey,
				workspaceId: g.workspaceId,
				projectId: g.projectId,
				timeoutMs: g.timeoutMs,
				query: options.query,
				limit: options.limit,
				maxBytes: options.maxBytes,
				includeCore: options.includeCore,
				includeNotes: options.includeNotes,
				includeRecent: options.includeRecent,
			});
		});

	cloud
		.command("recall")
		.description("search TekMemo Cloud memory")
		.argument("<query>", "text to search for")
		.option("-l, --limit <n>", "maximum recall items", parsePositiveOption)
		.option("--strategy <strategy>", "local | vector | hybrid")
		.option("--fallback <mode>", "none | local")
		.option("--rerank", "request reranking", false)
		.action(async (query, options) => {
			currentCommand = "cloud.recall";
			const g = await cloudGlobals();
			exitCode = await runCloudRecallCommand({
				output,
				json: g.json,
				cloudUrl: g.cloudUrl,
				apiKey: g.apiKey,
				workspaceId: g.workspaceId,
				projectId: g.projectId,
				timeoutMs: g.timeoutMs,
				query,
				limit: options.limit,
				strategy: options.strategy,
				fallback: options.fallback,
				rerank: options.rerank,
			});
		});

	cloud
		.command("index")
		.description("request TekMemo Cloud recall indexing for the project")
		.option("--mode <mode>", "all | changed | core | notes", "changed")
		.option("--force", "force re-indexing", false)
		.action(async (options) => {
			currentCommand = "cloud.index";
			const g = await cloudGlobals();
			exitCode = await runCloudRecallIndexCommand({
				output,
				json: g.json,
				cloudUrl: g.cloudUrl,
				apiKey: g.apiKey,
				workspaceId: g.workspaceId,
				projectId: g.projectId,
				timeoutMs: g.timeoutMs,
				mode: options.mode,
				force: options.force,
			});
		});

	cloud
		.command("remember")
		.description("store durable memory in TekMemo Cloud")
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
		.option("--metadata-json <json>", "metadata JSON object")
		.option(
			"--allow-secrets",
			"allow content that looks like a secret after manual review",
			false,
		)
		.action(async (content, options) => {
			currentCommand = "cloud.remember";
			const g = await cloudGlobals();
			exitCode = await runCloudRememberCommand({
				output,
				json: g.json,
				rootDir: g.root,
				stdinContent: input.stdinContent,
				cloudUrl: g.cloudUrl,
				apiKey: g.apiKey,
				workspaceId: g.workspaceId,
				projectId: g.projectId,
				timeoutMs: g.timeoutMs,
				content,
				stdin: options.stdin,
				file: options.file,
				kind: options.kind,
				title: options.title,
				tags: options.tag,
				confidence: options.confidence,
				source: options.source,
				metadata: options.metadataJson,
				allowSecrets: options.allowSecrets,
			});
		});

	cloud
		.command("read")
		.description("read a TekMemo Cloud memory document")
		.argument("<target>", "core | notes")
		.option(
			"-l, --limit <n>",
			"maximum notes when target is notes",
			parsePositiveOption,
		)
		.action(async (target, options) => {
			currentCommand = "cloud.read";
			const g = await cloudGlobals();
			if (target !== "core" && target !== "notes") {
				output.error("cloud read target must be core or notes");
				exitCode = 1;
				return;
			}
			exitCode = await runCloudReadCommand({
				output,
				json: g.json,
				cloudUrl: g.cloudUrl,
				apiKey: g.apiKey,
				workspaceId: g.workspaceId,
				projectId: g.projectId,
				timeoutMs: g.timeoutMs,
				target,
				limit: options.limit,
			});
		});

	cloud
		.command("update-core")
		.description("replace TekMemo Cloud core memory")
		.argument("[content]", "new core memory content")
		.option("--stdin", "read core memory from stdin", false)
		.option(
			"--file <path>",
			"read core memory from a file inside the selected root",
		)
		.option(
			"--allow-secrets",
			"allow content that looks like a secret after manual review",
			false,
		)
		.action(async (content, options) => {
			currentCommand = "cloud.update-core";
			const g = await cloudGlobals();
			exitCode = await runCloudUpdateCoreCommand({
				output,
				json: g.json,
				rootDir: g.root,
				stdinContent: input.stdinContent,
				cloudUrl: g.cloudUrl,
				apiKey: g.apiKey,
				workspaceId: g.workspaceId,
				projectId: g.projectId,
				timeoutMs: g.timeoutMs,
				content,
				stdin: options.stdin,
				file: options.file,
				allowSecrets: options.allowSecrets,
			});
		});

	cloud
		.command("recent")
		.description("list recent TekMemo Cloud memory events")
		.option("-l, --limit <n>", "maximum recent items", parsePositiveOption)
		.action(async (options) => {
			currentCommand = "cloud.recent";
			const g = await cloudGlobals();
			exitCode = await runCloudRecentCommand({
				output,
				json: g.json,
				cloudUrl: g.cloudUrl,
				apiKey: g.apiKey,
				workspaceId: g.workspaceId,
				projectId: g.projectId,
				timeoutMs: g.timeoutMs,
				limit: options.limit,
			});
		});

	cloud
		.command("validate")
		.description("validate TekMemo Cloud memory")
		.option("-s, --strict", "strict protocol validation", false)
		.action(async (options) => {
			currentCommand = "cloud.validate";
			const g = await cloudGlobals();
			exitCode = await runCloudValidateCommand({
				output,
				json: g.json,
				cloudUrl: g.cloudUrl,
				apiKey: g.apiKey,
				workspaceId: g.workspaceId,
				projectId: g.projectId,
				timeoutMs: g.timeoutMs,
				strict: options.strict,
			});
		});

	cloud
		.command("snapshot")
		.description("explain TekMemo Cloud snapshot availability")
		.option("-l, --label <name>", "snapshot label", "manual")
		.option(
			"--type <type>",
			"manual | automatic | pre-sync | pre-restore",
			"manual",
		)
		.action(async (options) => {
			currentCommand = "cloud.snapshot";
			const g = await cloudGlobals();
			exitCode = await runCloudSnapshotCommand({
				output,
				json: g.json,
				cloudUrl: g.cloudUrl,
				apiKey: g.apiKey,
				workspaceId: g.workspaceId,
				projectId: g.projectId,
				timeoutMs: g.timeoutMs,
				label: options.label,
				type: options.type,
			});
		});

	const sync = cloud
		.command("sync")
		.description("use TekMemo Cloud memory sync APIs");

	sync
		.command("status")
		.description("read cloud sync status")
		.option("--client-id <id>", "optional sync client ID")
		.action(async (options) => {
			currentCommand = "cloud.sync.status";
			const g = await cloudGlobals();
			exitCode = await runCloudSyncStatusCommand({
				output,
				json: g.json,
				cloudUrl: g.cloudUrl,
				apiKey: g.apiKey,
				workspaceId: g.workspaceId,
				projectId: g.projectId,
				timeoutMs: g.timeoutMs,
				clientId: options.clientId,
			});
		});

	sync
		.command("pull")
		.description("pull cloud sync events")
		.requiredOption("--client-id <id>", "sync client ID")
		.option(
			"--since-server-version <n>",
			"pull events after this server version",
			parseNonNegativeOption,
		)
		.option("-l, --limit <n>", "maximum events to return", parsePositiveOption)
		.action(async (options) => {
			currentCommand = "cloud.sync.pull";
			const g = await cloudGlobals();
			exitCode = await runCloudSyncPullCommand({
				output,
				json: g.json,
				cloudUrl: g.cloudUrl,
				apiKey: g.apiKey,
				workspaceId: g.workspaceId,
				projectId: g.projectId,
				timeoutMs: g.timeoutMs,
				clientId: options.clientId,
				sinceServerVersion: options.sinceServerVersion,
				limit: options.limit,
			});
		});

	sync
		.command("push")
		.description("push local sync events to TekMemo Cloud")
		.requiredOption("--client-id <id>", "sync client ID")
		.option("--events-json <json>", "event array or object with events array")
		.option("--checkpoint-json <json>", "optional checkpoint JSON object")
		.option("--stdin", "read events JSON from stdin", false)
		.option(
			"--file <path>",
			"read events JSON from a file inside the selected root",
		)
		.action(async (options) => {
			currentCommand = "cloud.sync.push";
			const g = await cloudGlobals();
			exitCode = await runCloudSyncPushCommand({
				output,
				json: g.json,
				rootDir: g.root,
				stdinContent: input.stdinContent,
				cloudUrl: g.cloudUrl,
				apiKey: g.apiKey,
				workspaceId: g.workspaceId,
				projectId: g.projectId,
				timeoutMs: g.timeoutMs,
				clientId: options.clientId,
				eventsJson: options.eventsJson,
				checkpointJson: options.checkpointJson,
				stdin: options.stdin,
				file: options.file,
			});
		});

	sync
		.command("resolve")
		.description("resolve a cloud sync conflict")
		.argument("<conflictId>", "conflict ID")
		.requiredOption(
			"--resolution <resolution>",
			"keep_cloud | use_client | ignore",
		)
		.option("--content-json <json>", "optional resolution content JSON object")
		.action(async (conflictId, options) => {
			currentCommand = "cloud.sync.resolve";
			const g = await cloudGlobals();
			exitCode = await runCloudSyncResolveCommand({
				output,
				json: g.json,
				cloudUrl: g.cloudUrl,
				apiKey: g.apiKey,
				workspaceId: g.workspaceId,
				projectId: g.projectId,
				timeoutMs: g.timeoutMs,
				conflictId,
				resolution: options.resolution,
				contentJson: options.contentJson,
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
				cloudUrl: g.cloudUrl,
				apiKey: g.apiKey,
				workspaceId: g.workspaceId,
				projectId: g.projectId,
				timeoutMs: g.timeoutMs,
			});
		});

	cloud
		.command("context-compose")
		.description("compose full context package from cloud")
		.requiredOption("-q, --query <query>", "task/query used to build context")
		.option("-l, --limit <n>", "maximum recall items", parsePositiveOption)
		.option("--strategy <strategy>", "auto | vector | local")
		.option("--rerank", "request reranking", false)
		.option("--include-core-memory", "include core memory", true)
		.option("--include-recall-results", "include recall results", true)
		.option("--include-graph-context", "include graph context", true)
		.action(async (options) => {
			currentCommand = "cloud.context-compose";
			const g = await cloudGlobals();
			exitCode = await runCloudContextComposeCommand({
				output,
				json: g.json,
				cloudUrl: g.cloudUrl,
				apiKey: g.apiKey,
				workspaceId: g.workspaceId,
				projectId: g.projectId,
				timeoutMs: g.timeoutMs,
				query: options.query,
				topK: options.limit,
				strategy: options.strategy,
				rerank: options.rerank,
				includeCoreMemory: options.includeCoreMemory,
				includeRecallResults: options.includeRecallResults,
				includeGraphContext: options.includeGraphContext,
			});
		});

	const graph = cloud.command("graph").description("graph memory operations");

	graph
		.command("list-nodes")
		.description("list graph nodes")
		.option("-l, --limit <n>", "maximum nodes to return", parsePositiveOption)
		.option("--cursor <string>", "pagination cursor")
		.option("--status <status>", "active | deprecated | conflicted | deleted")
		.action(async (options) => {
			currentCommand = "cloud.graph.list-nodes";
			const g = await cloudGlobals();
			exitCode = await runCloudGraphListNodesCommand({
				output,
				json: g.json,
				cloudUrl: g.cloudUrl,
				apiKey: g.apiKey,
				workspaceId: g.workspaceId,
				projectId: g.projectId,
				timeoutMs: g.timeoutMs,
				limit: options.limit,
				cursor: options.cursor,
				status: options.status,
			});
		});

	graph
		.command("create-node")
		.description("create a graph node")
		.requiredOption("--node-id <id>", "node ID")
		.requiredOption("--type <type>", "node type")
		.requiredOption("--label <label>", "node label")
		.option("--summary <summary>", "node summary")
		.option("--aliases <aliases>", "comma-separated aliases")
		.option("--metadata-json <json>", "metadata JSON object")
		.action(async (options) => {
			currentCommand = "cloud.graph.create-node";
			const g = await cloudGlobals();
			const aliases = options.aliases
				? options.aliases.split(",").map((s: string) => s.trim())
				: undefined;
			exitCode = await runCloudGraphCreateNodeCommand({
				output,
				json: g.json,
				cloudUrl: g.cloudUrl,
				apiKey: g.apiKey,
				workspaceId: g.workspaceId,
				projectId: g.projectId,
				timeoutMs: g.timeoutMs,
				nodeId: options.nodeId,
				type: options.type,
				label: options.label,
				summary: options.summary,
				aliases,
				metadataJson: options.metadataJson,
			});
		});

	graph
		.command("list-edges")
		.description("list graph edges")
		.option("-l, --limit <n>", "maximum edges to return", parsePositiveOption)
		.option("--cursor <string>", "pagination cursor")
		.option("--status <status>", "active | deprecated | conflicted | deleted")
		.action(async (options) => {
			currentCommand = "cloud.graph.list-edges";
			const g = await cloudGlobals();
			exitCode = await runCloudGraphListEdgesCommand({
				output,
				json: g.json,
				cloudUrl: g.cloudUrl,
				apiKey: g.apiKey,
				workspaceId: g.workspaceId,
				projectId: g.projectId,
				timeoutMs: g.timeoutMs,
				limit: options.limit,
				cursor: options.cursor,
				status: options.status,
			});
		});

	graph
		.command("create-edge")
		.description("create a graph edge")
		.option("--edge-id <id>", "edge ID")
		.requiredOption("--from <id>", "from node ID")
		.requiredOption("--to <id>", "to node ID")
		.requiredOption("--type <type>", "edge type")
		.option("--directed", "directed edge", true)
		.option("--weight <n>", "edge weight (0-1)", parsePositiveOption)
		.option("--metadata-json <json>", "metadata JSON object")
		.action(async (options) => {
			currentCommand = "cloud.graph.create-edge";
			const g = await cloudGlobals();
			exitCode = await runCloudGraphCreateEdgeCommand({
				output,
				json: g.json,
				cloudUrl: g.cloudUrl,
				apiKey: g.apiKey,
				workspaceId: g.workspaceId,
				projectId: g.projectId,
				timeoutMs: g.timeoutMs,
				edgeId: options.edgeId,
				fromNodeId: options.from,
				toNodeId: options.to,
				type: options.type,
				directed: options.directed,
				weight: options.weight,
				metadataJson: options.metadataJson,
			});
		});

	graph
		.command("neighbors")
		.description("find graph neighbors")
		.requiredOption("--node-id <id>", "seed node ID")
		.option("--direction <dir>", "in | out | both")
		.option("--depth <n>", "search depth", parsePositiveOption)
		.option("-l, --limit <n>", "maximum results", parsePositiveOption)
		.action(async (options) => {
			currentCommand = "cloud.graph.neighbors";
			const g = await cloudGlobals();
			exitCode = await runCloudGraphNeighborsCommand({
				output,
				json: g.json,
				cloudUrl: g.cloudUrl,
				apiKey: g.apiKey,
				workspaceId: g.workspaceId,
				projectId: g.projectId,
				timeoutMs: g.timeoutMs,
				nodeId: options.nodeId,
				direction: options.direction,
				depth: options.depth,
				limit: options.limit,
			});
		});

	graph
		.command("path")
		.description("find graph path between nodes")
		.requiredOption("--from <id>", "start node ID")
		.requiredOption("--to <id>", "target node ID")
		.option("--max-depth <n>", "maximum search depth", parsePositiveOption)
		.action(async (options) => {
			currentCommand = "cloud.graph.path";
			const g = await cloudGlobals();
			exitCode = await runCloudGraphPathCommand({
				output,
				json: g.json,
				cloudUrl: g.cloudUrl,
				apiKey: g.apiKey,
				workspaceId: g.workspaceId,
				projectId: g.projectId,
				timeoutMs: g.timeoutMs,
				fromNodeId: options.from,
				toNodeId: options.to,
				maxDepth: options.maxDepth,
			});
		});

	const extraction = cloud
		.command("extraction")
		.description("extraction operations");

	extraction
		.command("run")
		.description("run graph extraction")
		.option("--mode <mode>", "full | core | notes | sync | connectors")
		.option("--force", "force re-extraction", false)
		.action(async (options) => {
			currentCommand = "cloud.extraction.run";
			const g = await cloudGlobals();
			exitCode = await runCloudExtractionRunCommand({
				output,
				json: g.json,
				cloudUrl: g.cloudUrl,
				apiKey: g.apiKey,
				workspaceId: g.workspaceId,
				projectId: g.projectId,
				timeoutMs: g.timeoutMs,
				mode: options.mode,
				force: options.force,
			});
		});

	extraction
		.command("jobs")
		.description("list extraction jobs")
		.option("-l, --limit <n>", "maximum jobs to return", parsePositiveOption)
		.action(async (options) => {
			currentCommand = "cloud.extraction.jobs";
			const g = await cloudGlobals();
			exitCode = await runCloudExtractionJobsCommand({
				output,
				json: g.json,
				cloudUrl: g.cloudUrl,
				apiKey: g.apiKey,
				workspaceId: g.workspaceId,
				projectId: g.projectId,
				timeoutMs: g.timeoutMs,
				limit: options.limit,
			});
		});

	cloud
		.command("evals")
		.description("run context quality evals")
		.option("--fixture-ids <ids>", "comma-separated fixture IDs")
		.option("--iterations <n>", "number of iterations", parsePositiveOption)
		.option("--thresholds-json <json>", "thresholds JSON object")
		.action(async (options) => {
			currentCommand = "cloud.evals.run";
			const g = await cloudGlobals();
			exitCode = await runCloudEvalsRunCommand({
				output,
				json: g.json,
				cloudUrl: g.cloudUrl,
				apiKey: g.apiKey,
				workspaceId: g.workspaceId,
				projectId: g.projectId,
				timeoutMs: g.timeoutMs,
				fixtureIds: options.fixtureIds,
				iterations: options.iterations,
				thresholdsJson: options.thresholdsJson,
			});
		});

	cloud
		.command("benchmarks")
		.description("run context benchmarks")
		.option("--fixture-ids <ids>", "comma-separated fixture IDs")
		.option("--iterations <n>", "number of iterations", parsePositiveOption)
		.option("--thresholds-json <json>", "thresholds JSON object")
		.action(async (options) => {
			currentCommand = "cloud.benchmarks.run";
			const g = await cloudGlobals();
			exitCode = await runCloudBenchmarksRunCommand({
				output,
				json: g.json,
				cloudUrl: g.cloudUrl,
				apiKey: g.apiKey,
				workspaceId: g.workspaceId,
				projectId: g.projectId,
				timeoutMs: g.timeoutMs,
				fixtureIds: options.fixtureIds,
				iterations: options.iterations,
				thresholdsJson: options.thresholdsJson,
			});
		});

	const exports = cloud.command("exports").description("export operations");

	exports
		.command("create")
		.description("create memory export")
		.option("--label <name>", "export label")
		.action(async (options) => {
			currentCommand = "cloud.exports.create";
			const g = await cloudGlobals();
			exitCode = await runCloudExportsCreateCommand({
				output,
				json: g.json,
				cloudUrl: g.cloudUrl,
				apiKey: g.apiKey,
				workspaceId: g.workspaceId,
				projectId: g.projectId,
				timeoutMs: g.timeoutMs,
				label: options.label,
			});
		});

	exports
		.command("download")
		.description("download export archive")
		.requiredOption("--export-id <id>", "export ID")
		.action(async (options) => {
			currentCommand = "cloud.exports.download";
			const g = await cloudGlobals();
			exitCode = await runCloudExportsDownloadCommand({
				output,
				json: g.json,
				cloudUrl: g.cloudUrl,
				apiKey: g.apiKey,
				workspaceId: g.workspaceId,
				projectId: g.projectId,
				timeoutMs: g.timeoutMs,
				exportId: options.exportId,
			});
		});

	const snapshots = cloud
		.command("snapshots")
		.description("snapshot operations");

	snapshots
		.command("create")
		.description("create memory snapshot")
		.option("--label <name>", "snapshot label")
		.option("--trigger <trigger>", "manual | sync | system")
		.action(async (options) => {
			currentCommand = "cloud.snapshots.create";
			const g = await cloudGlobals();
			exitCode = await runCloudSnapshotsCreateCommand({
				output,
				json: g.json,
				cloudUrl: g.cloudUrl,
				apiKey: g.apiKey,
				workspaceId: g.workspaceId,
				projectId: g.projectId,
				timeoutMs: g.timeoutMs,
				label: options.label,
				trigger: options.trigger,
			});
		});

	snapshots
		.command("download")
		.description("download snapshot archive")
		.requiredOption("--snapshot-id <id>", "snapshot ID")
		.action(async (options) => {
			currentCommand = "cloud.snapshots.download";
			const g = await cloudGlobals();
			exitCode = await runCloudSnapshotsDownloadCommand({
				output,
				json: g.json,
				cloudUrl: g.cloudUrl,
				apiKey: g.apiKey,
				workspaceId: g.workspaceId,
				projectId: g.projectId,
				timeoutMs: g.timeoutMs,
				snapshotId: options.snapshotId,
			});
		});

	const providers = cloud
		.command("providers")
		.description("provider operations");

	providers
		.command("list")
		.description("list provider credentials")
		.action(async () => {
			currentCommand = "cloud.providers.list";
			const g = await cloudGlobals();
			exitCode = await runCloudProvidersListCommand({
				output,
				json: g.json,
				cloudUrl: g.cloudUrl,
				apiKey: g.apiKey,
				workspaceId: g.workspaceId,
				projectId: g.projectId,
				timeoutMs: g.timeoutMs,
			});
		});

	providers
		.command("create")
		.description("create provider credential")
		.requiredOption(
			"--provider <provider>",
			"voyageai | openai | upstash-vector",
		)
		.requiredOption("--key-name <name>", "key name")
		.requiredOption("--secret <secret>", "provider secret")
		.option("--rest-url <url>", "REST URL (required for upstash-vector)")
		.option("--embedding-model <model>", "embedding model")
		.option("--rerank-model <model>", "rerank model")
		.action(async (options) => {
			currentCommand = "cloud.providers.create";
			const g = await cloudGlobals();
			exitCode = await runCloudProvidersCreateCommand({
				output,
				json: g.json,
				cloudUrl: g.cloudUrl,
				apiKey: g.apiKey,
				workspaceId: g.workspaceId,
				projectId: g.projectId,
				timeoutMs: g.timeoutMs,
				provider: options.provider,
				keyName: options.keyName,
				secret: options.secret,
				restUrl: options.restUrl,
				embeddingModel: options.embeddingModel,
				rerankModel: options.rerankModel,
			});
		});

	providers
		.command("test")
		.description("test provider credential")
		.requiredOption("--credential-id <id>", "credential ID")
		.action(async (options) => {
			currentCommand = "cloud.providers.test";
			const g = await cloudGlobals();
			exitCode = await runCloudProvidersTestCommand({
				output,
				json: g.json,
				cloudUrl: g.cloudUrl,
				apiKey: g.apiKey,
				workspaceId: g.workspaceId,
				projectId: g.projectId,
				timeoutMs: g.timeoutMs,
				credentialId: options.credentialId,
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
				...g.config,
				cloud: {
					...g.config.cloud,
					apiKey: g.config.cloud.apiKey ? "<redacted>" : undefined,
				},
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
			"runtime mode: local, cloud, or hybrid",
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
					version: 1,
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
	}
}

function collect(value: string, previous: string[]): string[] {
	previous.push(value);
	return previous;
}

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

function isCommanderError(error: unknown): error is CommanderError {
	return error instanceof CommanderError;
}
