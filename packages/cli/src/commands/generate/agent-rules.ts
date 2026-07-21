/**
 * CLI command handler for `memofs generate agent-rules`.
 *
 * Emits a <=50-line agent-instructions file (AGENTS.md, CLAUDE.md, GEMINI.md,
 * .github/copilot-instructions.md, or .cursor/rules/memofs.mdc) that enforces
 * the MemoFS MCP workflow. Each target gets a target-aware MCP config pointer
 * (each platform stores MCP servers in a different place). The file contains
 * only behavioral rules and pointers — no project facts (those live in
 * MemoFS memory, injected at runtime via `context`).
 *
 * @module agent-rules
 */

import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";
import type { MemoFS } from "@memofs/core";
import { getRootDir } from "../../cli/store-helpers";
import {
	CliError,
	CliUsageError,
	CliValidationError,
} from "../../errors/cli-errors";
import type { CliOutput } from "../../output/output";
import { printJsonEnvelope } from "../../output/output";
import { writeFileWithForceProtect } from "./file-utils";
import {
	type McpScope,
	resolveMcpGlobal,
	resolveMcpPath,
	resolveScope,
	supportsScope,
} from "./mcp-config";
import {
	AGENT_RULES_TARGETS,
	type AgentRulesTarget,
	parseAgentRulesTarget,
} from "./targets";
import { AGENT_RULES_TEMPLATE } from "./templates";

export type { AgentRulesTarget };
// Re-exported so existing imports from "./agent-rules" keep working.
export { AGENT_RULES_TARGETS, parseAgentRulesTarget };

/**
 * The emitted agent-rules file.
 */
export interface AgentRulesFile {
	/** Relative path from project root where the file should be written. */
	readonly path: string;
	/** Full file content including any frontmatter. */
	readonly content: string;
}

/**
 * Options for the pure emitter (no IO).
 */
export interface EmitAgentRulesOptions {
	/** Which target format to emit. */
	readonly target: AgentRulesTarget;
	/** Project name; falls back to "Project" when omitted. */
	readonly projectName?: string;
	/**
	 * Behavioral rules to embed (the repo-specific "Do not..." list). These are
	 * *process* rules, not facts, so they belong in the instructions file.
	 * Rendered as a `## Behavioral Rules` section between the memory section
	 * and the workspace rules.
	 */
	readonly rules?: readonly string[];
	/**
	 * MCP config scope to reflect in the rules-file pointer (`{{mcpPath}}`).
	 * Defaults to the platform's default scope. Used so the pointer matches the
	 * actual config location chosen by `generate agent` / `generate mcp`.
	 */
	readonly mcpScope?: McpScope;
	/**
	 * When true, the generated rules assume MemoFS hooks are installed — core
	 * context is auto-injected at session start. Step 1 is phrased accordingly
	 * and a lead-in note is emitted. Steps 2–4 are always present regardless.
	 * Used by `generate agent` (umbrella command with hooks installed).
	 */
	readonly hooksInstalled?: boolean;
}

/** Hard cap on generated file length. Project facts belong in MemoFS memory. */
export const MAX_AGENT_RULES_LINES = 50;

/**
 * Target -> file path + rules directory. MCP config locations live in
 * `mcp-config.ts` (`MCP_CONFIG_META`), the single source of truth for where
 * and how each platform's MCP server config is written.
 */
interface TargetMeta {
	/** Where the generated instructions file lives (project-relative). */
	readonly file: string;
	/**
	 * Platform-local rules directory where rule .md files live
	 * (e.g. `.claude/rules/`, `.agents/rules/`). Created on generate if it
	 * doesn't exist; `git-conventions.md` is copied here as the first rule.
	 */
	readonly rulesDir: string;
}

