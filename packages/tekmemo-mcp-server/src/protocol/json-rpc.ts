/**
 * JSON-RPC 2.0 protocol structures, validation, and error code mappings.
 *
 * @module json-rpc
 */

import { McpValidationError } from "../errors";
import type { JsonObject, JsonValue } from "../types";
import { isPlainObject } from "../utils/json";

/**
 * Valid JSON-RPC identifier type.
 */
export type JsonRpcId = string | number | null;

/**
 * Interface representing a standard JSON-RPC 2.0 Request or Notification object.
 */
export interface JsonRpcRequest {
	/**
	 * JSON-RPC protocol version. Must be "2.0".
	 */
	jsonrpc: "2.0";
	/**
	 * Optional identifier. If omitted, the request is treated as a Notification.
	 */
	id?: JsonRpcId;
	/**
	 * Name of the method to invoke.
	 */
	method: string;
	/**
	 * Parameter key-value object mappings for the method arguments.
	 */
	params?: JsonObject;
}

/**
 * Interface representing a JSON-RPC 2.0 success response object.
 */
export interface JsonRpcSuccessResponse {
	/**
	 * JSON-RPC protocol version. Must be "2.0".
	 */
	jsonrpc: "2.0";
	/**
	 * Corresponding request identifier.
	 */
	id: JsonRpcId;
	/**
	 * The payload/result returned by the successful execution.
	 */
	result: JsonValue;
}

/**
 * Interface representing a JSON-RPC 2.0 error response object.
 */
export interface JsonRpcErrorResponse {
	/**
	 * JSON-RPC protocol version. Must be "2.0".
	 */
	jsonrpc: "2.0";
	/**
	 * Corresponding request identifier.
	 */
	id: JsonRpcId;
	/**
	 * Nested error details container.
	 */
	error: {
		/**
		 * Numeric error code.
		 */
		code: number;
		/**
		 * Short error message description.
		 */
		message: string;
		/**
		 * Optional extra structured context details.
		 */
		data?: JsonValue;
	};
}

/**
 * Composite JSON-RPC 2.0 Response type.
 */
export type JsonRpcResponse = JsonRpcSuccessResponse | JsonRpcErrorResponse;

/**
 * Standard JSON-RPC 2.0 spec error code mappings.
 */
export const JSON_RPC_ERRORS = {
	/**
	 * Invalid JSON was received by the server. An error occurred on the server while parsing the JSON text.
	 */
	parseError: -32700,
	/**
	 * The JSON sent is not a valid Request object.
	 */
	invalidRequest: -32600,
	/**
	 * The method does not exist / is not available.
	 */
	methodNotFound: -32601,
	/**
	 * Invalid method parameter(s).
	 */
	invalidParams: -32602,
	/**
	 * Internal JSON-RPC error.
	 */
	internalError: -32603,
} as const;

/**
 * Safely parses an input string to JSON.
 *
 * @param input - The raw JSON string payload.
 * @returns The parsed JSON value.
 * @throws {McpValidationError} If parsing fails, indicating a JSON-RPC ParseError.
 */
export function parseJsonRpcPayload(input: string): unknown {
	try {
		return JSON.parse(input) as unknown;
	} catch {
		throw new McpValidationError("Invalid JSON-RPC JSON payload.", {
			jsonRpcCode: JSON_RPC_ERRORS.parseError,
		});
	}
}

/**
 * Validates and casts an unknown object into a valid JsonRpcRequest.
 *
 * @param value - The raw request object to validate.
 * @returns The validated JsonRpcRequest.
 * @throws {McpValidationError} If the request properties fail specification validation.
 */
export function validateJsonRpcRequest(value: unknown): JsonRpcRequest {
	if (!isPlainObject(value))
		throw new McpValidationError("JSON-RPC request must be an object.", {
			jsonRpcCode: JSON_RPC_ERRORS.invalidRequest,
		});
	if (value.jsonrpc !== "2.0")
		throw new McpValidationError("JSON-RPC version must be 2.0.", {
			jsonRpcCode: JSON_RPC_ERRORS.invalidRequest,
		});
	if (typeof value.method !== "string" || value.method.length === 0)
		throw new McpValidationError("JSON-RPC method is required.", {
			jsonRpcCode: JSON_RPC_ERRORS.invalidRequest,
		});
	if (
		value.id !== undefined &&
		typeof value.id !== "string" &&
		typeof value.id !== "number" &&
		value.id !== null
	)
		throw new McpValidationError(
			"JSON-RPC id must be string, number, or null.",
			{ jsonRpcCode: JSON_RPC_ERRORS.invalidRequest },
		);
	if (value.params !== undefined && !isPlainObject(value.params))
		throw new McpValidationError("JSON-RPC params must be an object.", {
			jsonRpcCode: JSON_RPC_ERRORS.invalidParams,
		});
	return value as unknown as JsonRpcRequest;
}

/**
 * Checks if a JSON-RPC request is a notification (i.e., has no `id`).
 *
 * @param request - The JSON-RPC request to check.
 * @returns `true` if notification, `false` otherwise.
 */
export function isNotification(request: JsonRpcRequest): boolean {
	return request.id === undefined;
}

/**
 * Generates a JSON-RPC Success Response helper object.
 *
 * @param id - Corresponding request ID.
 * @param result - Successful result payload.
 * @returns A JSON-RPC Success Response object.
 */
export function success(
	id: JsonRpcId,
	result: JsonValue,
): JsonRpcSuccessResponse {
	return { jsonrpc: "2.0", id, result };
}

/**
 * Generates a JSON-RPC Error Response helper object.
 *
 * @param id - Corresponding request ID.
 * @param code - Error numeric code.
 * @param message - Short error message description.
 * @param data - Optional extra structured details.
 * @returns A JSON-RPC Error Response object.
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
