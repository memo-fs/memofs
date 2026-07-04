/**
 * MCP Tool dispatching, authorization, and execution handlers.
 *
 * @module handlers
 */

import {
	McpAuthorizationError,
	McpValidationError,
	toSafeError,
} from "../errors";
import type { McpToolResult, TekMemoMcpOptions, ToolSafety } from "../types";
import { asObject, safeJsonStringify, toJsonObject } from "../utils/json";
import { enforceToolResultLimit } from "../utils/limits";
import { withTimeout } from "../utils/timeout";
import {
	ensurePayloadSize,
	optionalBoolean,
	optionalInteger,
	optionalNumber,
	optionalString,
	optionalStringArray,
	requiredString,
	validateMemoryKind,
	validateSourceRefs,
} from "../utils/validation";

const DEFAULT_MAX_INPUT_BYTES = 256_000;
const DEFAULT_MAX_OUTPUT_BYTES = 512_000;
const DEFAULT_TIMEOUT_MS = 30_000;

/**
 * Main dispatcher to parse arguments, validate safety authorization, and run
 * the matching TekMemo operation tool by name.
 *
 * @param options - Configuration options for the MCP runtime.
 * @param toolName - Name of the MCP tool being called.
 * @param rawArgs - Raw arguments object mapping inputs.
 * @returns The structured McpToolResult payload.
 * @throws {McpValidationError} If input arguments validation fails.
 * @throws {McpAuthorizationError} If write operation is not authorized by the configuration.
 */
export async function callTekMemoTool(
	options: TekMemoMcpOptions,
	toolName: string,
	rawArgs: unknown,
): Promise<McpToolResult> {
	const maxInputBytes = options.maxInputBytes ?? DEFAULT_MAX_INPUT_BYTES;
	const maxOutputBytes = options.maxOutputBytes ?? DEFAULT_MAX_OUTPUT_BYTES;
	const timeoutMs = options.requestTimeoutMs ?? DEFAULT_TIMEOUT_MS;
	const args = rawArgs === undefined ? {} : rawArgs;

	try {
		ensurePayloadSize(args, maxInputBytes, "tool arguments");
		const result = await withTimeout(toolName, timeoutMs, async (signal) => {
			const validated = validateToolArguments(
				toolName,
				args,
				options.maxPageSize ?? 50,
			);
			await authorizeTool(
				options,
				toolName,
				validated.safety,
				validated.workspaceId,
				validated.args,
			);
			return executeTool(options, toolName, validated.args, signal);
		});
		return enforceToolResultLimit(result, maxOutputBytes, toolName);
	} catch (error) {
		const safe = toSafeError(error);
		const result: McpToolResult = {
			isError: true,
			content: [{ type: "text", text: `${safe.code}: ${safe.message}` }],
			structuredContent: { error: safe as unknown as never },
		};
		return enforceToolResultLimit(result, maxOutputBytes, toolName);
	}
}

async function authorizeTool(
	options: TekMemoMcpOptions,
	operation: string,
	safety: ToolSafety,
	workspaceId: string | undefined,
	args: unknown,
): Promise<void> {
	if (options.readOnly && safety !== "read") {
		throw new McpAuthorizationError(
			`Operation ${operation} is blocked because this MCP server is running read-only.`,
		);
	}
	if (!options.authorize) return;
	const allowed = await options.authorize({
		operation,
		safety,
		...(workspaceId === undefined ? {} : { workspaceId }),
		arguments: args,
	});
	if (!allowed) {
		throw new McpAuthorizationError(
			`Operation ${operation} was denied by the authorization policy.`,
		);
	}
}

function textResult(output: unknown): McpToolResult {
	const object = toJsonObject(output, "structuredContent");
	return {
		content: [{ type: "text", text: safeJsonStringify(object) }],
		structuredContent: object,
	};
}

async function executeTool(
	options: TekMemoMcpOptions,
	toolName: string,
	args: Record<string, unknown>,
	signal: AbortSignal,
): Promise<McpToolResult> {
	switch (toolName) {
		case "tekmemo_agent_session_start":
			return textResult(
				await callOptionalRuntime(options, "startAgentSession", args, signal),
			);
		case "tekmemo_agent_session_read":
			return textResult(
				await callOptionalRuntime(
					options,
					"readAgentSessionFile",
					args,
					signal,
				),
			);
		case "tekmemo_agent_session_write":
			return textResult(
				await callOptionalRuntime(
					options,
					"writeAgentSessionFile",
					args,
					signal,
				),
			);
		case "tekmemo_agent_session_append":
			return textResult(
				await callOptionalRuntime(
					options,
					"appendAgentSessionFile",
					args,
					signal,
				),
			);
		case "tekmemo_agent_session_extract":
			return textResult(
				await callOptionalRuntime(options, "extractAgentSession", args, signal),
			);
		case "tekmemo_agent_session_complete":
			return textResult(
				await callOptionalRuntime(
					options,
					"completeAgentSession",
					args,
					signal,
				),
			);
		case "tekmemo.context":
			return textResult(
				await callOptionalRuntime(options, "context", args, signal),
			);
		case "tekmemo.recall":
			return textResult(
				await callOptionalRuntime(options, "recall", args, signal),
			);
		case "tekmemo.remember":
			return textResult(
				await callOptionalRuntime(options, "writeMemory", args, signal),
			);
		case "tekmemo.consolidate":
			return textResult(
				await callOptionalRuntime(options, "consolidateMemory", args, signal),
			);
		default:
			throw new McpValidationError(`Unknown tool: ${toolName}.`);
	}
}

