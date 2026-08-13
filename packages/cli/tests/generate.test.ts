import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { createTempMemoFsDir } from "@memofs/core/node-fs";
import { describe, expect, it } from "vitest";
import { runMemoFsCli } from "../src";
import { AGENT_RULES_TARGETS, emitAgentRules } from "../src/commands/generate";

/**
 * Target -> { file, MCP config, rules dir }. Mirrors TARGET_META in
 * agent-rules.ts. Asserting here catches a careless edit to either side.
 */
const EXPECTED: Record<
	(string & {}) | (typeof AGENT_RULES_TARGETS)[number],
	{ file: string; mcp: string; rulesDir: string }
> = {
	agents: {
		file: "AGENTS.md",
		mcp: "~/.codex/config.toml",
		rulesDir: ".agents/rules",
	},
	codex: {
		file: "AGENTS.md",
		mcp: "~/.codex/config.toml",
		rulesDir: ".agents/rules",
	},
	claude: { file: "CLAUDE.md", mcp: ".mcp.json", rulesDir: ".claude/rules" },
	gemini: {
		file: "GEMINI.md",
		mcp: ".gemini/settings.json",
		rulesDir: ".gemini/rules",
	},
	copilot: {
		file: ".github/copilot-instructions.md",
		mcp: ".vscode/mcp.json",
		rulesDir: ".github/rules",
	},
	cursor: {
		file: ".cursor/rules/memofs.mdc",
		mcp: ".cursor/mcp.json",
		rulesDir: ".cursor/rules",
	},
	opencode: {
		file: "AGENTS.md",
		mcp: "opencode.json",
		rulesDir: ".agents/rules",
	},
};

