/**
 * MCP server config emission for the `generate` command family.
 *
 * Writes the platform-specific MCP server configuration that registers the
 * `@memofs/mcp-server` stdio server with an agent platform. Each platform
 * stores its MCP config in a different place and shape:
 *
 * - `json-mcpServers` — Claude Code, Gemini, Copilot, Cursor: a JSON file with
 *   an `mcpServers` object (`{ command, args }` per server).
 * - `json-mcp` — opencode: a JSON file with an `mcp` object
 *   (`{ type: "local", command: [...] }` per server).
 * - `toml-mcp_servers` — Codex: a TOML file with `[mcp_servers.<name>]` tables.
 *
 * Writing is **additive and safe**: existing config files are read and merged —
 * other servers/keys are preserved. If a `memofs` entry already exists it is
 * left untouched unless `--force` is passed. No secrets are ever written; cloud
 * credentials are supplied via environment variables at runtime.
 *
 * Scope:
 * - `local` — project-relative config (committable, portable). The server is
 *   launched with the project root as cwd, so `--root` is omitted.
 * - `global` — user-home config (per-machine). The server is launched with an
 *   absolute `--root` so it targets the specific project.
 *
 * @module mcp-config
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import type { MemoFS } from "@memofs/core";
import { getRootDir } from "../../cli/store-helpers";
import { CliUsageError, CliValidationError } from "../../errors/cli-errors";
import type { CliOutput } from "../../output/output";
import { printJsonEnvelope } from "../../output/output";
import {
	AGENT_RULES_TARGETS,
	type AgentRulesTarget,
	parseAgentRulesTarget,
} from "./targets";

export type { AgentRulesTarget } from "./targets";

/**
 * MCP config scope.
 *
 * - `local` — project-relative (committable, portable).
 * - `global` — user-home (per-machine, absolute root).
 */
export type McpScope = "local" | "global";

/**
 * The config file format a platform uses for MCP server registration.
 */
export type McpConfigFormat =
	| "json-mcpServers"
	| "json-mcp"
	| "toml-mcp_servers";

/**
 * Per-platform MCP config metadata. The single source of truth for where and
 * how a platform's MCP server config is written.
 */
export interface McpConfigMeta {
	/** Config file format. */
	readonly format: McpConfigFormat;
	/** Project-relative config path, or `null` if local scope is unsupported. */
	readonly localPath: string | null;
	/** User-home config path (may start with `~/`), or `null` if global scope is unsupported. */
	readonly globalPath: string | null;
	/** Default scope used for the rules-file pointer and when `--scope` is omitted. */
	readonly defaultScope: McpScope;
}

/**
 * The MCP server name under which MemoFS is registered in every platform.
 */
const SERVER_NAME = "memofs";

/**
 * The npm command used to launch the MCP server on demand.
 */
const SERVER_COMMAND = "npx";

/**
 * Per-platform MCP config metadata.
 *
 * Adding a platform is one entry here (plus its `TARGET_META` entry in
 * `agent-rules.ts`). `defaultScope` preserves each platform's conventional
 * config location (Codex defaults to global; all others default to local).
 */
export const MCP_CONFIG_META: Record<AgentRulesTarget, McpConfigMeta> = {
	agents: {
		format: "toml-mcp_servers",
		localPath: ".codex/config.toml",
		globalPath: "~/.codex/config.toml",
		defaultScope: "global",
	},
	codex: {
		format: "toml-mcp_servers",
		localPath: ".codex/config.toml",
		globalPath: "~/.codex/config.toml",
		defaultScope: "global",
	},
	claude: {
		format: "json-mcpServers",
		localPath: ".mcp.json",
		globalPath: "~/.claude.json",
		defaultScope: "local",
	},
	gemini: {
		format: "json-mcpServers",
		localPath: ".gemini/settings.json",
		globalPath: "~/.gemini/settings.json",
		defaultScope: "local",
	},
	copilot: {
		format: "json-mcpServers",
		localPath: ".vscode/mcp.json",
		globalPath: null,
		defaultScope: "local",
	},
	cursor: {
		format: "json-mcpServers",
		localPath: ".cursor/mcp.json",
		globalPath: "~/.cursor/mcp.json",
		defaultScope: "local",
	},
	opencode: {
		format: "json-mcp",
		localPath: "opencode.json",
		globalPath: "~/.config/opencode/opencode.json",
		defaultScope: "local",
	},
};

/**
 * Returns whether a target supports the given scope.
 *
 * @param target - The target platform.
 * @param scope - The scope to check.
 * @returns True if the scope's config path is defined for the target.
 */