async function callOptionalRuntime(
	options: TekMemoMcpOptions,
	method: keyof TekMemoMcpOptions["runtime"],
	args: Record<string, unknown>,
	signal: AbortSignal,
): Promise<unknown> {
	const fn = options.runtime[method];
	if (typeof fn !== "function") {
		throw new McpValidationError(
			`Runtime does not support ${String(method)}.`,
			{
				method,
			},
		);
	}
	return (
		fn as (
			input: Record<string, unknown>,
			signal?: AbortSignal,
		) => Promise<unknown>
	)(args, signal);
}

function scopeArgs(object: Record<string, unknown>): {
	workspaceId?: string;
	projectId?: string;
} {
	const workspaceId = optionalString(object.workspaceId, "workspaceId", 256);
	const projectId = optionalString(object.projectId, "projectId", 256);
	return {
		...(workspaceId === undefined ? {} : { workspaceId }),
		...(projectId === undefined ? {} : { projectId }),
	};
}

function validateToolArguments(
	toolName: string,
	rawArgs: unknown,
	maxPageSize: number,
): {
	args: Record<string, unknown>;
	safety: ToolSafety;
	workspaceId?: string | undefined;
} {
	const object = asObject(rawArgs, "tool arguments");
	switch (toolName) {
		case "tekmemo_agent_session_start": {
			const scope = scopeArgs(object);
			const actorId = optionalString(object.actorId, "actorId", 256);
			const sessionId = optionalString(object.sessionId, "sessionId", 256);
			return {
				args: {
					task: requiredString(object.task, "task", 4096),
					...scope,
					...(actorId === undefined ? {} : { actorId }),
					...(sessionId === undefined ? {} : { sessionId }),
				},
				safety: "write",
				workspaceId: scope.workspaceId,
			};
		}
		case "tekmemo_agent_session_read": {
			const scope = scopeArgs(object);
			return {
				args: {
					sessionId: requiredString(object.sessionId, "sessionId", 256),
					path: requiredString(object.path, "path", 2048),
					...scope,
				},
				safety: "read",
				workspaceId: scope.workspaceId,
			};
		}
		case "tekmemo_agent_session_write":
		case "tekmemo_agent_session_append": {
			const scope = scopeArgs(object);
			return {
				args: {
					sessionId: requiredString(object.sessionId, "sessionId", 256),
					path: requiredString(object.path, "path", 2048),
					content: requiredString(object.content, "content", 200_000),
					...scope,
				},
				safety: "write",
				workspaceId: scope.workspaceId,
			};
		}
		case "tekmemo_agent_session_extract": {
			const scope = scopeArgs(object);
			return {
				args: {
					sessionId: requiredString(object.sessionId, "sessionId", 256),
					...scope,
				},
				safety: "read",
				workspaceId: scope.workspaceId,
			};
		}
		case "tekmemo_agent_session_complete": {
			const scope = scopeArgs(object);
			const extractDurableMemory = optionalBoolean(
				object.extractDurableMemory,
				"extractDurableMemory",
			);
			const checkpointLabel = optionalString(
				object.checkpointLabel,
				"checkpointLabel",
				128,
			);
			return {
				args: {
					sessionId: requiredString(object.sessionId, "sessionId", 256),
					...scope,
					...(extractDurableMemory === undefined
						? {}
						: { extractDurableMemory }),
					...(checkpointLabel === undefined ? {} : { checkpointLabel }),
				},
				safety: "write",
				workspaceId: scope.workspaceId,
			};
		}
		case "tekmemo.context": {
			const scope = scopeArgs(object);
			const limit = optionalInteger(object.limit, "limit", 1, maxPageSize);
			const maxBytes = optionalInteger(
				object.maxBytes,
				"maxBytes",
				1024,
				262144,
			);
			// Progressive disclosure ( / Q27).
			const detailRaw = optionalString(object.detail, "detail", 16);
			if (
				detailRaw !== undefined &&
				detailRaw !== "compact" &&
				detailRaw !== "full"
			) {
				throw new McpValidationError(
					'detail must be one of: "compact", "full".',
				);
			}
			const detail = detailRaw as "compact" | "full" | undefined;
			const sectionRaw = optionalString(object.section, "section", 32);
			if (
				sectionRaw !== undefined &&
				sectionRaw !== "entities" &&
				sectionRaw !== "recall" &&
				sectionRaw !== "recent" &&
				sectionRaw !== "notes"
			) {
				throw new McpValidationError(
					'section must be one of: "entities", "recall", "recent", "notes".',
				);
			}
			const section = sectionRaw as
				| "entities"
				| "recall"
				| "recent"
				| "notes"
				| undefined;
			const expand = optionalString(object.expand, "expand", 512);
			const includeCore = optionalBoolean(object.includeCore, "includeCore");
			const includeNotes = optionalBoolean(object.includeNotes, "includeNotes");
			const includeRecent = optionalBoolean(
				object.includeRecent,
				"includeRecent",
			);
			const includeGraph = optionalBoolean(object.includeGraph, "includeGraph");
			const includeSources = optionalBoolean(
				object.includeSources,
				"includeSources",
			);
			const filters =
				object.filters === undefined
					? undefined
					: toJsonObject(object.filters, "filters");
			return {
				args: {
					query: requiredString(object.query, "query", 4096),
					...scope,
					...(limit === undefined ? {} : { limit }),
					...(maxBytes === undefined ? {} : { maxBytes }),
					...(detail === undefined ? {} : { detail }),
					...(section === undefined ? {} : { section }),
					...(expand === undefined ? {} : { expand }),
					...(includeCore === undefined ? {} : { includeCore }),
					...(includeNotes === undefined ? {} : { includeNotes }),
					...(includeRecent === undefined ? {} : { includeRecent }),
					...(includeGraph === undefined ? {} : { includeGraph }),
					...(includeSources === undefined ? {} : { includeSources }),
					...(filters === undefined ? {} : { filters }),
				},
				safety: "read",
				workspaceId: scope.workspaceId,
			};
		}
		case "tekmemo.recall": {
			const scope = scopeArgs(object);
			const limit = optionalInteger(object.limit, "limit", 1, maxPageSize);
			const includeGraph = optionalBoolean(object.includeGraph, "includeGraph");
			const includeSources = optionalBoolean(
				object.includeSources,
				"includeSources",
			);
			const filters =
				object.filters === undefined
					? undefined
					: toJsonObject(object.filters, "filters");
			return {
				args: {
					query: requiredString(object.query, "query", 4096),
					...scope,
					...(limit === undefined ? {} : { limit }),
					...(includeGraph === undefined ? {} : { includeGraph }),
					...(includeSources === undefined ? {} : { includeSources }),
					...(filters === undefined ? {} : { filters }),
				},
				safety: "read",
				workspaceId: scope.workspaceId,
			};
		}
		case "tekmemo.remember": {
			const scope = scopeArgs(object);
			const title = optionalString(object.title, "title", 512);
			const kind = validateMemoryKind(object.kind);
			const confidence = optionalNumber(object.confidence, "confidence", 0, 1);
			const source = optionalString(object.source, "source", 512);
			const tags = optionalStringArray(object.tags, "tags", 50, 128);
			const sourceRefs = validateSourceRefs(object.sourceRefs);
			const metadata =
				object.metadata === undefined
					? undefined
					: toJsonObject(object.metadata, "metadata");
			return {
				args: {
					content: requiredString(object.content, "content", 100_000),
					...(title === undefined ? {} : { title }),
					...(kind === undefined ? {} : { kind }),
					...(confidence === undefined ? {} : { confidence }),
					...(source === undefined ? {} : { source }),
					...scope,
					...(tags === undefined ? {} : { tags }),
					...(sourceRefs === undefined ? {} : { sourceRefs }),
					...(metadata === undefined ? {} : { metadata }),
				},
				safety: "write",
				workspaceId: scope.workspaceId,
			};
		}
		case "tekmemo.consolidate": {
			const scope = scopeArgs(object);
			const apply = optionalBoolean(object.apply, "apply");
			const now = optionalString(object.now, "now", 64);
			const supersedingEdgeType = optionalString(
				object.supersedingEdgeType,
				"supersedingEdgeType",
				128,
			);
			// Consolidation is dual-nature: a preview (apply=false) is a read-only
			// pass that computes the plan without persisting; an applied pass
			// (apply=true, the default) mutates the graph. Derive safety from the
			// flag so read-only servers can still run previews, while applied
			// consolidation goes through the write authorization path.
			const safety: ToolSafety = apply === false ? "read" : "write";
			return {
				args: {
					...scope,
					...(apply === undefined ? {} : { apply }),
					...(now === undefined ? {} : { now }),
					...(supersedingEdgeType === undefined ? {} : { supersedingEdgeType }),
				},
				safety,
				workspaceId: scope.workspaceId,
			};
		}
		default:
			throw new McpValidationError(`Unknown tool: ${toolName}.`);
	}
}
