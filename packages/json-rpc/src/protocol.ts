/**
 * JSON-RPC 2.0 protocol structures, validation, and response helpers.
 *
 * @remarks
 * A dependency-free, product-neutral implementation of the JSON-RPC 2.0 spec
 * ({@link https://www.jsonrpc.org/specification}). Extracted as a shared SSOT
 * so every JSON-RPC-speaking package in the workspace (`memofs-server`'s
 * runtime API, `memofs-mcp-server`'s MCP transport) shares one set of types
 * + helpers instead of each vendoring a copy (AGENTS.md: DRY & SSOT
 * everywhere; `.agents/rules/package-boundaries.md`: no transport in core, no
 * distribution→distribution import).
 *
 * The two throw sites (`parseJsonRpcPayload`, `validateJsonRpcRequest`) throw
 * {@link JsonRpcProtocolError} — the neutral error type. A consumer that owns
 * its own error hierarchy (e.g. an MCP server) catches it and re-throws in its
 * own type; the protocol layer never imports a consumer's classes.
 *
 * @module json-rpc
 */

import { JsonRpcProtocolError } from "./error";
import type { JsonObject, JsonValue } from "./types";

/**
 * Checks if a value is a plain JavaScript object (created with `{}` or
 * `new Object()`), excluding arrays, `Date`, `Map`, class instances, etc.
 *
 * Inline (not imported) to keep this package dependency-free. JSON-RPC
 * `params` and the `error.data` member must be plain objects per spec.
 *
 * @param value - The value to inspect.
 * @returns `true` if the value is a plain object, `false` otherwise.
 */
export function isPlainObject(
	value: unknown,
): value is Record<string, unknown> {
	if (value === null || typeof value !== "object") return false;
	const proto = Object.getPrototypeOf(value);
	return proto === Object.prototype || proto === null;
}

/**
 * Valid JSON-RPC identifier type.
 *
 * Per spec §4 a request `id` is a `String`, `Number`, or `Null`, used to
 * correlate the response. A request with no `id` is a Notification (§4.1).
 */
export type JsonRpcId = string | number | null;

/**
 * A JSON-RPC 2.0 Request or Notification object (spec §4).
 */
export interface JsonRpcRequest {
	/** JSON-RPC protocol version. Must be `"2.0"`. */
	jsonrpc: "2.0";
	/**
	 * Optional identifier. If omitted, the request is a Notification
	 * (spec §4.1) and expects no response.
	 */
	id?: JsonRpcId;
	/** Name of the method to invoke. */
	method: string;
	/** Parameter object for the method arguments (spec §4.2). */
	params?: JsonObject;
}

/**
 * A JSON-RPC 2.0 success response object (spec §4.2).
 */
export interface JsonRpcSuccessResponse {
	/** JSON-RPC protocol version. Must be `"2.0"`. */
	jsonrpc: "2.0";
	/** The request identifier this response correlates to. */
	id: JsonRpcId;
	/** The payload returned by successful execution. */
	result: JsonValue;
}

/**
 * A JSON-RPC 2.0 error response object (spec §4.2).
 */
export interface JsonRpcErrorResponse {
	/** JSON-RPC protocol version. Must be `"2.0"`. */
	jsonrpc: "2.0";
	/** The request identifier this response correlates to. */
	id: JsonRpcId;
	/** The structured error. */
	error: {
		/** Numeric error code (spec §5.1). */
		code: number;
		/** Short error message. */
		message: string;
		/** Optional structured context (spec §5.1). */
		data?: JsonValue;
	};
}

/** A composite JSON-RPC 2.0 response. */
export type JsonRpcResponse = JsonRpcSuccessResponse | JsonRpcErrorResponse;

/**
 * Standard JSON-RPC 2.0 spec error codes (spec §5.1).
 *
 * These are the only codes the protocol layer maps to. A server may add its
 * own application-level codes in the `-32000` to `-32099` "server error"
 * reserved band, but those are the consumer's concern, not this package's.
 */
