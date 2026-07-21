import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { createTempMemoFsDir } from "@memofs/core/node-fs";
import { describe, expect, it } from "vitest";
import { runMemoFsCli } from "../src";
import { getEmitter } from "../src/commands/generate/emitters";
import { claudeEmitter } from "../src/commands/generate/emitters/claude";
import { codexEmitter } from "../src/commands/generate/emitters/codex";
import { mergeHooksJson } from "../src/commands/generate/emitters/hooks-json";
import { opencodeEmitter } from "../src/commands/generate/emitters/opencode";
import {
	compactionSurvivalModule,
	contextInjectionModule,
	statusDisplayModule,
	subagentInjectionModule,
} from "../src/commands/generate/hooks";

const ALL_MODULES = [
	contextInjectionModule,
	subagentInjectionModule,
	compactionSurvivalModule,
	statusDisplayModule,
];

describe("generate agent (CLI)", () => {
	it("generate agent claude creates CLAUDE.md + .claude/settings.json + .mcp.json", async () => {
		const temp = await createTempMemoFsDir();
		try {
			const result = await runMemoFsCli({
				argv: [
					"generate",
					"agent",
					"claude",
					"--root",
					temp.rootDir,
					"--project-name",
					"Test",
				],
			});
			expect(result.exitCode).toBe(0);
			const claudeMd = await readFile(join(temp.rootDir, "CLAUDE.md"), "utf8");
			expect(claudeMd).toContain("# Test — Agent Rules");
			// Unified template: the workflow section is always present; hooks only
			// change step 1's phrasing (steps 2-4 can never silently disappear).
			expect(claudeMd).toContain("## MemoFS Memory (REQUIRED)");
			expect(claudeMd).toContain("hooks are installed");
			expect(claudeMd).toContain("memofs.recall");
			expect(claudeMd).toContain("memofs.remember");
			const settings = JSON.parse(
				await readFile(join(temp.rootDir, ".claude/settings.json"), "utf8"),
			);
			// Claude Code hook shape: event → matcher groups → hooks array.
			expect(settings.hooks.SessionStart).toBeDefined();
			const startGroup = settings.hooks.SessionStart[0];
			expect(startGroup.matcher).toBe("startup|resume|clear");
			expect(startGroup.hooks[0].type).toBe("command");
			expect(startGroup.hooks[0].command).toContain("memofs context");
			// Compaction survival rides SessionStart's `compact` source (stdout
			// on PreCompact is ignored by the platform).
			const compactGroup = settings.hooks.SessionStart.find(
				(g: { matcher?: string }) => g.matcher === "compact",
			);
			expect(compactGroup).toBeDefined();
			expect(settings.hooks.SubagentStart).toBeDefined();
			expect(settings.hooks.Stop).toBeDefined();
			expect(settings.hooks.Stop[0].hooks[0].command).toContain(
				"memofs status --hook",
			);
			const mcp = JSON.parse(
				await readFile(join(temp.rootDir, ".mcp.json"), "utf8"),
			);
			expect(mcp.mcpServers.memofs.command).toBe("npx");
			expect(mcp.mcpServers.memofs.args).toContain("@memofs/mcp-server");
		} finally {
			await temp.cleanup();
		}
	});

	it("generate agent-hooks claude creates only .claude/settings.json", async () => {
		const temp = await createTempMemoFsDir();
		try {
			const result = await runMemoFsCli({
				argv: ["generate", "agent-hooks", "claude", "--root", temp.rootDir],
			});
			expect(result.exitCode).toBe(0);
			const settings = JSON.parse(
				await readFile(join(temp.rootDir, ".claude/settings.json"), "utf8"),
			);
			expect(settings.hooks.SessionStart).toBeDefined();
			expect(settings.hooks.Stop).toBeDefined();
		} finally {
			await temp.cleanup();
		}
	});

	it("generate agent codex creates AGENTS.md + .codex/hooks.json + .codex/config.toml", async () => {
		const temp = await createTempMemoFsDir();
		try {
			// codex defaults to global MCP scope (~/.codex/config.toml); use
			// --scope local to keep the test hermetic and assert project config.
			const result = await runMemoFsCli({
				argv: [
					"generate",
					"agent",
					"codex",
					"--root",
					temp.rootDir,
					"--scope",
					"local",
				],
			});
			expect(result.exitCode).toBe(0);
			const agentsMd = await readFile(join(temp.rootDir, "AGENTS.md"), "utf8");
			expect(agentsMd).toContain("Agent Rules");
			const hooks = JSON.parse(
				await readFile(join(temp.rootDir, ".codex/hooks.json"), "utf8"),
			);
			expect(hooks.hooks.SessionStart).toBeDefined();
			const toml = await readFile(
				join(temp.rootDir, ".codex/config.toml"),
				"utf8",
			);
			expect(toml).toContain("[mcp_servers.memofs]");
			expect(toml).toContain('command = "npx"');
			expect(toml).toContain("@memofs/mcp-server");
		} finally {
			await temp.cleanup();
		}
	});

	it("generate agent cursor emits rules + MCP but no hooks (unsupported)", async () => {
		const temp = await createTempMemoFsDir();
		try {
			const result = await runMemoFsCli({
				argv: ["generate", "agent", "cursor", "--root", temp.rootDir],
			});
			expect(result.exitCode).toBe(0);
			const rules = await readFile(
				join(temp.rootDir, ".cursor/rules/memofs.mdc"),
				"utf8",
			);
			expect(rules).toContain("alwaysApply: true");
			// Cursor hooks are observational-only (no context injection, no
			// session-start event) — the rules file must NOT claim hooks are
			// installed, and no hooks.json is generated.
			expect(rules).not.toContain("hooks are installed");
			await expect(
				readFile(join(temp.rootDir, ".cursor/hooks.json"), "utf8"),
			).rejects.toThrow();
			const mcp = JSON.parse(
				await readFile(join(temp.rootDir, ".cursor/mcp.json"), "utf8"),
			);
			expect(mcp.mcpServers.memofs.command).toBe("npx");
		} finally {
			await temp.cleanup();
		}
	});

	it("generate agent opencode creates AGENTS.md + .opencode/plugin/memofs.ts", async () => {
		const temp = await createTempMemoFsDir();
		try {
			const result = await runMemoFsCli({
				argv: ["generate", "agent", "opencode", "--root", temp.rootDir],
			});
			expect(result.exitCode).toBe(0);
			const agentsMd = await readFile(join(temp.rootDir, "AGENTS.md"), "utf8");
			expect(agentsMd).toContain("Agent Rules");
			// opencode plugins cannot inject context — the rules file keeps the
			// "call memofs.context yourself" phrasing.
			expect(agentsMd).not.toContain("hooks are installed");
			const plugin = await readFile(
				join(temp.rootDir, ".opencode/plugin/memofs.ts"),
				"utf8",
			);
			expect(plugin).toContain('from "@opencode-ai/plugin"');
			expect(plugin).toContain("session.created");
			expect(plugin).toContain("session.idle");
			expect(plugin).not.toContain("SubagentStart");
			const mcp = JSON.parse(
				await readFile(join(temp.rootDir, "opencode.json"), "utf8"),
			);
			expect(mcp.mcp.memofs.type).toBe("local");
			expect(mcp.mcp.memofs.command[0]).toBe("npx");
		} finally {
			await temp.cleanup();
		}
	});

	it("--no-hooks omits hooks but still writes MCP config", async () => {
		const temp = await createTempMemoFsDir();
		try {
			const result = await runMemoFsCli({
				argv: [
					"generate",
					"agent",
					"claude",
					"--root",
					temp.rootDir,
					"--no-hooks",
				],
			});
			expect(result.exitCode).toBe(0);
			const claudeMd = await readFile(join(temp.rootDir, "CLAUDE.md"), "utf8");
			expect(claudeMd).toContain("## MemoFS Memory (REQUIRED)");
			expect(claudeMd).not.toContain("hooks are installed");
			// MCP config is independent of hooks.
			const mcp = JSON.parse(
				await readFile(join(temp.rootDir, ".mcp.json"), "utf8"),
			);
			expect(mcp.mcpServers.memofs).toBeDefined();
		} finally {
			await temp.cleanup();
		}
	});

	it("--no-mcp skips MCP server config", async () => {
		const temp = await createTempMemoFsDir();
		try {
			const result = await runMemoFsCli({
				argv: [
					"generate",
					"agent",
					"claude",
					"--root",
					temp.rootDir,
					"--no-mcp",
				],
			});
			expect(result.exitCode).toBe(0);
			await expect(
				readFile(join(temp.rootDir, ".mcp.json"), "utf8"),
			).rejects.toThrow();
		} finally {
			await temp.cleanup();
		}
	});

	it("--force overwrites existing files", async () => {
		const temp = await createTempMemoFsDir();
		try {
			await runMemoFsCli({
				argv: [
					"generate",
					"agent",
					"claude",
					"--root",
					temp.rootDir,
					"--project-name",
					"First",
				],
			});
			const result = await runMemoFsCli({
				argv: [
					"generate",
					"agent",
					"claude",
					"--root",
					temp.rootDir,
					"--force",
					"--project-name",
					"Renamed",
				],
			});
			expect(result.exitCode).toBe(0);
			const claudeMd = await readFile(join(temp.rootDir, "CLAUDE.md"), "utf8");
			expect(claudeMd).toContain("# Renamed — Agent Rules");
		} finally {
			await temp.cleanup();
		}
	});

	it("--list enumerates supported targets", async () => {
		const temp = await createTempMemoFsDir();
		try {
			const result = await runMemoFsCli({
				argv: ["generate", "agent", "--list", "--root", temp.rootDir],
			});
			expect(result.exitCode).toBe(0);
			const out = result.stdout.join("\n");
			expect(out).toContain("claude");
			expect(out).toContain("codex");
			expect(out).toContain("cursor");
			expect(out).toContain("opencode");
		} finally {
			await temp.cleanup();
		}
	});

	it("--json emits structured output", async () => {
		const temp = await createTempMemoFsDir();
		try {
			const result = await runMemoFsCli({
				argv: ["generate", "agent", "claude", "--root", temp.rootDir, "--json"],
			});
			expect(result.exitCode).toBe(0);
			const parsed = JSON.parse(result.stdout.join("\n"));
			expect(parsed.ok).toBe(true);
			expect(parsed.command).toBe("generate.agent");
			expect(parsed.data.target).toBe("claude");
			expect(parsed.data.hooks).toBe(true);
			expect(parsed.data.mcp).toBe(true);
			expect(parsed.data.scope).toBe("local");
			expect(parsed.data.files).toHaveLength(2);
			expect(parsed.data.mcpConfig.path).toBe(".mcp.json");
			expect(parsed.data.mcpConfig.created).toBe(true);
		} finally {
			await temp.cleanup();
		}
	});

	it("errors on an unknown target", async () => {
		const temp = await createTempMemoFsDir();
		try {
			const result = await runMemoFsCli({
				argv: ["generate", "agent", "unknown", "--root", temp.rootDir],
			});
			expect(result.exitCode).toBe(1);
			expect(result.stderr.join("\n").toLowerCase()).toContain(
				"unknown target",
			);
		} finally {
			await temp.cleanup();
		}
	});
});