const TARGET_META: Record<AgentRulesTarget, TargetMeta> = {
	// OpenAI Codex: AGENTS.md at root; MCP servers in ~/.codex/config.toml
	// (global by default) or .codex/config.toml (local) under [mcp_servers].
	agents: { file: "AGENTS.md", rulesDir: ".agents/rules" },
	// "codex" is the explicit name for the same target as "agents".
	codex: { file: "AGENTS.md", rulesDir: ".agents/rules" },
	// Anthropic Claude Code: CLAUDE.md at root; project MCP in .mcp.json.
	claude: { file: "CLAUDE.md", rulesDir: ".claude/rules" },
	// Google Gemini CLI: GEMINI.md at root; project MCP in .gemini/settings.json.
	gemini: { file: "GEMINI.md", rulesDir: ".gemini/rules" },
	// VS Code + GitHub Copilot: .github/copilot-instructions.md; project
	// MCP in .vscode/mcp.json.
	copilot: {
		file: ".github/copilot-instructions.md",
		rulesDir: ".github/rules",
	},
	// Cursor: rules in .cursor/rules/*.mdc; project MCP in .cursor/mcp.json.
	cursor: { file: ".cursor/rules/memofs.mdc", rulesDir: ".cursor/rules" },
	// opencode: AGENTS.md at root (read natively); MCP config in opencode.json.
	opencode: { file: "AGENTS.md", rulesDir: ".agents/rules" },
};

/**
 * Returns the rules directory for a target.
 *
 * @param target - The target whose rules directory to resolve.
 * @returns Project-relative path to the platform-local rules directory.
 */
export function getRulesDir(target: AgentRulesTarget): string {
	return TARGET_META[target].rulesDir;
}

/**
 * Builds optional frontmatter for targets that require it (Cursor .mdc).
 *
 * @param target - The target format.
 * @returns Frontmatter block (with trailing blank line) or null.
 */
function buildFrontmatter(target: AgentRulesTarget): string | null {
	switch (target) {
		case "cursor":
			// Cursor .mdc requires frontmatter (description + globs + alwaysApply),
			// followed by a blank line so the closing "---" isn't misparsed.
			return [
				"---",
				"description: MemoFS memory workflow — load context, recall, remember.",
				"globs: **/*",
				"alwaysApply: true",
				"---",
				"",
				"",
			].join("\n");
		default:
			return null;
	}
}

/**
 * Resolves the target-aware MCP config label for use in template interpolation.
 *
 * @param target - The target whose MCP config label to resolve.
 * @param scope - Explicit scope, or undefined to use the platform default.
 * @returns A human-readable label, e.g. "MemoFS MCP server config (project MCP config)".
 */
function resolveMcpLabel(target: AgentRulesTarget, scope?: McpScope): string {
	const global = resolveMcpGlobal(target, scope);
	return `MemoFS MCP server config (${global ? "global" : "project"} MCP config)`;
}

/**
 * Renders the optional `## Behavioral Rules` section for template interpolation.
 *
 * @param rules - Behavioral rules to embed.
 * @returns A string block (with leading and trailing newlines) or a single
 * newline if no rules are provided.
 */
function renderRulesSection(rules: readonly string[]): string {
	if (rules.length === 0) return "";
	const lines = ["", "## Behavioral Rules", ""];
	for (const rule of rules) lines.push(`- ${rule}`);
	lines.push("");
	return lines.join("\n");
}

/**
 * Interpolates `{{placeholder}}` variables in a template string.
 *
 * @param template - Raw template content with `{{key}}` placeholders.
 * @param vars - Key-value map for substitution.
 * @returns The interpolated string.
 */
function interpolateTemplate(
	template: string,
	vars: Readonly<Record<string, string>>,
): string {
	return template.replace(/\{\{(\w+)\}\}/g, (match, key: string) => {
		const value = vars[key];
		return value !== undefined ? value : match;
	});
}

/**
 * Precomputes the `{{hooksNote}}` lead-in paragraph for the unified template.
 *
 * When hooks are installed, emits a note telling the agent that core context
 * is auto-injected but that the numbered steps still apply. When hooks are not
 * installed, emits nothing (the template's surrounding blank lines render a
 * clean paragraph break either way).
 *
 * @param hooksInstalled - Whether MemoFS hooks are installed for this target.
 * @returns The note text (with a trailing newline so it renders as its own
 * paragraph), or an empty string.
 */
function buildHooksNote(hooksInstalled: boolean): string {
	if (!hooksInstalled) return "";
	return "MemoFS hooks are installed — core context is injected automatically at session start. Treat that as your starting point, not your last lookup: the steps below still apply for the rest of the task.\n";
}