export function supportsScope(
	target: AgentRulesTarget,
	scope: McpScope,
): boolean {
	const meta = MCP_CONFIG_META[target];
	return (scope === "global" ? meta.globalPath : meta.localPath) !== null;
}

/**
 * Resolves the effective scope for a target, falling back to its default.
 *
 * @param target - The target platform.
 * @param scope - Explicit scope, or undefined to use the platform default.
 * @returns The resolved scope.
 */
export function resolveScope(
	target: AgentRulesTarget,
	scope?: McpScope,
): McpScope {
	return scope ?? MCP_CONFIG_META[target].defaultScope;
}

/**
 * Resolves the config path for a target at a given (or default) scope.
 *
 * @param target - The target platform.
 * @param scope - Explicit scope, or undefined to use the platform default.
 * @returns The project-relative or home-relative config path.
 * @throws {CliUsageError} When the scope is not supported by the target.
 */
export function resolveMcpPath(
	target: AgentRulesTarget,
	scope?: McpScope,
): string {
	const effective = resolveScope(target, scope);
	const meta = MCP_CONFIG_META[target];
	const path = effective === "global" ? meta.globalPath : meta.localPath;
	if (path === null) {
		throw new CliUsageError(
			`${target} does not support ${effective} MCP config scope`,
		);
	}
	return path;
}

/**
 * Returns whether the config path for a target at a given (or default) scope is
 * global (lives outside the repo, in the user's home directory).
 *
 * @param target - The target platform.
 * @param scope - Explicit scope, or undefined to use the platform default.
 * @returns True if the resolved scope is global.
 */
export function resolveMcpGlobal(
	target: AgentRulesTarget,
	scope?: McpScope,
): boolean {
	return resolveScope(target, scope) === "global";
}

/**
 * Builds the stdio args for the MCP server command.
 *
 * Local scope omits `--root` (the client launches with the project root as
 * cwd, so the server's cwd default is correct and the config stays portable
 * across machines). Global scope includes an absolute `--root` so the
 * per-machine config targets the specific project.
 *
 * @param scope - The config scope.
 * @param rootDir - Project root directory (made absolute for global scope).
 * @returns The arg list following `-y @memofs/mcp-server`.
 */
function buildServerArgs(scope: McpScope, rootDir: string): string[] {
	const base = ["-y", "@memofs/mcp-server"];
	return scope === "global" ? [...base, "--root", resolve(rootDir)] : base;
}

/**
 * Builds the platform-specific server entry for JSON formats.
 *
 * @param format - The JSON config format.
 * @param scope - The config scope.
 * @param rootDir - Project root directory.
 * @returns The server entry object to place under the top-level key.
 */
function buildJsonServerEntry(
	format: McpConfigFormat,
	scope: McpScope,
	rootDir: string,
): Record<string, unknown> {
	const args = buildServerArgs(scope, rootDir);
	if (format === "json-mcp") {
		return { type: "local", command: [SERVER_COMMAND, ...args] };
	}
	return { command: SERVER_COMMAND, args };
}

/**
 * Renders the TOML block for the memofs MCP server.
 *
 * @param scope - The config scope.
 * @param rootDir - Project root directory.
 * @returns The block lines (without trailing newline).
 */
function buildTomlBlock(scope: McpScope, rootDir: string): string[] {
	const args = buildServerArgs(scope, rootDir);
	return [
		`[mcp_servers.${SERVER_NAME}]`,
		`command = ${JSON.stringify(SERVER_COMMAND)}`,
		`args = ${JSON.stringify(args)}`,
	];
}

/**
 * The top-level JSON key that holds MCP servers, per JSON format.
 */
function jsonTopKey(format: McpConfigFormat): string {
	return format === "json-mcp" ? "mcp" : "mcpServers";
}

/**
 * Merges the memofs server entry into an existing JSON config, preserving all
 * other keys and servers.
 *
 * @param existingContent - Existing file content (or undefined if no file).
 * @param format - The JSON config format.
 * @param rootDir - Project root directory.
 * @param scope - The config scope.
 * @returns The merged content and whether a memofs entry already existed.
 * @throws {CliValidationError} When existing content is not valid JSON.
 */
function mergeJsonConfig(
	existingContent: string | undefined,
	format: McpConfigFormat,
	scope: McpScope,
	rootDir: string,
): { readonly content: string; readonly entryExisted: boolean } {
	let root: Record<string, unknown>;
	if (existingContent && existingContent.trim().length > 0) {
		try {
			root = JSON.parse(existingContent) as Record<string, unknown>;
		} catch (cause) {
			throw new CliValidationError(
				`Existing MCP config is not valid JSON; merge aborted to avoid clobbering. Fix or remove it and re-run.`,
				{ cause },
			);
		}
	} else {
		root = {};
	}
	const topKey = jsonTopKey(format);
	const servers = (root[topKey] as Record<string, unknown> | undefined) ?? {};
	const entryExisted = Object.hasOwn(servers, SERVER_NAME);
	root[topKey] = {
		...servers,
		[SERVER_NAME]: buildJsonServerEntry(format, scope, rootDir),
	};
	const content = `${JSON.stringify(root, null, 2)}\n`;
	return { content, entryExisted };
}

