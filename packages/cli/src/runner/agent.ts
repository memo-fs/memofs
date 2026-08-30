import type { Command } from "commander";
import {
	runAgentCompleteCommand,
	runAgentExtractCommand,
	runAgentPathsCommand,
	runAgentStartCommand,
} from "../commands";
import type { CLIContext } from "./shared";

export function registerAgentCommands(program: Command, ctx: CLIContext) {
	const { globals, setExitCode, setCurrentCommand, output } = ctx;

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
}
