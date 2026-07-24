/**
 * Real Server harness — Node http random free port, file-first truth.
 *
 * @remarks
 * Boots `node:http` server on 127.0.0.1:0 bridging to `handleRuntimeRequest`
 * with a real `NodeFsMemoryStore` + `createHostedRuntime` from tmpDir.
 * Provides concurrency layer to enable writes (memory.write) for e2e,
 * proving file-first truth, json-rpc fetch, cross-visibility.
 *
 * Node-only.
 */

import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
	assertFileExistsAt,
	assertFileNotExistsAt,
	listFilesRecursive,
	snapshotFsRecursive,
} from "./fs-helpers.js";
import { headersToObject, readBody } from "./http-helpers.js";

import type { RealHarness } from "./core-harness.js";

export type ServerRealHarness = RealHarness & {
	/** Base URL e.g. http://127.0.0.1:port/ */
	url: string;
	port: number;
	server: ReturnType<typeof createServer>;
	/** JSON-RPC POST helper returning full envelope. */
	rpc: (method: string, params?: Record<string, unknown>, id?: number | string) => Promise<unknown>;
	/** Convenience: memory.write */
	writeMemory: (content: string) => Promise<unknown>;
	/** Convenience: recall */
	recall: (query: string, limit?: number) => Promise<unknown>;
	/** Convenience: context */
	context: (query: string) => Promise<unknown>;
	close: () => Promise<void>;
};

export type CreateRealServerHarnessOptions = {
	tmpDir?: string;
	prefix?: string;
	projectId?: string;
	name?: string;
	version?: string;
	env?: Record<string, string>;
};



/**
 * Creates a real Server harness with isolated tmpDir and random port.
 * @public
 */
export async function createRealServerHarness(
	options: CreateRealServerHarnessOptions = {},
): Promise<ServerRealHarness> {
	const prefix = options.prefix ?? "memofs-e2e-server-";
	const tmpDir = options.tmpDir ?? (await mkdtemp(join(tmpdir(), prefix)));
	if (options.tmpDir) await mkdir(tmpDir, { recursive: true });

	const projectId = options.projectId ?? "e2e-test";

	// Dynamic imports
	const { createNodeFsMemoryStore } = await import("@memofs/core/node-fs");
	const { createHostedRuntime, handleRuntimeRequest } = await import("@memofs/server");

	const store = createNodeFsMemoryStore({
		rootDir: tmpDir,
		createRoot: true,
		missingFileBehavior: "empty",
		lock: false,
	});

	const runtime = createHostedRuntime({
		store,
		projectId,
		name: options.name ?? "memofs-server-e2e",
		version: options.version ?? "0.1.0",
	});

	// Minimal concurrency layer that just runs fn — enables writes for e2e single writer
	const concurrencyLayer = {
		acquire: async <T>(_projectId: string, fn: () => Promise<T>): Promise<T> => fn(),
	};

	const server = createServer((req: IncomingMessage, res: ServerResponse) => {
		void (async () => {
			try {
				const method = req.method ?? "GET";
				const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "127.0.0.1"}`);
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

				const response = await handleRuntimeRequest(request, {
					runtime,
					requireAuth: false,
					concurrencyLayer,
				});

				res.writeHead(response.status, headersToObject(response.headers));
				const buf = Buffer.from(await response.arrayBuffer());
				res.end(buf);
			} catch (err) {
				console.error("[server-harness] request failed", err);
				if (!res.headersSent) res.writeHead(500, { "Content-Type": "text/plain" });
				res.end("Internal server error");
			}
		})();
	});

	server.requestTimeout = 30_000;
	server.headersTimeout = 65_000;

	const { port } = await new Promise<{ port: number }>((resolve, reject) => {
		server.listen(0, "127.0.0.1", () => {
			const addr = server.address();
			if (addr && typeof addr === "object") resolve({ port: addr.port });
			else reject(new Error("ServerHarness: failed to get port"));
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
	const snapshotFs = async (): Promise<Record<string, string>> => snapshotFsRecursive(tmpDir);

	const rpc = async (method: string, params: Record<string, unknown> = {}, id: number | string = 1): Promise<unknown> => {
		const body = JSON.stringify({ jsonrpc: "2.0", id, method, params: { ...params, projectId } });
		const res = await fetch(url, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body,
		});
		const text = await res.text();
		let json: unknown;
		try {
			json = JSON.parse(text) as unknown;
		} catch {
			throw new Error(`ServerHarness: invalid JSON status=${res.status} body=${text.slice(0, 500)}`);
		}
		return json;
	};

	const writeMemory = async (content: string): Promise<unknown> => {
		const envelope = (await rpc("memory.write", { content })) as { error?: unknown; result?: unknown };
		if (envelope.error) {
			throw new Error(`ServerHarness writeMemory failed: ${JSON.stringify(envelope.error)}`);
		}
		return envelope.result;
	};

	const recall = async (query: string, limit?: number): Promise<unknown> => {
		const envelope = (await rpc("recall", { query, ...(limit ? { limit } : {}) })) as {
			error?: unknown;
			result?: unknown;
		};
		if (envelope.error) {
			throw new Error(`ServerHarness recall failed: ${JSON.stringify(envelope.error)}`);
		}
		return envelope.result;
	};

	const context = async (query: string): Promise<unknown> => {
		const envelope = (await rpc("context", { query })) as { error?: unknown; result?: unknown };
		if (envelope.error) {
			throw new Error(`ServerHarness context failed: ${JSON.stringify(envelope.error)}`);
		}
		return envelope.result;
	};

	const close = async (): Promise<void> => {
		await new Promise<void>((resolve) => server.close(() => resolve()));
		try {
			await store.dispose?.();
		} catch {}
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
		writeMemory,
		recall,
		context,
		cleanup,
		close,
		assertFileExists,
		assertFileNotExists,
		snapshotFs,
		listFiles,
	};
}
