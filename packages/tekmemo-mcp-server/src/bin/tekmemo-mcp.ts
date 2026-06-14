#!/usr/bin/env node
import {
	createTekMemoMcpProtocolServer,
	createTekMemoMcpRuntimeFromConfig,
	runStdioServer,
} from "../index";

main().catch((error) => {
	console.error(
		`[tekmemo-mcp] ${error instanceof Error ? error.message : String(error)}`,
	);
	process.exit(2);
});

async function main(): Promise<void> {
	const args = parseArgs(process.argv.slice(2));
	if (args.help) {
		printHelp();
		process.exit(0);
	}

	let runtime: Awaited<ReturnType<typeof createTekMemoMcpRuntimeFromConfig>>;
	try {
		runtime = await createTekMemoMcpRuntimeFromConfig({
			mode: args.runtime as TekMemoRuntimeMode | undefined,
			rootDir: args.root as string | undefined,
			projectId: args.projectId as string | undefined,
			workspaceId: args.workspaceId as string | undefined,
			readPolicy: args.readPolicy as RuntimeReadPolicy | undefined,
			writePolicy: args.writePolicy as RuntimeWritePolicy | undefined,
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
			`[tekmemo-mcp] ${error instanceof Error ? error.message : String(error)}`,
		);
		process.exit(2);
	}

	const readOnly =
		(args.readOnly as boolean | undefined) ??
		process.env.TEKMEMO_MCP_READ_ONLY === "true";
	const server = createTekMemoMcpProtocolServer({
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

type TekMemoRuntimeMode = "local" | "memory" | "cloud" | "hybrid";
type RuntimeReadPolicy =
	| "local-first"
	| "cloud-first"
	| "local-only"
	| "cloud-only";
type RuntimeWritePolicy =
	| "local-first"
	| "cloud-first"
	| "local-only"
	| "cloud-only";

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
		else if (arg === "--read-policy")
			out.readPolicy = requireValue(argv, ++index, arg);
		else if (arg === "--write-policy")
			out.writePolicy = requireValue(argv, ++index, arg);
		else if (arg === "--request-timeout-ms")
			out.requestTimeoutMs = requireValue(argv, ++index, arg);
		else if (arg === "--max-input-bytes")
			out.maxInputBytes = requireValue(argv, ++index, arg);
		else if (arg === "--max-output-bytes")
			out.maxOutputBytes = requireValue(argv, ++index, arg);
		else {
			console.error(`[tekmemo-mcp] Unknown option: ${arg}`);
			process.exit(2);
		}
	}

	if (
		out.runtime !== undefined &&
		!["local", "memory", "cloud", "hybrid"].includes(out.runtime as string)
	) {
		console.error(
			`[tekmemo-mcp] --runtime must be local, memory, cloud, or hybrid.`,
		);
		process.exit(2);
	}
	if (
		out.readPolicy !== undefined &&
		!["local-first", "cloud-first", "local-only", "cloud-only"].includes(
			out.readPolicy as string,
		)
	) {
		console.error(
			`[tekmemo-mcp] --read-policy must be local-first, cloud-first, local-only, or cloud-only.`,
		);
		process.exit(2);
	}
	if (
		out.writePolicy !== undefined &&
		!["local-first", "cloud-first", "local-only", "cloud-only"].includes(
			out.writePolicy as string,
		)
	) {
		console.error(
			`[tekmemo-mcp] --write-policy must be local-first, cloud-first, local-only, or cloud-only.`,
		);
		process.exit(2);
	}

	return out;
}

function requireValue(argv: string[], index: number, flag: string): string {
	const value = argv[index];
	if (value === undefined || value.startsWith("--")) {
		console.error(`[tekmemo-mcp] ${flag} requires a value.`);
		process.exit(2);
	}
	return value;
}

function numberArg(
	value: string | undefined,
	fallback: number | undefined,
): number | undefined {
	if (value === undefined) return fallback;
	const number = Number(value);
	return Number.isFinite(number) && number > 0 ? number : fallback;
}

function printHelp(): void {
	console.log(`Usage: tekmemo-mcp-server [options]

Options:
  --runtime <local|memory|cloud|hybrid>  Runtime mode. Defaults to local.
  --root <path>                         Local workspace root. Defaults to cwd.
  --project-id <id>                     Optional project id / default cloud project id.
  --workspace-id <id>                   Optional default cloud workspace id.
  --cloud-url <url>                     TekMemo Cloud API root, e.g. https://memo.tekbreed.com/api/v1.
  --api-key <key>                       TekMemo Cloud API key. Prefer TEKMEMO_API_KEY.
  --cloud-timeout-ms <number>           Cloud request timeout. Defaults to cloud-client default.
  --read-policy <local-first|cloud-first>
                                         Hybrid read policy. Defaults to local-first.
  --write-policy <local-first|cloud-first|local-only|cloud-only>
                                         Hybrid write policy. Defaults to local-first.
  --read-only                           Block all write tools.
  --allow-writes                        Allow write tools when host authorizes them.
  --request-timeout-ms <number>         Per-tool timeout. Defaults to 30000.
  --max-input-bytes <number>            Max tool argument bytes.
  --max-output-bytes <number>           Max tool result bytes.
  -h, --help                            Show this help.

Environment:
  TEKMEMO_RUNTIME                       local, memory, cloud, or hybrid.
  TEKMEMO_ROOT                          Local workspace root.
  TEKMEMO_CLOUD_URL / TEKMEMO_API_URL   TekMemo Cloud API root.
  TEKMEMO_API_KEY                       TekMemo Cloud API key.
  TEKMEMO_WORKSPACE_ID                  Default cloud workspace id.
  TEKMEMO_PROJECT_ID                    Default project id.
  TEKMEMO_CLOUD_TIMEOUT_MS              Cloud request timeout.
  TEKMEMO_MCP_READ_ONLY                 true to block write tools.
`);
}
