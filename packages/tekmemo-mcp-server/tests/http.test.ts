import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
	createHonoTekMemoMcpHandler,
	createTekMemoMcpFetchHandler,
	handleTekMemoMcpRequest,
} from "../src/http/index";
import {
	createTekMemoMcpRuntimeFromConfig,
	type JsonRpcResponse,
} from "../src/index";

const runtime = createTekMemoMcpRuntimeFromConfig({ mode: "memory" });
const auth = { requireAuth: true, bearerToken: "test-token" };

/**
 * Creates a valid MCP HTTP POST request for adapter tests.
 *
 * @param body - JSON-RPC payload or raw text body.
 * @param init - Additional request init options.
 * @returns Fetch Request object.
 */
function mcpRequest(body: unknown, init: RequestInit = {}): Request {
	const headers = new Headers({
		Accept: "application/json, text/event-stream",
		Authorization: "Bearer test-token",
		"Content-Type": "application/json",
	});
	if (init.headers) {
		for (const [key, value] of new Headers(init.headers).entries()) {
			headers.set(key, value);
		}
	}
	const { headers: _omit, ...rest } = init;
	return new Request("https://mcp.example.com/mcp", {
		method: "POST",
		body: typeof body === "string" ? body : JSON.stringify(body),
		headers,
		...rest,
	});
}

/**
 * Parses an adapter JSON-RPC response.
 *
 * @param response - HTTP response.
 * @returns Parsed JSON-RPC response.
 */
async function jsonRpc(response: Response): Promise<JsonRpcResponse> {
	return (await response.json()) as JsonRpcResponse;
}

describe("MCP HTTP adapter", () => {
	it("handles initialize over stateless Streamable HTTP", async () => {
		const response = await handleTekMemoMcpRequest(
			mcpRequest({
				jsonrpc: "2.0",
				id: 1,
				method: "initialize",
				params: {
					protocolVersion: "2025-11-25",
					clientInfo: { name: "test", version: "0" },
					capabilities: {},
				},
			}),
			{ runtime, auth },
		);

		expect(response.status).toBe(200);
		expect(response.headers.get("Content-Type")).toContain("application/json");
		const body = await jsonRpc(response);
		expect(body.id).toBe(1);
		expect("result" in body).toBe(true);
	});

	it("lists tools through the HTTP adapter", async () => {
		const response = await handleTekMemoMcpRequest(
			mcpRequest({
				jsonrpc: "2.0",
				id: "tools",
				method: "tools/list",
				params: {},
			}),
			{ runtime, auth, defaultPageSize: 3, maxPageSize: 5 },
		);

		expect(response.status).toBe(200);
		const body = await jsonRpc(response);
		const result = "result" in body ? body.result : undefined;
		expect((result as { tools: unknown[] }).tools.length).toBe(3);
	});

	it("calls read tools through the HTTP adapter", async () => {
		// tekmemo.health was demoted to a runtime method (ADR 0009 Component 1);
		// exercise the HTTP read dispatch through tekmemo.context, a surviving
		// read verb.
		const response = await handleTekMemoMcpRequest(
			mcpRequest({
				jsonrpc: "2.0",
				id: "context",
				method: "tools/call",
				params: { name: "tekmemo.context", arguments: { query: "auth" } },
			}),
			{ runtime, auth },
		);

		expect(response.status).toBe(200);
		const body = await jsonRpc(response);
		const result = "result" in body ? body.result : undefined;
		expect(
			typeof (result as { structuredContent: { text: string } })
				.structuredContent.text,
		).toBe("string");
	});

	it("returns 202 for notifications", async () => {
		const response = await handleTekMemoMcpRequest(
			mcpRequest({
				jsonrpc: "2.0",
				method: "notifications/initialized",
				params: {},
			}),
			{ runtime, auth },
		);

		expect(response.status).toBe(202);
		expect(await response.text()).toBe("");
	});

	it("returns a parse error for invalid JSON", async () => {
		const response = await handleTekMemoMcpRequest(mcpRequest("{bad"), {
			runtime,
			auth,
		});

		expect(response.status).toBe(400);
		const body = await jsonRpc(response);
		expect("error" in body ? body.error.code : undefined).toBe(-32700);
	});

	it("returns a JSON-RPC error for unsupported methods", async () => {
		const response = await handleTekMemoMcpRequest(
			mcpRequest({
				jsonrpc: "2.0",
				id: "bad",
				method: "not/supported",
				params: {},
			}),
			{ runtime, auth },
		);

		expect(response.status).toBe(200);
		const body = await jsonRpc(response);
		expect("error" in body ? body.error.code : undefined).toBe(-32601);
	});

	it("rejects disallowed browser origins", async () => {
		const response = await handleTekMemoMcpRequest(
			mcpRequest(
				{ jsonrpc: "2.0", id: 1, method: "ping", params: {} },
				{ headers: { Origin: "https://evil.example.com" } },
			),
			{ runtime, auth, allowedOrigins: ["https://app.example.com"] },
		);

		expect(response.status).toBe(403);
	});

	it("rejects unsupported MCP protocol versions", async () => {
		const response = await handleTekMemoMcpRequest(
			mcpRequest(
				{ jsonrpc: "2.0", id: 1, method: "ping", params: {} },
				{ headers: { "MCP-Protocol-Version": "1999-01-01" } },
			),
			{ runtime, auth },
		);

		expect(response.status).toBe(400);
	});

	it("blocks write tools by default", async () => {
		const response = await handleTekMemoMcpRequest(
			mcpRequest({
				jsonrpc: "2.0",
				id: "write",
				method: "tools/call",
				params: {
					name: "tekmemo.remember",
					arguments: { content: "remember this" },
				},
			}),
			{ runtime, auth },
		);

		expect(response.status).toBe(200);
		const body = await jsonRpc(response);
		const result = "result" in body ? body.result : undefined;
		expect((result as { isError?: boolean }).isError).toBe(true);
		const content = (result as { content: Array<{ text: string }> }).content;
		expect(content[0]?.text).toMatch(/read-only/);
	});

	it("creates fetch and Hono-style handlers without requiring framework deps", async () => {
		const fetchHandler = createTekMemoMcpFetchHandler({ runtime, auth });
		const fetchResponse = await fetchHandler(
			mcpRequest({ jsonrpc: "2.0", id: "fetch", method: "ping", params: {} }),
			{},
			{},
		);
		expect(fetchResponse.status).toBe(200);

		const honoHandler = createHonoTekMemoMcpHandler({ runtime, auth });
		const honoResponse = await honoHandler({
			req: {
				raw: mcpRequest({
					jsonrpc: "2.0",
					id: "hono",
					method: "ping",
					params: {},
				}),
			},
			env: {},
		});
		expect(honoResponse.status).toBe(200);
	});

	it("keeps the HTTP subpath source free of Node runtime imports", () => {
		const files = [
			"../src/http/index.ts",
			"../src/http/cloud-runtime.ts",
			"../src/utils/pagination.ts",
		];
		for (const file of files) {
			const source = readFileSync(new URL(file, import.meta.url), "utf8");
			expect(source).not.toMatch(/node:(process|readline|fs|path)/);
			expect(source).not.toMatch(/from "node:/);
		}
	});
});
