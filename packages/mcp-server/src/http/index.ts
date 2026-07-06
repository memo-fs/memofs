/**
 * Stateless Streamable HTTP adapter for MemoFS MCP.
 *
 * This module is safe to import from Web Fetch runtimes such as Cloudflare
 * Workers. It intentionally avoids the stdio and local runtime entrypoints.
 *
 * @module http
 */

import { failure, JSON_RPC_ERRORS } from "../protocol/json-rpc";
import { createMemoFSMcpProtocolServer } from "../protocol/server";
import type { MemoFSMcpOptions, MemoFSMcpRuntime } from "../types";
import {
	createMemoFSCloudMcpRuntime,
	type MemoFSCloudMcpRuntimeOptions,
} from "./cloud-runtime";
import {
	bearerTokenFromRequest,
	emptyResponse,
	isJsonRpcResponsePayload,
	jsonResponse,
	parsePositiveInteger,
	requiredString,
	responseHeaders,
	textResponse,
	timingSafeEqual,
	validateAcceptHeader,
	validateContentTypeHeader,
	validateOrigin,
	validateProtocolVersion,
	withCors,
} from "./helpers";

/**
 * Minimal environment shape used by Worker-style runtimes.
 */
export interface MemoFSMcpHttpEnv {
	[key: string]: string | undefined;
	MEMOFS_API_KEY?: string;
	MEMOFS_API_URL?: string;
	MEMOFS_CLOUD_URL?: string;
	MEMOFS_CLOUD_TIMEOUT_MS?: string;
	MEMOFS_MCP_READ_ONLY?: string;
	MEMOFS_MCP_TOKEN?: string;
	MEMOFS_MCP_BEARER_TOKEN?: string;
	MEMOFS_PROJECT_ID?: string;
	MEMOFS_WORKSPACE_ID?: string;
}

/**
 * Authentication configuration for the HTTP adapter.
 */
export interface MemoFSMcpHttpAuthOptions {
	requireAuth?: boolean;
	bearerToken?: string;
	authenticate?: (request: Request) => boolean | Promise<boolean>;
}

/**
 * Options for handling a single MCP HTTP request.
 */
export interface MemoFSMcpHttpOptions
	extends Omit<MemoFSMcpOptions, "runtime"> {
	runtime?: MemoFSMcpRuntime;
	env?: MemoFSMcpHttpEnv;
	cloud?: Partial<MemoFSCloudMcpRuntimeOptions>;
	auth?: MemoFSMcpHttpAuthOptions;
	allowedOrigins?: readonly string[];
}

/**
 * Cloudflare Worker-compatible fetch handler type.
 */
export type MemoFSMcpFetchHandler<Env = MemoFSMcpHttpEnv> = (
	request: Request,
	env: Env,
	ctx: MemoFSMcpExecutionContext,
) => Response | Promise<Response>;

/**
 * Minimal Worker execution context shape used by the fetch-handler helper.
 */
export interface MemoFSMcpExecutionContext {
	waitUntil?(promise: Promise<unknown>): void;
	passThroughOnException?(): void;
}

/**
 * Minimal Hono context shape accepted by the optional Hono helper.
 */
export interface MemoFSMcpHonoContext {
	req: { raw: Request };
	env?: MemoFSMcpHttpEnv;
}

/**
 * Handles a stateless MCP Streamable HTTP request.
 *
 * @param request - Incoming Web Fetch request.
 * @param options - MCP runtime, cloud, security, and protocol options.
 * @returns HTTP response for the MCP request.
 */
export async function handleMemoFSMcpRequest(
	request: Request,
	options: MemoFSMcpHttpOptions = {},
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

	const server = createMemoFSMcpProtocolServer({
		...options,
		runtime: options.runtime ?? createRuntimeFromHttpOptions(options),
		readOnly:
			options.readOnly ?? options.env?.MEMOFS_MCP_READ_ONLY !== "false",
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
export function createMemoFSMcpFetchHandler<Env extends MemoFSMcpHttpEnv>(
	options: MemoFSMcpHttpOptions = {},
): MemoFSMcpFetchHandler<Env> {
	return (request, env) =>
		handleMemoFSMcpRequest(request, {
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
export function createHonoMemoFSMcpHandler(
	options: MemoFSMcpHttpOptions = {},
): (context: MemoFSMcpHonoContext) => Promise<Response> {
	return (context) =>
		handleMemoFSMcpRequest(context.req.raw, {
			...options,
			env: { ...context.env, ...options.env },
		});
}

/**
 * Creates a cloud-only runtime from HTTP adapter options.
 *
 * @param options - Adapter options containing env and cloud config.
 * @returns MemoFS MCP runtime.
 */
function createRuntimeFromHttpOptions(
	options: MemoFSMcpHttpOptions,
): MemoFSMcpRuntime {
	const env = options.env ?? {};
	const timeoutMs =
		options.cloud?.timeoutMs ??
		parsePositiveInteger(env.MEMOFS_CLOUD_TIMEOUT_MS);
	return createMemoFSCloudMcpRuntime({
		baseUrl: requiredString(
			options.cloud?.baseUrl ?? env.MEMOFS_CLOUD_URL ?? env.MEMOFS_API_URL,
			"MEMOFS_CLOUD_URL or MEMOFS_API_URL is required for cloud MCP.",
		),
		apiKey: options.cloud?.apiKey ?? env.MEMOFS_API_KEY,
		projectId: options.cloud?.projectId ?? env.MEMOFS_PROJECT_ID,
		workspaceId: options.cloud?.workspaceId ?? env.MEMOFS_WORKSPACE_ID,
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
	options: MemoFSMcpHttpOptions,
): Promise<Response | undefined> {
	if (options.auth?.authenticate) {
		const allowed = await options.auth.authenticate(request);
		return allowed ? undefined : textResponse("Unauthorized.", 401);
	}

	const expectedToken =
		options.auth?.bearerToken ??
		options.env?.MEMOFS_MCP_BEARER_TOKEN ??
		options.env?.MEMOFS_MCP_TOKEN;
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
