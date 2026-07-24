/**
 * Real MCP HTTP harness — Node http random free port, file-first truth.
 *
 * @remarks
 * Boots `node:http` server on 127.0.0.1 random port (0) that bridges
 * to `handleMemoFSMcpRequest` with a real `NodeFs` runtime from tmpDir.
 * Proves MCP Streamable HTTP adapter works with real store, file-first
 * truth, and json-rpc fetch `memory.write` + `recall`.
 *
 * Node-only.
 */

import { mkdir, mkdtemp, rm } from "node:fs/promises";
import {
	createServer,
	type IncomingMessage,
	type ServerResponse,
} from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { RealHarness } from "./core-harness";
import {
	assertFileExistsAt,
	assertFileNotExistsAt,
	listFilesRecursive,
	snapshotFsRecursive,
} from "./fs-helpers";
import { headersToObject, readBody } from "./http-helpers";

export type McpHttpHarness = RealHarness & {
	/** Base URL e.g. http://127.0.0.1:43821/ */
	url: string;
	/** Port number. */
	port: number;
	/** Underlying http.Server (for advanced). */
	server: ReturnType<typeof createServer>;
	/** JSON-RPC POST helper. */
	rpc: (
		method: string,
		params?: Record<string, unknown>,
		id?: number | string,
	) => Promise<unknown>;
	/** Call a tool via tools/call. */
	callTool: (name: string, args?: Record<string, unknown>) => Promise<unknown>;
	/** List tools. */
	listTools: () => Promise<unknown[]>;
	/** Stop server + rm tmpDir. */
	close: () => Promise<void>;
};

export type CreateRealMcpHttpHarnessOptions = {
	tmpDir?: string;
	prefix?: string;
	projectId?: string;
	workspaceId?: string;
	readOnly?: boolean;
	env?: Record<string, string>;
};

/**
 * Creates a real MCP HTTP harness with isolated tmpDir and random port.
 * @public
 */
export async function createRealMcpHttpHarness(
	options: CreateRealMcpHttpHarnessOptions = {},
): Promise<McpHttpHarness> {
	const prefix = options.prefix ?? "memofs-e2e-mcp-http-";
	const tmpDir = options.tmpDir ?? (await mkdtemp(join(tmpdir(), prefix)));
	if (options.tmpDir) await mkdir(tmpDir, { recursive: true });

	// Dynamic import to avoid bundling issues + allow CJS interop
	const { createMemoFSMcpRuntimeFromConfig } = await import(
		"@memofs/mcp-server"
	);
	const { handleMemoFSMcpRequest } = await import("@memofs/mcp-server/http");

	const runtime = createMemoFSMcpRuntimeFromConfig({
		mode: "local",
		rootDir: tmpDir,
		...(options.projectId ? { projectId: options.projectId } : {}),
		...(options.workspaceId ? { workspaceId: options.workspaceId } : {}),
		recall: { localEmbeddings: false },
	});

	const readOnly = options.readOnly ?? false;

	// Create http server bridging Node <-> Web API
	const server = createServer((req: IncomingMessage, res: ServerResponse) => {
		void (async () => {
			try {
				const method = req.method ?? "GET";
				const url = new URL(
					req.url ?? "/",
					`http://${req.headers.host ?? "127.0.0.1"}`,
				);
				const headers = new Headers();
				for (const [key, value] of Object.entries(req.headers)) {
					if (Array.isArray(value)) {
						for (const v of value) headers.append(key, v);
					} else if (value !== undefined) {
						headers.set(key, value);
					}
				}
				let body: Buffer | null = null;
				if (method !== "GET" && method !== "HEAD") {
					try {
						body = await readBody(req);
					} catch {
						res.writeHead(500).end("read body failed");
						return;
					}
				}
				const request = new Request(url, {
					method,
					headers,
					body: body ? new Uint8Array(body) : null,
				});

				const response = await handleMemoFSMcpRequest(request, {
					runtime,
					readOnly,
					auth: { requireAuth: false },
				});

				res.writeHead(response.status, headersToObject(response.headers));
				const buf = Buffer.from(await response.arrayBuffer());
				res.end(buf);
			} catch (err) {
				console.error("[mcp-http-harness] request failed", err);
				if (!res.headersSent)
					res.writeHead(500, { "Content-Type": "text/plain" });
				res.end("Internal server error");
			}
		})();
	});

	server.requestTimeout = 30_000;
	server.headersTimeout = 65_000;

	const { port } = await new Promise<{ port: number }>((resolve, reject) => {
		server.listen(0, "127.0.0.1", () => {
			const addr = server.address();
			if (addr && typeof addr === "object") {
				resolve({ port: addr.port });
			} else {
				reject(new Error("McpHttpHarness: failed to get port"));
			}
		});
		server.on("error", reject);
	});

	const url = `http://127.0.0.1:${port}/`;

	let cleaned = false;

	const assertFileExists = async (relPath: string): Promise<void> => {
		await assertFileExistsAt(tmpDir, relPath);
	};
	const assertFileNotExists = async (relPath: string): Promise<void> => {
		await assertFileNotExistsAt(tmpDir, relPath);
	};
	const listFiles = async (): Promise<string[]> => listFilesRecursive(tmpDir);
	const snapshotFs = async (): Promise<Record<string, string>> =>
		snapshotFsRecursive(tmpDir);

	const rpc = async (
		method: string,
		params: Record<string, unknown> = {},
		id: number | string = 1,
	): Promise<unknown> => {
		const body = JSON.stringify({ jsonrpc: "2.0", id, method, params });
		const res = await fetch(url, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Accept: "application/json, text/event-stream",
			},
			body,
		});
		const text = await res.text();
		let json: unknown;
		try {
			json = JSON.parse(text) as unknown;
		} catch {
			throw new Error(
				`McpHttpHarness: invalid JSON response status=${res.status} body=${text.slice(0, 500)}`,
			);
		}
		if (typeof json === "object" && json !== null && "error" in json) {
			return json;
		}
		if (typeof json === "object" && json !== null && "result" in json) {
			return (json as { result: unknown }).result;
		}
		return json;
	};

	const listTools = async (): Promise<unknown[]> => {
		const result = (await rpc("tools/list", {})) as { tools?: unknown[] };
		if (result.tools) return result.tools;
		return [];
	};

	const callTool = async (
		name: string,
		args: Record<string, unknown> = {},
	): Promise<unknown> => {
		const result = await rpc("tools/call", { name, arguments: args });
		return result;
	};

	const close = async (): Promise<void> => {
		await new Promise<void>((resolve) => server.close(() => resolve()));
	};

	const cleanup = async (): Promise<void> => {
		if (cleaned) return;
		cleaned = true;
		try {
			await close();
		} catch {}
		await rm(tmpDir, { recursive: true, force: true });
	};

	return {
		tmpDir,
		url,
		port,
		server,
		rpc,
		callTool,
		listTools,
		cleanup,
		close,
		assertFileExists,
		assertFileNotExists,
		snapshotFs,
		listFiles,
	};
}