/**
 * Merges the `[mcp_servers.memofs]` block into an existing TOML config,
 * preserving all other tables. Replaces an existing memofs block in place or
 * appends a new one.
 *
 * @param existingContent - Existing file content (or undefined if no file).
 * @param scope - The config scope.
 * @param rootDir - Project root directory.
 * @returns The merged content and whether a memofs block already existed.
 */
function mergeTomlConfig(
	existingContent: string | undefined,
	scope: McpScope,
	rootDir: string,
): { readonly content: string; readonly entryExisted: boolean } {
	const blockLines = buildTomlBlock(scope, rootDir);
	const header = `[mcp_servers.${SERVER_NAME}]`;

	if (!existingContent || existingContent.trim().length === 0) {
		return { content: `${blockLines.join("\n")}\n`, entryExisted: false };
	}

	const lines = existingContent.split("\n");
	const headerIdx = lines.findIndex((line) => line.trim() === header);
	if (headerIdx === -1) {
		const prefix = existingContent.endsWith("\n")
			? existingContent
			: `${existingContent}\n`;
		return {
			content: `${prefix}${blockLines.join("\n")}\n`,
			entryExisted: false,
		};
	}

	let endIdx = headerIdx + 1;
	while (endIdx < lines.length && !lines[endIdx]?.trim().startsWith("[")) {
		endIdx += 1;
	}
	const newLines = [
		...lines.slice(0, headerIdx),
		...blockLines,
		...lines.slice(endIdx),
	];
	return { content: `${newLines.join("\n")}\n`, entryExisted: true };
}

/**
 * Options for the pure MCP config emitter (no IO).
 */
export interface EmitMcpConfigOptions {
	/** Target platform. */
	readonly target: AgentRulesTarget;
	/** Config scope. */
	readonly scope: McpScope;
	/** Project root directory (used for the global-scope `--root` arg). */
	readonly rootDir: string;
	/** Existing config file content, for additive merge (or undefined if none). */
	readonly existingContent?: string;
}

/**
 * The result of emitting an MCP config file.
 */
export interface EmittedMcpConfig {
	/** Project-relative or home-relative config path. */
	readonly path: string;
	/** Full merged file content. */
	readonly content: string;
	/** True if a memofs entry already existed in the provided content. */
	readonly entryExisted: boolean;
}

/**
 * Emits the merged MCP config file content for a target. Pure function — no IO.
 *
 * @param opts - Emission options.
 * @returns The config path, merged content, and whether a memofs entry existed.
 * @throws {CliUsageError} When the scope is not supported by the target.
 * @throws {CliValidationError} When existing JSON content fails to parse.
 */
export function emitMcpConfig(opts: EmitMcpConfigOptions): EmittedMcpConfig {
	if (!supportsScope(opts.target, opts.scope)) {
		throw new CliUsageError(
			`${opts.target} does not support ${opts.scope} MCP config scope`,
		);
	}
	const meta = MCP_CONFIG_META[opts.target];
	const path = opts.scope === "global" ? meta.globalPath : meta.localPath;
	if (path === null) {
		throw new CliUsageError(
			`${opts.target} does not support ${opts.scope} MCP config scope`,
		);
	}
	const result =
		meta.format === "toml-mcp_servers"
			? mergeTomlConfig(opts.existingContent, opts.scope, opts.rootDir)
			: mergeJsonConfig(
					opts.existingContent,
					meta.format,
					opts.scope,
					opts.rootDir,
				);
	return { path, ...result };
}

/**
 * Expands a leading `~/` to the user's home directory; otherwise resolves the
 * path against the project root.
 *
 * @param configPath - The project-relative or home-relative config path.
 * @param rootDir - Project root directory.
 * @returns The absolute filesystem path.
 */
function resolveConfigFsPath(configPath: string, rootDir: string): string {
	if (configPath.startsWith("~/")) {
		return join(homedir(), configPath.slice(2));
	}
	return resolve(rootDir, configPath);
}

/**
 * The result of writing an MCP config file.
 */
export interface McpConfigWriteResult {
	/** Project-relative or home-relative config path. */
	readonly path: string;
	/** The scope that was written. */
	readonly scope: McpScope;
	/** True if the config file was created (did not exist before). */
	readonly created: boolean;
	/** True if the file existed and the memofs entry was added (no prior entry). */
	readonly merged: boolean;
	/** True if a memofs entry already existed and was left untouched (!force). */
	readonly skipped: boolean;
}

