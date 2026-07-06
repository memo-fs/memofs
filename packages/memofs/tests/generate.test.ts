import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { createTempTekMemoDir } from "@memofs/core/node-fs";
import { describe, expect, it } from "vitest";
import { runTekMemoCli } from "../src";
import {
	AGENT_RULES_TARGETS,
	emitAgentRules,
	MAX_AGENT_RULES_LINES,
} from "../src/commands/generate";

/**
 * Target -> { file path on disk, MCP config path the pointer must mention }.
 * This mirrors TARGET_META in src/commands/generate.ts. Asserting it here means
 * a careless edit to either side is caught before users get a wrong MCP pointer.
 */
const EXPECTED: Record<
	(string & {}) | (typeof AGENT_RULES_TARGETS)[number],
	{ file: string; mcp: string }
> = {
	agents: { file: "AGENTS.md", mcp: "~/.codex/config.toml" },
	claude: { file: "CLAUDE.md", mcp: ".mcp.json" },
	gemini: { file: "GEMINI.md", mcp: ".gemini/settings.json" },
	copilot: { file: ".github/copilot-instructions.md", mcp: ".vscode/mcp.json" },
	cursor: { file: ".cursor/rules/tekmemo.mdc", mcp: ".cursor/mcp.json" },
};

describe("generate agent-rules (pure emitter)", () => {
	it.each(AGENT_RULES_TARGETS)("keeps %s output <= 50 lines", (target) => {
		const file = emitAgentRules({
			target,
			projectName: "TekMemo",
			rules: ["Do not add deps", "Do not commit secrets"],
		});
		const lineCount = file.content.split("\n").length;
		expect(lineCount).toBeLessThanOrEqual(MAX_AGENT_RULES_LINES);
	});

	it.each(
		AGENT_RULES_TARGETS,
	)("%s output names its target-aware MCP config path", (target) => {
		const file = emitAgentRules({ target });
		// The pointer must reference the exact per-platform MCP location so the
		// generated instructions file is accurate for that platform's tooling.
		expect(file.content).toContain(EXPECTED[target].mcp);
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

	it("always embeds the TekMemo MCP workflow directive", () => {
		const file = emitAgentRules({ target: "agents" });
		expect(file.content).toContain("TekMemo Memory (REQUIRED)");
		expect(file.content).toContain("tekmemo.context");
	});

	it("rejects output that would exceed the line cap", () => {
		const tooManyRules = Array.from({ length: 60 }, (_, i) => `rule ${i}`);
		expect(() =>
			emitAgentRules({ target: "agents", rules: tooManyRules }),
		).toThrow(/exceed 50 lines/);
	});
});

describe("generate agent-rules (CLI)", () => {
	it("writes CLAUDE.md for the claude target", async () => {
		const temp = await createTempTekMemoDir();
		try {
			const result = await runTekMemoCli({
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
			expect(written).toContain(".mcp.json");
		} finally {
			await temp.cleanup();
		}
	});

	it("creates nested directories (copilot -> .github/)", async () => {
		const temp = await createTempTekMemoDir();
		try {
			const result = await runTekMemoCli({
				argv: ["generate", "agent-rules", "copilot", "--root", temp.rootDir],
			});
			expect(result.exitCode).toBe(0);
			const written = await readFile(
				join(temp.rootDir, ".github/copilot-instructions.md"),
				"utf8",
			);
			expect(written).toContain(".vscode/mcp.json");
		} finally {
			await temp.cleanup();
		}
	});

	it("refuses to overwrite an existing file without --force", async () => {
		const temp = await createTempTekMemoDir();
		try {
			await runTekMemoCli({
				argv: ["generate", "agent-rules", "claude", "--root", temp.rootDir],
			});
			// Second run without --force must not clobber the first file.
			const result = await runTekMemoCli({
				argv: ["generate", "agent-rules", "claude", "--root", temp.rootDir],
			});
			expect(result.exitCode).toBe(0);
			expect(result.stdout.join("\n")).toContain("already exists");
		} finally {
			await temp.cleanup();
		}
	});

	it("overwrites an existing file with --force", async () => {
		const temp = await createTempTekMemoDir();
		try {
			await runTekMemoCli({
				argv: ["generate", "agent-rules", "claude", "--root", temp.rootDir],
			});
			const result = await runTekMemoCli({
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
		const temp = await createTempTekMemoDir();
		try {
			const result = await runTekMemoCli({
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
		const temp = await createTempTekMemoDir();
		try {
			const result = await runTekMemoCli({
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
		const temp = await createTempTekMemoDir();
		try {
			const result = await runTekMemoCli({
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
});
