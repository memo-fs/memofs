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
import { CliError, CliUsageError } from "../../errors/cli-errors";
import type { CliOutput } from "../../output/output";
import { printJsonEnvelope } from "../../output/output";
import { writeFileWithForceProtect } from "./file-utils";
import {
	MCP_CONFIG_META,
	type McpScope,
	resolveMcpPath,
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
	/**
	 * `true` when the content is a thin `@AGENTS.md` import (claude target
	 * only, emitted when a root `AGENTS.md` already exists). The runner reads
	 * this to render the JSON envelope / success line, instead of re-deriving
	 * the decision on its side. Always undefined for full emission.
	 */
	readonly thinImport?: boolean;
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
	/**
	 * When true, emit the `## Workspace Rules` section pointing at the
	 * platform-local `git-conventions.md` (and copy that template in via
	 * `copyGitConventionsToRulesDir`). Bare `generate agent-rules` defaults to
	 * `false` — the emitted file is fully self-contained and references nothing
	 * the caller did not also generate. The umbrella `generate agent` sets
	 * `true` because it also copies `git-conventions.md` to the rules dir.
	 */
	readonly includeWorkspaceRules?: boolean;
	/**
	 * When true, a root `AGENTS.md` already exists. The `claude` target then
	 * emits a one-line `CLAUDE.md` that imports it via `@AGENTS.md` instead of
	 * duplicating content, following Claude Code's documented `@import`
	 * pattern. SSOT: never duplicate rules that the imported file already
	 * enforces. Has no effect for other targets.
	 */
	readonly agentsMdExists?: boolean;
}

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
 * Renders the optional `## Behavioral Rules` section for template interpolation.
 *
 * @param rules - Behavioral rules to embed.
 * @returns A string block (with leading and trailing newlines) or an empty
 * string if no rules are provided.
 */
function renderRulesSection(rules: readonly string[]): string {
	if (rules.length === 0) return "";
	const lines = ["", "## Behavioral Rules", ""];
	for (const rule of rules) lines.push(`- ${rule}`);
	lines.push("");
	return lines.join("\n");
}

/**
 * Renders the `## Workspace Rules` section for template interpolation.
 *
 * Only the umbrella `generate agent` command sets `include=true` — it also
 * copies `git-conventions.md` into the platform-local rules dir so the link
 * resolves. The bare `generate agent-rules` command leaves `include=false`
 * (default) so its output is fully self-contained and links at nothing the
 * caller did not also generate. The returned string carries no leading
 * newline (the prior placeholder's trailing newline already separates) but
 * carries one trailing newline so the final file ends cleanly.
 *
 * @param include - Whether to emit the section at all.
 * @param rulesDir - Project-relative path to the rules directory.
 * @returns The section block (with trailing newline), or an empty string.
 */
