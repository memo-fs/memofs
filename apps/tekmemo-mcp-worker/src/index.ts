/**
 * Cloudflare Worker entrypoint for TekMemo MCP over Streamable HTTP.
 *
 * The canonical MCP endpoint is the worker root:
 *   POST https://mcp.memo.tekbreed.com/
 *
 * MCP Streamable HTTP only POSTs JSON-RPC, so the root is routed by method:
 * `POST /` dispatches to the MCP handler and `GET /` returns a health payload.
 *
 * The reusable protocol and transport behavior lives in
 * `@tekbreed/tekmemo-mcp-server/http`; this app only wires routing and
 * Worker env.
 */

import { handleTekMemoMcpRequest } from "@tekbreed/tekmemo-mcp-server/http";

/**
 * Environment bindings expected by the TekMemo MCP Worker.
 */
export interface Env {
	[key: string]: string | undefined;
	/** TekMemo Cloud API key used by the cloud-only runtime. */
	TEKMEMO_API_KEY?: string;
	/** TekMemo Cloud base URL ending in `/api/v1`. Required. */
	TEKMEMO_API_URL?: string;
	/** Alias for `TEKMEMO_API_URL`. */
	TEKMEMO_CLOUD_URL?: string;
	/** Cloud request timeout in milliseconds. */
	TEKMEMO_CLOUD_TIMEOUT_MS?: string;
	/** Bearer token clients must present to reach the MCP endpoint. Required. */
	TEKMEMO_MCP_BEARER_TOKEN?: string;
	/** Legacy alias for `TEKMEMO_MCP_BEARER_TOKEN`. */
	TEKMEMO_MCP_TOKEN?: string;
	/** Set to `false` to enable write tools. Defaults to read-only. */
	TEKMEMO_MCP_READ_ONLY?: string;
	/** Default Cloud project scope. */
	TEKMEMO_PROJECT_ID?: string;
	/** Optional caller-side workspace scope. */
	TEKMEMO_WORKSPACE_ID?: string;
	/** Comma-separated allowlist of browser Origins for CORS. */
	TEKMEMO_MCP_ALLOWED_ORIGINS?: string;
}

const HEALTH_PAYLOAD = {
	ok: true,
	name: "tekmemo-mcp-worker",
	mcp: "/",
};

/**
 * Worker fetch handler.
 *
 * @param request - Incoming HTTP request.
 * @param env - Worker environment bindings.
 * @returns HTTP response.
 */
async function fetch(request: Request, env: Env): Promise<Response> {
	const url = new URL(request.url);

	// MCP endpoint at the worker root, routed by method.
	if (url.pathname === "/") {
		if (request.method === "POST") {
			return handleTekMemoMcpRequest(request, {
				env,
				allowedOrigins: allowedOrigins(env),
			});
		}
		return Response.json(HEALTH_PAYLOAD);
	}

	if (url.pathname === "/health") {
		return Response.json(HEALTH_PAYLOAD);
	}

	return Response.json({ error: "Not found." }, { status: 404 });
}

/**
 * Reads comma-separated browser origins from the Worker environment.
 *
 * @param env - Worker environment bindings.
 * @returns Allowlist for Origin validation, or undefined for non-browser clients.
 */
function allowedOrigins(env: Env): string[] | undefined {
	const raw = env.TEKMEMO_MCP_ALLOWED_ORIGINS;
	if (!raw) return undefined;
	return raw
		.split(",")
		.map((origin) => origin.trim())
		.filter((origin) => origin.length > 0);
}

export default { fetch };
