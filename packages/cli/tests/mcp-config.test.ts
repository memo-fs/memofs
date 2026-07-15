import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
	type AgentRulesTarget,
	emitMcpConfig,
	MCP_CONFIG_META,
	resolveMcpGlobal,
	resolveMcpPath,
	resolveScope,
	supportsScope,
	writeMcpConfig,
} from "../src/commands/generate/mcp-config";

describe("mcp-config (pure emitter)", () => {
	it("claude local emits a mcpServers entry without --root", () => {
		const { content } = emitMcpConfig({
			target: "claude",
			scope: "local",
			rootDir: "/proj",
		});
		const parsed = JSON.parse(content);
		expect(parsed.mcpServers.memofs.command).toBe("npx");
		expect(parsed.mcpServers.memofs.args).toEqual(["-y", "@memofs/mcp-server"]);
	});

	it("claude global emits an absolute --root arg", () => {
		const { content, path } = emitMcpConfig({
			target: "claude",
			scope: "global",
			rootDir: "/proj",
		});
		expect(path).toBe("~/.claude.json");
		const parsed = JSON.parse(content);
		expect(parsed.mcpServers.memofs.args).toContain("--root");
		expect(parsed.mcpServers.memofs.args).toContain("/proj");
	});

	it("copilot emits the VS Code servers shape with an explicit stdio type", () => {
		const { content, path } = emitMcpConfig({
			target: "copilot",
			scope: "local",
			rootDir: "/proj",
		});
		expect(path).toBe(".vscode/mcp.json");
		const parsed = JSON.parse(content);
		// VS Code reads `servers` (not `mcpServers`) and requires a type field.
		expect(parsed.mcpServers).toBeUndefined();
		expect(parsed.servers.memofs.type).toBe("stdio");
		expect(parsed.servers.memofs.command).toBe("npx");
		expect(parsed.servers.memofs.args).toEqual(["-y", "@memofs/mcp-server"]);
	});

	it("opencode emits the json-mcp shape with a command array", () => {
		const { content } = emitMcpConfig({
			target: "opencode",
			scope: "local",
			rootDir: "/proj",
		});
		const parsed = JSON.parse(content);
		expect(parsed.mcp.memofs.type).toBe("local");
		expect(Array.isArray(parsed.mcp.memofs.command)).toBe(true);
		expect(parsed.mcp.memofs.command).toContain("npx");
	});

	it("codex local emits a TOML block", () => {
		const { content, path } = emitMcpConfig({
			target: "codex",
			scope: "local",
			rootDir: "/proj",
		});
		expect(path).toBe(".codex/config.toml");
		expect(content).toContain("[mcp_servers.memofs]");
		expect(content).toContain('command = "npx"');
		expect(content).toContain('"-y"');
		expect(content).toContain('"@memofs/mcp-server"');
		expect(content).not.toContain("--root");
	});

	it("codex global emits a TOML block with --root", () => {
		const { content, path } = emitMcpConfig({
			target: "codex",
			scope: "global",
			rootDir: "/proj",
		});
		expect(path).toBe("~/.codex/config.toml");
		expect(content).toContain('"--root"');
		expect(content).toContain('"/proj"');
	});

	it("preserves existing JSON servers when merging", () => {
		const existing = JSON.stringify({
			mcpServers: { other: { command: "foo", args: ["bar"] } },
		});
		const { content, entryExisted } = emitMcpConfig({
			target: "cursor",
			scope: "local",
			rootDir: "/proj",
			existingContent: existing,
		});
		expect(entryExisted).toBe(false);
		const parsed = JSON.parse(content);
		expect(parsed.mcpServers.other.command).toBe("foo");
		expect(parsed.mcpServers.memofs).toBeDefined();
	});

	it("reports entryExisted when memofs is already present", () => {
		const existing = JSON.stringify({
			mcpServers: { memofs: { command: "custom" } },
		});
		const { entryExisted } = emitMcpConfig({
			target: "claude",
			scope: "local",
			rootDir: "/proj",
			existingContent: existing,
		});
		expect(entryExisted).toBe(true);
	});

	it("preserves other TOML tables when merging a codex block", () => {
		const existing = [
			"[mcp_servers.other]",
			'command = "foo"',
			'args = ["bar"]',
			"",
		].join("\n");
		const { content, entryExisted } = emitMcpConfig({
			target: "codex",
			scope: "local",
			rootDir: "/proj",
			existingContent: existing,
		});
		expect(entryExisted).toBe(false);
		expect(content).toContain("[mcp_servers.other]");
		expect(content).toContain('command = "foo"');
		expect(content).toContain("[mcp_servers.memofs]");
	});

	it("replaces an existing codex memofs block in place", () => {
		const existing = [
			"[mcp_servers.other]",
			'command = "foo"',
			"",
			"[mcp_servers.memofs]",
			'command = "old"',
			'args = ["old"]',
			"",
		].join("\n");
		const { content, entryExisted } = emitMcpConfig({
			target: "codex",
			scope: "local",
			rootDir: "/proj",
			existingContent: existing,
		});
		expect(entryExisted).toBe(true);
		expect(content).toContain("[mcp_servers.other]");
		expect(content).not.toContain('"old"');
		expect(content).toContain("@memofs/mcp-server");
	});

	it("throws on invalid existing JSON", () => {
		expect(() =>
			emitMcpConfig({
				target: "claude",
				scope: "local",
				rootDir: "/proj",
				existingContent: "{not json",
			}),
		).toThrow(/not valid JSON/);
	});

	it("throws on an unsupported scope", () => {
		expect(() =>
			emitMcpConfig({
				target: "copilot",
				scope: "global",
				rootDir: "/proj",
			}),
		).toThrow(/does not support global/);
	});
});

