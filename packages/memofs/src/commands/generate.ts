/**
 * CLI command handler for `tekmemo generate agent-rules`.
 *
 * Emits a <=50-line agent-instructions file (AGENTS.md, CLAUDE.md, GEMINI.md,
 * .github/copilot-instructions.md, or .cursor/rules/tekmemo.mdc) that enforces
 * the TekMemo MCP workflow. Each target gets a target-aware MCP config pointer
 * (each platform stores MCP servers in a different place). The file contains
 * only behavioral rules and pointers — no project facts (those live in
 * TekMemo memory, injected at runtime via `context`).
 *
 * @module generate
 */

import { mkdir, stat, writeFile } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";
import type { Tekmemo } from "@memofs/core";
import { getRootDir } from "../cli/store-helpers";
import {
	CliError,
	CliUsageError,
	CliValidationError,
} from "../errors/cli-errors";
import type { CliOutput } from "../output/output";
import { printJsonEnvelope } from "../output/output";

/**
 * Canonical targets a user can generate.
 */
export type AgentRulesTarget =
	| "agents"
	| "claude"
	| "gemini"
	| "copilot"
	| "cursor";

/**
 * A pointer line rendered as `- {label}: [{path}]({path})`.
 */
export interface AgentRulesPointer {
	/** Human-readable label, e.g. "Workspace rules". */
	readonly label: string;
	/** Relative or absolute path string. */
	readonly path: string;
}

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
	 */
	readonly rules?: readonly string[];
	/**
	 * Extra pointers beyond the built-in MCP pointer. The target-aware MCP
	 * config pointer is always appended last.
	 */
	readonly pointers?: readonly AgentRulesPointer[];
}

/** Hard cap on generated file length. Project facts belong in TekMemo memory. */
export const MAX_AGENT_RULES_LINES = 50;

/**
 * Target -> file path + MCP config location (verified per-platform docs,
 * June 2026).
 */
interface TargetMeta {
	/** Where the generated instructions file lives (project-relative). */
	readonly file: string;
	/**
	 * MCP server config for this platform. `global` means it lives outside the
	 * repo (user home).
	 */
	readonly mcp: { readonly path: string; readonly global: boolean };
}

const TARGET_META: Record<AgentRulesTarget, TargetMeta> = {
	// OpenAI Codex: AGENTS.md at root; MCP servers live globally in
	// ~/.codex/config.toml under [mcp_servers] (stdio-only).
	agents: {
		file: "AGENTS.md",
		mcp: { path: "~/.codex/config.toml", global: true },
	},
	// Anthropic Claude Code: CLAUDE.md at root; project MCP in .mcp.json.
	claude: {
		file: "CLAUDE.md",
		mcp: { path: ".mcp.json", global: false },
	},
	// Google Gemini CLI: GEMINI.md at root; project MCP in .gemini/settings.json.
	gemini: {
		file: "GEMINI.md",
		mcp: { path: ".gemini/settings.json", global: false },
	},
	// VS Code + GitHub Copilot: .github/copilot-instructions.md; project
	// MCP in .vscode/mcp.json.
	copilot: {
		file: ".github/copilot-instructions.md",
		mcp: { path: ".vscode/mcp.json", global: false },
	},
	// Cursor: rules in .cursor/rules/*.mdc; project MCP in .cursor/mcp.json.
	cursor: {
		file: ".cursor/rules/tekmemo.mdc",
		mcp: { path: ".cursor/mcp.json", global: false },
	},
};

const DEFAULT_POINTERS: AgentRulesPointer[] = [
	{ label: "Workspace rules", path: "./.agents/rules" },
	{ label: "Global skills", path: "~/.agents/skills/" },
];

/**
 * Ordered list of supported targets (for `--list`).
 */
export const AGENT_RULES_TARGETS = Object.keys(
	TARGET_META,
) as AgentRulesTarget[];

/**
 * Parses a target alias (case-insensitive). Accepts the canonical id and the
 * common filename aliases (e.g. "agents" | "agents.md" | "AGENTS.md").
 *
 * @param input - Raw user input.
 * @returns The normalized target, or undefined if unrecognized.
 */
export function parseAgentRulesTarget(
	input: string,
): AgentRulesTarget | undefined {
	const norm = input
		.trim()
		.toLowerCase()
		.replace(/\.md(c?)$/, "$1");
	for (const target of AGENT_RULES_TARGETS) {
		if (target === norm) return target;
	}
	return undefined;
}

/**
 * Builds the target-aware MCP config pointer.
 *
 * @param target - The target whose MCP config path to resolve.
 * @returns A pointer describing where this platform looks for MCP servers.
 */
