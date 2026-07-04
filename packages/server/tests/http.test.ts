/**
 * HTTP layer for the `tekmemo-server` runtime API (`handleRuntimeRequest`).
 *
 * @remarks
 * Proves the framework-free core's contract at slice 1:
 * - `GET /health` returns liveness JSON.
 * - `POST /` dispatches JSON-RPC and returns the envelope (success + gate).
 * - The concurrency gate surfaces as an HTTP `503` (so client retry engages).
 * - Bearer-token auth rejects/accepts correctly.
 * - Unsupported verbs + paths return the right status.
 *
 * The runtime is an injected fake bundle (no real provider calls).
 */
import { InMemoryMemoryStore } from "@tekmemo/core";
import { beforeEach, describe, expect, it } from "vitest";
import { createHostedRuntime } from "../src";
import { handleRuntimeRequest } from "../src/http";
import { RUNTIME_METHOD } from "../src/protocol/methods";

function buildRuntime() {
	return createHostedRuntime({
		store: new InMemoryMemoryStore(),
		projectId: "http",
	});
}

async function post(
	runtime: ReturnType<typeof buildRuntime>,
	body: unknown,
	init?: { token?: string; requireAuth?: boolean; path?: string },
): Promise<{ status: number; json: unknown; text: string }> {
	const headers: Record<string, string> = {
		"Content-Type": "application/json",
	};
	if (init?.token) headers.Authorization = `Bearer ${init.token}`;
	const res = await handleRuntimeRequest(
		new Request(`http://tekmemo.test${init?.path ?? "/"}`, {
			method: "POST",
			headers,
			body: JSON.stringify(body),
		}),
		{
			runtime,
			...(init?.requireAuth === undefined ? {} : { requireAuth: init.requireAuth }),
			...(init?.token === undefined ? {} : { bearerToken: init.token }),
		},
	);
	const text = await res.text();
	let json = text;
	try {
		json = JSON.parse(text);
	} catch {
		/* keep text */
	}
	return { status: res.status, json, text };
}

describe("handleRuntimeRequest — HTTP layer", () => {
	let runtime: ReturnType<typeof buildRuntime>;

	beforeEach(() => {
		runtime = buildRuntime();
	});

	it("GET /health returns liveness JSON", async () => {
		const res = await handleRuntimeRequest(
			new Request("http://tekmemo.test/health"),
			{ runtime },
		);
		expect(res.status).toBe(200);
		const body = (await res.json()) as { ok: boolean; name: string };
		expect(body.ok).toBe(true);
		expect(body.name).toBe("tekmemo-server");
	});

	it("POST / dispatches a read method and returns the success envelope", async () => {
		const { status, json } = await post(runtime, {
			jsonrpc: "2.0",
			id: 1,
			method: RUNTIME_METHOD.health,
			params: {},
		});
		expect(status).toBe(200);
		const body = json as { result: { ok: boolean } };
		expect(body.result.ok).toBe(true);
	});

	it("POST / surfaces a gated write as HTTP 503", async () => {
		// The Hard ordering rule at the HTTP layer: a mutating method returns 503
		// so a client's retry logic engages (not a 200-with-error-body).
		const { status, json } = await post(runtime, {
			jsonrpc: "2.0",
			id: 1,
			method: RUNTIME_METHOD.write,
			params: { content: "x" },
		});
		expect(status).toBe(503);
		const body = json as {
			error: { code: number; data: { httpStatus: number } };
		};
		expect(body.error.data.httpStatus).toBe(503);
	});

	it("a non-gated error stays 200 (JSON-RPC carries it in the body)", async () => {
		const { status } = await post(runtime, {
			jsonrpc: "2.0",
			id: 1,
			method: "unknown.method",
			params: {},
		});
		expect(status).toBe(200);
	});

	it("rejects a non-JSON Content-Type with 415", async () => {
		const res = await handleRuntimeRequest(
			new Request("http://tekmemo.test/", {
				method: "POST",
				headers: { "Content-Type": "text/plain" },
				body: "nope",
			}),
			{ runtime },
		);
		expect(res.status).toBe(415);
	});

	it("returns 405 for unsupported verbs", async () => {
		const res = await handleRuntimeRequest(
			new Request("http://tekmemo.test/health", { method: "DELETE" }),
			{ runtime },
		);
		expect(res.status).toBe(405);
	});

	it("returns 404 for unknown POST paths", async () => {
		const res = await handleRuntimeRequest(
			new Request("http://tekmemo.test/unknown", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: "{}",
			}),
			{ runtime },
		);
		expect(res.status).toBe(404);
	});

	describe("bearer-token auth", () => {
		it("returns 500 when auth is required but no token is configured", async () => {
			// A misconfigured server (requireAuth + no token) is a server fault,
			// not a client 401 — the request can never succeed regardless of the
			// token the client sends.
			const { status } = await post(
				runtime,
				{ jsonrpc: "2.0", id: 1, method: RUNTIME_METHOD.health, params: {} },
				{ requireAuth: true, token: undefined },
			);
			expect(status).toBe(500);
		});

		it("accepts a valid token when auth is required", async () => {
			const { status } = await post(
				runtime,
				{ jsonrpc: "2.0", id: 1, method: RUNTIME_METHOD.health, params: {} },
				{ requireAuth: true, token: "secret" },
			);
			expect(status).toBe(200);
		});

		it("rejects a wrong token with 401 when auth is required", async () => {
			// Server is configured with bearerToken "right"; client sends "wrong".
			const res = await handleRuntimeRequest(
				new Request("http://tekmemo.test/", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Authorization: "Bearer wrong",
					},
					body: JSON.stringify({
						jsonrpc: "2.0",
						id: 1,
						method: RUNTIME_METHOD.health,
						params: {},
					}),
				}),
				{ runtime, requireAuth: true, bearerToken: "right" },
			);
			expect(res.status).toBe(401);
		});

		it("defaults to no auth (Service Binding / private network)", async () => {
			const { status } = await post(runtime, {
				jsonrpc: "2.0",
				id: 1,
				method: RUNTIME_METHOD.health,
				params: {},
			});
			expect(status).toBe(200);
		});
	});
});