describe("mcp-config (scope resolution)", () => {
	it("resolveMcpPath defaults to the platform default scope", () => {
		expect(resolveMcpPath("codex")).toBe("~/.codex/config.toml");
		expect(resolveMcpPath("claude")).toBe(".mcp.json");
	});

	it("resolveMcpGlobal reflects the resolved scope", () => {
		expect(resolveMcpGlobal("codex")).toBe(true);
		expect(resolveMcpGlobal("claude")).toBe(false);
		expect(resolveMcpGlobal("claude", "global")).toBe(true);
	});

	it("resolveScope falls back to the default", () => {
		expect(resolveScope("codex")).toBe("global");
		expect(resolveScope("codex", "local")).toBe("local");
	});

	it("supportsScope reports per-platform support", () => {
		expect(supportsScope("copilot", "global")).toBe(false);
		expect(supportsScope("copilot", "local")).toBe(true);
		expect(supportsScope("claude", "global")).toBe(true);
	});

	it.each(
		Object.keys(MCP_CONFIG_META) as AgentRulesTarget[],
	)("%s has a non-null default-scope path", (target) => {
		expect(resolveMcpPath(target)).toBeTruthy();
	});
});

describe("mcp-config (writeMcpConfig IO — local)", () => {
	async function withTempRoot<T>(fn: (root: string) => Promise<T>): Promise<T> {
		const root = await mkdtemp(join(tmpdir(), "memofs-mcp-"));
		try {
			return await fn(root);
		} finally {
			await rm(root, { recursive: true, force: true });
		}
	}

	it("creates a new config file", async () => {
		await withTempRoot(async (root) => {
			const result = await writeMcpConfig({
				target: "claude",
				scope: "local",
				rootDir: root,
			});
			expect(result.created).toBe(true);
			expect(result.merged).toBe(false);
			expect(result.skipped).toBe(false);
			const mcp = JSON.parse(await readFile(join(root, ".mcp.json"), "utf8"));
			expect(mcp.mcpServers.memofs).toBeDefined();
		});
	});

	it("merges additively into an existing file", async () => {
		await withTempRoot(async (root) => {
			const { writeFile } = await import("node:fs/promises");
			await writeFile(
				join(root, ".mcp.json"),
				JSON.stringify({ mcpServers: { other: { command: "foo" } } }),
				"utf8",
			);
			const result = await writeMcpConfig({
				target: "claude",
				scope: "local",
				rootDir: root,
			});
			expect(result.created).toBe(false);
			expect(result.merged).toBe(true);
			const mcp = JSON.parse(await readFile(join(root, ".mcp.json"), "utf8"));
			expect(mcp.mcpServers.other.command).toBe("foo");
			expect(mcp.mcpServers.memofs).toBeDefined();
		});
	});

	it("skips an existing memofs entry without force", async () => {
		await withTempRoot(async (root) => {
			const { writeFile } = await import("node:fs/promises");
			await writeFile(
				join(root, ".mcp.json"),
				JSON.stringify({
					mcpServers: { memofs: { command: "custom", args: [] } },
				}),
				"utf8",
			);
			const result = await writeMcpConfig({
				target: "claude",
				scope: "local",
				rootDir: root,
			});
			expect(result.skipped).toBe(true);
			const mcp = JSON.parse(await readFile(join(root, ".mcp.json"), "utf8"));
			expect(mcp.mcpServers.memofs.command).toBe("custom");
		});
	});

	it("overwrites an existing memofs entry with force", async () => {
		await withTempRoot(async (root) => {
			const { writeFile } = await import("node:fs/promises");
			await writeFile(
				join(root, ".mcp.json"),
				JSON.stringify({
					mcpServers: { memofs: { command: "custom", args: [] } },
				}),
				"utf8",
			);
			await writeMcpConfig({
				target: "claude",
				scope: "local",
				rootDir: root,
				force: true,
			});
			const mcp = JSON.parse(await readFile(join(root, ".mcp.json"), "utf8"));
			expect(mcp.mcpServers.memofs.command).toBe("npx");
		});
	});
});
