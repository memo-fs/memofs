/**
 * MCP Protocol Server implementation for handling JSON-RPC requests/notifications.
 *
 * @module server
 */

import {
	McpNotFoundError,
	McpValidationError,
	MemoFSMcpError,
	toSafeError,
} from "../errors";
import { createPromptDefinitions, getMemoFSPrompt } from "../prompts/handlers";
import {
	createResourceDefinitions,
	readMemoFSResource,
} from "../resources/handlers";
import { LATEST_PROTOCOL_VERSION, negotiateProtocolVersion } from "../schema";
import { createToolDefinitions } from "../tools/definitions";
import { callMemoFSTool } from "../tools/handlers";
import type { JsonValue, MemoFSMcpOptions } from "../types";
import { asObject } from "../utils/json";
import { paginateArray } from "../utils/pagination";
import {
	failure,
	isNotification,
	JSON_RPC_ERRORS,
	JsonRpcProtocolError,
	type JsonRpcRequest,
	type JsonRpcResponse,
	parseJsonRpcPayload,
	success,
	validateJsonRpcRequest,
} from "./json-rpc";

/**
 * Interface defining the API of the MemoFS MCP Protocol Server.
 */
export interface MemoFSMcpProtocolServer {
	/**
	 * Configured options resolved and typed.
	 */
	readonly options: Required<
		Pick<
			MemoFSMcpOptions,
			"name" | "version" | "instructions" | "defaultPageSize" | "maxPageSize"
		>
	> &
		MemoFSMcpOptions;

	/**
	 * Processes a structured message object (which could be single or a batch array of JSON-RPC requests).
	 *
	 * @param message - The raw parsed request message payload.
	 * @returns The JSON-RPC response, response batch array, or `undefined` for notifications.
	 */
	handleJsonRpcMessage(
		message: unknown,
	): Promise<JsonRpcResponse | JsonRpcResponse[] | undefined>;

	/**
	 * Processes a raw string text payload, parsing and dispatching it.
	 *
	 * @param text - The raw string input from stdio or other transport.
	 * @returns The stringified JSON response, or `undefined` for notifications.
	 */
	handleJsonRpcText(text: string): Promise<string | undefined>;
}

const DEFAULT_INSTRUCTIONS =
	"MemoFS exposes four memory verbs: memofs.context (task briefing), memofs.recall (semantic search), memofs.remember (write a durable fact), and memofs.consolidate (merge/retire graph memory). Call memofs.context first, then write tools (remember/consolidate) only after host approval. AgentFS session tools (memofs_agent_session_*) drive a coding-agent scratch filesystem.";

/**
 * Factory function to create a new MemoFSMcpProtocolServer instance.
 *
 * @param options - Configuration options for the MCP server.
 * @returns An implementation of `MemoFSMcpProtocolServer`.
 */
export function createMemoFSMcpProtocolServer(
	options: MemoFSMcpOptions,
): MemoFSMcpProtocolServer {
	const normalized = {
		...options,
		name: options.name ?? "memofs-mcp",
		version: options.version ?? "0.1.0",
		instructions: options.instructions ?? DEFAULT_INSTRUCTIONS,
		defaultPageSize: options.defaultPageSize ?? 25,
		maxPageSize: options.maxPageSize ?? 100,
	};
	return new DefaultMemoFSMcpProtocolServer(normalized);
}

/**
 * Default implementation of the MemoFSMcpProtocolServer.
 * Handles protocol lifecycle, ping, listing tools, invoking tools, listing resources, etc.
 *
 * @private
 */
class DefaultMemoFSMcpProtocolServer implements MemoFSMcpProtocolServer {
	readonly options: Required<
		Pick<
			MemoFSMcpOptions,
			"name" | "version" | "instructions" | "defaultPageSize" | "maxPageSize"
		>
	> &
		MemoFSMcpOptions;

	/**
	 * Creates a DefaultMemoFSMcpProtocolServer instance.
	 *
	 * @param options - Normalized options configuration.
	 */
	constructor(
		options: Required<
			Pick<
				MemoFSMcpOptions,
				"name" | "version" | "instructions" | "defaultPageSize" | "maxPageSize"
			>
		> &
			MemoFSMcpOptions,
	) {
		this.options = options;
	}

