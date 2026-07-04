import type { JsonRpcResponse } from "../protocol/json-rpc";
import { SUPPORTED_PROTOCOL_VERSIONS } from "../schema";
import type { TekMemoMcpHttpOptions } from "./index";

export const JSON_CONTENT_TYPE = "application/json";
export const EVENT_STREAM_CONTENT_TYPE = "text/event-stream";
export const MCP_PROTOCOL_VERSION_HEADER = "mcp-protocol-version";

export function validateAcceptHeader(request: Request): Response | undefined {
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

export function validateContentTypeHeader(
	request: Request,
): Response | undefined {
	const contentType = request.headers.get("Content-Type")?.toLowerCase();
	if (
		!contentType?.includes(JSON_CONTENT_TYPE) &&
		!contentType?.includes("+json")
	) {
		return textResponse("Content-Type must be application/json.", 415);
	}
	return undefined;
}

export function validateProtocolVersion(
	request: Request,
): Response | undefined {
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

export function validateOrigin(
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

export function isJsonRpcResponsePayload(payload: unknown): boolean {
	if (Array.isArray(payload)) {
		return payload.length > 0 && payload.every(isJsonRpcResponseObject);
	}
	return isJsonRpcResponseObject(payload);
}

export function isJsonRpcResponseObject(value: unknown): boolean {
	return (
		typeof value === "object" &&
		value !== null &&
		(value as { jsonrpc?: unknown }).jsonrpc === "2.0" &&
		("result" in value || "error" in value) &&
		!("method" in value)
	);
}

export function jsonResponse(
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

export function emptyResponse(
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

export function withCors(
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

export function responseHeaders(
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

export function textResponse(text: string, status: number): Response {
	return new Response(text, {
		status,
		headers: {
			"Cache-Control": "no-store",
			"Content-Type": "text/plain; charset=utf-8",
		},
	});
}

export function bearerTokenFromRequest(request: Request): string | undefined {
	const authorization = request.headers.get("Authorization");
	if (!authorization) return undefined;
	const match = /^Bearer\s+(.+)$/i.exec(authorization);
	return match?.[1];
}

export function timingSafeEqual(left: string, right: string): boolean {
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

export function parsePositiveInteger(
	value: string | undefined,
): number | undefined {
	if (value === undefined) return undefined;
	const number = Number(value);
	return Number.isInteger(number) && number > 0 ? number : undefined;
}

export function requiredString(
	value: string | undefined,
	message: string,
): string {
	if (typeof value === "string" && value.trim().length > 0) return value;
	throw new Error(message);
}
