import { isTaskType, TASK_TYPES, type TaskType } from "@memofs/core";
import type { Command } from "commander";
import {
	runChunksCommand,
	runConsolidateCommand,
	runContextCommand,
	runDiffCommand,
	runDoctorCommand,
	runEventsCommand,
	runInitCommand,
	runInspectCommand,
	runMigrateAnchorsCommand,
	runReadCommand,
	runRememberCommand,
	runRestoreCommand,
	runSearchCommand,
	runSnapshotCommand,
	runStatusCommand,
	runValidateCommand,
} from "../commands";
import { type CLIContext, collect } from "./shared";

export function registerMemoryCommands(program: Command, ctx: CLIContext) {
	const {
		globals,
		setExitCode,
		setCurrentCommand,
		output,
		stdinContent,
		parsePositiveOption,
		parseNonNegativeOption,
	} = ctx;

	program
		.command("init")
		.description("initialize canonical .memofs/ files")
		.option("-f, --force", "overwrite existing seed files", false)
		.option("-p, --project-id <id>", "explicit project ID")
		.option("--no-input", "skip interactive prompts")
		.option("--no-embeddings", "skip predownloading the local embedding model")
		.action(async (options) => {
			setCurrentCommand("init");
			const g = await globals();
			// Commander treats --no-input as negatable: it sets options.input = false
			// when --no-input is passed. Handle both shapes (input === false and
			// noInput === true) and fall back to non-TTY auto-detection.
			const optsAny = options as {
				input?: boolean;
				noInput?: boolean;
				embeddings?: boolean;
			};
			const explicitNoInput =
				optsAny.input === false || optsAny.noInput === true;
			const noInput = explicitNoInput ? true : !process.stdout.isTTY;
			setExitCode(
				await runInitCommand({
					memo: g.memo,
					output,
					json: g.json,
					force: options.force,
					projectId: options.projectId,
					noInput,
					noEmbeddings: optsAny.embeddings === false,
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
		.option(
			"--fix",
			"automatically archive deprecated memories and consolidate graph",
			false,
		)
		.action(async (options) => {
			setCurrentCommand("doctor");
			const g = await globals();
			setExitCode(
				await runDoctorCommand({
					memo: g.memo,
					output,
					json: g.json,
					strict: options.strict,
					fix: options.fix,
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

	const migrate = program
		.command("migrate")
		.description("one-shot migration utilities for existing .memofs/ data");

	migrate
		.command("anchors")
		.description(
			"backfill AnchorRef onto existing notes.md entries by detecting file-path references",
		)
		.action(async () => {
			setCurrentCommand("migrate.anchors");
			const g = await globals();
			setExitCode(
				await runMigrateAnchorsCommand({
					memo: g.memo,
					output,
					json: g.json,
				}),
			);
		});

	program
		.command("consolidate")
		.description("merge duplicate graph nodes and retire superseded facts")
		.option(
			"--archive-deprecated",
			"physically move deprecated memories to .memofs/archive/<id>.json",
			false,
		)
		.action(async (options) => {
			setCurrentCommand("consolidate");
			const g = await globals();
			setExitCode(
				await runConsolidateCommand({
					memo: g.memo,
					output,
					json: g.json,
					archiveDeprecated: options.archiveDeprecated,
				}),
			);
		});

	program
		.command("restore")
		.description("restore an archived memory to active recall")
		.argument("<id>", "memory id to restore from .memofs/archive/")
		.action(async (id) => {
			setCurrentCommand("restore");
			const g = await globals();
			setExitCode(
				await runRestoreCommand({
					memo: g.memo,
					output,
					json: g.json,
					id,
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
}
