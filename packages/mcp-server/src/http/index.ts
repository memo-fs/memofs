/**
 * Stateless Streamable HTTP adapter for TekMemo MCP.
 *
 * This module is safe to import from Web Fetch runtimes such as Cloudflare
 * Workers. It intentionally avoids the stdio and local runtime entrypoints.
 *
 * @module http
 */

import type { JsonRpcResponse } from "../protocol/json-rpc";
import { failure, JSON_RPC_ERRORS } from "../protocol/json-rpc";
import { createTekMemoMcpProtocolServer } from "../protocol/server";
import { SUPPORTED_PROTOCOL_VERSIONS } from "../schema";
import type { TekMemoMcpOptions, TekMemoMcpRuntime } from "../types";
import {
	createTekMemoCloudMcpRuntime,
	type TekMemoCloudMcpRuntimeOptions,
} from "./cloud-runtime";

/**
 * Minimal environment shape used by Worker-style runtimes.
 */
export interface TekMemoMcpHttpEnv {
	[key: string]: string | undefined;
	TEKMEMO_API_KEY?: string;
	TEKMEMO_API_URL?: string;
	TEKMEMO_CLOUD_URL?: string;
	TEKMEMO_CLOUD_TIMEOUT_MS?: string;
	TEKMEMO_MCP_READ_ONLY?: string;
	TEKMEMO_MCP_TOKEN?: string;
	TEKMEMO_MCP_BEARER_TOKEN?: string;
	TEKMEMO_PROJECT_ID?: string;
	TEKMEMO_WORKSPACE_ID?: string;
}

/**
 * Authentication configuration for the HTTP adapter.
 */
export interface TekMemoMcpHttpAuthOptions {
	requireAuth?: boolean;
	bearerToken?: string;
	authenticate?: (request: Request) => boolean | Promise<boolean>;
}

/**
 * Options for handling a single MCP HTTP request.
 */
export interface TekMemoMcpHttpOptions
	extends Omit<TekMemoMcpOptions, "runtime"> {
	runtime?: TekMemoMcpRuntime;
	env?: TekMemoMcpHttpEnv;
	cloud?: Partial<TekMemoCloudMcpRuntimeOptions>;
	auth?: TekMemoMcpHttpAuthOptions;
	allowedOrigins?: readonly string[];
}

/**
 * Cloudflare Worker-compatible fetch handler type.
 */
export type TekMemoMcpFetchHandler<Env = TekMemoMcpHttpEnv> = (
	request: Request,
	env: Env,
	ctx: TekMemoMcpExecutionContext,
) => Response | Promise<Response>;

/**
 * Minimal Worker execution context shape used by the fetch-handler helper.
 */
export interface TekMemoMcpExecutionContext {
	waitUntil?(promise: Promise<unknown>): void;
	passThroughOnException?(): void;
}

/**
 * Minimal Hono context shape accepted by the optional Hono helper.
 */
export interface TekMemoMcpHonoContext {
	req: { raw: Request };
	env?: TekMemoMcpHttpEnv;
}

const JSON_CONTENT_TYPE = "application/json";
const EVENT_STREAM_CONTENT_TYPE = "text/event-stream";
const MCP_PROTOCOL_VERSION_HEADER = "mcp-protocol-version";

/**
 * Handles a stateless MCP Streamable HTTP request.
 *
 * @param request - Incoming Web Fetch request.
 * @param options - MCP runtime, cloud, security, and protocol options.
 * @returns HTTP response for the MCP request.
 */
