import type { Command } from "commander";
import {
	runGenerateAgentCommand,
	runGenerateAgentHooksCommand,
	runGenerateAgentRulesCommand,
	runGenerateMcpCommand,
} from "../commands";
import { type CLIContext, parseScope } from "./shared";

export function registerGenerateCommands(program: Command, ctx: CLIContext) {
	const { globals, setExitCode, setCurrentCommand, output } = ctx;

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
}
