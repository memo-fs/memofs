/**
 * Framework-free HTTP core for the `tekmemo-server` runtime API.
 *
 * @remarks
 * Takes a Web `Request` + an assembled {@link Tekmemo} runtime + options, and
 * returns a Web `Response`. This is the one place the runtime API touches
 * HTTP; both the Worker entry (`worker.ts`) and the Node bin
 * (`bin/tekmemo-server.ts`) are thin adapters over it's "the cloud
 * and the OSS self-hoster run identical `tekmemo-server` code" made literal.
 *
 * The shape mirrors `tekmemo-mcp-server`'s `handleTekMemoMcpRequest`:
 * `GET /health` → liveness JSON; `POST /` → JSON-RPC dispatch; `OPTIONS` →
 * CORS preflight; everything else → `405`. Bearer-token auth is optional and
 * defaults off (the cloud reaches the runtime Worker over a private Service
 * Binding that needs no shared secret; an OSS self-hoster exposes it publicly
 * and turns auth on).
 *
 * The concurrency gate's `data.httpStatus` is honored: a gated-write
 * `503` is surfaced as an actual `503` so a client's retry logic engages
 * correctly. Every other JSON-RPC response is `200` (JSON-RPC carries errors
 * in the body, not the status — except the gate, which is an HTTP-level
 * "try again later").
 *
 * @module http
 */

import type { Tekmemo } from "@tekmemo/core";
import type { JsonRpcResponse } from "@tekmemo/json-rpc";
import {
	type DispatchOptions,
	dispatchRuntimeText,
} from "../runtime-api/dispatch";

/** Options for {@link handleRuntimeRequest}. */
export interface RuntimeHttpOptions extends DispatchOptions {
	/**
	 * The assembled runtime. Required — the HTTP layer dispatches over it.
	 * The Worker/Node entries build it from `createHostedRuntime` + a provider
	 * bundle before calling here.
	 */
	runtime: Tekmemo;
	/**
	 * Require a bearer token on `POST /`. Defaults to `false`: the cloud's
	 * runtime Worker sits behind a private Service Binding (no shared secret
	 * needed); an OSS self-hoster exposing the port publicly sets this `true`
	 * + `bearerToken`.
	 */
	requireAuth?: boolean;
	/** The expected bearer token when {@link requireAuth} is `true`. */
	bearerToken?: string;
	/**
	 * Allowed browser `Origin` values for CORS. When set, the matching origin
	 * gets `Access-Control-Allow-*` headers. Omit to disable CORS entirely
	 * (the typical Service-Binding / server-to-server case).
	 */
	allowedOrigins?: readonly string[];
}

/** The liveness response body for `GET /health`. */
const HEALTH_BODY = JSON.stringify({
	ok: true,
	name: "tekmemo-server",
	version: "0.1.0",
});

/** The HTTP status carried by a gated-write response (defaults to 200). */
function httpStatusFor(response: JsonRpcResponse): number {
	if (
		"error" in response &&
		response.error.data !== null &&
		typeof response.error.data === "object" &&
		"httpStatus" in response.error.data
	) {
		const status = (response.error.data as { httpStatus?: unknown }).httpStatus;
		if (typeof status === "number") return status;
	}
	return 200;
}

/**
 * Handles a single runtime-API HTTP request.
 *
 * @param request - The incoming Web `Request`.
 * @param options - Runtime + auth + CORS options.
 * @returns The Web `Response`.
 */
