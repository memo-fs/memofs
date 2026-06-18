import { describe, expect, it } from "vitest";
import worker, { type Env } from "../src/index";

const BASE = "https://mcp.memo.tekbreed.com";

const env: Env = {
	TEKMEMO_API_KEY: "cloud-key",
	TEKMEMO_CLOUD_URL: "https://api.tekbreed.com/memo/v1",
	TEKMEMO_MCP_BEARER_TOKEN: "mcp-token",
};

/**
 * Builds an MCP Streamable HTTP POST request against the worker root.
 *
 * @param overrides - Optional header overrides.
 * @param body - JSON-RPC payload. Defaults to a notification.
 * @returns Fetch Request object targeting `/`.
 */
function mcpRequest(
	overrides: Record<string, string> = {},
	body: unknown = {
		jsonrpc: "2.0",
		method: "notifications/initialized",
		params: {},
	},
): Request {
	return new Request(`${BASE}/`, {
		method: "POST",
		body: JSON.stringify(body),
		headers: {
			Accept: "application/json, text/event-stream",
			Authorization: "Bearer mcp-token",
			"Content-Type": "application/json",
			...overrides,
		},
	});
}

describe("TekMemo MCP Worker", () => {
	describe("routing", () => {
		it("serves health metadata at the root via GET", async () => {
			const response = await worker.fetch(
				new Request(`${BASE}/`),
				env,
			);

			expect(response.status).toBe(200);
			await expect(response.json()).resolves.toMatchObject({
				ok: true,
				name: "tekmemo-mcp-worker",
				mcp: "/",
			});
		});

		it("serves health metadata at /health", async () => {
			const response = await worker.fetch(
				new Request(`${BASE}/health`),
				env,
			);

			expect(response.status).toBe(200);
			await expect(response.json()).resolves.toMatchObject({
				ok: true,
				mcp: "/",
			});
		});

		it("routes MCP notifications at the root to the HTTP adapter", async () => {
			const response = await worker.fetch(mcpRequest(), env);

			expect(response.status).toBe(202);
		});

		it("returns 404 outside supported routes", async () => {
			const response = await worker.fetch(
				new Request(`${BASE}/nope`),
				env,
			);

			expect(response.status).toBe(404);
		});
	});

	describe("authentication (fail-closed)", () => {
		it("rejects requests with no Authorization header", async () => {
			const response = await worker.fetch(
				mcpRequest({ Authorization: "" }),
				env,
			);

			expect(response.status).toBe(401);
		});

		it("rejects requests with the wrong bearer token", async () => {
			const response = await worker.fetch(
				mcpRequest({ Authorization: "Bearer wrong-token" }),
				env,
			);

			expect(response.status).toBe(401);
		});

		it("returns 500 when no bearer token is configured", async () => {
			// Fail-closed: a misconfigured worker must never serve MCP traffic.
			const insecureEnv: Env = {
				TEKMEMO_API_KEY: "cloud-key",
				TEKMEMO_CLOUD_URL: "https://api.tekbreed.com/memo/v1",
			};

			const response = await worker.fetch(mcpRequest(), insecureEnv);

			expect(response.status).toBe(500);
		});

		it("accepts the legacy TEKMEMO_MCP_TOKEN alias", async () => {
			const aliasedEnv: Env = {
				TEKMEMO_API_KEY: "cloud-key",
				TEKMEMO_CLOUD_URL: "https://api.tekbreed.com/memo/v1",
				TEKMEMO_MCP_TOKEN: "legacy-token",
			};

			const response = await worker.fetch(
				mcpRequest({ Authorization: "Bearer legacy-token" }),
				aliasedEnv,
			);

			expect(response.status).toBe(202);
		});
	});
});
