import { McpValidationError } from "../errors";
import type { JsonObject, JsonValue } from "../types";
import { isPlainObject } from "../utils/json";

export type JsonRpcId = string | number | null;

export interface JsonRpcRequest {
	jsonrpc: "2.0";
	id?: JsonRpcId;
	method: string;
	params?: JsonObject;
}

export interface JsonRpcSuccessResponse {
	jsonrpc: "2.0";
	id: JsonRpcId;
	result: JsonValue;
}

export interface JsonRpcErrorResponse {
	jsonrpc: "2.0";
	id: JsonRpcId;
	error: {
		code: number;
		message: string;
		data?: JsonValue;
	};
}

export type JsonRpcResponse = JsonRpcSuccessResponse | JsonRpcErrorResponse;

export const JSON_RPC_ERRORS = {
	parseError: -32700,
	invalidRequest: -32600,
	methodNotFound: -32601,
	invalidParams: -32602,
	internalError: -32603,
} as const;

export function parseJsonRpcPayload(input: string): unknown {
	try {
		return JSON.parse(input) as unknown;
	} catch {
		throw new McpValidationError("Invalid JSON-RPC JSON payload.", {
			jsonRpcCode: JSON_RPC_ERRORS.parseError,
		});
	}
}

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

export function isNotification(request: JsonRpcRequest): boolean {
	return request.id === undefined;
}

export function success(
	id: JsonRpcId,
	result: JsonValue,
): JsonRpcSuccessResponse {
	return { jsonrpc: "2.0", id, result };
}

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
