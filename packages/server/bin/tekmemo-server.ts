#!/usr/bin/env node

/**
 * Node single-process entry for `tekmemo-server` — the OSS self-host deploy
 * (ADR 0013: "a single Node process for OSS self-hosters — Fly / Railway /
 * Render / a VPS — no size cap, nothing to split").
 *
 * @remarks
 * Bridges `node:http`'s `IncomingMessage`/`ServerResponse` to the same Web
 * `Request`/`Response` core (`handleRuntimeRequest`) the Worker entry uses —
 * so Node and Cloudflare run **identical** server code, only the deployment
 * target differs. This is the net-new `node:http` ↔ Web-API bridge for the
 * repo (no prior precedent); it stays minimal: read the body once, build a
 * global `Request`, pass it to the core, write the `Response` back.
 *
 * The runtime bundle is built from env (the canonical OSS self-host path:
 * an R2-compatible bucket + Turso/libSQL + OpenAI). Slice 1 ships a
 * deterministic in-memory default so the bin boots + passes its smoke test;
 * the cloud-bundle wiring is the deploy-doc configuration step.
 *
 * Auth: bearer token via `TEKMEMO_SERVER_TOKEN` (required when the port is
 * exposed publicly — set `requireAuth` off only behind a private network).
 */

import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { InMemoryMemoryStore, Tekmemo } from "@tekmemo/core";
import {
	createHostedRuntime,
	handleRuntimeRequest,
} from "../src/index";

const PORT = parsePort(process.env.PORT);
const TOKEN = process.env.TEKMEMO_SERVER_TOKEN;
// Auth defaults OFF: the in-memory default bundle has no secret, and the cloud
// reaches the runtime Worker over a private Service Binding. A self-hoster
// exposing the port publicly sets TEKMEMO_SERVER_TOKEN (which auto-enables
// auth) or TEKMEMO_SERVER_REQUIRE_AUTH=true explicitly.
const REQUIRE_AUTH =
	process.env.TEKMEMO_SERVER_REQUIRE_AUTH === "true" || TOKEN !== undefined;

main().catch((error) => {
	console.error(
		`[tekmemo-server] ${error instanceof Error ? error.message : String(error)}`,
	);
	process.exit(1);
});

/**
 * Boots the HTTP server. Builds the runtime, wires `node:http` to the core,
 * and listens on `PORT`.
 */
async function main(): Promise<void> {
	const runtime = buildRuntime();
	const server = createServer((req, res) => {
		serve(req, res, runtime).catch((error) => {
			console.error("[tekmemo-server] request failed", error);
			if (!res.headersSent) {
				res.writeHead(500, { "Content-Type": "text/plain" });
			}
			res.end("Internal server error.");
		});
	});
	// Defense-in-depth against DoS on the OSS Node deploy: cap how long a single
	// request may take + how slowly a client may send headers/body. Node's
	// defaults (300s/60s) are sized for browsers; an API surface should reject
	// slow-drip + slowloris stalls much faster. (Security review VULN-002.)
	server.requestTimeout = 30_000;
	server.headersTimeout = 65_000; // must exceed keepAliveTimeout (5s default)
	server.maxConnections = 100;

	server.listen(PORT, () => {
		const auth = REQUIRE_AUTH && TOKEN ? " (auth on)" : TOKEN ? "" : " (auth off)";
		// Defense-in-depth posture warning (security review VULN-003): when the
		// port is public and auth is off, every read method is wide open. The
		// bin binds 0.0.0.0 by default, so surface this loudly rather than let a
		// misconfigured public deploy leak memory silently.
		if (!REQUIRE_AUTH) {
			console.warn(
				`[tekmemo-server] WARNING: auth is off and the server binds 0.0.0.0. ` +
					`Set TEKMEMO_SERVER_TOKEN before exposing this port publicly, ` +
					`or run behind a private network / Service Binding.`,
			);
		}
		console.log(
			`[tekmemo-server] listening on http://0.0.0.0:${PORT}${auth}`,
		);
	});

	// Graceful shutdown on SIGTERM/SIGINT (container hosts send these).
	const shutdown = (signal: string) => {
		console.log(`[tekmemo-server] ${signal} received, shutting down.`);
		server.close(() => process.exit(0));
	};
	process.on("SIGTERM", () => shutdown("SIGTERM"));
	process.on("SIGINT", () => shutdown("SIGINT"));
}