function buildWorkspaceRulesSection(
	include: boolean,
	rulesDir: string,
): string {
	if (!include) return "";
	return `## Workspace Rules\n\n- [Git conventions](./${rulesDir}/git-conventions.md) — MUST follow, no exceptions.\n`;
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
 * When `agentsMdExists` is set and `target === "claude"`, emits a one-line
 * `CLAUDE.md` containing `@AGENTS.md` — Claude Code's documented `@import`
 * pattern for sharing instructions across tools without duplicating them.
 * All other options are ignored in this case (SSOT win).
 *
 * @param opts - Emission options.
 * @returns The file path (project-relative) and full content.
 */
export function emitAgentRules(opts: EmitAgentRulesOptions): AgentRulesFile {
	const meta = TARGET_META[opts.target];

	// Thin emission: when a repo already has AGENTS.md, the `claude` target
	// imports it via `@AGENTS.md` instead of duplicating the rules. Claude
	// Code expands `@path` imports at session start (see Claude Code memory
	// docs). This avoids the SSOT violation of writing the same rules into
	// both files, and lets callers using unsupported agents keep AGENTS.md as
	// their single wired-up source of truth.
	if (opts.target === "claude" && opts.agentsMdExists) {
		return { path: meta.file, content: "@AGENTS.md\n", thinImport: true };
	}

	const hooksInstalled = opts.hooksInstalled ?? false;
	const includeWorkspaceRules = opts.includeWorkspaceRules ?? false;

	const content = interpolateTemplate(AGENT_RULES_TEMPLATE, {
		projectName: opts.projectName ?? "Project",
		hooksNote: buildHooksNote(hooksInstalled),
		stepOneText: buildStepOneText(hooksInstalled),
		rulesDir: meta.rulesDir,
		rules: renderRulesSection(opts.rules ?? []),
		workspaceRules: buildWorkspaceRulesSection(
			includeWorkspaceRules,
			meta.rulesDir,
		),
	});

	const frontmatter = buildFrontmatter(opts.target);
	let fullContent = (frontmatter ?? "") + content;
	// Collapse trailing blank lines left behind by empty `{{rules}}` /
	// `{{workspaceRules}}` placeholders into a single terminating newline.
	fullContent = fullContent.replace(/\n{2,}$/, "\n");

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
		const targets = AGENT_RULES_TARGETS.map((t) => {
			const meta = MCP_CONFIG_META[t];
			// `agents` is MCP-less (localPath + globalPath both null); resolveMcpPath
			// would throw for it. Use the default-scope path only when the target
			// actually supports that scope, else null.
			const mcp = supportsScope(t, meta.defaultScope)
				? resolveMcpPath(t)
				: null;
			return {
				target: t,
				file: TARGET_META[t].file,
				mcp,
				rulesDir: TARGET_META[t].rulesDir,
			};
		});
		if (options.json) {
			printJsonEnvelope(options.output, "generate.agent-rules.list", targets);
		} else {
			const lines = ["Supported agent-rules targets:", ""];
			for (const t of targets) {
				lines.push(` ${t.target.padEnd(8)} -> ${t.file}`);
				lines.push(` MCP config: ${t.mcp ?? "(none)"}`);
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
	const agentsMdExists = await agentsMdExistsAt(rootDir);

	if (options.mcpScope && !supportsScope(target, options.mcpScope)) {
		throw new CliUsageError(
			`${target} does not support ${options.mcpScope} MCP config scope`,
		);
	}

	let file: AgentRulesFile;
	try {
		file = emitAgentRules({
			target,
			projectName,
			mcpScope: options.mcpScope,
			agentsMdExists,
		});
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		options.output.error(message);
		return err instanceof CliError ? err.exitCode : 1;
	}

	const fullPath = resolve(rootDir, file.path);

	// Refuse to clobber an existing instructions file unless --force is set.
	// This protects hand-edited AGENTS.md / CLAUDE.md from silent overwrite,
	// including a downgrade from a previously full CLAUDE.md to the thin
	// `@AGENTS.md` form.
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

	const thinImport = file.thinImport ?? false;

	// `agents` is MCP-less (localPath + globalPath both null); resolveMcpPath
	// would throw, so leave mcpConfig null and omit it from the success line.
	const mcpConfig = supportsScope(target, MCP_CONFIG_META[target].defaultScope)
		? resolveMcpPath(target, options.mcpScope)
		: null;

	const data = {
		created: true,
		target,
		path: file.path,
		thinImport,
		lines: file.content.split("\n").length,
		mcpConfig,
		rulesDir: TARGET_META[target].rulesDir,
	};
	if (options.json) {
		printJsonEnvelope(options.output, "generate.agent-rules", data);
	} else {
		const lead = `Generated ${file.path}${thinImport ? " (thin @AGENTS.md import)" : ` (${data.lines} lines)`}`;
		options.output.success(
			mcpConfig === null ? lead : `${lead}. MemoFS MCP config: ${mcpConfig}`,
		);
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

/**
 * Resolves whether a root `AGENTS.md` already exists at the project root.
 * Used by both `generate agent-rules` and `generate agent` so the `claude`
 * target can decide between full emission and a thin `@AGENTS.md` import.
 *
 * @param rootDir - Project root directory.
 * @returns `true` if `AGENTS.md` exists at the root.
 * @throws {NodeJS.ErrnoException} Re-throws any `stat` error whose code is not
 * `ENOENT`/`ENOTDIR` (e.g. `EACCES`, `ELOOP`). Missing-file errors are
 * swallowed and yield `false`.
 */
export async function agentsMdExistsAt(rootDir: string): Promise<boolean> {
	try {
		await stat(resolve(rootDir, "AGENTS.md"));
		return true;
	} catch (err) {
		if (!isNotFoundError(err)) throw err;
		return false;
	}
}