/**
 * Writes (or merges) the MCP server config for a target. Additive and safe:
 * existing config is preserved; a prior `memofs` entry is skipped unless
 * `force` is set.
 *
 * @param opts - Write options.
 * @returns The write result describing what happened.
 * @throws {CliUsageError} When the scope is not supported by the target.
 * @throws {CliValidationError} When existing JSON content fails to parse.
 */
export async function writeMcpConfig(opts: {
	readonly target: AgentRulesTarget;
	readonly scope: McpScope;
	readonly rootDir: string;
	readonly force?: boolean;
}): Promise<McpConfigWriteResult> {
	if (!supportsScope(opts.target, opts.scope)) {
		throw new CliUsageError(
			`${opts.target} does not support ${opts.scope} MCP config scope`,
		);
	}
	const configPath = resolveMcpPath(opts.target, opts.scope);
	const fullPath = resolveConfigFsPath(configPath, opts.rootDir);

	let fileExisted = false;
	let existingContent: string | undefined;
	try {
		existingContent = await readFile(fullPath, "utf8");
		fileExisted = true;
	} catch (err) {
		if (!isNotFoundError(err)) throw err;
	}

	const emitted = emitMcpConfig({
		target: opts.target,
		scope: opts.scope,
		rootDir: opts.rootDir,
		existingContent,
	});

	if (emitted.entryExisted && !opts.force) {
		return {
			path: configPath,
			scope: opts.scope,
			created: false,
			merged: false,
			skipped: true,
		};
	}

	await mkdir(dirname(fullPath), { recursive: true });
	await writeFile(fullPath, emitted.content, "utf8");

	return {
		path: configPath,
		scope: opts.scope,
		created: !fileExisted,
		merged: fileExisted && !emitted.entryExisted,
		skipped: false,
	};
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
 * Options configuration for the `generate mcp` command.
 */
export interface GenerateMcpCommandOptions {
	/** The MemoFS client instance. */
	readonly memo: MemoFS;
	/** The CLI output console wrapper. */
	readonly output: CliOutput;
	/** If true, outputs results in structured JSON format. */
	readonly json?: boolean;
	/** Target platform (any agent-rules target). */
	readonly target?: string;
	/** MCP config scope: local or global. Defaults to the platform default. */
	readonly scope?: McpScope;
	/** If true, list supported targets instead of generating. */
	readonly list?: boolean;
	/** If true, overwrite an existing memofs MCP config entry. */
	readonly force?: boolean;
}

/**
 * Runs the `generate mcp <target>` command: writes (or safely merges) the
 * platform-specific MCP server config that registers `@memofs/mcp-server`.
 * Granular companion to `generate agent` for users who only want MCP config.
 *
 * @param options - Command configuration options.
 * @returns CLI exit code.
 */
export async function runGenerateMcpCommand(
	options: GenerateMcpCommandOptions,
): Promise<number> {
	if (options.list) {
		const targets = AGENT_RULES_TARGETS.map((t) => {
			const meta = MCP_CONFIG_META[t];
			return {
				target: t,
				format: meta.format,
				local: meta.localPath,
				global: meta.globalPath,
				defaultScope: meta.defaultScope,
			};
		});
		if (options.json) {
			printJsonEnvelope(options.output, "generate.mcp.list", targets);
		} else {
			const lines = ["Supported MCP config targets:", ""];
			for (const t of targets) {
				lines.push(
					` ${t.target.padEnd(8)} format: ${t.format}  default: ${t.defaultScope}`,
				);
				lines.push(`  local:  ${t.local ?? "(unsupported)"}`);
				lines.push(`  global: ${t.global ?? "(unsupported)"}`);
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

	const scope = resolveScope(target, options.scope);
	if (!supportsScope(target, scope)) {
		throw new CliUsageError(
			`${target} does not support ${scope} MCP config scope`,
		);
	}

	const rootDir = getRootDir(options.memo.store);

	const result = await writeMcpConfig({
		target,
		scope,
		rootDir,
		force: options.force ?? false,
	});

	if (options.json) {
		printJsonEnvelope(options.output, "generate.mcp", { target, ...result });
	} else if (result.skipped) {
		options.output.warn(
			`${result.path} already has a memofs entry. Re-run with --force to overwrite.`,
		);
	} else if (result.merged) {
		options.output.success(
			`Merged memofs MCP server into ${result.path} (${scope})`,
		);
	} else {
		options.output.success(`Created ${result.path} (${scope})`);
	}
	return 0;
}
