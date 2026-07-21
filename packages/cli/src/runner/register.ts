import path from "node:path";
import { isTaskType, TASK_TYPES, type TaskType } from "@memofs/core";
import type { Command } from "commander";
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
	runGenerateAgentCommand,
	runGenerateAgentHooksCommand,
	runGenerateAgentRulesCommand,
	runGenerateMcpCommand,
	runInitCommand,
	runInspectCommand,
	runReadCommand,
	runRememberCommand,
	runSearchCommand,
	runSnapshotCommand,
	runStatusCommand,
	runValidateCommand,
} from "../commands";
import type { MemoFsConfigFile } from "../config";
import { resolveSchemaPath, writeDefaultCliConfig } from "../config";
import { CliUsageError } from "../errors/cli-errors";
import { printJsonEnvelope } from "../output/output";

function collect(value: string, previous: string[]): string[] {
	previous.push(value);
	return previous;
}

function parseScope(value: string | undefined): "local" | "global" | undefined {
	if (value === undefined) return undefined;
	if (value === "local" || value === "global") return value;
	throw new CliUsageError(
		`--scope must be "local" or "global", got "${value}"`,
	);
}

export interface CLIContext {
	globals: () => Promise<{
		root: string;
		json: boolean;
		verbose: boolean;
		quiet: boolean;
		memo: import("@memofs/core").MemoFS;
	}>;
	setExitCode: (code: number) => void;
	setCurrentCommand: (cmd: string) => void;
	output: import("../output/output").CliOutput;
	stdinContent?: string;
	cwd?: string;
	parsePositiveOption: (value: string, previous: number) => number;
	parseNonNegativeOption: (value: string, previous: number) => number;
}