describe("generate mcp (CLI)", () => {
	it("generate mcp claude writes .mcp.json", async () => {
		const temp = await createTempMemoFsDir();
		try {
			const result = await runMemoFsCli({
				argv: ["generate", "mcp", "claude", "--root", temp.rootDir],
			});
			expect(result.exitCode).toBe(0);
			const mcp = JSON.parse(
				await readFile(join(temp.rootDir, ".mcp.json"), "utf8"),
			);
			expect(mcp.mcpServers.memofs.command).toBe("npx");
			expect(mcp.mcpServers.memofs.args).toEqual(["-y", "@memofs/mcp-server"]);
		} finally {
			await temp.cleanup();
		}
	});

	it("merges into an existing config without clobbering other servers", async () => {
		const temp = await createTempMemoFsDir();
		try {
			const { writeFile } = await import("node:fs/promises");
			await writeFile(
				join(temp.rootDir, ".mcp.json"),
				JSON.stringify({ mcpServers: { other: { command: "foo" } } }),
				"utf8",
			);
			const result = await runMemoFsCli({
				argv: ["generate", "mcp", "claude", "--root", temp.rootDir],
			});
			expect(result.exitCode).toBe(0);
			const mcp = JSON.parse(
				await readFile(join(temp.rootDir, ".mcp.json"), "utf8"),
			);
			expect(mcp.mcpServers.other).toEqual({ command: "foo" });
			expect(mcp.mcpServers.memofs).toBeDefined();
		} finally {
			await temp.cleanup();
		}
	});

	it("skips when a memofs entry already exists without --force", async () => {
		const temp = await createTempMemoFsDir();
		try {
			const { writeFile } = await import("node:fs/promises");
			await writeFile(
				join(temp.rootDir, ".mcp.json"),
				JSON.stringify({
					mcpServers: { memofs: { command: "custom", args: [] } },
				}),
				"utf8",
			);
			const result = await runMemoFsCli({
				argv: ["generate", "mcp", "claude", "--root", temp.rootDir, "--json"],
			});
			expect(result.exitCode).toBe(0);
			const parsed = JSON.parse(result.stdout.join("\n"));
			expect(parsed.data.skipped).toBe(true);
			const mcp = JSON.parse(
				await readFile(join(temp.rootDir, ".mcp.json"), "utf8"),
			);
			expect(mcp.mcpServers.memofs.command).toBe("custom");
		} finally {
			await temp.cleanup();
		}
	});

	it("--force overwrites an existing memofs entry", async () => {
		const temp = await createTempMemoFsDir();
		try {
			const { writeFile } = await import("node:fs/promises");
			await writeFile(
				join(temp.rootDir, ".mcp.json"),
				JSON.stringify({
					mcpServers: { memofs: { command: "custom", args: [] } },
				}),
				"utf8",
			);
			const result = await runMemoFsCli({
				argv: ["generate", "mcp", "claude", "--root", temp.rootDir, "--force"],
			});
			expect(result.exitCode).toBe(0);
			const mcp = JSON.parse(
				await readFile(join(temp.rootDir, ".mcp.json"), "utf8"),
			);
			expect(mcp.mcpServers.memofs.command).toBe("npx");
		} finally {
			await temp.cleanup();
		}
	});

	it("errors on an unsupported scope", async () => {
		const temp = await createTempMemoFsDir();
		try {
			const result = await runMemoFsCli({
				argv: [
					"generate",
					"mcp",
					"copilot",
					"--scope",
					"global",
					"--root",
					temp.rootDir,
				],
			});
			expect(result.exitCode).toBe(1);
			expect(result.stderr.join("\n").toLowerCase()).toContain(
				"does not support global",
			);
		} finally {
			await temp.cleanup();
		}
	});

	it("--list enumerates targets with scope paths", async () => {
		const temp = await createTempMemoFsDir();
		try {
			const result = await runMemoFsCli({
				argv: ["generate", "mcp", "--list", "--root", temp.rootDir],
			});
			expect(result.exitCode).toBe(0);
			const out = result.stdout.join("\n");
			expect(out).toContain("claude");
			expect(out).toContain("local:");
			expect(out).toContain("global:");
		} finally {
			await temp.cleanup();
		}
	});
});

