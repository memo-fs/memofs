import {
	McpNotFoundError,
	McpValidationError,
	TekMemoMcpError,
	toSafeError,
} from "../errors.js";
import {
	createPromptDefinitions,
	getTekMemoPrompt,
} from "../prompts/handlers.js";
import {
	createResourceDefinitions,
	readTekMemoResource,
} from "../resources/handlers.js";
import {
	LATEST_PROTOCOL_VERSION,
	negotiateProtocolVersion,
} from "../schema.js";
import { createToolDefinitions } from "../tools/definitions.js";
import { callTekMemoTool } from "../tools/handlers.js";
import type { JsonValue, TekMemoMcpOptions } from "../types.js";
import { asObject } from "../utils/json.js";
import { paginateArray } from "../utils/pagination.js";
import {
	failure,
	isNotification,
	JSON_RPC_ERRORS,
	type JsonRpcRequest,
	type JsonRpcResponse,
	parseJsonRpcPayload,
	success,
	validateJsonRpcRequest,
} from "./json-rpc.js";

export interface TekMemoMcpProtocolServer {
	readonly options: Required<
		Pick<
			TekMemoMcpOptions,
			"name" | "version" | "instructions" | "defaultPageSize" | "maxPageSize"
		>
	> &
		TekMemoMcpOptions;
	handleJsonRpcMessage(
		message: unknown,
	): Promise<JsonRpcResponse | JsonRpcResponse[] | undefined>;
	handleJsonRpcText(text: string): Promise<string | undefined>;
}

const DEFAULT_INSTRUCTIONS =
	"Use TekMemo MCP for grounded memory recall and explicitly authorized memory writes. Read-only tools may be used for context. Write tools should only be called after user approval from the host.";

export function createTekMemoMcpProtocolServer(
	options: TekMemoMcpOptions,
): TekMemoMcpProtocolServer {
	const normalized = {
		...options,
		name: options.name ?? "tekmemo-mcp",
		version: options.version ?? "0.1.0",
		instructions: options.instructions ?? DEFAULT_INSTRUCTIONS,
		defaultPageSize: options.defaultPageSize ?? 25,
		maxPageSize: options.maxPageSize ?? 100,
	};
	return new DefaultTekMemoMcpProtocolServer(normalized);
}

class DefaultTekMemoMcpProtocolServer implements TekMemoMcpProtocolServer {
	readonly options: Required<
		Pick<
			TekMemoMcpOptions,
			"name" | "version" | "instructions" | "defaultPageSize" | "maxPageSize"
		>
	> &
		TekMemoMcpOptions;

	constructor(
		options: Required<
			Pick<
				TekMemoMcpOptions,
				"name" | "version" | "instructions" | "defaultPageSize" | "maxPageSize"
			>
		> &
			TekMemoMcpOptions,
	) {
		this.options = options;
	}

	async handleJsonRpcText(text: string): Promise<string | undefined> {
		let payload: unknown;
		try {
			payload = parseJsonRpcPayload(text);
		} catch (error) {
			const safe = toSafeError(error);
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

	private async handleSingle(
		message: unknown,
	): Promise<JsonRpcResponse | undefined> {
		let request: JsonRpcRequest;
		try {
			request = validateJsonRpcRequest(message);
		} catch (error) {
			const safe = toSafeError(error);
			return failure(
				null,
				errorCodeFrom(error),
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
				return (await callTekMemoTool(
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
				return (await readTekMemoResource(
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
				return getTekMemoPrompt(
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

function optionalCursor(value: unknown): string | undefined {
	if (value === undefined) return undefined;
	if (typeof value !== "string")
		throw new McpValidationError("cursor must be a string.");
	return value;
}

function errorCodeFrom(error: unknown): number {
	if (error instanceof McpValidationError) {
		const maybe = error.details as { jsonRpcCode?: unknown } | undefined;
		return typeof maybe?.jsonRpcCode === "number"
			? maybe.jsonRpcCode
			: JSON_RPC_ERRORS.invalidParams;
	}
	if (error instanceof McpNotFoundError) return JSON_RPC_ERRORS.methodNotFound;
	if (error instanceof TekMemoMcpError) return JSON_RPC_ERRORS.internalError;
	return JSON_RPC_ERRORS.internalError;
}

function cleanErrorData(safe: {
	code: string;
	details?: unknown;
}): Record<string, unknown> {
	return safe.details === undefined
		? { code: safe.code }
		: { code: safe.code, details: safe.details };
}

export { LATEST_PROTOCOL_VERSION };