export const JSON_RPC_ERRORS = {
	/** Invalid JSON was received by the server. */
	parseError: -32700,
	/** The JSON sent is not a valid Request object. */
	invalidRequest: -32600,
	/** The method does not exist or is not available. */
	methodNotFound: -32601,
	/** Invalid method parameter(s). */
	invalidParams: -32602,
	/** Internal JSON-RPC error. */
	internalError: -32603,
} as const;

/**
 * Safely parses a JSON-RPC payload string.
 *
 * @param input - The raw JSON string payload.
 * @returns The parsed JSON value.
 * @throws {JsonRpcProtocolError} mapped to {@link JSON_RPC_ERRORS.parseError}
 * if parsing fails.
 */
export function parseJsonRpcPayload(input: string): unknown {
	try {
		return JSON.parse(input) as unknown;
	} catch {
		throw new JsonRpcProtocolError("Invalid JSON-RPC JSON payload.", {
			jsonRpcCode: JSON_RPC_ERRORS.parseError,
		});
	}
}

/**
 * Validates and narrows an unknown value into a {@link JsonRpcRequest}.
 *
 * Checks `jsonrpc === "2.0"`, a non-empty `method` string, a well-typed `id`,
 * and (when present) a plain-object `params`. Each failure throws
 * {@link JsonRpcProtocolError} with the appropriate spec code
 * (`invalidRequest` for shape violations, `invalidParams` for a bad
 * `params` member).
 *
 * @param value - The raw parsed value to validate.
 * @returns The validated {@link JsonRpcRequest}.
 * @throws {JsonRpcProtocolError} on any spec violation.
 */
export function validateJsonRpcRequest(value: unknown): JsonRpcRequest {
	if (!isPlainObject(value)) {
		throw new JsonRpcProtocolError("JSON-RPC request must be an object.", {
			jsonRpcCode: JSON_RPC_ERRORS.invalidRequest,
		});
	}
	if (value.jsonrpc !== "2.0") {
		throw new JsonRpcProtocolError("JSON-RPC version must be 2.0.", {
			jsonRpcCode: JSON_RPC_ERRORS.invalidRequest,
		});
	}
	if (typeof value.method !== "string" || value.method.length === 0) {
		throw new JsonRpcProtocolError("JSON-RPC method is required.", {
			jsonRpcCode: JSON_RPC_ERRORS.invalidRequest,
		});
	}
	if (
		value.id !== undefined &&
		typeof value.id !== "string" &&
		typeof value.id !== "number" &&
		value.id !== null
	) {
		throw new JsonRpcProtocolError(
			"JSON-RPC id must be string, number, or null.",
			{ jsonRpcCode: JSON_RPC_ERRORS.invalidRequest },
		);
	}
	if (value.params !== undefined && !isPlainObject(value.params)) {
		throw new JsonRpcProtocolError("JSON-RPC params must be an object.", {
			jsonRpcCode: JSON_RPC_ERRORS.invalidParams,
		});
	}
	return value as unknown as JsonRpcRequest;
}

/**
 * Checks whether a JSON-RPC request is a Notification (spec §4.1: no `id`).
 *
 * @param request - The validated JSON-RPC request.
 * @returns `true` when the request is a notification (no response expected).
 */
export function isNotification(request: JsonRpcRequest): boolean {
	return request.id === undefined;
}

/**
 * Builds a JSON-RPC success response (spec §4.2).
 *
 * @param id - The correlated request identifier.
 * @param result - The successful result payload.
 * @returns A {@link JsonRpcSuccessResponse}.
 */
export function success(
	id: JsonRpcId,
	result: JsonValue,
): JsonRpcSuccessResponse {
	return { jsonrpc: "2.0", id, result };
}

/**
 * Builds a JSON-RPC error response (spec §4.2 + §5.1).
 *
 * @param id - The correlated request identifier.
 * @param code - The numeric error code (see {@link JSON_RPC_ERRORS}).
 * @param message - A short error description.
 * @param data - Optional structured context for the error object's `data`.
 * @returns A {@link JsonRpcErrorResponse}.
 */
export function failure(
	id: JsonRpcId,
	code: number,
	message: string,
	data?: JsonValue,
): JsonRpcErrorResponse {
	return {
		jsonrpc: "2.0",
		id,
		error: { code, message, ...(data === undefined ? {} : { data }) },
	};
}
