/**
 * CLI command handler for `memofs generate agent <target>`.
 *
 * The umbrella command that composes everything a target platform needs in one
 * go: the agent-rules file, platform-specific hooks (when the platform supports
 * them), and the MCP server config (registered with `@memofs/mcp-server`).
 * Works for every supported target — platforms without hooks (Gemini, Copilot)
 * simply skip the hooks step.
 *
 * Options:
 * - `--no-hooks` — emit rules + MCP only (no hooks file)
 * - `--no-mcp` — emit rules + hooks only (no MCP server config)
 * - `--scope <local|global>` — MCP config scope (defaults to the platform default)
 * - `--force` — overwrite existing files / MCP entry
 * - `--list` — list supported targets
 *
 * @module agent
 */

import { basename, resolve } from "node:path";
import type { MemoFS } from "@memofs/core";
import { getRootDir } from "../../cli/store-helpers";
import { CliUsageError } from "../../errors/cli-errors";
import type { CliOutput } from "../../output/output";
import { printJsonEnvelope } from "../../output/output";
import {
	AGENT_RULES_TARGETS,
	copyGitConventionsToRulesDir,
	emitAgentRules,
	parseAgentRulesTarget,
} from "./agent-rules";
import { getEmitter } from "./emitters";
import {
	type WriteResult,
	writeEmittedHookFiles,
	writeFilesWithForceProtect,
} from "./file-utils";
import {
	compactionSurvivalModule,
	contextInjectionModule,
	statusDisplayModule,
	subagentInjectionModule,
} from "./hooks";
import {
	type McpScope,
	resolveScope,
	supportsScope,
	writeMcpConfig,
} from "./mcp-config";

/**
 * The complete set of hook modules emitted by `generate agent`.
 *
 * SessionStart injects context, SubagentStart injects into subagents,
 * PreCompact re-injects after compaction, Stop displays compliance status.
 */
const ALL_MODULES = [
	contextInjectionModule,
	subagentInjectionModule,
	compactionSurvivalModule,
	statusDisplayModule,
];

/**
 * Options configuration for the `generate agent` command.
 */
export interface GenerateAgentCommandOptions {
	/** The MemoFS client instance. */
	readonly memo: MemoFS;
	/** The CLI output console wrapper. */
	readonly output: CliOutput;
	/** If true, outputs results in structured JSON format. */
	readonly json?: boolean;
	/** Target platform (any agent-rules target). */
	readonly target?: string;
	/** Project name; defaults to the directory basename. */
	readonly projectName?: string;
	/** If false, emit rules + MCP only (no hooks). Defaults to true. */
	readonly hooks?: boolean;
	/** If false, emit rules + hooks only (no MCP server config). Defaults to true. */
	readonly mcp?: boolean;
	/** MCP config scope: local or global. Defaults to the platform default. */
	readonly mcpScope?: McpScope;
	/** If true, list supported targets instead of generating. */
	readonly list?: boolean;
	/** If true, overwrite existing files / MCP entry. */
	readonly force?: boolean;
}

/**
 * Runs the `generate agent <target>` command: emits the agent-rules file +
 * platform-specific hooks (when supported) + MCP server config, and copies
 * `git-conventions.md` to the platform-local rules directory. The one-go setup
 * command for any agent platform.
 *
 * @param options - Command configuration options.
 * @returns CLI exit code.
 */
export async function runGenerateAgentCommand(
	options: GenerateAgentCommandOptions,
): Promise<number> {
	if (options.list) {
		const targets = AGENT_RULES_TARGETS.map((t) => {
			const emitter = getEmitter(t);
			return {
				target: t,
				hooks: emitter !== undefined,
				capabilities: emitter?.capabilities,
			};
		});
		if (options.json) {
			printJsonEnvelope(options.output, "generate.agent.list", targets);
		} else {
			const lines = ["Supported agent targets:", ""];
			for (const t of targets) {
				lines.push(
					` ${t.target.padEnd(10)} hooks: ${t.hooks ? "yes" : "no"}  capabilities: ${JSON.stringify(t.capabilities ?? null)}`,
				);
			}
			options.output.write(lines.join("\n"));
		}
		return 0;
	}

	if (!options.target) {
		throw new CliUsageError(
			`target is required (${AGENT_RULES_TARGETS.join(" | ")}). Use --list to see options.`,
		);
	}

	const target = parseAgentRulesTarget(options.target);
	if (!target) {
		throw new CliUsageError(
			`Unknown target "${options.target}". Supported: ${AGENT_RULES_TARGETS.join(", ")}.`,
		);
	}

	const emitter = getEmitter(target);
	const rootDir = getRootDir(options.memo.store);
	const projectName = options.projectName?.trim() || basename(resolve(rootDir));
	const includeHooks = options.hooks !== false && emitter !== undefined;
	const includeMcp = options.mcp !== false;
	const scope = resolveScope(target, options.mcpScope);
	// Only claim "context is auto-injected" in the rules file when the
	// platform actually injects hook stdout into the model's context.
	// opencode hooks run side effects only — its rules keep the
	// "call memofs.context yourself" phrasing.
	const contextAutoInjected =
		includeHooks && (emitter?.capabilities.contextInjection ?? false);

	if (includeMcp && !supportsScope(target, scope)) {
		throw new CliUsageError(
			`${target} does not support ${scope} MCP config scope`,
		);
	}

	const rulesFile = emitAgentRules({
		target,
		projectName,
		hooksInstalled: contextAutoInjected,
		...(includeMcp ? { mcpScope: scope } : {}),
	});

	const results: WriteResult[] = await writeFilesWithForceProtect(
		rootDir,
		[rulesFile],
		options.force ?? false,
	);

	if (includeHooks && emitter) {
		const hookFiles = emitter.emitHooks(ALL_MODULES);
		results.push(
			...(await writeEmittedHookFiles(
				rootDir,
				hookFiles,
				options.force ?? false,
			)),
		);
	}

	const conventionsResult = await copyGitConventionsToRulesDir(
		rootDir,
		target,
		options.force ?? false,
	);
	if (conventionsResult) {
		results.push(conventionsResult);
	}

	let mcpResult = null;
	if (includeMcp) {
		mcpResult = await writeMcpConfig({
			target,
			scope,
			rootDir,
			force: options.force ?? false,
		});
	}

	if (options.json) {
		printJsonEnvelope(options.output, "generate.agent", {
			target,
			hooks: includeHooks,
			mcp: includeMcp,
			scope: includeMcp ? scope : null,
			files: results,
			mcpConfig: mcpResult,
		});
	} else {
		for (const r of results) {
			if (r.created) {
				options.output.success(`Generated ${r.path}`);
			} else {
				options.output.warn(
					`${r.path} already exists. Re-run with --force to overwrite.`,
				);
			}
		}
		if (mcpResult) {
			if (mcpResult.skipped) {
				options.output.warn(
					`${mcpResult.path} already has a memofs entry. Re-run with --force to overwrite.`,
				);
			} else if (mcpResult.merged) {
				options.output.success(
					`Merged memofs MCP server into ${mcpResult.path} (${scope})`,
				);
			} else {
				options.output.success(`Created ${mcpResult.path} (${scope})`);
			}
		}
	}
	return 0;
}