export function registerAllCommands(program: Command, ctx: CLIContext) {
	const {
		globals,
		setExitCode,
		setCurrentCommand,
		output,
		stdinContent,
		cwd,
		parsePositiveOption,
		parseNonNegativeOption,
	} = ctx;

	program
		.command("init")
		.description("initialize canonical .memofs/ files")
		.option("-f, --force", "overwrite existing seed files", false)
		.option("-p, --project-id <id>", "explicit project ID")
		.option("--no-input", "skip interactive prompts", false)
		.action(async (options) => {
			setCurrentCommand("init");
			const g = await globals();
			setExitCode(
				await runInitCommand({
					memo: g.memo,
					output,
					json: g.json,
					force: options.force,
					projectId: options.projectId,
					noInput: options.noInput ?? !process.stdout.isTTY,
				}),
			);
		});

	program
		.command("inspect")
		.description("inspect memory state")
		.action(async () => {
			setCurrentCommand("inspect");
			const g = await globals();
			setExitCode(
				await runInspectCommand({
					memo: g.memo,
					output,
					json: g.json,
				}),
			);
		});

	program
		.command("context")
		.description("pack project memory into context block")
		.option("-q, --query <query>", "prioritize lines matching a task/query")
		.option(
			"--task-type <type>",
			"task type: coding | debug | refactor | docs | general",
			(value: string) => {
				if (!isTaskType(value)) {
					throw new Error(
						`Invalid task type "${value}". Must be one of: ${TASK_TYPES.join(", ")}.`,
					);
				}
				return value as TaskType;
			},
		)
		.option(
			"--max-chars <n>",
			"maximum output characters",
			parsePositiveOption,
			12000,
		)
		.option(
			"--mark-session-start",
			"write a session-start event marker (used by hook scripts)",
			false,
		)
		.action(async (options) => {
			setCurrentCommand("context");
			const g = await globals();
			setExitCode(
				await runContextCommand({
					memo: g.memo,
					output,
					json: g.json,
					query: options.query,
					taskType: options.taskType,
					maxChars: options.maxChars,
					markSessionStart: options.markSessionStart,
				}),
			);
		});

	program
		.command("remember")
		.description("store a durable note")
		.argument("[content]", "memory content")
		.option("--stdin", "read memory content from stdin", false)
		.option(
			"--file <path>",
			"read memory content from a file inside the selected root",
		)
		.option("-k, --kind <kind>", "note kind", "note")
		.option("--title <title>", "optional note title")
		.option("-t, --tag <tag>", "tag to attach; repeatable", collect, [])
		.option("--confidence <n>", "confidence from 0 to 1")
		.option("--source <source>", "source identifier")
		.option("--actor <actor>", "actor type or type:id", "user")
		.option("--metadata-json <json>", "metadata JSON object")
		.option("--allow-secrets", "allow content that looks like a secret", false)
		.action(async (content, options) => {
			setCurrentCommand("remember");
			const g = await globals();
			setExitCode(
				await runRememberCommand({
					memo: g.memo,
					output,
					json: g.json,
					content,
					stdin: options.stdin,
					file: options.file,
					stdinContent: stdinContent,
					kind: options.kind,
					title: options.title,
					tags: options.tag,
					confidence: options.confidence,
					source: options.source,
					actor: options.actor,
					metadata: options.metadataJson,
					allowSecrets: options.allowSecrets,
				}),
			);
		});

	program
		.command("read")
		.description("read a canonical memory document")
		.argument("<target>", "core | notes | manifest")
		.action(async (target) => {
			setCurrentCommand("read");
			const g = await globals();
			if (target !== "core" && target !== "notes" && target !== "manifest") {
				output.error("read target must be core, notes, or manifest");
				setExitCode(1);
				return;
			}
			setExitCode(
				await runReadCommand({
					memo: g.memo,
					output,
					json: g.json,
					target,
				}),
			);
		});

	program
		.command("events")
		.description("read memory event log")
		.option(
			"-l, --limit <n>",
			"limit number of events",
			parseNonNegativeOption,
			0,
		)
		.option("-s, --strict", "strict protocol validation", false)
		.action(async (options) => {
			setCurrentCommand("events");
			const g = await globals();
			setExitCode(
				await runEventsCommand({
					memo: g.memo,
					output,
					json: g.json,
					limit: options.limit,
					strict: options.strict,
				}),
			);
		});

	program
		.command("chunks")
		.description("read local chunk index")
		.option(
			"-l, --limit <n>",
			"limit number of chunks",
			parseNonNegativeOption,
			0,
		)
		.option("-s, --strict", "strict protocol validation", false)
		.action(async (options) => {
			setCurrentCommand("chunks");
			const g = await globals();
			setExitCode(
				await runChunksCommand({
					memo: g.memo,
					output,
					json: g.json,
					limit: options.limit,
					strict: options.strict,
				}),
			);
		});

	program
		.command("snapshot")
		.description("create local memory snapshot bundle")
		.option("-l, --label <name>", "snapshot label", "manual")
		.action(async (options) => {
			setCurrentCommand("snapshot");
			const g = await globals();
			setExitCode(
				await runSnapshotCommand({
					memo: g.memo,
					output,
					json: g.json,
					label: options.label,
				}),
			);
		});

	program
		.command("doctor")
		.description("find missing or corrupt memory files")
		.option("-s, --strict", "strict protocol validation", false)
		.action(async (options) => {
			setCurrentCommand("doctor");
			const g = await globals();
			setExitCode(
				await runDoctorCommand({
					memo: g.memo,
					output,
					json: g.json,
					strict: options.strict,
				}),
			);
		});

	program
		.command("validate")
		.description("strict protocol validation for CI")
		.action(async () => {
			setCurrentCommand("validate");
			const g = await globals();
			setExitCode(
				await runValidateCommand({
					memo: g.memo,
					output,
					json: g.json,
				}),
			);
		});

	program
		.command("search")
		.description("search memory files for a query")
		.argument("<query>", "text to search for")
		.option("-e, --regex", "treat query as a regular expression", false)
		.action(async (query, options) => {
			setCurrentCommand("search");
			const g = await globals();
			setExitCode(
				await runSearchCommand({
					memo: g.memo,
					output,
					json: g.json,
					query,
					regex: options.regex,
				}),
			);
		});

	program
		.command("status")
		.description("show memory compliance status for the most recent session")
		.option(
			"--hook",
			'emit Stop-hook JSON ({"systemMessage": ...}) for agent hooks',
			false,
		)
		.action(async (options) => {
			setCurrentCommand("status");
			const g = await globals();
			setExitCode(
				await runStatusCommand({
					memo: g.memo,
					output,
					json: g.json,
					hook: options.hook,
				}),
			);
		});

	program
		.command("diff")
		.description("compare two memory snapshots by ID or label")
		.argument("<labelA>", "first snapshot ID or label")
		.argument("<labelB>", "second snapshot ID or label")
		.action(async (labelA, labelB) => {
			setCurrentCommand("diff");
			const g = await globals();
			setExitCode(
				await runDiffCommand({
					memo: g.memo,
					output,
					json: g.json,
					labelA,
					labelB,
				}),
			);
		});

	const generate = program
		.command("generate")
		.description(
			"generate agent instruction files that enforce the MemoFS workflow",
		);

	generate
		.command("agent-rules")
		.description(
			"emit a MemoFS-enforcing instructions file for an agent platform",
		)
		.argument(
			"[target]",
			"agents | claude | gemini | copilot | cursor (omit with --list)",
		)
		.option("--project-name <name>", "project name in the header")
		.option(
			"--scope <scope>",
			"MCP config scope reflected in the pointer: local or global",
		)
		.option("-f, --force", "overwrite an existing instructions file", false)
		.option(
			"--list",
			"list supported targets and their MCP config locations",
			false,
		)
		.action(async (target, options) => {
			setCurrentCommand("generate.agent-rules");
			const g = await globals();
			setExitCode(
				await runGenerateAgentRulesCommand({
					memo: g.memo,
					output,
					json: g.json,
					target,
					projectName: options.projectName,
					mcpScope: parseScope(options.scope),
					force: options.force,
					list: options.list,
				}),
			);
		});

	generate
		.command("agent-hooks")
		.description(
			"emit platform-specific MemoFS hook configuration (no rules file)",
		)
		.argument("[target]", "claude | codex | opencode (omit with --list)")
		.option("-f, --force", "overwrite existing hook files", false)
		.option("--list", "list supported targets and their capabilities", false)
		.action(async (target, options) => {
			setCurrentCommand("generate.agent-hooks");
			const g = await globals();
			setExitCode(
				await runGenerateAgentHooksCommand({
					memo: g.memo,
					output,
					json: g.json,
					target,
					force: options.force,
					list: options.list,
				}),
			);
		});

	generate
		.command("mcp")
		.description(
			"write (or merge) the platform MCP server config for @memofs/mcp-server",
		)
		.argument("[target]", "any agent target (omit with --list)")
		.option(
			"--scope <scope>",
			"MCP config scope: local or global (defaults to the platform default)",
		)
		.option("-f, --force", "overwrite an existing memofs MCP entry", false)
		.option("--list", "list supported targets, formats, and scope paths", false)
		.action(async (target, options) => {
			setCurrentCommand("generate.mcp");
			const g = await globals();
			setExitCode(
				await runGenerateMcpCommand({
					memo: g.memo,
					output,
					json: g.json,
					target,
					scope: parseScope(options.scope),
					force: options.force,
					list: options.list,
				}),
			);
		});

	generate
		.command("agent")
		.description(
			"emit rules + hooks + MCP config for an agent platform (one-go)",
		)
		.argument("[target]", "any agent target (omit with --list)")
		.option("--project-name <name>", "project name in the header")
		.option("--no-hooks", "emit rules + MCP only (no hooks file)")
		.option("--no-mcp", "emit rules + hooks only (no MCP server config)")
		.option(
			"--scope <scope>",
			"MCP config scope: local or global (defaults to the platform default)",
		)
		.option("-f, --force", "overwrite existing files / MCP entry", false)
		.option("--list", "list supported targets and their capabilities", false)
		.action(async (target, options) => {
			setCurrentCommand("generate.agent");
			const g = await globals();
			setExitCode(
				await runGenerateAgentCommand({
					memo: g.memo,
					output,
					json: g.json,
					target,
					projectName: options.projectName,
					hooks: options.hooks,
					mcp: options.mcp,
					mcpScope: parseScope(options.scope),
					force: options.force,
					list: options.list,
				}),
			);
		});

	const agent = program
		.command("agent")
		.description("manage AgentFS-backed MemoFS coding sessions");

	agent
		.command("start")
		.description(
			"start an AgentFS-style workspace for Codex, Claude Code, or another coding agent",
		)
		.requiredOption("--task <task>", "agent task or brief")
		.option("--project <id>", "project ID")
		.option("--actor <id>", "actor ID")
		.option("--session <id>", "explicit safe session ID")
		.action(async (options) => {
			setCurrentCommand("agent.start");
			const g = await globals();
			setExitCode(
				await runAgentStartCommand({
					memo: g.memo,
					output,
					json: g.json,
					task: options.task,
					projectId: options.project ?? g.memo.projectId,
					actorId: options.actor,
					sessionId: options.session,
				}),
			);
		});

	agent
		.command("paths")
		.description("print paths for the latest or selected agent session")
		.option("--session <id>", "session ID or latest", "latest")
		.action(async (options) => {
			setCurrentCommand("agent.paths");
			const g = await globals();
			setExitCode(
				await runAgentPathsCommand({
					memo: g.memo,
					output,
					json: g.json,
					session: options.session,
				}),
			);
		});

	agent
		.command("extract")
		.description(
			"extract summary, durable memory, and follow-ups from an agent session",
		)
		.option("--session <id>", "session ID or latest", "latest")
		.action(async (options) => {
			setCurrentCommand("agent.extract");
			const g = await globals();
			setExitCode(
				await runAgentExtractCommand({
					memo: g.memo,
					output,
					json: g.json,
					session: options.session,
				}),
			);
		});

	agent
		.command("complete")
		.description(
			"complete an agent session and optionally persist durable memory",
		)
		.option("--session <id>", "session ID or latest", "latest")
		.option(
			"--extract",
			"append output/durable-memory.md to MemoFS notes",
			false,
		)
		.option("--checkpoint-label <label>", "checkpoint label")
		.action(async (options) => {
			setCurrentCommand("agent.complete");
			const g = await globals();
			setExitCode(
				await runAgentCompleteCommand({
					memo: g.memo,
					output,
					json: g.json,
					session: options.session,
					extract: options.extract,
					checkpointLabel: options.checkpointLabel,
				}),
			);
		});

	const connectors = program
		.command("connectors")
		.description(
			"manage local connectors: add, remove, list, run ingestion into .memofs/",
		);

	connectors
		.command("list")
		.description("list configured connectors")
		.action(async () => {
			setCurrentCommand("connectors.list");
			const g = await globals();
			setExitCode(
				await runConnectorsListCommand({
					memo: g.memo,
					output,
					json: g.json,
				}),
			);
		});

	connectors
		.command("add")
		.description("add a connector row to .memofs/connectors.json")
		.requiredOption("--type <type>", "connector type (github, notion, ...)")
		.requiredOption(
			"--secret-ref <ref>",
			"opaque pointer to a token stored server-side",
		)
		.option("--id <id>", "connector id")
		.option("--schedule <schedule>", "schedule hint")
		.option("--source-mapping <json>", "source-specific config as JSON")
		.option("--disabled", "add the connector in disabled state", false)
		.action(async (options) => {
			setCurrentCommand("connectors.add");
			const g = await globals();
			setExitCode(
				await runConnectorsAddCommand({
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
				}),
			);
		});

	connectors
		.command("remove")
		.description("remove a connector by id")
		.argument("<id>", "connector id to remove")
		.action(async (id) => {
			setCurrentCommand("connectors.remove");
			const g = await globals();
			setExitCode(
				await runConnectorsRemoveCommand({
					memo: g.memo,
					output,
					json: g.json,
					id,
				}),
			);
		});

	connectors
		.command("run")
		.description("run enabled connectors")
		.option("--type <type>", "run only connectors of this type")
		.action(async (options) => {
			setCurrentCommand("connectors.run");
			const g = await globals();
			setExitCode(
				await runConnectorsRunCommand({
					memo: g.memo,
					output,
					json: g.json,
					...(options.type === undefined ? {} : { onlyType: options.type }),
				}),
			);
		});

	const cloud = program
		.command("cloud")
		.description("use MemoFS Cloud file-replica sync");

	async function cloudGlobals() {
		const g = await globals();
		if (!g.memo.cloud) {
			throw new CliUsageError(
				"Cloud sync requires --cloud-url and --api-key or MEMOFS_CLOUD_URL/MEMOFS_API_KEY",
			);
		}
		return {
			...g,
			client: g.memo.cloud,
		};
	}

	cloud
		.command("health")
		.description("check MemoFS Cloud health")
		.action(async () => {
			setCurrentCommand("cloud.health");
			const g = await cloudGlobals();
			setExitCode(
				await runCloudHealthCommand({
					output,
					json: g.json,
					client: g.client,
				}),
			);
		});

	cloud
		.command("readiness")
		.description("check MemoFS Cloud readiness")
		.action(async () => {
			setCurrentCommand("cloud.readiness");
			const g = await cloudGlobals();
			setExitCode(
				await runCloudReadinessCommand({
					output,
					json: g.json,
					client: g.client,
				}),
			);
		});

	const sync = cloud
		.command("sync")
		.description("use MemoFS Cloud file-replica sync APIs");

	sync
		.command("status")
		.description("read cloud sync status")
		.action(async () => {
			setCurrentCommand("cloud.sync.status");
			const g = await cloudGlobals();
			setExitCode(
				await runCloudSyncStatusCommand({
					output,
					json: g.json,
					client: g.client,
				}),
			);
		});

	sync
		.command("pull")
		.description("pull file replicas from the cloud")
		.option("--since <cursor>", "pull everything changed since this cursor")
		.action(async (options) => {
			setCurrentCommand("cloud.sync.pull");
			const g = await cloudGlobals();
			setExitCode(
				await runCloudSyncPullCommand({
					output,
					json: g.json,
					rootDir: g.root,
					client: g.client,
					since: options.since,
				}),
			);
		});

	sync
		.command("push")
		.description("push local .memofs/ file replicas to the cloud")
		.option("--base-cursor <cursor>", "cursor the client last synced at")
		.action(async (options) => {
			setCurrentCommand("cloud.sync.push");
			const g = await cloudGlobals();
			setExitCode(
				await runCloudSyncPushCommand({
					output,
					json: g.json,
					rootDir: g.root,
					stdinContent: stdinContent,
					client: g.client,
					baseCursor: options.baseCursor,
				}),
			);
		});

	const configCmd = program
		.command("config")
		.description("inspect or create .memofs/config.json");

	configCmd
		.command("get")
		.description("print resolved CLI configuration")
		.action(async () => {
			setCurrentCommand("config.get");
			const g = await globals();
			const safeConfig = {
				mode: g.memo.mode,
				projectId: g.memo.projectId,
				...(g.memo.workspaceId !== undefined
					? { workspaceId: g.memo.workspaceId }
					: {}),
				...(g.memo.cloud
					? { cloud: { configured: true } }
					: { cloud: { configured: false } }),
			};
			if (g.json) printJsonEnvelope(output, "config.get", safeConfig);
			else output.write(JSON.stringify(safeConfig, null, 2));
		});

	configCmd
		.command("init")
		.description("create .memofs/config.json without storing secrets")
		.option("-f, --force", "overwrite existing config", false)
		.action(async (options) => {
			setCurrentCommand("config.init");
			const g = await globals();
			// `--runtime`, `--cloud-url`, `--workspace-id`, and `--project-id` are
			// declared as global options on the parent program. Re-declaring them
			// on this subcommand causes Commander to shadow the subcommand storage
			// with the parent's, so the parsed values land in `program.opts()` and
			// the subcommand's options fall back to their defaults. Read them from
			// the global program opts instead — the documented UX
			// (`memofs config init --runtime hybrid --cloud-url ...`) keeps working.
			const programOpts = program.opts() as {
				runtime?: string;
				cloudUrl?: string;
				workspaceId?: string;
				projectId?: string;
			};
			const rootDir = path.resolve(cwd ?? process.cwd(), g.root);
			const result = await writeDefaultCliConfig({
				cwd: cwd ?? process.cwd(),
				root: g.root,
				force: options.force,
				config: {
					$schema: resolveSchemaPath(rootDir),
					runtime:
						(programOpts.runtime as MemoFsConfigFile["runtime"]) ?? "local",
					root: ".",
					cloud: {
						...(programOpts.cloudUrl ? { baseUrl: programOpts.cloudUrl } : {}),
						...(programOpts.workspaceId
							? { workspaceId: programOpts.workspaceId }
							: {}),
						...(programOpts.projectId
							? { projectId: programOpts.projectId }
							: {}),
					},
				} satisfies MemoFsConfigFile,
			});
			if (g.json) printJsonEnvelope(output, "config.init", result);
			else if (result.created) output.success(`Created ${result.path}`);
			else if (result.overwritten) output.success(`Overwrote ${result.path}`);
			else
				output.warn(`${result.path} already exists. Use --force to overwrite.`);
		});
}