export async function handleRuntimeRequest(
	request: Request,
	options: RuntimeHttpOptions,
): Promise<Response> {
	const corsResponse = handleCors(request, options);
	if (corsResponse) return corsResponse;

	const url = new URL(request.url);

	if (
		request.method === "GET" &&
		(url.pathname === "/health" || url.pathname === "/")
	) {
		return json(HEALTH_BODY, 200, options, request);
	}

	if (request.method === "OPTIONS") {
		return new Response(null, {
			status: 204,
			headers: corsHeaders(options, request),
		});
	}

	if (request.method !== "POST") {
		return text("Method not allowed.", 405, { Allow: "GET, POST, OPTIONS" });
	}

	if (url.pathname !== "/" && url.pathname !== "/rpc") {
		return text("Not found.", 404);
	}

	const authResponse = authenticate(request, options);
	if (authResponse) return authResponse;

	const contentType = request.headers.get("Content-Type") ?? "";
	if (
		!contentType.includes("application/json") &&
		!contentType.includes("+json")
	) {
		return text("Content-Type must be application/json.", 415);
	}

	const textBody = await request.text();
	const responseText = await dispatchRuntimeText(
		options.runtime,
		textBody,
		options,
	);

	if (responseText === undefined) {
		// A notification (no `id`) — spec: no response body. `202 Accepted`.
		return new Response(null, { status: 202 });
	}

	const response = JSON.parse(responseText) as JsonRpcResponse;
	return json(responseText, httpStatusFor(response), options, request);
}

/**
 * Short-circuits a CORS preflight if the request is an `OPTIONS` from an
 * allowed origin. Returns `undefined` when the request should proceed to the
 * route handlers.
 */
function handleCors(
	request: Request,
	options: RuntimeHttpOptions,
): Response | undefined {
	if (request.method !== "OPTIONS") return undefined;
	const origin = request.headers.get("Origin");
	if (!origin || !options.allowedOrigins?.includes(origin)) return undefined;
	return new Response(null, {
		status: 204,
		headers: corsHeaders(options, request),
	});
}

/** Builds the CORS response headers for an allowed origin. */
function corsHeaders(
	options: RuntimeHttpOptions,
	request: Request,
): HeadersInit {
	const origin = request.headers.get("Origin");
	const headers: Record<string, string> = {
		"Access-Control-Allow-Methods": "GET, POST, OPTIONS",
		"Access-Control-Allow-Headers": "Accept, Authorization, Content-Type",
		Vary: "Origin",
	};
	if (origin && options.allowedOrigins?.includes(origin)) {
		headers["Access-Control-Allow-Origin"] = origin;
	}
	return headers;
}

/**
 * Validates the bearer token when auth is required. Returns `undefined` when
 * the request is allowed; an error `Response` when not.
 */
function authenticate(
	request: Request,
	options: RuntimeHttpOptions,
): Response | undefined {
	if (!options.requireAuth) return undefined;
	if (!options.bearerToken) {
		return text("Auth is required but no bearer token is configured.", 500);
	}
	const provided = bearerTokenFromRequest(request);
	if (!provided || !timingSafeEqual(provided, options.bearerToken)) {
		return text("Unauthorized.", 401);
	}
	return undefined;
}

/** Extracts a bearer token from the `Authorization` header. */
function bearerTokenFromRequest(request: Request): string | undefined {
	const authorization = request.headers.get("Authorization");
	if (!authorization) return undefined;
	const match = /^Bearer\s+(.+)$/i.exec(authorization);
	return match?.[1];
}

/** Web-Crypto constant-time byte comparison (never early-returns on length). */
function timingSafeEqual(left: string, right: string): boolean {
	const encoder = new TextEncoder();
	const leftBytes = encoder.encode(left);
	const rightBytes = encoder.encode(right);
	const length = Math.max(leftBytes.length, rightBytes.length);
	let difference = leftBytes.length ^ rightBytes.length;
	for (let index = 0; index < length; index += 1) {
		difference |= (leftBytes[index] ?? 0) ^ (rightBytes[index] ?? 0);
	}
	return difference === 0;
}

/** Builds a JSON `Response` with no-store + optional CORS headers. */
function json(
	body: string,
	status: number,
	options: RuntimeHttpOptions,
	request: Request,
): Response {
	return new Response(body, {
		status,
		headers: {
			"Content-Type": "application/json",
			"Cache-Control": "no-store",
			...corsHeaders(options, request),
		},
	});
}

/** Builds a plain-text `Response`. */
function text(
	body: string,
	status: number,
	extraHeaders: Record<string, string> = {},
): Response {
	return new Response(body, {
		status,
		headers: {
			"Content-Type": "text/plain; charset=utf-8",
			"Cache-Control": "no-store",
			...extraHeaders,
		},
	});
}
