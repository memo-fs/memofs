/**
 * Node bin smoke test — the runtime API over the Node single-process deploy.
 *
 * @remarks
 * The s3-execution-plan slice-1 bar: "containerized where it's Node." Boots the
 * real **built** `dist/bin/memofs-server.mjs` entry as a child process on an
 * ephemeral port, waits for it to listen, then exercises the HTTP surface over
 * real sockets. The built artifact (not the raw `.ts`) is used so the bin's
 * bundled deps resolve — this is how the MCP bin runs too
 * (`dist/bin/memofs-mcp.mjs`).
 *
 * Proves's "the cloud and the OSS self-hoster run identical
 * `memofs-server` code" at the Node target: the same `handleRuntimeRequest`
 * core the Worker uses serves the same shapes from `node:http`.
 *
 * The bin ships a deterministic in-memory runtime at slice 1 (no provider
 * bundle wired); the deploy doc covers wiring R2-compatible + Turso + OpenAI.
 * We assert it boots, serves health, dispatches a read, and gates writes —
 * the contract that holds regardless of which bundle is injected.
 *
 * NOTE: requires `pnpm build` to have produced `dist/bin/memofs-server.mjs`.
 */
import { type ChildProcess, spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const BIN_PATH = resolve("dist/bin/memofs-server.mjs");
const PORT = 18_000 + Math.floor(Math.random() * 1000);

let child: ChildProcess | undefined;

beforeAll(async () => {
	if (!existsSync(BIN_PATH)) {
		throw new Error(
			`Built bin not found at ${BIN_PATH}. Run \`pnpm build\` before this suite.`,
		);
	}
	child = await bootBin(PORT);
}, 30_000);

afterAll(() => {
	child?.kill("SIGTERM");
});

/** Spawns the built bin + waits until it logs "listening". */
async function bootBin(port: number): Promise<ChildProcess> {
	const proc = spawn("node", [BIN_PATH], {
		env: { ...process.env, PORT: String(port) },
		stdio: ["ignore", "pipe", "pipe"],
	});
	await waitForListening(proc);
	return proc;
}

/** Resolves once the bin's stdout announces it is listening. */
function waitForListening(proc: ChildProcess): Promise<void> {
	return new Promise((resolvePromise, reject) => {
		const timer = setTimeout(() => {
			reject(new Error("bin did not announce listening within 10s"));
		}, 10_000);
		proc.stdout?.on("data", (chunk: Buffer) => {
			if (chunk.toString().includes("listening")) {
				clearTimeout(timer);
				resolvePromise();
			}
		});
		proc.on("error", (err) => {
			clearTimeout(timer);
			reject(err);
		});
		proc.on("exit", (code) => {
			clearTimeout(timer);
			reject(new Error(`bin exited before listening (code=${String(code)})`));
		});
	});
}

/** POSTs a JSON-RPC request, retrying connection-refused during boot. */
async function rpc(
	method: string,
	params: Record<string, unknown> = {},
): Promise<{ status: number; body: unknown }> {
	const url = `http://127.0.0.1:${PORT}/`;
	for (let attempt = 0; attempt < 30; attempt += 1) {
		try {
			const res = await fetch(url, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
			});
			const text = await res.text();
			try {
				return { status: res.status, body: JSON.parse(text) };
			} catch {
				return { status: res.status, body: text };
			}
		} catch (err) {
			if (
				err instanceof Error &&
				/ECONNREFUSED|Connection refused/.test(err.message)
			) {
				await new Promise((r) => setTimeout(r, 100));
				continue;
			}
			throw err;
		}
	}
	throw new Error(`could not reach ${url}`);
}

describe("server-bin: Node single-process deploy", () => {
	it("GET /health returns liveness JSON", async () => {
		const res = await fetch(`http://127.0.0.1:${PORT}/health`);
		expect(res.status).toBe(200);
		const body = (await res.json()) as { ok: boolean; name: string };
		expect(body.ok).toBe(true);
		expect(body.name).toBe("memofs-server");
	});

	it("POST / dispatches a read method over real sockets", async () => {
		const { status, body } = await rpc("memory.readCore", {});
		expect(status).toBe(200);
		expect((body as { result: { content: string } }).result).toBeDefined();
	});

	it("a gated write returns HTTP 503 over real sockets", async () => {
		const { status, body } = await rpc("memory.write", { content: "x" });
		expect(status).toBe(503);
		expect(
			(body as { error: { data: { httpStatus: number } } }).error.data
				.httpStatus,
		).toBe(503);
	});

	it("an unknown method returns methodNotFound (200 body)", async () => {
		const { status, body } = await rpc("nope", {});
		expect(status).toBe(200);
		expect((body as { error: { code: number } }).error.code).toBe(-32601);
	});

	it("rejects an oversized body with 413 (DoS protection, VULN-001)", async () => {
		// A body over MAX_BODY_BYTES (1 MB) must be refused before dispatch so an
		// attacker cannot exhaust heap by streaming an unbounded body.
		const oversized = "x".repeat(1_100_000); // > 1 MB
		const res = await fetch(`http://127.0.0.1:${PORT}/`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				jsonrpc: "2.0",
				id: 1,
				method: "memory.readCore",
				params: { padding: oversized },
			}),
		});
		expect(res.status).toBe(413);
	});
});