/**
 * Precomputes the `{{stepOneText}}` bullet text for the unified template.
 *
 * Only step 1's phrasing changes based on whether hooks are installed;
 * steps 2–4 are identical in both cases (recall, adhere, remember are always
 * the agent's job — hooks cannot do them).
 *
 * @param hooksInstalled - Whether MemoFS hooks are installed for this target.
 * @returns The step-1 bullet body (without the trailing period — the template
 * supplies it).
 */
function buildStepOneText(hooksInstalled: boolean): string {
	return hooksInstalled
		? "auto-loaded via hooks at session start; if it's missing, stale, or this is a new subtask/focus area, call the MemoFS `context` tool (e.g. `memofs.context`) directly"
		: "call the MemoFS `context` tool (e.g. `memofs.context`) with the task description to load core memory, notes, and recall";
}

/**
 * Emits the agent-rules file content for a target. Pure function — no IO.
 *
 * Reads the unified `agent-rules.md` template, interpolates target-aware
 * placeholders, and prepends target-specific frontmatter if needed
 * (Cursor `.mdc`). Steps 2–4 of the memory workflow are always present;
 * only the lead-in note and step-1 phrasing vary with `hooksInstalled`.
 *
 * @param opts - Emission options.
 * @returns The file path (project-relative) and full content.
 * @throws {CliError} When the result exceeds {@link MAX_AGENT_RULES_LINES}.
 */
export function emitAgentRules(opts: EmitAgentRulesOptions): AgentRulesFile {
	const meta = TARGET_META[opts.target];
	const hooksInstalled = opts.hooksInstalled ?? false;
	const scope = resolveScope(opts.target, opts.mcpScope);

	const content = interpolateTemplate(AGENT_RULES_TEMPLATE, {
		projectName: opts.projectName ?? "Project",
		hooksNote: buildHooksNote(hooksInstalled),
		stepOneText: buildStepOneText(hooksInstalled),
		rulesDir: meta.rulesDir,
		mcpLabel: resolveMcpLabel(opts.target, scope),
		mcpPath: resolveMcpPath(opts.target, scope),
		rules: renderRulesSection(opts.rules ?? []),
	});

	const frontmatter = buildFrontmatter(opts.target);
	const fullContent = (frontmatter ?? "") + content;

	const lineCount = fullContent.split("\n").length;
	if (lineCount > MAX_AGENT_RULES_LINES) {
		throw new CliValidationError(
			`Generated ${opts.target} rules exceed ${MAX_AGENT_RULES_LINES} lines (${lineCount}). Trim rules or pointers — project facts belong in MemoFS memory, not this file.`,
		);
	}

	return { path: meta.file, content: fullContent };
}

/**
 * Options configuration for the `generate agent-rules` command.
 */
export interface GenerateAgentRulesCommandOptions {
	/** The MemoFS client instance. */
	readonly memo: MemoFS;
	/** The CLI output console wrapper. */
	readonly output: CliOutput;
	/** If true, outputs results in structured JSON format. */
	readonly json?: boolean;
	/** Target format: agents | codex | claude | gemini | copilot | cursor | opencode. */
	readonly target?: string;
	/** Project name; defaults to the directory basename. */
	readonly projectName?: string;
	/** MCP config scope reflected in the rules-file pointer. */
	readonly mcpScope?: McpScope;
	/** If true, list supported targets instead of generating. */
	readonly list?: boolean;
	/** If true, overwrite an existing instructions file. */
	readonly force?: boolean;
}

/**
 * Runs the `generate agent-rules` command: emits a MemoFS-enforcing
 * instructions file for the given target and writes it to the project root.
 *
 * @param options - Command configuration options.
 * @returns CLI exit code.
 */