export async function handleTekMemoMcpRequest(
	request: Request,
	options: TekMemoMcpHttpOptions = {},
): Promise<Response> {
	const originResponse = validateOrigin(request, options.allowedOrigins);
	if (originResponse) return originResponse;

	if (request.method === "OPTIONS") {
		return new Response(null, {
			status: 204,
			headers: responseHeaders(request, options.allowedOrigins),
		});
	}

	if (request.method === "GET" || request.method === "DELETE") {
		return emptyResponse(405, request, options, { Allow: "POST, OPTIONS" });
	}

	if (request.method !== "POST") {
		return emptyResponse(405, request, options, { Allow: "POST, OPTIONS" });
	}

	const authResponse = await authenticateRequest(request, options);
	if (authResponse) return authResponse;

	const acceptResponse = validateAcceptHeader(request);
	if (acceptResponse) return withCors(acceptResponse, request, options);

	const contentTypeResponse = validateContentTypeHeader(request);
	if (contentTypeResponse)
		return withCors(contentTypeResponse, request, options);

	const protocolResponse = validateProtocolVersion(request);
	if (protocolResponse) return withCors(protocolResponse, request, options);

	let payload: unknown;
	try {
		payload = await request.json();
	} catch {
		return jsonResponse(
			failure(
				null,
				JSON_RPC_ERRORS.parseError,
				"Invalid JSON-RPC JSON payload.",
			),
			400,
			request,
			options,
		);
	}

	if (isJsonRpcResponsePayload(payload)) {
		return emptyResponse(202, request, options);
	}

	const server = createTekMemoMcpProtocolServer({
		...options,
		runtime: options.runtime ?? createRuntimeFromHttpOptions(options),
		readOnly:
			options.readOnly ?? options.env?.TEKMEMO_MCP_READ_ONLY !== "false",
	});
	const result = await server.handleJsonRpcMessage(payload);
	if (result === undefined) return emptyResponse(202, request, options);
	return jsonResponse(result, 200, request, options);
}

/**
 * Creates a Cloudflare Worker-compatible fetch handler.
 *
 * @param options - Static MCP HTTP options.
 * @returns Fetch handler that merges runtime environment bindings per request.
 */
export function createTekMemoMcpFetchHandler<Env extends TekMemoMcpHttpEnv>(
	options: TekMemoMcpHttpOptions = {},
): TekMemoMcpFetchHandler<Env> {
	return (request, env) =>
		handleTekMemoMcpRequest(request, {
			...options,
			env: { ...env, ...options.env },
		});
}

/**
 * Creates a small Hono-compatible handler without depending on Hono.
 *
 * @param options - Static MCP HTTP options.
 * @returns Function that accepts a Hono-like context and returns a Response.
 */
export function createHonoTekMemoMcpHandler(
	options: TekMemoMcpHttpOptions = {},
): (context: TekMemoMcpHonoContext) => Promise<Response> {
	return (context) =>
		handleTekMemoMcpRequest(context.req.raw, {
			...options,
			env: { ...context.env, ...options.env },
		});
}

/**
 * Creates a cloud-only runtime from HTTP adapter options.
 *
 * @param options - Adapter options containing env and cloud config.
 * @returns TekMemo MCP runtime.
 */
function createRuntimeFromHttpOptions(
	options: TekMemoMcpHttpOptions,
): TekMemoMcpRuntime {
	const env = options.env ?? {};
	const timeoutMs =
		options.cloud?.timeoutMs ??
		parsePositiveInteger(env.TEKMEMO_CLOUD_TIMEOUT_MS);
	return createTekMemoCloudMcpRuntime({
		baseUrl: requiredString(
			options.cloud?.baseUrl ?? env.TEKMEMO_CLOUD_URL ?? env.TEKMEMO_API_URL,
			"TEKMEMO_CLOUD_URL or TEKMEMO_API_URL is required for cloud MCP.",
		),
		apiKey: options.cloud?.apiKey ?? env.TEKMEMO_API_KEY,
		projectId: options.cloud?.projectId ?? env.TEKMEMO_PROJECT_ID,
		workspaceId: options.cloud?.workspaceId ?? env.TEKMEMO_WORKSPACE_ID,
		...(timeoutMs === undefined ? {} : { timeoutMs }),
		...(options.cloud?.fetch === undefined
			? {}
			: { fetch: options.cloud.fetch }),
		...(options.cloud?.client === undefined
			? {}
			: { client: options.cloud.client }),
		...(options.cloud?.userAgent === undefined
			? {}
			: { userAgent: options.cloud.userAgent }),
		...(options.cloud?.requireApiKey === undefined
			? {}
			: { requireApiKey: options.cloud.requireApiKey }),
		...(options.cloud?.retry === undefined
			? {}
			: { retry: options.cloud.retry }),
	});
}

