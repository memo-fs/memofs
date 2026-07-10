#!/usr/bin/env node

/**
 * Command Line Interface entrypoint executable for the Model Context Protocol (MCP) server.
 * Parses process arguments, constructs the runtime, and starts the stdio server stream.
 *
 * @module memofs-mcp
 */

import {
	createMemoFSMcpProtocolServer,
	createMemoFSMcpRuntimeFromConfig,
	runStdioServer,
} from "../index";
import type { MemoFSRuntimeMode } from "../types";

main().catch((error) => {
	console.error(
		`[memofs-mcp] ${error instanceof Error ? error.message : String(error)}`,
	);
	process.exit(2);
});

/**
 * Main application entrypoint function.
 * Initializes the runtime based on CLI parameters and starts the transport server.
 *
 * @returns A promise that resolves when server initialization and stream execution completes.
 */
async function main(): Promise<void> {
	const args = parseArgs(process.argv.slice(2));
	if (args.help) {
		printHelp();
		process.exit(0);
	}

	let runtime: Awaited<ReturnType<typeof createMemoFSMcpRuntimeFromConfig>>;
	try {
		runtime = await createMemoFSMcpRuntimeFromConfig({
			mode: args.runtime as MemoFSRuntimeMode | undefined,
			rootDir: args.root as string | undefined,
			projectId: args.projectId as string | undefined,
			workspaceId: args.workspaceId as string | undefined,
			cloud: {
				baseUrl: args.cloudUrl as string | undefined,
				apiKey: args.apiKey as string | undefined,
				workspaceId: args.workspaceId as string | undefined,
				projectId: args.projectId as string | undefined,
				timeoutMs: numberArg(
					args.cloudTimeoutMs as string | undefined,
					undefined,
				),
			},
		});
	} catch (error) {
		console.error(
			`[memofs-mcp] ${error instanceof Error ? error.message : String(error)}`,
		);
		process.exit(2);
	}

	const readOnly =
		(args.readOnly as boolean | undefined) ??
		process.env.MEMOFS_MCP_READ_ONLY === "true";
	const server = createMemoFSMcpProtocolServer({
		runtime,
		readOnly,
		requestTimeoutMs: numberArg(
			args.requestTimeoutMs as string | undefined,
			30_000,
		),
		maxInputBytes: numberArg(args.maxInputBytes as string | undefined, 256_000),
		maxOutputBytes: numberArg(
			args.maxOutputBytes as string | undefined,
			512_000,
		),
	});

	await runStdioServer(server);
}

/**
 * Parses argv command line parameters into a structured record dictionary mapping option keys.
 *
 * @param argv - The process argv slice.
 * @returns A parsed parameters record mapping flag values.
 */
function parseArgs(
	argv: string[],
): Record<string, string | boolean | undefined> {
	const out: Record<string, string | boolean | undefined> = {};
	for (let index = 0; index < argv.length; index += 1) {
		const arg = argv[index];
		if (arg === "--help" || arg === "-h") out.help = true;
		else if (arg === "--read-only") out.readOnly = true;
		else if (arg === "--allow-writes") out.readOnly = false;
		else if (arg === "--runtime")
			out.runtime = requireValue(argv, ++index, arg);
		else if (arg === "--root") out.root = requireValue(argv, ++index, arg);
		else if (arg === "--project-id")
			out.projectId = requireValue(argv, ++index, arg);
		else if (arg === "--workspace-id")
			out.workspaceId = requireValue(argv, ++index, arg);
		else if (arg === "--cloud-url")
			out.cloudUrl = requireValue(argv, ++index, arg);
		else if (arg === "--api-key") out.apiKey = requireValue(argv, ++index, arg);
		else if (arg === "--cloud-timeout-ms")
			out.cloudTimeoutMs = requireValue(argv, ++index, arg);
		else if (arg === "--request-timeout-ms")
			out.requestTimeoutMs = requireValue(argv, ++index, arg);
		else if (arg === "--max-input-bytes")
			out.maxInputBytes = requireValue(argv, ++index, arg);
		else if (arg === "--max-output-bytes")
			out.maxOutputBytes = requireValue(argv, ++index, arg);
		else {
			console.error(`[memofs-mcp] Unknown option: ${arg}`);
			process.exit(2);
		}
	}

	if (
		out.runtime !== undefined &&
		!["local", "hybrid"].includes(out.runtime as string)
	) {
		console.error(`[memofs-mcp] --runtime must be local or hybrid.`);
		process.exit(2);
	}

	return out;
}

/**
 * Asserts that a value exists for a given command-line option flag and returns it.
 *
 * @param argv - The process arguments array.
 * @param index - Index of the expected flag value.
 * @param flag - The flag name.
 * @returns The parsed option string value.
 */
function requireValue(argv: string[], index: number, flag: string): string {
	const value = argv[index];
	if (value === undefined || value.startsWith("--")) {
		console.error(`[memofs-mcp] ${flag} requires a value.`);
		process.exit(2);
	}
	return value;
}

/**
 * Parses and returns a numeric configuration option with fallback protection.
 *
 * @param value - The input flag value.
 * @param fallback - The default fallback number.
 * @returns The parsed number or the fallback.
 */
function numberArg(
	value: string | undefined,
	fallback: number | undefined,
): number | undefined {
	if (value === undefined) return fallback;
	const number = Number(value);
	return Number.isFinite(number) && number > 0 ? number : fallback;
}

/**
 * Outputs the helper command usage documentation block to standard output.
 */
function printHelp(): void {
	console.log(`Usage: memofs-mcp-server [options]

Options:
 --runtime <local|hybrid> Runtime mode. Defaults to local.
 --root <path> Local workspace root. Defaults to cwd.
 --project-id <id> Optional project id / default cloud project id.
 --workspace-id <id> Optional default cloud workspace id.
 --cloud-url <url> MemoFS Cloud API root, e.g. https://memofs.dev/api/v1.
 --api-key <key> MemoFS Cloud API key. Prefer MEMOFS_API_KEY.
 --cloud-timeout-ms <number> Cloud request timeout. Defaults to cloud-client default.
 --read-only Block all write tools.
 --allow-writes Allow write tools when host authorizes them.
 --request-timeout-ms <number> Per-tool timeout. Defaults to 30000.
 --max-input-bytes <number> Max tool argument bytes.
 --max-output-bytes <number> Max tool result bytes.
 --help Show this help.

Environment:
 MEMOFS_RUNTIME local or hybrid.
 MEMOFS_ROOT Local workspace root.
 MEMOFS_CLOUD_URL / MEMOFS_API_URL MemoFS Cloud API root.
 MEMOFS_API_KEY MemoFS Cloud API key.
 MEMOFS_WORKSPACE_ID Default cloud workspace id.
 MEMOFS_PROJECT_ID Default project id.
 MEMOFS_CLOUD_TIMEOUT_MS Cloud request timeout.
 MEMOFS_MCP_READ_ONLY true to block write tools.
 `);
}