export async function runGenerateAgentRulesCommand(
	options: GenerateAgentRulesCommandOptions,
): Promise<number> {
	if (options.list) {
		const targets = AGENT_RULES_TARGETS.map((t) => ({
			target: t,
			file: TARGET_META[t].file,
			mcp: resolveMcpPath(t),
			rulesDir: TARGET_META[t].rulesDir,
		}));
		if (options.json) {
			printJsonEnvelope(options.output, "generate.agent-rules.list", targets);
		} else {
			const lines = ["Supported agent-rules targets:", ""];
			for (const t of targets) {
				lines.push(` ${t.target.padEnd(8)} -> ${t.file}`);
				lines.push(` MCP config: ${t.mcp}`);
				lines.push(` Rules dir:  ${t.rulesDir}`);
			}
			options.output.write(lines.join("\n"));
		}
		return 0;
	}

	if (!options.target) {
		throw new CliUsageError(
			"target is required (agents | codex | claude | gemini | copilot | cursor | opencode). Use --list to see options.",
		);
	}

	const target = parseAgentRulesTarget(options.target);
	if (!target) {
		throw new CliUsageError(
			`Unknown target "${options.target}". Supported: ${AGENT_RULES_TARGETS.join(", ")}.`,
		);
	}

	const rootDir = getRootDir(options.memo.store);
	const projectName = options.projectName?.trim() || basename(resolve(rootDir));

	if (options.mcpScope && !supportsScope(target, options.mcpScope)) {
		throw new CliUsageError(
			`${target} does not support ${options.mcpScope} MCP config scope`,
		);
	}

	let file: AgentRulesFile;
	try {
		file = emitAgentRules({ target, projectName, mcpScope: options.mcpScope });
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		options.output.error(message);
		return err instanceof CliError ? err.exitCode : 1;
	}

	const fullPath = resolve(rootDir, file.path);

	// Refuse to clobber an existing instructions file unless --force is set.
	// This protects hand-edited AGENTS.md / CLAUDE.md from silent overwrite.
	if (!options.force) {
		try {
			await stat(fullPath);
			const message = `${file.path} already exists. Re-run with --force to overwrite.`;
			if (options.json) {
				printJsonEnvelope(options.output, "generate.agent-rules", {
					created: false,
					target,
					path: file.path,
					exists: true,
				});
			} else {
				options.output.warn(message);
			}
			return 0;
		} catch (err) {
			if (!isNotFoundError(err)) throw err;
			// File does not exist — proceed to write.
		}
	}

	// Create parent directories (e.g. .github/, .cursor/rules/) if needed.
	await mkdir(dirname(fullPath), { recursive: true });
	await writeFile(fullPath, file.content, "utf8");

	const convResult = await copyGitConventionsToRulesDir(
		rootDir,
		target,
		options.force ?? false,
	);

	const data = {
		created: true,
		target,
		path: file.path,
		lines: file.content.split("\n").length,
		mcpConfig: resolveMcpPath(target, options.mcpScope),
		rulesDir: TARGET_META[target].rulesDir,
		gitConventions: convResult,
	};
	if (options.json) {
		printJsonEnvelope(options.output, "generate.agent-rules", data);
	} else {
		options.output.success(
			`Generated ${file.path} (${data.lines} lines) — MemoFS MCP configured at ${data.mcpConfig}`,
		);
		if (convResult?.created) {
			options.output.success(`Copied git-conventions.md to ${convResult.path}`);
		} else if (convResult?.skipped) {
			options.output.warn(
				`${convResult.path} already exists. Re-run with --force to overwrite.`,
			);
		}
	}
	return 0;
}

/**
 * Copies the root `git-conventions.md` template into a target's platform-local
 * rules directory. Creates the directory if it doesn't exist. Skips silently
 * if the root template doesn't exist or the destination already exists
 * (unless `force` is true).
 *
 * @param rootDir - Project root directory.
 * @param target - The target whose rules directory receives the copy.
 * @param force - If true, overwrites an existing destination file.
 * @returns Result info, or `null` if no root template was found.
 */
export async function copyGitConventionsToRulesDir(
	rootDir: string,
	target: AgentRulesTarget,
	force: boolean,
): Promise<{
	path: string;
	created: boolean;
	skipped?: boolean;
} | null> {
	const rulesDir = TARGET_META[target].rulesDir;
	const relativePath = `${rulesDir}/git-conventions.md`;
	const sourcePath = resolve(rootDir, "git-conventions.md");

	let sourceContent: string;
	try {
		sourceContent = await readFile(sourcePath, "utf8");
	} catch {
		return null;
	}

	return writeFileWithForceProtect(rootDir, relativePath, sourceContent, force);
}

/**
 * Detects Node's "file not found" error across fs/promises calls.
 *
 * @param err - Error value from a caught fs call.
 * @returns True if the error indicates the path does not exist.
 */
function isNotFoundError(err: unknown): boolean {
	if (!(err instanceof Error)) return false;
	const code = (err as NodeJS.ErrnoException).code;
	return code === "ENOENT" || code === "ENOTDIR";
}