/**
 * Validates request authentication.
 *
 * @param request - Incoming request.
 * @param options - Adapter options.
 * @returns Error response when authentication fails.
 */
async function authenticateRequest(
	request: Request,
	options: TekMemoMcpHttpOptions,
): Promise<Response | undefined> {
	if (options.auth?.authenticate) {
		const allowed = await options.auth.authenticate(request);
		return allowed ? undefined : textResponse("Unauthorized.", 401);
	}

	const expectedToken =
		options.auth?.bearerToken ??
		options.env?.TEKMEMO_MCP_BEARER_TOKEN ??
		options.env?.TEKMEMO_MCP_TOKEN;
	const requireAuth = options.auth?.requireAuth ?? true;
	if (!requireAuth) return undefined;
	if (!expectedToken) {
		return textResponse(
			"MCP HTTP authentication is required, but no bearer token is configured.",
			500,
		);
	}
	const provided = bearerTokenFromRequest(request);
	if (provided === undefined || !timingSafeEqual(provided, expectedToken)) {
		return textResponse("Unauthorized.", 401);
	}
	return undefined;
}

/**
 * Validates the HTTP Accept header required by Streamable HTTP.
 *
 * @param request - Incoming request.
 * @returns Error response when unacceptable.
 */
function validateAcceptHeader(request: Request): Response | undefined {
	const accept = request.headers.get("Accept");
	if (!accept) return textResponse("Accept header is required.", 406);
	const values = accept.toLowerCase();
	if (
		!values.includes(JSON_CONTENT_TYPE) ||
		!values.includes(EVENT_STREAM_CONTENT_TYPE)
	) {
		return textResponse(
			"Accept must include application/json and text/event-stream.",
			406,
		);
	}
	return undefined;
}

/**
 * Validates request Content-Type.
 *
 * @param request - Incoming request.
 * @returns Error response when unsupported.
 */
function validateContentTypeHeader(request: Request): Response | undefined {
	const contentType = request.headers.get("Content-Type")?.toLowerCase();
	if (
		!contentType?.includes(JSON_CONTENT_TYPE) &&
		!contentType?.includes("+json")
	) {
		return textResponse("Content-Type must be application/json.", 415);
	}
	return undefined;
}

/**
 * Validates the optional MCP-Protocol-Version header.
 *
 * @param request - Incoming request.
 * @returns Error response when unsupported.
 */
function validateProtocolVersion(request: Request): Response | undefined {
	const version = request.headers.get(MCP_PROTOCOL_VERSION_HEADER);
	if (version === null) return undefined;
	if (
		!SUPPORTED_PROTOCOL_VERSIONS.includes(
			version as (typeof SUPPORTED_PROTOCOL_VERSIONS)[number],
		)
	) {
		return textResponse("Unsupported MCP-Protocol-Version.", 400);
	}
	return undefined;
}

/**
 * Validates browser Origin headers against an allowlist.
 *
 * @param request - Incoming request.
 * @param allowedOrigins - Allowed Origin values.
 * @returns Error response when disallowed.
 */
function validateOrigin(
	request: Request,
	allowedOrigins: readonly string[] | undefined,
): Response | undefined {
	const origin = request.headers.get("Origin");
	if (origin === null) return undefined;
	if (!allowedOrigins?.includes(origin)) {
		return textResponse("Origin is not allowed.", 403);
	}
	return undefined;
}

/**
 * Checks whether a JSON-RPC payload is a client response instead of a request.
 *
 * @param payload - Parsed JSON payload.
 * @returns True when all payload entries are JSON-RPC responses.
 */
function isJsonRpcResponsePayload(payload: unknown): boolean {
	if (Array.isArray(payload)) {
		return payload.length > 0 && payload.every(isJsonRpcResponseObject);
	}
	return isJsonRpcResponseObject(payload);
}

/**
 * Checks whether a value is a JSON-RPC response object.
 *
 * @param value - Unknown parsed value.
 * @returns True when it has response shape.
 */