export function resolveMcpPointer(target: AgentRulesTarget): AgentRulesPointer {
	const { mcp } = TARGET_META[target];
	const hint = mcp.global ? " (global MCP config)" : " (project MCP config)";
	return { label: `TekMemo MCP server config${hint}`, path: mcp.path };
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
				"description: TekMemo memory workflow — load context, recall, remember.",
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
 * Builds the shared markdown body (the TekMemo workflow directive + rules +
 * pointers). Pure: identical for every target except the prepended frontmatter.
 *
 * @param opts - Resolved options (all fields required).
 * @returns Lines that make up the body.
 */
function buildBody(opts: {
	projectName: string;
	rules: readonly string[];
	pointers: readonly AgentRulesPointer[];
}): string[] {
	const lines: string[] = [];
	lines.push(`# ${opts.projectName} — Agent Rules`);
	lines.push("");
	lines.push(
		"This file is the bootstrap for agents working in this repo. **All project knowledge lives in TekMemo** — use MCP tools, not this file.",
	);
	lines.push("");
	lines.push("## TekMemo Memory (REQUIRED)");
	lines.push("");
	lines.push(
		"This repo uses TekMemo as its single source of truth for project knowledge.",
	);
	lines.push("At the **start of every task**, agents MUST:");
	lines.push("");
	lines.push(
		"1. **Load context** — call the TekMemo `context` tool (e.g. `tekmemo.context`) with the task description to load core memory, notes, and recall.",
	);
	lines.push(
		"2. **Look up details** — use the TekMemo `recall` tool (e.g. `tekmemo.recall`) for specific lookups when context is insufficient.",
	);
	lines.push(
		"3. **Adhere to memory** — follow constraints, decisions, and references returned.",
	);
	lines.push(
		"4. **Persist new facts** — store discovered facts/decisions via the TekMemo `remember` tool (e.g. `tekmemo.remember`).",
	);
	lines.push("");
	lines.push(
		"This file contains only behavioral rules and pointers — no project facts.",
	);
	lines.push("");
	lines.push("## Behavioral Rules");
	lines.push("");
	for (const rule of opts.rules) lines.push(`- ${rule}`);
	lines.push("");
	lines.push("## Pointers");
	lines.push("");
	for (const p of opts.pointers)
		lines.push(`- ${p.label}: [${p.path}](${p.path})`);
	lines.push("");
	return lines;
}

/**
 * Emits the agent-rules file content for a target. Pure function — no IO.
 *
 * @param opts - Emission options.
 * @returns The file path (project-relative) and full content.
 * @throws {CliError} When the result exceeds {@link MAX_AGENT_RULES_LINES}.
 */
export function emitAgentRules(opts: EmitAgentRulesOptions): AgentRulesFile {
	const extra = opts.pointers ?? DEFAULT_POINTERS;
	// MCP pointer is always last and always target-aware.
	const pointers = [...extra, resolveMcpPointer(opts.target)];

	const body = buildBody({
		projectName: opts.projectName ?? "Project",
		rules: opts.rules ?? [],
		pointers,
	});
	const frontmatter = buildFrontmatter(opts.target);
	const content = (frontmatter ?? "") + body.join("\n");

	const lineCount = content.split("\n").length;
	if (lineCount > MAX_AGENT_RULES_LINES) {
		throw new CliValidationError(
			`Generated ${opts.target} rules exceed ${MAX_AGENT_RULES_LINES} lines (${lineCount}). Trim rules or pointers — project facts belong in TekMemo memory, not this file.`,
		);
	}

	return { path: TARGET_META[opts.target].file, content };
}

/**
 * Options configuration for the `generate agent-rules` command.
 */
export interface GenerateAgentRulesCommandOptions {
	/** The Tekmemo client instance. */
	readonly memo: Tekmemo;
	/** The CLI output console wrapper. */
	readonly output: CliOutput;
	/** If true, outputs results in structured JSON format. */
	readonly json?: boolean;
	/** Target format: agents | claude | gemini | copilot | cursor. */
	readonly target?: string;
	/** Project name; defaults to the directory basename. */
	readonly projectName?: string;
	/** If true, list supported targets instead of generating. */
	readonly list?: boolean;
	/** If true, overwrite an existing instructions file. */
	readonly force?: boolean;
}

/**
 * Runs the `generate agent-rules` command: emits a TekMemo-enforcing
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
			mcp: TARGET_META[t].mcp.path,
		}));
		if (options.json) {
			printJsonEnvelope(options.output, "generate.agent-rules.list", targets);
		} else {
			const lines = ["Supported agent-rules targets:", ""];
			for (const t of targets) {
				lines.push(` ${t.target.padEnd(8)} -> ${t.file}`);
				lines.push(` MCP config: ${t.mcp}`);
			}
			options.output.write(lines.join("\n"));
		}
		return 0;
	}

	if (!options.target) {
		throw new CliUsageError(
			"target is required (agents | claude | gemini | copilot | cursor). Use --list to see options.",
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

	let file: AgentRulesFile;
	try {
		file = emitAgentRules({ target, projectName });
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

	const data = {
		created: true,
		target,
		path: file.path,
		lines: file.content.split("\n").length,
		mcpConfig: TARGET_META[target].mcp.path,
	};
	if (options.json) {
		printJsonEnvelope(options.output, "generate.agent-rules", data);
	} else {
		options.output.success(
			`Generated ${file.path} (${data.lines} lines) — TekMemo MCP configured at ${data.mcpConfig}`,
		);
	}
	return 0;
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