describe("generate agent-rules (pure emitter)", () => {
	it.each(
		AGENT_RULES_TARGETS,
	)("%s output omits the Workspace Rules section by default (bare command)", (target) => {
		const file = emitAgentRules({ target });
		expect(file.content).not.toContain("## Workspace Rules");
		expect(file.content).not.toContain("git-conventions.md");
	});

	it.each(
		AGENT_RULES_TARGETS,
	)("%s output includes a Git conventions pointer only when includeWorkspaceRules is set", (target) => {
		const file = emitAgentRules({ target, includeWorkspaceRules: true });
		expect(file.content).toContain("## Workspace Rules");
		expect(file.content).toContain(EXPECTED[target].rulesDir);
		expect(file.content).toContain("git-conventions.md");
	});

	it.each(
		AGENT_RULES_TARGETS,
	)("%s writes to the canonical file path", (target) => {
		const file = emitAgentRules({ target });
		expect(file.path).toBe(EXPECTED[target].file);
	});

	it("cursor output carries required .mdc frontmatter", () => {
		const file = emitAgentRules({ target: "cursor" });
		expect(file.content.startsWith("---\n")).toBe(true);
		expect(file.content).toContain("alwaysApply: true");
	});

	it("non-cursor targets have no frontmatter", () => {
		const file = emitAgentRules({ target: "claude" });
		expect(file.content.startsWith("---")).toBe(false);
	});

	it("always embeds the MemoFS MCP workflow directive", () => {
		const file = emitAgentRules({ target: "agents" });
		expect(file.content).toContain(
			"MemoFS Memory (**REQUIRED** — no exceptions)",
		);
		expect(file.content).toContain("memofs.context");
	});

	it("hooksInstalled mode keeps the workflow section and steps 2-4", () => {
		const file = emitAgentRules({ target: "claude", hooksInstalled: true });
		// The unified template always renders the workflow section — hooks only
		// change step 1's phrasing and add a lead-in note. Steps 2-4 (recall,
		// adhere, remember) must never silently disappear for a hooks platform.
		expect(file.content).toContain(
			"MemoFS Memory (**REQUIRED** — no exceptions)",
		);
		expect(file.content).toContain("hooks are installed");
		expect(file.content).toContain("auto-loaded via hooks at session start");
		expect(file.content).toContain("memofs.recall");
		expect(file.content).toContain("memofs.remember");
	});

	it("no-hooks mode uses the manual context-load phrasing", () => {
		const file = emitAgentRules({ target: "claude", hooksInstalled: false });
		expect(file.content).toContain(
			"MemoFS Memory (**REQUIRED** — no exceptions)",
		);
		expect(file.content).not.toContain("hooks are installed");
		expect(file.content).toContain(
			"with the task description to load core memory",
		);
		expect(file.content).toContain("memofs.recall");
		expect(file.content).toContain("memofs.remember");
	});

	it("includes Workspace Rules section only when includeWorkspaceRules is set", () => {
		const without = emitAgentRules({
			target: "claude",
			projectName: "TestProj",
		});
		expect(without.content).not.toContain("## Workspace Rules");
		expect(without.content).not.toContain("## Pointers");
		expect(without.content).not.toContain("Global skills");

		const withRules = emitAgentRules({
			target: "claude",
			projectName: "TestProj",
			includeWorkspaceRules: true,
		});
		expect(withRules.content).toContain("## Workspace Rules");
		expect(withRules.content).toContain("./.claude/rules/git-conventions.md");
	});

	it("interpolates projectName and rulesDir placeholders when the workspace section is included", () => {
		const file = emitAgentRules({
			target: "claude",
			projectName: "Acme",
			includeWorkspaceRules: true,
		});
		expect(file.content).toContain("# Acme — Agent Rules");
		expect(file.content).toContain("./.claude/rules/git-conventions.md");
		expect(file.content).not.toContain("{{rulesDir}}");
	});

	it("renders custom rules as a Behavioral Rules section", () => {
		const file = emitAgentRules({
			target: "claude",
			rules: ["Do not add deps", "Do not commit secrets"],
		});
		expect(file.content).toContain("## Behavioral Rules");
		expect(file.content).toContain("- Do not add deps");
		expect(file.content).toContain("- Do not commit secrets");
	});

	it("omits Behavioral Rules section when no rules are provided", () => {
		const file = emitAgentRules({ target: "claude" });
		expect(file.content).not.toContain("## Behavioral Rules");
	});

	it("emits a thin @AGENTS.md import for claude when agentsMdExists is set", () => {
		const file = emitAgentRules({
			target: "claude",
			agentsMdExists: true,
			projectName: "Ignored",
			rules: ["Do not add deps"],
			includeWorkspaceRules: true,
			hooksInstalled: true,
		});
		expect(file.path).toBe("CLAUDE.md");
		expect(file.content).toBe("@AGENTS.md\n");
		// No duplication — the imported file owns the rules.
		expect(file.content).not.toContain("MemoFS Memory");
		expect(file.content).not.toContain("## Workspace Rules");
		expect(file.content).not.toContain("Behavioral Rules");
	});

	it("emits the full CLAUDE.md for claude when agentsMdExists is unset", () => {
		const file = emitAgentRules({
			target: "claude",
			agentsMdExists: false,
			projectName: "Acme",
		});
		expect(file.content).toContain("# Acme — Agent Rules");
		expect(file.content).toContain(
			"MemoFS Memory (**REQUIRED** — no exceptions)",
		);
	});

	it("ignores agentsMdExists for non-claude targets", () => {
		const file = emitAgentRules({
			target: "agents",
			agentsMdExists: true,
			projectName: "Acme",
		});
		expect(file.content).toContain("# Acme — Agent Rules");
		expect(file.content).not.toContain("@AGENTS.md");
	});
});