function isJsonRpcResponseObject(value: unknown): boolean {
	return (
		typeof value === "object" &&
		value !== null &&
		(value as { jsonrpc?: unknown }).jsonrpc === "2.0" &&
		("result" in value || "error" in value) &&
		!("method" in value)
	);
}

/**
 * Builds a JSON HTTP response.
 *
 * @param body - Serializable response body.
 * @param status - HTTP status.
 * @param request - Incoming request.
 * @param options - Adapter options.
 * @returns JSON response.
 */
function jsonResponse(
	body: JsonRpcResponse | JsonRpcResponse[],
	status: number,
	request: Request,
	options: TekMemoMcpHttpOptions,
): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: responseHeaders(request, options.allowedOrigins, {
			"Content-Type": JSON_CONTENT_TYPE,
		}),
	});
}

/**
 * Builds an empty HTTP response.
 *
 * @param status - HTTP status.
 * @param request - Incoming request.
 * @param options - Adapter options.
 * @param headers - Extra response headers.
 * @returns Empty response.
 */
function emptyResponse(
	status: number,
	request: Request,
	options: TekMemoMcpHttpOptions,
	headers: HeadersInit = {},
): Response {
	return new Response(null, {
		status,
		headers: responseHeaders(request, options.allowedOrigins, headers),
	});
}

/**
 * Adds CORS headers to an existing response.
 *
 * @param response - Source response.
 * @param request - Incoming request.
 * @param options - Adapter options.
 * @returns Response with CORS headers.
 */
function withCors(
	response: Response,
	request: Request,
	options: TekMemoMcpHttpOptions,
): Response {
	const headers = responseHeaders(
		request,
		options.allowedOrigins,
		response.headers,
	);
	return new Response(response.body, { status: response.status, headers });
}

/**
 * Builds shared response headers.
 *
 * @param request - Incoming request.
 * @param allowedOrigins - Allowed Origin values.
 * @param extra - Extra headers.
 * @returns Headers for an HTTP response.
 */
function responseHeaders(
	request: Request,
	allowedOrigins: readonly string[] | undefined,
	extra: HeadersInit = {},
): Headers {
	const headers = new Headers(extra);
	headers.set("Cache-Control", "no-store");
	headers.set("Vary", "Origin");
	const origin = request.headers.get("Origin");
	if (origin && allowedOrigins?.includes(origin)) {
		headers.set("Access-Control-Allow-Origin", origin);
		headers.set(
			"Access-Control-Allow-Headers",
			["Accept", "Authorization", "Content-Type", "MCP-Protocol-Version"].join(
				", ",
			),
		);
		headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
	}
	return headers;
}

/**
 * Builds a text response used for pre-dispatch HTTP validation failures.
 *
 * @param text - Response text.
 * @param status - HTTP status.
 * @returns Text response.
 */
function textResponse(text: string, status: number): Response {
	return new Response(text, {
		status,
		headers: {
			"Cache-Control": "no-store",
			"Content-Type": "text/plain; charset=utf-8",
		},
	});
}

/**
 * Extracts a Bearer token from the Authorization header.
 *
 * @param request - Incoming request.
 * @returns Token when present.
 */
function bearerTokenFromRequest(request: Request): string | undefined {
	const authorization = request.headers.get("Authorization");
	if (!authorization) return undefined;
	const match = /^Bearer\s+(.+)$/i.exec(authorization);
	return match?.[1];
}

/**
 * Compares secrets using Web Crypto-safe constant-time byte comparison.
 *
 * @param left - First secret.
 * @param right - Second secret.
 * @returns True when equal.
 */
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

/**
 * Parses a positive integer.
 *
 * @param value - Raw string value.
 * @returns Parsed number or undefined.
 */
function parsePositiveInteger(value: string | undefined): number | undefined {
	if (value === undefined) return undefined;
	const number = Number(value);
	return Number.isInteger(number) && number > 0 ? number : undefined;
}

/**
 * Requires a non-empty string configuration value.
 *
 * @param value - Candidate value.
 * @param message - Error message.
 * @returns Non-empty string.
 */
function requiredString(value: string | undefined, message: string): string {
	if (typeof value === "string" && value.trim().length > 0) return value;
	throw new Error(message);
}