describe("hook emitters (pure unit tests)", () => {
	it("claude emitter uses matcher groups (event → groups → hooks)", () => {
		const files = claudeEmitter.emitHooks(ALL_MODULES);
		expect(files).toHaveLength(1);
		expect(files[0]?.path).toBe(".claude/settings.json");
		expect(files[0]?.merge).toBe("hooks-json");
		const parsed = JSON.parse(files[0]?.content ?? "{}");
		const start = parsed.hooks.SessionStart;
		expect(Array.isArray(start)).toBe(true);
		expect(start[0].matcher).toBe("startup|resume|clear");
		expect(start[0].hooks[0].type).toBe("command");
		// preCompact maps to SessionStart(compact), not PreCompact (stdout on
		// PreCompact is ignored by both platforms).
		expect(
			start.some((g: { matcher?: string }) => g.matcher === "compact"),
		).toBe(true);
		expect(parsed.hooks.PreCompact).toBeUndefined();
		expect(parsed.hooks.SubagentStart).toBeDefined();
		expect(parsed.hooks.Stop).toBeDefined();
	});

	it("codex emitter produces the same shape at .codex/hooks.json", () => {
		const files = codexEmitter.emitHooks(ALL_MODULES);
		expect(files).toHaveLength(1);
		expect(files[0]?.path).toBe(".codex/hooks.json");
		expect(files[0]?.merge).toBe("hooks-json");
		const parsed = JSON.parse(files[0]?.content ?? "{}");
		expect(parsed.hooks.SessionStart[0].matcher).toBe("startup|resume|clear");
		expect(parsed.hooks.SubagentStart).toBeDefined();
		expect(parsed.hooks.Stop).toBeDefined();
		// Codex requires JSON on Stop-hook exit 0.
		expect(parsed.hooks.Stop[0].hooks[0].command).toContain(
			"memofs status --hook",
		);
	});

	it("opencode emitter generates a real plugin (context + $, no bare exec)", () => {
		const files = opencodeEmitter.emitHooks(ALL_MODULES);
		expect(files[0]?.path).toBe(".opencode/plugin/memofs.ts");
		const content = files[0]?.content ?? "";
		expect(content).toContain('from "@opencode-ai/plugin"');
		expect(content).toContain("async ({ $, client })");
		expect(content).toContain("session.created");
		expect(content).toContain("session.idle");
		expect(content).not.toMatch(/\bawait exec\(/);
		expect(content).not.toContain("SubagentStart");
	});

	it("opencode does not claim context injection", () => {
		expect(opencodeEmitter.capabilities.contextInjection).toBe(false);
	});

	it("claude SessionStart hook includes cloud-conditional pull", () => {
		const files = claudeEmitter.emitHooks(ALL_MODULES);
		const parsed = JSON.parse(files[0]?.content ?? "{}");
		const cmd = parsed.hooks.SessionStart[0].hooks[0].command as string;
		expect(cmd).toContain("MEMOFS_API_KEY");
		expect(cmd).toContain("memofs cloud sync pull");
		expect(cmd).toContain("--mark-session-start");
	});

	it("only requested hooks are emitted", () => {
		const files = claudeEmitter.emitHooks([contextInjectionModule]);
		const parsed = JSON.parse(files[0]?.content ?? "{}");
		expect(parsed.hooks.SessionStart).toHaveLength(1);
		expect(parsed.hooks.SubagentStart).toBeUndefined();
		expect(parsed.hooks.Stop).toBeUndefined();
	});

	it("getEmitter resolves the agents alias to the codex emitter", () => {
		expect(getEmitter("agents")).toBe(codexEmitter);
		expect(getEmitter("codex")).toBe(codexEmitter);
		expect(getEmitter("cursor")).toBeUndefined();
	});
});

describe("hooks-json merge", () => {
	it("preserves other top-level keys and foreign hook groups", () => {
		const existing = JSON.stringify({
			permissions: { allow: ["Bash(ls:*)"] },
			env: { FOO: "bar" },
			hooks: {
				PostToolUse: [
					{ matcher: "Edit", hooks: [{ type: "command", command: "lint" }] },
				],
				SessionStart: [
					{ hooks: [{ type: "command", command: "echo custom" }] },
				],
			},
		});
		const files = claudeEmitter.emitHooks(ALL_MODULES);
		const fresh = JSON.parse(files[0]?.content ?? "{}").hooks;
		const { content, entryExisted } = mergeHooksJson(existing, fresh);
		const merged = JSON.parse(content);
		expect(entryExisted).toBe(false);
		expect(merged.permissions).toEqual({ allow: ["Bash(ls:*)"] });
		expect(merged.env).toEqual({ FOO: "bar" });
		expect(merged.hooks.PostToolUse).toHaveLength(1);
		// User's custom SessionStart group survives alongside ours.
		const startCommands = merged.hooks.SessionStart.flatMap(
			(g: { hooks: Array<{ command: string }> }) =>
				g.hooks.map((h) => h.command),
		);
		expect(startCommands).toContain("echo custom");
		expect(
			startCommands.some((c: string) => c.includes("memofs context")),
		).toBe(true);
	});

	it("replaces prior memofs groups instead of duplicating them", () => {
		const files = claudeEmitter.emitHooks(ALL_MODULES);
		const fresh = JSON.parse(files[0]?.content ?? "{}").hooks;
		const first = mergeHooksJson(undefined, fresh);
		const second = mergeHooksJson(first.content, fresh);
		expect(second.entryExisted).toBe(true);
		const merged = JSON.parse(second.content);
		// Same group count as a single emission — no duplicates.
		expect(merged.hooks.SessionStart).toHaveLength(fresh.SessionStart.length);
		expect(merged.hooks.Stop).toHaveLength(fresh.Stop.length);
	});

	it("generate agent claude merges into an existing settings.json", async () => {
		const temp = await createTempMemoFsDir();
		try {
			const { mkdir, writeFile } = await import("node:fs/promises");
			await mkdir(join(temp.rootDir, ".claude"), { recursive: true });
			await writeFile(
				join(temp.rootDir, ".claude/settings.json"),
				JSON.stringify({ permissions: { allow: ["Bash(ls:*)"] } }),
				"utf8",
			);
			const result = await runMemoFsCli({
				argv: ["generate", "agent", "claude", "--root", temp.rootDir],
			});
			expect(result.exitCode).toBe(0);
			const settings = JSON.parse(
				await readFile(join(temp.rootDir, ".claude/settings.json"), "utf8"),
			);
			// Existing settings preserved, hooks added.
			expect(settings.permissions).toEqual({ allow: ["Bash(ls:*)"] });
			expect(settings.hooks.SessionStart).toBeDefined();
		} finally {
			await temp.cleanup();
		}
	});

	it("aborts (no clobber) when the existing settings file is invalid JSON", async () => {
		const temp = await createTempMemoFsDir();
		try {
			const { mkdir, writeFile } = await import("node:fs/promises");
			await mkdir(join(temp.rootDir, ".claude"), { recursive: true });
			await writeFile(
				join(temp.rootDir, ".claude/settings.json"),
				"{ not json",
				"utf8",
			);
			const result = await runMemoFsCli({
				argv: ["generate", "agent-hooks", "claude", "--root", temp.rootDir],
			});
			expect(result.exitCode).not.toBe(0);
			const raw = await readFile(
				join(temp.rootDir, ".claude/settings.json"),
				"utf8",
			);
			expect(raw).toBe("{ not json");
		} finally {
			await temp.cleanup();
		}
	});
});