describe("generate agent-rules (CLI)", () => {
	it("writes CLAUDE.md for the claude target", async () => {
		const temp = await createTempMemoFsDir();
		try {
			const result = await runMemoFsCli({
				argv: [
					"generate",
					"agent-rules",
					"claude",
					"--root",
					temp.rootDir,
					"--project-name",
					"My Project",
				],
			});
			expect(result.exitCode).toBe(0);
			const written = await readFile(join(temp.rootDir, "CLAUDE.md"), "utf8");
			expect(written).toContain("# My Project — Agent Rules");
			expect(written).toContain(
				"## MemoFS Memory (**REQUIRED** — no exceptions)",
			);
		} finally {
			await temp.cleanup();
		}
	});

	it("creates nested directories (copilot -> .github/)", async () => {
		const temp = await createTempMemoFsDir();
		try {
			const result = await runMemoFsCli({
				argv: ["generate", "agent-rules", "copilot", "--root", temp.rootDir],
			});
			expect(result.exitCode).toBe(0);
			const written = await readFile(
				join(temp.rootDir, ".github/copilot-instructions.md"),
				"utf8",
			);
			expect(written).toContain("Agent Rules");
		} finally {
			await temp.cleanup();
		}
	});

	it("refuses to overwrite an existing file without --force", async () => {
		const temp = await createTempMemoFsDir();
		try {
			await runMemoFsCli({
				argv: ["generate", "agent-rules", "claude", "--root", temp.rootDir],
			});
			// Second run without --force must not clobber the first file.
			const result = await runMemoFsCli({
				argv: ["generate", "agent-rules", "claude", "--root", temp.rootDir],
			});
			expect(result.exitCode).toBe(0);
			expect(result.stdout.join("\n")).toContain("already exists");
		} finally {
			await temp.cleanup();
		}
	});

	it("overwrites an existing file with --force", async () => {
		const temp = await createTempMemoFsDir();
		try {
			await runMemoFsCli({
				argv: ["generate", "agent-rules", "claude", "--root", temp.rootDir],
			});
			const result = await runMemoFsCli({
				argv: [
					"generate",
					"agent-rules",
					"claude",
					"--root",
					temp.rootDir,
					"--force",
					"--project-name",
					"Renamed",
				],
			});
			expect(result.exitCode).toBe(0);
			const written = await readFile(join(temp.rootDir, "CLAUDE.md"), "utf8");
			expect(written).toContain("# Renamed — Agent Rules");
		} finally {
			await temp.cleanup();
		}
	});

	it("errors on an unknown target", async () => {
		const temp = await createTempMemoFsDir();
		try {
			const result = await runMemoFsCli({
				argv: ["generate", "agent-rules", "unknown", "--root", temp.rootDir],
			});
			expect(result.exitCode).toBe(1);
			expect(result.stderr.join("\n").toLowerCase()).toContain(
				"unknown target",
			);
		} finally {
			await temp.cleanup();
		}
	});

	it("--list enumerates all supported targets", async () => {
		const temp = await createTempMemoFsDir();
		try {
			const result = await runMemoFsCli({
				argv: ["generate", "agent-rules", "--list", "--root", temp.rootDir],
			});
			expect(result.exitCode).toBe(0);
			const out = result.stdout.join("\n");
			for (const target of AGENT_RULES_TARGETS) {
				expect(out).toContain(target);
			}
		} finally {
			await temp.cleanup();
		}
	});

	it("--json emits a structured envelope", async () => {
		const temp = await createTempMemoFsDir();
		try {
			const result = await runMemoFsCli({
				argv: [
					"generate",
					"agent-rules",
					"gemini",
					"--root",
					temp.rootDir,
					"--json",
				],
			});
			expect(result.exitCode).toBe(0);
			const parsed = JSON.parse(result.stdout.join("\n"));
			expect(parsed.ok).toBe(true);
			expect(parsed.command).toBe("generate.agent-rules");
			expect(parsed.data.target).toBe("gemini");
			expect(parsed.data.created).toBe(true);
			expect(parsed.data.mcpConfig).toBe(".gemini/settings.json");
		} finally {
			await temp.cleanup();
		}
	});

	it("emits a thin CLAUDE.md (@AGENTS.md) when AGENTS.md exists at root", async () => {
		const temp = await createTempMemoFsDir();
		try {
			// Seed an AGENTS.md so the claude target picks the thin path.
			await writeFile(join(temp.rootDir, "AGENTS.md"), "# Existing\n", "utf8");
			const result = await runMemoFsCli({
				argv: ["generate", "agent-rules", "claude", "--root", temp.rootDir],
			});
			expect(result.exitCode).toBe(0);
			const written = await readFile(join(temp.rootDir, "CLAUDE.md"), "utf8");
			expect(written).toBe("@AGENTS.md\n");
		} finally {
			await temp.cleanup();
		}
	});

	it("does not copy git-conventions.md (bare command is rules-only)", async () => {
		const temp = await createTempMemoFsDir();
		try {
			// Seed a root git-conventions.md template — the bare command must
			// NOT propagate it; that is the umbrella command's job now.
			await writeFile(
				join(temp.rootDir, "git-conventions.md"),
				"## Git Conventions\n",
				"utf8",
			);
			const result = await runMemoFsCli({
				argv: ["generate", "agent-rules", "claude", "--root", temp.rootDir],
			});
			expect(result.exitCode).toBe(0);
			await expect(
				readFile(
					join(temp.rootDir, ".claude/rules/git-conventions.md"),
					"utf8",
				),
			).rejects.toThrow();
			// And the emitted CLAUDE.md must not link at the missing file.
			const written = await readFile(join(temp.rootDir, "CLAUDE.md"), "utf8");
			expect(written).not.toContain("git-conventions.md");
		} finally {
			await temp.cleanup();
		}
	});
});
