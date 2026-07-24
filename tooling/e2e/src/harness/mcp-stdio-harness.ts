/**
 * Real MCP stdio harness — spawn built memofs-mcp binary & cross-visibility proof.
 *
 * @remarks
 * Resolves `packages/mcp-server/dist/bin/memofs-mcp.mjs`, spawns via
 * `@modelcontextprotocol/sdk` StdioClientTransport with isolated tmpDir,
 * proves handshake (initialize), tool discovery (4 memory verbs + 6 AgentFS),
 * resources, prompts per docs, callTool, AgentFS lifecycle, traversal guard,
 * read-only guard, and cross-visibility with CLI/core same tmpDir.
 *
 * Node-only: imports `node:fs`, `node:child_process`.
 */

import { existsSync } from "node:fs";
import { mkdir, mkdtemp, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { Client as SdkClient } from "@modelcontextprotocol/sdk/client/index";
import type { StdioClientTransport as SdkStdioTransport } from "@modelcontextprotocol/sdk/client/stdio";
import type { RealHarness } from "./core-harness";
import {
	assertFileExistsAt,
	assertFileNotExistsAt,
	listFilesRecursive,
	snapshotFsRecursive,
} from "./fs-helpers";

/** Subset of MCP tool result shape used in e2e. */
export type McpToolCallResult = {
	isError?: boolean;
	content?: Array<{ type: string; text?: string }>;
	structuredContent?: unknown;
	[key: string]: unknown;
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Minimal tool description.
 * @public
 */
export type McpTool = {
	name: string;
	title?: string;
	description?: string;
};

/**
 * MCP stdio harness — real binary spawn + SDK Client proof.
 * @public
 */
export type McpStdioHarness = RealHarness & {
	/** Absolute path to resolved MCP binary. */
	mcpBin: string;
	/** Underlying SDK Client (connected). */
	client: SdkClient;
	/** Underlying StdioClientTransport (for direct access if needed). */
	transport: SdkStdioTransport;
	/** List tools via SDK. */
	listTools: () => Promise<McpTool[]>;
	/** List resources. */
	listResources: () => Promise<unknown[]>;
	/** List prompts. */
	listPrompts: () => Promise<unknown[]>;
	/** Call a tool by name with arguments. */
	callTool: (
		name: string,
		args?: Record<string, unknown>,
	) => Promise<McpToolCallResult>;
	/** Read a resource by uri. */
	readResource: (uri: string) => Promise<unknown>;
	/** Get a prompt. */
	getPrompt: (name: string, args?: Record<string, unknown>) => Promise<unknown>;
	/** Close connection. */
	close: () => Promise<void>;
};

export type CreateRealMcpStdioHarnessOptions = {
	tmpDir?: string;
	prefix?: string;
	mcpBin?: string;
	projectId?: string;
	workspaceId?: string;
	/** When true, run with MEMOFS_MCP_READ_ONLY=true (read-only guard). */
	readOnly?: boolean;
	/** Extra env vars. */
	env?: Record<string, string>;
	/** Extra CLI args passed after --root tmpDir. */
	extraArgs?: string[];
};

/**
 * Resolve MCP binary path from explicit override or monorepo layout.
 */
function resolveMcpBin(explicit?: string): string {
	if (explicit) {
		if (!existsSync(explicit)) {
			throw new Error(
				`McpStdioHarness: explicit mcpBin not found: ${explicit}`,
			);
		}
		return resolve(explicit);
	}
	const candidates: string[] = [];
	const fromFileRoot = resolve(
		__dirname,
		"../../../../packages/mcp-server/dist/bin/memofs-mcp.mjs",
	);
	const fromFileRootAlt = resolve(
		__dirname,
		"../../../..",
		"packages/mcp-server/dist/bin/memofs-mcp.mjs",
	);
	candidates.push(fromFileRoot, fromFileRootAlt);

	const cwd = process.cwd();
	candidates.push(
		resolve(cwd, "packages/mcp-server/dist/bin/memofs-mcp.mjs"),
		resolve(cwd, "../../packages/mcp-server/dist/bin/memofs-mcp.mjs"),
		resolve(cwd, "../mcp-server/dist/bin/memofs-mcp.mjs"),
		resolve(cwd, "dist/bin/memofs-mcp.mjs"),
	);

	const seen = new Set<string>();
	const uniq: string[] = [];
	for (const c of candidates) {
		if (!seen.has(c)) {
			seen.add(c);
			uniq.push(c);
		}
	}
	for (const candidate of uniq) {
		if (existsSync(candidate)) return candidate;
	}
	throw new Error(
		`McpStdioHarness: could not resolve MCP bin. Tried:\n${uniq.join("\n")}\nDid you run pnpm build? cwd=${cwd}`,
	);
}

/**
 * Creates a real MCP stdio harness with isolated tmpDir.
 *
 * Proves:
 * - built `memofs-mcp.mjs` binary spawn via SDK StdioClientTransport
 * - initialize handshake, list tools (4 memory + 6 AgentFS = 10), resources, prompts
 * - callTool after CLI remember same tmpDir returns fact (cross-visibility)
 * - AgentFS start/write/append/read/extract/complete works, traversal ../../outside fails
 * - read-only guard MEMOFS_MCP_READ_ONLY=true blocks writes
 * - cleanup kills child process + removes tmpDir
 *
 * @public
 */
export async function createRealMcpStdioHarness(
	options: CreateRealMcpStdioHarnessOptions = {},
): Promise<McpStdioHarness> {
	const prefix = options.prefix ?? "memofs-e2e-mcp-stdio-";
	const tmpDir = options.tmpDir ?? (await mkdtemp(join(tmpdir(), prefix)));

	if (options.tmpDir) {
		await mkdir(tmpDir, { recursive: true });
	}

	const mcpBin = resolveMcpBin(options.mcpBin);

	// Ensure bin exists
	try {
		await stat(mcpBin);
	} catch {
		throw new Error(
			`McpStdioHarness: mcpBin does not exist after resolution: ${mcpBin}`,
		);
	}

	// Dynamic import SDK Client to avoid bundling issues; types imported statically above
	let Client: typeof SdkClient;
	let StdioClientTransport: typeof SdkStdioTransport;
	try {
		const modClient = (await import(
			"@modelcontextprotocol/sdk/client/index"
		)) as unknown as {
			Client: typeof SdkClient;
		};
		Client = modClient.Client;
		const modStdio = (await import(
			"@modelcontextprotocol/sdk/client/stdio"
		)) as unknown as {
			StdioClientTransport: typeof SdkStdioTransport;
		};
		StdioClientTransport = modStdio.StdioClientTransport;
	} catch (e) {
		throw new Error(
			`McpStdioHarness: failed to import @modelcontextprotocol/sdk Client. Install it in @repo/e2e. Original: ${(e as Error).message}`,
		);
	}

	// Build env: isolate, disable color, disable local embeddings for speed, respect readOnly
	const env: Record<string, string> = {
		...(process.env as Record<string, string>),
		MEMOFS_ROOT: tmpDir,
		MEMOFS_HOME: tmpDir,
		MEMOFS_LOCAL_EMBEDDINGS: "0",
		NO_COLOR: "1",
		FORCE_COLOR: "0",
		...options.env,
	};

	if (options.readOnly) {
		env.MEMOFS_MCP_READ_ONLY = "true";
	} else if (env.MEMOFS_MCP_READ_ONLY === undefined) {
		// Default allow writes unless explicitly read-only
		env.MEMOFS_MCP_READ_ONLY = "false";
	}

	// Build args: --root tmpDir + optional projectId/workspaceId + extraArgs
	const args: string[] = [mcpBin, "--root", tmpDir];
	if (options.projectId) {
		args.push("--project-id", options.projectId);
	}
	if (options.workspaceId) {
		args.push("--workspace-id", options.workspaceId);
	}
	if (options.extraArgs) {
		args.push(...options.extraArgs);
	}

	// Create transport that spawns: node <mcpBin> --root <tmpDir> ...
	const transport = new StdioClientTransport({
		command: process.execPath,
		args,
		env,
		stderr: "pipe",
	});

	const client = new Client(
		{ name: "e2e-mcp-stdio", version: "1.0.0" },
		{ capabilities: {} },
	);

	// Connect will spawn and perform initialize handshake
	await client.connect(transport);

	let cleaned = false;

	const assertFileExists = async (relPath: string): Promise<void> => {
		await assertFileExistsAt(tmpDir, relPath);
	};
	const assertFileNotExists = async (relPath: string): Promise<void> => {
		await assertFileNotExistsAt(tmpDir, relPath);
	};
	const listFiles = async (): Promise<string[]> => {
		return listFilesRecursive(tmpDir);
	};
	const snapshotFs = async (): Promise<Record<string, string>> => {
		return snapshotFsRecursive(tmpDir);
	};

	const listTools = async (): Promise<McpTool[]> => {
		const result = (await client.listTools()) as unknown as {
			tools?: McpTool[];
		} & McpTool[];
		const toolsField = (result as { tools?: McpTool[] }).tools;
		const tools = toolsField ?? (result as unknown as McpTool[]);
		if (Array.isArray(tools)) return tools;
		const nested = (result as { tools?: { tools?: McpTool[] } })
			.tools as unknown as { tools?: McpTool[] } | undefined;
		return nested?.tools ?? [];
	};

	const listResources = async (): Promise<unknown[]> => {
		const result = (await client.listResources()) as unknown as {
			resources?: unknown[];
		};
		const resources =
			(result as { resources?: unknown[] }).resources ??
			(result as unknown as unknown[]);
		if (Array.isArray(resources)) return resources;
		return [];
	};

	const listPrompts = async (): Promise<unknown[]> => {
		const result = (await client.listPrompts()) as unknown as {
			prompts?: unknown[];
		};
		const prompts =
			(result as { prompts?: unknown[] }).prompts ??
			(result as unknown as unknown[]);
		if (Array.isArray(prompts)) return prompts;
		return [];
	};

	const callTool = async (
		name: string,
		args: Record<string, unknown> = {},
	): Promise<McpToolCallResult> => {
		const result = (await client.callTool({
			name,
			arguments: args,
		})) as unknown as McpToolCallResult;
		return result;
	};

	const readResource = async (uri: string): Promise<unknown> => {
		return (await client.readResource({ uri })) as unknown;
	};

	const getPrompt = async (
		name: string,
		args: Record<string, unknown> = {},
	): Promise<unknown> => {
		return (await client.getPrompt({
			name,
			arguments: args as never,
		})) as unknown;
	};

	const close = async (): Promise<void> => {
		try {
			await client.close();
		} catch {
			// ignore
		}
		try {
			await transport.close?.();
		} catch {
			// ignore
		}
	};

	const cleanup = async (): Promise<void> => {
		if (cleaned) return;
		cleaned = true;
		try {
			await close();
		} catch {
			// ignore
		}
		await rm(tmpDir, { recursive: true, force: true });
	};

	return {
		tmpDir,
		mcpBin,
		client,
		transport,
		cleanup,
		close,
		assertFileExists,
		assertFileNotExists,
		snapshotFs,
		listFiles,
		listTools,
		listResources,
		listPrompts,
		callTool,
		readResource,
		getPrompt,
	};
}