	/**
	 * Processes raw string JSON-RPC text.
	 *
	 * @param text - JSON-RPC input text.
	 * @returns Stringified response or undefined.
	 */
	async handleJsonRpcText(text: string): Promise<string | undefined> {
		let payload: unknown;
		try {
			payload = parseJsonRpcPayload(text);
		} catch (error) {
			// Translate the neutral protocol error to the MCP error type via the
			// shared helper so `data.code` stays `"MCP_VALIDATION_ERROR"` (not the
			// generic `"UNEXPECTED_ERROR"` a raw `toSafeError` would yield).
			const safe = toSafeError(toMcpError(error));
			return JSON.stringify(
				failure(null, JSON_RPC_ERRORS.parseError, safe.message, {
					code: safe.code,
				} as never),
			);
		}
		const response = await this.handleJsonRpcMessage(payload);
		if (response === undefined) return undefined;
		return JSON.stringify(response);
	}

	/**
	 * Handles a parsed JSON-RPC message payload.
	 * Supports single requests, notifications, and batch arrays.
	 *
	 * @param message - The parsed message.
	 * @returns The JSON-RPC response, array of responses, or undefined.
	 */
	async handleJsonRpcMessage(
		message: unknown,
	): Promise<JsonRpcResponse | JsonRpcResponse[] | undefined> {
		if (Array.isArray(message)) {
			if (message.length === 0)
				return failure(
					null,
					JSON_RPC_ERRORS.invalidRequest,
					"JSON-RPC batch must not be empty.",
				);
			const responses: JsonRpcResponse[] = [];
			for (const item of message) {
				const response = await this.handleSingle(item);
				if (response !== undefined) responses.push(response);
			}
			return responses.length > 0 ? responses : undefined;
		}
		return this.handleSingle(message);
	}

	/**
	 * Inner helper to process a single JSON-RPC request message.
	 */
	private async handleSingle(
		message: unknown,
	): Promise<JsonRpcResponse | undefined> {
		let request: JsonRpcRequest;
		try {
			request = validateJsonRpcRequest(message);
		} catch (error) {
			// The protocol layer throws a neutral `JsonRpcProtocolError` (from
			// `@memofs/json-rpc`). Translate it into this package's own
			// `McpValidationError` via the shared `toMcpError` helper, preserving
			// the spec `jsonRpcCode` in `details` so `errorCodeFrom` maps it to the
			// right JSON-RPC code. Unknown throws pass straight through.
			const mcpError = toMcpError(error);
			const safe = toSafeError(mcpError);
			return failure(
				null,
				errorCodeFrom(mcpError),
				safe.message,
				cleanErrorData(safe) as never,
			);
		}

		if (isNotification(request)) {
			await this.handleNotification(request);
			return undefined;
		}

		try {
			const result = await this.dispatch(request);
			return success(request.id ?? null, result);
		} catch (error) {
			const safe = toSafeError(error);
			return failure(
				request.id ?? null,
				errorCodeFrom(error),
				safe.message,
				cleanErrorData(safe) as never,
			);
		}
	}

	/**
	 * Processes standard JSON-RPC Notifications.
	 */
	private async handleNotification(request: JsonRpcRequest): Promise<void> {
		switch (request.method) {
			case "notifications/initialized":
			case "notifications/cancelled":
			case "notifications/progress":
				return;
			default:
				return;
		}
	}

