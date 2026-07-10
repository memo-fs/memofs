/**
 * The neutral error type thrown by the JSON-RPC 2.0 protocol primitives.
 *
 * @remarks
 * This is the **only** error type this package throws, and it carries the
 * JSON-RPC error code it should be mapped to (see {@link JSON_RPC_ERRORS}).
 * Downstream packages that own their *own* error hierarchy (e.g. an MCP
 * server with `McpValidationError`) catch this and re-throw in their own
 * type — the protocol layer stays neutral and never imports a
 * consumer's error classes. This is the decoupling that lets both
 * `@memofs/server` and `@memofs/mcp-server` share one protocol SSOT.
 *
 * @public
 */

import type { JsonValue } from "./types";

/**
 * The JSON-RPC 2.0 error code a {@link JsonRpcProtocolError} maps to.
 *
 * One of the five spec-defined codes in {@link JSON_RPC_ERRORS}
 * (`-32700`, `-32600`, `-32602`, …). Consumers read this to build their own
 * error envelope without re-deriving the mapping.
 */
export type JsonRpcErrorCode = -32700 | -32600 | -32601 | -32602 | -32603;

/**
 * Structured extra context attached to a {@link JsonRpcProtocolError}.
 *
 * `jsonRpcCode` is always present (the spec code the error maps to);
 * `data` is the optional application-level detail the spec allows in an error
 * object's `data` member.
 */
export interface JsonRpcProtocolErrorDetails {
	/** The JSON-RPC 2.0 spec code this error maps to. */
	jsonRpcCode: JsonRpcErrorCode;
	/** Optional structured context surfaced in the error object's `data`. */
	data?: JsonValue;
}

/**
 * The error thrown by `parseJsonRpcPayload` / `validateJsonRpcRequest`.
 *
 * Carries the JSON-RPC spec code so a caller can decide the response shape
 * without inspecting the message text. Product-neutral: no `cause`, no status
 * code, no consumer-specific base class.
 *
 * @public
 */
export class JsonRpcProtocolError extends Error {
	/** The JSON-RPC 2.0 spec code this error maps to. */
	readonly jsonRpcCode: JsonRpcErrorCode;
	/** Optional structured context surfaced in the error object's `data`. */
	readonly data?: JsonValue;

	/**
	 * Creates a {@link JsonRpcProtocolError}.
	 *
	 * @param message - Human-readable description of the protocol failure.
	 * @param details - The spec code + optional `data`.
	 */
	constructor(message: string, details: JsonRpcProtocolErrorDetails) {
		super(message);
		this.name = "JsonRpcProtocolError";
		this.jsonRpcCode = details.jsonRpcCode;
		this.data = details.data;
	}
}