/**
 * Handles a single Node HTTP request by bridging it to the Web-API core.
 *
 * @param req - The Node incoming message.
 * @param res - The Node server response.
 * @param runtime - The assembled Tekmemo runtime.
 */
async function serve(
	req: IncomingMessage,
	res: ServerResponse,
	runtime: Tekmemo,
): Promise<void> {
	const method = req.method ?? "GET";
	const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
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
			// Oversized body (MAX_BODY_BYTES exceeded) → 413, not 500.
			res.writeHead(413, { "Content-Type": "text/plain" });
			res.end("Request body too large.");
			return;
		}
	}
	// Node's `Buffer` type doesn't satisfy the DOM `BodyInit` contract the global
	// `Request` expects; pass a fresh `Uint8Array` view over the same bytes.
	const request = new Request(url, {
		method,
		headers,
		body: body === null ? null : new Uint8Array(body),
	});
	const response = await handleRuntimeRequest(request, {
		runtime,
		requireAuth: REQUIRE_AUTH,
		bearerToken: TOKEN,
	});

	res.writeHead(response.status, headersToObject(response.headers));
	res.end(Buffer.from(await response.arrayBuffer()));
}

/**
 * Hard cap on a single request body (1 MB). A JSON-RPC runtime-API payload is
 * small; anything larger is abuse. Enforced before dispatch so an attacker
 * cannot exhaust heap by streaming an unbounded body. (Security review VULN-001.)
 */
const MAX_BODY_BYTES = 1_000_000;

/** Error thrown by {@link readBody} when the body exceeds {@link MAX_BODY_BYTES}. */
class BodyTooLargeError extends Error {
	constructor() {
		super("Request body too large.");
		this.name = "BodyTooLargeError";
	}
}

/**
 * Reads the full request body into a Node Buffer, rejecting with
 * {@link BodyTooLargeError} once it exceeds {@link MAX_BODY_BYTES}. Stops
 * accumulating chunks on overflow but does NOT destroy the socket — the caller
 * writes a clean `413` response and Node closes the connection after `res.end`.
 */
function readBody(req: IncomingMessage): Promise<Buffer> {
	return new Promise((resolve, reject) => {
		const chunks: Buffer[] = [];
		let size = 0;
		let overflow = false;
		req.on("data", (chunk: Buffer) => {
			if (overflow) return; // drain remaining bytes without accumulating
			size += chunk.length;
			if (size > MAX_BODY_BYTES) {
				overflow = true;
				reject(new BodyTooLargeError());
				return;
			}
			chunks.push(chunk);
		});
		req.on("error", reject);
		req.on("end", () => {
			if (!overflow) resolve(Buffer.concat(chunks));
		});
	});
}

/** Converts Web `Headers` to a Node plain-object header map. */
function headersToObject(headers: Headers): Record<string, string> {
	const out: Record<string, string> = {};
	for (const [key, value] of headers.entries()) out[key] = value;
	return out;
}

/**
 * Builds the runtime from env. Slice-1 default: a deterministic in-memory
 * runtime so the bin boots + passes its smoke test. The deploy doc wires the
 * real bundle (R2-compatible bucket + Turso/libSQL + OpenAI) here.
 */
function buildRuntime(): Tekmemo {
	return createHostedRuntime({
		store: new InMemoryMemoryStore(),
		projectId: process.env.TEKMEMO_PROJECT_ID ?? "self-host",
		name: "tekmemo-server",
		version: "0.1.0",
	});
}

/** Parses a positive integer port, defaulting to 8787. */
function parsePort(value: string | undefined): number {
	if (value === undefined) return 8787;
	const port = Number(value);
	return Number.isInteger(port) && port > 0 ? port : 8787;
}