	/**
	 * Dispatches a standard JSON-RPC method request to the appropriate tool, resource, or server capability.
	 */
	private async dispatch(request: JsonRpcRequest): Promise<JsonValue> {
		const params = request.params ?? {};
		switch (request.method) {
			case "initialize":
				return {
					protocolVersion: negotiateProtocolVersion(params.protocolVersion),
					capabilities: {
						tools: { listChanged: false },
						resources: { subscribe: false, listChanged: false },
						prompts: { listChanged: false },
						logging: {},
					},
					serverInfo: {
						name: this.options.name,
						version: this.options.version,
					},
					instructions: this.options.instructions,
				};
			case "ping":
				return {};
			case "tools/list": {
				const page = paginateArray(
					createToolDefinitions(this.options.maxPageSize),
					{
						cursor: optionalCursor(params.cursor),
						defaultLimit: this.options.defaultPageSize,
						maxLimit: this.options.maxPageSize,
					},
					"tools",
				);
				return {
					tools: page.items.map(({ safety: _safety, ...tool }) => tool),
					...(page.nextCursor ? { nextCursor: page.nextCursor } : {}),
				} as unknown as JsonValue;
			}
			case "tools/call": {
				const object = asObject(params, "params");
				if (typeof object.name !== "string")
					throw new McpValidationError("tools/call params.name is required.");
				const args = object.arguments === undefined ? {} : object.arguments;
				return (await callMemoFSTool(
					this.options,
					object.name,
					args,
				)) as unknown as JsonValue;
			}
			case "resources/list": {
				const page = paginateArray(
					createResourceDefinitions(),
					{
						cursor: optionalCursor(params.cursor),
						defaultLimit: this.options.defaultPageSize,
						maxLimit: this.options.maxPageSize,
					},
					"resources",
				);
				return {
					resources: page.items,
					...(page.nextCursor ? { nextCursor: page.nextCursor } : {}),
				} as unknown as JsonValue;
			}
			case "resources/read": {
				const object = asObject(params, "params");
				if (typeof object.uri !== "string")
					throw new McpValidationError(
						"resources/read params.uri is required.",
					);
				return (await readMemoFSResource(
					this.options,
					object.uri,
				)) as unknown as JsonValue;
			}
			case "prompts/list": {
				const page = paginateArray(
					createPromptDefinitions(),
					{
						cursor: optionalCursor(params.cursor),
						defaultLimit: this.options.defaultPageSize,
						maxLimit: this.options.maxPageSize,
					},
					"prompts",
				);
				return {
					prompts: page.items,
					...(page.nextCursor ? { nextCursor: page.nextCursor } : {}),
				} as unknown as JsonValue;
			}
			case "prompts/get": {
				const object = asObject(params, "params");
				if (typeof object.name !== "string")
					throw new McpValidationError("prompts/get params.name is required.");
				return getMemoFSPrompt(
					object.name,
					object.arguments,
				) as unknown as JsonValue;
			}
			case "logging/setLevel":
				return {};
			default:
				throw new McpNotFoundError(
					`Unsupported MCP method: ${request.method}.`,
				);
		}
	}
}

/**
 * Validates and normalizes the cursor parameter.
 *
 * @param value - The raw input cursor.
 * @returns The validated string cursor, or undefined.
 * @throws {McpValidationError} If cursor is not a string.
 */
function optionalCursor(value: unknown): string | undefined {
	if (value === undefined) return undefined;
	if (typeof value !== "string")
		throw new McpValidationError("cursor must be a string.");
	return value;
}

/**
 * Translates a neutral {@link JsonRpcProtocolError} (thrown by the shared
 * `@memofs/json-rpc` protocol layer) into this package's own
 * {@link McpValidationError}, preserving the spec `jsonRpcCode` in `details`.
 *
 * Used at both protocol-error catch sites (`handleJsonRpcText` parse failures +
 * `handleSingle` validation failures) so `toSafeError` always sees an MCP error
 * type and `data.code` stays `"MCP_VALIDATION_ERROR"` (not the generic
 * `"UNEXPECTED_ERROR"`). Anything that is not a `JsonRpcProtocolError` is
 * returned unchanged — the protocol layer is the only thing that throws the
 * neutral type, and a handler's own MCP errors must pass through untouched.
 *
 * @param error - The caught error.
 * @returns The MCP-flavored error to feed `toSafeError` / `errorCodeFrom`.
 */
function toMcpError(error: unknown): unknown {
	if (error instanceof JsonRpcProtocolError) {
		return new McpValidationError(error.message, {
			jsonRpcCode: error.jsonRpcCode,
		});
	}
	return error;
}

/**
 * Maps standard MemoFS MCP exceptions to standard JSON-RPC 2.0 error codes.
 *
 * @param error - The thrown exception.
 * @returns A JSON-RPC 2.0 compliant error code.
 */
function errorCodeFrom(error: unknown): number {
	if (error instanceof McpValidationError) {
		const maybe = error.details as { jsonRpcCode?: unknown } | undefined;
		return typeof maybe?.jsonRpcCode === "number"
			? maybe.jsonRpcCode
			: JSON_RPC_ERRORS.invalidParams;
	}
	if (error instanceof McpNotFoundError) return JSON_RPC_ERRORS.methodNotFound;
	if (error instanceof MemoFSMcpError) return JSON_RPC_ERRORS.internalError;
	return JSON_RPC_ERRORS.internalError;
}

/**
 * Filters and cleans structured error details container payload.
 *
 * @param safe - Normalized error details structure.
 * @returns Cleaned key-value record payload.
 */
function cleanErrorData(safe: {
	code: string;
	details?: unknown;
}): Record<string, unknown> {
	return safe.details === undefined
		? { code: safe.code }
		: { code: safe.code, details: safe.details };
}

export { LATEST_PROTOCOL_VERSION };
