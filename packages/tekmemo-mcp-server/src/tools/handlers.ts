import {
	McpAuthorizationError,
	McpValidationError,
	toSafeError,
} from "../errors";
import type {
	GraphPathInput,
	McpToolResult,
	TekMemoMcpOptions,
	ToolSafety,
} from "../types";
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
	validateGraphEdge,
	validateGraphNode,
	validateId,
	validateMemoryKind,
	validateSourceRefs,
} from "../utils/validation";

const DEFAULT_MAX_INPUT_BYTES = 256_000;
const DEFAULT_MAX_OUTPUT_BYTES = 512_000;
const DEFAULT_TIMEOUT_MS = 30_000;

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
		case "tekmemo.health":
			return textResult(await options.runtime.health(signal));
		case "tekmemo.context":
			return textResult(
				await callOptionalRuntime(options, "context", args, signal),
			);
		case "tekmemo.recall":
			return textResult(await options.runtime.recall(args as never, signal));
		case "tekmemo.remember":
		case "tekmemo.write_note":
			return textResult(
				await options.runtime.writeMemory(args as never, signal),
			);
		case "tekmemo.read_core_memory":
			return textResult(
				await callOptionalRuntime(options, "readCoreMemory", args, signal),
			);
		case "tekmemo.read_notes_memory":
			return textResult(
				await callOptionalRuntime(options, "readNotesMemory", args, signal),
			);
		case "tekmemo.list_recent_memories":
			return textResult(
				await callOptionalRuntime(options, "listRecentMemories", args, signal),
			);
		case "tekmemo.validate":
			return textResult(
				await callOptionalRuntime(options, "validate", args, signal),
			);
		case "tekmemo.snapshot":
			return textResult(
				await callOptionalRuntime(options, "createSnapshot", args, signal),
			);
		case "tekmemo.update_core_memory":
			return textResult(
				await callOptionalRuntime(options, "updateCoreMemory", args, signal),
			);
		case "tekmemo.sync_status":
			return textResult(
				await callOptionalRuntime(options, "syncStatus", args, signal),
			);
		case "tekmemo.sync_pull":
			return textResult(
				await callOptionalRuntime(options, "syncPull", args, signal),
			);
		case "tekmemo.sync_push":
			return textResult(
				await callOptionalRuntime(options, "syncPush", args, signal),
			);
		case "tekmemo.sync_resolve_conflict":
			return textResult(
				await callOptionalRuntime(options, "resolveSyncConflict", args, signal),
			);
		case "tekmemo.graph_upsert_nodes":
			return textResult(
				await options.runtime.upsertGraphNodes(args as never, signal),
			);
		case "tekmemo.graph_upsert_edges":
			return textResult(
				await options.runtime.upsertGraphEdges(args as never, signal),
			);
		case "tekmemo.graph_neighbors":
			return textResult(
				await options.runtime.graphNeighbors(args as never, signal),
			);
		case "tekmemo.graph_path":
			return textResult(
				await options.runtime.graphPath(
					args as unknown as GraphPathInput,
					signal,
				),
			);
		case "tekmemo.readiness":
			return textResult(
				(await options.runtime.readiness?.(signal)) ?? {
					ok: false,
					message: "Readiness not supported.",
				},
			);
		case "tekmemo.context_compose":
			return textResult(
				(await options.runtime.contextCompose?.(args as never, signal)) ?? {
					error: "Context compose not supported.",
				},
			);
		case "tekmemo.graph_list_nodes":
			return textResult(
				(await options.runtime.graphListNodes?.(args as never, signal)) ?? {
					items: [],
				},
			);
		case "tekmemo.graph_create_node":
			return textResult(
				(await options.runtime.graphCreateNode?.(args as never, signal)) ?? {
					error: "Graph node creation not supported.",
				},
			);
		case "tekmemo.graph_list_edges":
			return textResult(
				(await options.runtime.graphListEdges?.(args as never, signal)) ?? {
					items: [],
				},
			);
		case "tekmemo.graph_create_edge":
			return textResult(
				(await options.runtime.graphCreateEdge?.(args as never, signal)) ?? {
					error: "Graph edge creation not supported.",
				},
			);
		case "tekmemo.extraction_run":
			return textResult(
				(await options.runtime.extractionRun?.(args as never, signal)) ?? {
					status: "skipped",
				},
			);
		case "tekmemo.extraction_jobs":
			return textResult(
				(await options.runtime.extractionJobs?.(args as never, signal)) ?? {
					items: [],
				},
			);
		case "tekmemo.evals_run":
			return textResult(
				(await options.runtime.evalsRun?.(args as never, signal)) ?? {
					passRate: 0,
				},
			);
		case "tekmemo.benchmarks_run":
			return textResult(
				(await options.runtime.benchmarksRun?.(args as never, signal)) ?? {
					passRate: 0,
				},
			);
		case "tekmemo.exports_create":
			return textResult(
				(await options.runtime.exportsCreate?.(args as never, signal)) ?? {
					error: "Exports not supported.",
				},
			);
		case "tekmemo.exports_download":
			return textResult(
				(await options.runtime.exportsDownload?.(args as never, signal)) ?? {
					error: "Exports download not supported.",
				},
			);
		case "tekmemo.snapshots_create":
			return textResult(
				(await options.runtime.snapshotsCreate?.(args as never, signal)) ?? {
					error: "Snapshots not supported.",
				},
			);
		case "tekmemo.snapshots_download":
			return textResult(
				(await options.runtime.snapshotsDownload?.(args as never, signal)) ?? {
					error: "Snapshots download not supported.",
				},
			);
		case "tekmemo.providers_list":
			return textResult(
				(await options.runtime.providersList?.(args as never, signal)) ?? [],
			);
		case "tekmemo.providers_create":
			return textResult(
				(await options.runtime.providersCreate?.(args as never, signal)) ?? {
					error: "Provider creation not supported.",
				},
			);
		case "tekmemo.providers_test":
			return textResult(
				(await options.runtime.providersTest?.(args as never, signal)) ?? {
					ok: false,
				},
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
		case "tekmemo.health":
			return { args: {}, safety: "read" };
		case "tekmemo.context": {
			const scope = scopeArgs(object);
			const limit = optionalInteger(object.limit, "limit", 1, maxPageSize);
			const maxBytes = optionalInteger(
				object.maxBytes,
				"maxBytes",
				1024,
				262144,
			);
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
		case "tekmemo.remember":
		case "tekmemo.write_note": {
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
		case "tekmemo.read_core_memory":
		case "tekmemo.read_notes_memory": {
			const scope = scopeArgs(object);
			return { args: scope, safety: "read", workspaceId: scope.workspaceId };
		}
		case "tekmemo.list_recent_memories": {
			const scope = scopeArgs(object);
			const limit = optionalInteger(object.limit, "limit", 1, maxPageSize);
			return {
				args: { ...scope, ...(limit === undefined ? {} : { limit }) },
				safety: "read",
				workspaceId: scope.workspaceId,
			};
		}
		case "tekmemo.validate": {
			const scope = scopeArgs(object);
			const strict = optionalBoolean(object.strict, "strict");
			return {
				args: { ...scope, ...(strict === undefined ? {} : { strict }) },
				safety: "read",
				workspaceId: scope.workspaceId,
			};
		}
		case "tekmemo.snapshot": {
			const scope = scopeArgs(object);
			const label = optionalString(object.label, "label", 128);
			const type = optionalString(object.type, "type", 32);
			if (
				type !== undefined &&
				!["manual", "automatic", "pre-sync", "pre-restore"].includes(type)
			) {
				throw new McpValidationError(
					"type must be manual, automatic, pre-sync, or pre-restore.",
				);
			}
			return {
				args: {
					...scope,
					...(label === undefined ? {} : { label }),
					...(type === undefined ? {} : { type }),
				},
				safety: "write",
				workspaceId: scope.workspaceId,
			};
		}
		case "tekmemo.update_core_memory": {
			const scope = scopeArgs(object);
			return {
				args: {
					content: requiredString(object.content, "content", 200_000),
					...scope,
				},
				safety: "write",
				workspaceId: scope.workspaceId,
			};
		}
		case "tekmemo.sync_status": {
			const scope = scopeArgs(object);
			const clientId = optionalString(object.clientId, "clientId", 256);
			return {
				args: { ...scope, ...(clientId === undefined ? {} : { clientId }) },
				safety: "read",
				workspaceId: scope.workspaceId,
			};
		}
		case "tekmemo.sync_pull": {
			const scope = scopeArgs(object);
			const sinceServerVersion = optionalInteger(
				object.sinceServerVersion,
				"sinceServerVersion",
				0,
				Number.MAX_SAFE_INTEGER,
			);
			const limit = optionalInteger(object.limit, "limit", 1, maxPageSize);
			return {
				args: {
					...scope,
					clientId: requiredString(object.clientId, "clientId", 256),
					...(sinceServerVersion === undefined ? {} : { sinceServerVersion }),
					...(limit === undefined ? {} : { limit }),
				},
				safety: "read",
				workspaceId: scope.workspaceId,
			};
		}
		case "tekmemo.sync_push": {
			const scope = scopeArgs(object);
			if (
				!Array.isArray(object.events) ||
				object.events.length === 0 ||
				object.events.length > 100
			) {
				throw new McpValidationError(
					"events must contain 1 to 100 sync events.",
				);
			}
			const events = object.events.map((event, index) =>
				validateSyncEvent(event, index),
			);
			const checkpoint =
				object.checkpoint === undefined
					? undefined
					: toJsonObject(object.checkpoint, "checkpoint");
			return {
				args: {
					...scope,
					clientId: requiredString(object.clientId, "clientId", 256),
					events,
					...(checkpoint === undefined ? {} : { checkpoint }),
				},
				safety: "write",
				workspaceId: scope.workspaceId,
			};
		}
		case "tekmemo.sync_resolve_conflict": {
			const scope = scopeArgs(object);
			const resolution = requiredString(object.resolution, "resolution", 32);
			if (!["keep_cloud", "use_client", "ignore"].includes(resolution)) {
				throw new McpValidationError(
					"resolution must be keep_cloud, use_client, or ignore.",
				);
			}
			const content =
				object.content === undefined
					? undefined
					: toJsonObject(object.content, "content");
			return {
				args: {
					...scope,
					conflictId: validateId(object.conflictId, "conflictId"),
					resolution,
					...(content === undefined ? {} : { content }),
				},
				safety: "write",
				workspaceId: scope.workspaceId,
			};
		}
		case "tekmemo.graph_upsert_nodes": {
			if (
				!Array.isArray(object.nodes) ||
				object.nodes.length === 0 ||
				object.nodes.length > 100
			) {
				throw new McpValidationError(
					"nodes must contain 1 to 100 graph nodes.",
				);
			}
			const ids = new Set<string>();
			const nodes = object.nodes.map((node, index) => {
				const valid = validateGraphNode(node, index);
				if (ids.has(valid.id))
					throw new McpValidationError(
						`Duplicate node id in batch: ${valid.id}.`,
					);
				ids.add(valid.id);
				return valid;
			});
			const scope = scopeArgs(object);
			return {
				args: { ...scope, nodes },
				safety: "write",
				workspaceId: scope.workspaceId,
			};
		}
		case "tekmemo.graph_upsert_edges": {
			if (
				!Array.isArray(object.edges) ||
				object.edges.length === 0 ||
				object.edges.length > 200
			) {
				throw new McpValidationError(
					"edges must contain 1 to 200 graph edges.",
				);
			}
			const identities = new Set<string>();
			const edges = object.edges.map((edge, index) => {
				const valid = validateGraphEdge(edge, index);
				const identity =
					valid.id ??
					`${valid.from}|${valid.type}|${valid.to}|${valid.dedupeKey ?? ""}`;
				if (identities.has(identity))
					throw new McpValidationError(
						`Duplicate edge identity in batch: ${identity}.`,
					);
				identities.add(identity);
				return valid;
			});
			const scope = scopeArgs(object);
			return {
				args: { ...scope, edges },
				safety: "write",
				workspaceId: scope.workspaceId,
			};
		}
		case "tekmemo.graph_neighbors": {
			const scope = scopeArgs(object);
			const direction =
				optionalString(object.direction, "direction", 8) ?? "both";
			if (!["in", "out", "both"].includes(direction))
				throw new McpValidationError("direction must be in, out, or both.");
			const edgeTypes = optionalStringArray(
				object.edgeTypes,
				"edgeTypes",
				50,
				128,
			);
			const minWeight = optionalNumber(object.minWeight, "minWeight", 0, 1);
			const limit = optionalInteger(object.limit, "limit", 1, maxPageSize);
			const cursor = optionalString(object.cursor, "cursor", 512);
			return {
				args: {
					nodeId: validateId(object.nodeId, "nodeId"),
					...scope,
					direction,
					...(edgeTypes === undefined ? {} : { edgeTypes }),
					...(minWeight === undefined ? {} : { minWeight }),
					...(limit === undefined ? {} : { limit }),
					...(cursor === undefined ? {} : { cursor }),
				},
				safety: "read",
				workspaceId: scope.workspaceId,
			};
		}
		case "tekmemo.graph_path": {
			const scope = scopeArgs(object);
			const weighted = optionalBoolean(object.weighted, "weighted");
			const maxDepth = optionalInteger(object.maxDepth, "maxDepth", 1, 25);
			const edgeTypes = optionalStringArray(
				object.edgeTypes,
				"edgeTypes",
				50,
				128,
			);
			const minWeight = optionalNumber(object.minWeight, "minWeight", 0, 1);
			return {
				args: {
					from: validateId(object.from, "from"),
					to: validateId(object.to, "to"),
					...scope,
					...(weighted === undefined ? {} : { weighted }),
					...(maxDepth === undefined ? {} : { maxDepth }),
					...(edgeTypes === undefined ? {} : { edgeTypes }),
					...(minWeight === undefined ? {} : { minWeight }),
				},
				safety: "read",
				workspaceId: scope.workspaceId,
			};
		}
		case "tekmemo.readiness": {
			return { args: {}, safety: "read" };
		}
		case "tekmemo.context_compose": {
			const scope = scopeArgs(object);
			const query = requiredString(object.query, "query", 4096);
			const topK = optionalInteger(object.topK, "topK", 1, 20);
			const strategy = optionalString(object.strategy, "strategy", 8);
			if (
				strategy !== undefined &&
				!["auto", "vector", "local"].includes(strategy)
			) {
				throw new McpValidationError(
					"strategy must be auto, vector, or local.",
				);
			}
			const rerank = optionalBoolean(object.rerank, "rerank");
			const includeCoreMemory = optionalBoolean(
				object.includeCoreMemory,
				"includeCoreMemory",
			);
			const includeRecallResults = optionalBoolean(
				object.includeRecallResults,
				"includeRecallResults",
			);
			const includeGraphContext = optionalBoolean(
				object.includeGraphContext,
				"includeGraphContext",
			);
			const graphDepth = optionalInteger(object.graphDepth, "graphDepth", 1, 3);
			const graphLimit = optionalInteger(
				object.graphLimit,
				"graphLimit",
				1,
				50,
			);
			const maxContextCharacters = optionalInteger(
				object.maxContextCharacters,
				"maxContextCharacters",
				1000,
				50000,
			);
			const maxSourceCharacters = optionalInteger(
				object.maxSourceCharacters,
				"maxSourceCharacters",
				300,
				8000,
			);
			return {
				args: {
					query,
					...scope,
					...(topK === undefined ? {} : { topK }),
					...(strategy === undefined ? {} : { strategy }),
					...(rerank === undefined ? {} : { rerank }),
					...(includeCoreMemory === undefined ? {} : { includeCoreMemory }),
					...(includeRecallResults === undefined
						? {}
						: { includeRecallResults }),
					...(includeGraphContext === undefined ? {} : { includeGraphContext }),
					...(graphDepth === undefined ? {} : { graphDepth }),
					...(graphLimit === undefined ? {} : { graphLimit }),
					...(maxContextCharacters === undefined
						? {}
						: { maxContextCharacters }),
					...(maxSourceCharacters === undefined ? {} : { maxSourceCharacters }),
				},
				safety: "read",
				workspaceId: scope.workspaceId,
			};
		}
		case "tekmemo.graph_list_nodes": {
			const scope = scopeArgs(object);
			const limit = optionalInteger(object.limit, "limit", 1, 100);
			const cursor = optionalString(object.cursor, "cursor", 512);
			const status = optionalString(object.status, "status", 32);
			if (
				status !== undefined &&
				!["active", "deprecated", "conflicted", "deleted"].includes(status)
			) {
				throw new McpValidationError(
					"status must be active, deprecated, conflicted, or deleted.",
				);
			}
			return {
				args: {
					...scope,
					...(limit === undefined ? {} : { limit }),
					...(cursor === undefined ? {} : { cursor }),
					...(status === undefined ? {} : { status }),
				},
				safety: "read",
				workspaceId: scope.workspaceId,
			};
		}
		case "tekmemo.graph_create_node": {
			const scope = scopeArgs(object);
			const nodeId = requiredString(object.nodeId, "nodeId", 256);
			const type = requiredString(object.type, "type", 128);
			const label = requiredString(object.label, "label", 256);
			const summary = optionalString(object.summary, "summary", 1024);
			const aliases = optionalStringArray(object.aliases, "aliases", 20, 128);
			const metadata =
				object.metadata === undefined
					? undefined
					: toJsonObject(object.metadata, "metadata");
			return {
				args: {
					nodeId,
					type,
					label,
					...scope,
					...(summary === undefined ? {} : { summary }),
					...(aliases === undefined ? {} : { aliases }),
					...(metadata === undefined ? {} : { metadata }),
				},
				safety: "write",
				workspaceId: scope.workspaceId,
			};
		}
		case "tekmemo.graph_list_edges": {
			const scope = scopeArgs(object);
			const limit = optionalInteger(object.limit, "limit", 1, 100);
			const cursor = optionalString(object.cursor, "cursor", 512);
			const status = optionalString(object.status, "status", 32);
			if (
				status !== undefined &&
				!["active", "deprecated", "conflicted", "deleted"].includes(status)
			) {
				throw new McpValidationError(
					"status must be active, deprecated, conflicted, or deleted.",
				);
			}
			return {
				args: {
					...scope,
					...(limit === undefined ? {} : { limit }),
					...(cursor === undefined ? {} : { cursor }),
					...(status === undefined ? {} : { status }),
				},
				safety: "read",
				workspaceId: scope.workspaceId,
			};
		}
		case "tekmemo.graph_create_edge": {
			const scope = scopeArgs(object);
			const edgeId = optionalString(object.edgeId, "edgeId", 256);
			const from = requiredString(object.from, "from", 256);
			const to = requiredString(object.to, "to", 256);
			const type = requiredString(object.type, "type", 128);
			const directed = optionalBoolean(object.directed, "directed");
			const weight = optionalNumber(object.weight, "weight", 0, 1);
			const metadata =
				object.metadata === undefined
					? undefined
					: toJsonObject(object.metadata, "metadata");
			return {
				args: {
					...scope,
					...(edgeId === undefined ? {} : { edgeId }),
					from,
					to,
					type,
					...(directed === undefined ? {} : { directed }),
					...(weight === undefined ? {} : { weight }),
					...(metadata === undefined ? {} : { metadata }),
				},
				safety: "write",
				workspaceId: scope.workspaceId,
			};
		}
		case "tekmemo.extraction_run": {
			const scope = scopeArgs(object);
			const mode = optionalString(object.mode, "mode", 32);
			if (
				mode !== undefined &&
				!["full", "core", "notes", "sync", "connectors"].includes(mode)
			) {
				throw new McpValidationError(
					"mode must be full, core, notes, sync, or connectors.",
				);
			}
			const force = optionalBoolean(object.force, "force");
			return {
				args: {
					...scope,
					...(mode === undefined ? {} : { mode }),
					...(force === undefined ? {} : { force }),
				},
				safety: "write",
				workspaceId: scope.workspaceId,
			};
		}
		case "tekmemo.extraction_jobs": {
			const scope = scopeArgs(object);
			const limit = optionalInteger(object.limit, "limit", 1, 100);
			return {
				args: {
					...scope,
					...(limit === undefined ? {} : { limit }),
				},
				safety: "read",
				workspaceId: scope.workspaceId,
			};
		}
		case "tekmemo.evals_run": {
			const scope = scopeArgs(object);
			const fixtureIds =
				object.fixtureIds === undefined
					? undefined
					: optionalStringArray(object.fixtureIds, "fixtureIds", 50, 256);
			const iterations = optionalInteger(
				object.iterations,
				"iterations",
				1,
				20,
			);
			const thresholds =
				object.thresholds === undefined
					? undefined
					: toJsonObject(object.thresholds, "thresholds");
			return {
				args: {
					...scope,
					...(fixtureIds === undefined ? {} : { fixtureIds }),
					...(iterations === undefined ? {} : { iterations }),
					...(thresholds === undefined ? {} : { thresholds }),
				},
				safety: "read",
				workspaceId: scope.workspaceId,
			};
		}
		case "tekmemo.benchmarks_run": {
			const scope = scopeArgs(object);
			const fixtureIds =
				object.fixtureIds === undefined
					? undefined
					: optionalStringArray(object.fixtureIds, "fixtureIds", 50, 256);
			const iterations = optionalInteger(
				object.iterations,
				"iterations",
				1,
				20,
			);
			const warmupIterations = optionalInteger(
				object.warmupIterations,
				"warmupIterations",
				0,
				5,
			);
			const thresholds =
				object.thresholds === undefined
					? undefined
					: toJsonObject(object.thresholds, "thresholds");
			return {
				args: {
					...scope,
					...(fixtureIds === undefined ? {} : { fixtureIds }),
					...(iterations === undefined ? {} : { iterations }),
					...(warmupIterations === undefined ? {} : { warmupIterations }),
					...(thresholds === undefined ? {} : { thresholds }),
				},
				safety: "read",
				workspaceId: scope.workspaceId,
			};
		}
		case "tekmemo.exports_create": {
			const scope = scopeArgs(object);
			const label = optionalString(object.label, "label", 120);
			return {
				args: {
					...scope,
					...(label === undefined ? {} : { label }),
				},
				safety: "write",
				workspaceId: scope.workspaceId,
			};
		}
		case "tekmemo.exports_download": {
			const scope = scopeArgs(object);
			const exportId = requiredString(object.exportId, "exportId", 256);
			return {
				args: { ...scope, exportId },
				safety: "read",
				workspaceId: scope.workspaceId,
			};
		}
		case "tekmemo.snapshots_create": {
			const scope = scopeArgs(object);
			const label = optionalString(object.label, "label", 120);
			const trigger = optionalString(object.trigger, "trigger", 32);
			if (
				trigger !== undefined &&
				!["manual", "sync", "system"].includes(trigger)
			) {
				throw new McpValidationError(
					"trigger must be manual, sync, or system.",
				);
			}
			return {
				args: {
					...scope,
					...(label === undefined ? {} : { label }),
					...(trigger === undefined ? {} : { trigger }),
				},
				safety: "write",
				workspaceId: scope.workspaceId,
			};
		}
		case "tekmemo.snapshots_download": {
			const scope = scopeArgs(object);
			const snapshotId = requiredString(object.snapshotId, "snapshotId", 256);
			return {
				args: { ...scope, snapshotId },
				safety: "read",
				workspaceId: scope.workspaceId,
			};
		}
		case "tekmemo.providers_list": {
			const scope = scopeArgs(object);
			return {
				args: { ...scope },
				safety: "read",
				workspaceId: scope.workspaceId,
			};
		}
		case "tekmemo.providers_create": {
			const scope = scopeArgs(object);
			const provider = requiredString(object.provider, "provider", 32);
			if (!["voyageai", "openai", "upstash-vector"].includes(provider)) {
				throw new McpValidationError(
					"provider must be voyageai, openai, or upstash-vector.",
				);
			}
			const keyName = requiredString(object.keyName, "keyName", 256);
			const secret = requiredString(object.secret, "secret", 4096);
			const restUrl = optionalString(object.restUrl, "restUrl", 2048);
			const embeddingModel = optionalString(
				object.embeddingModel,
				"embeddingModel",
				256,
			);
			const rerankModel = optionalString(
				object.rerankModel,
				"rerankModel",
				256,
			);
			return {
				args: {
					...scope,
					provider,
					keyName,
					secret,
					...(restUrl === undefined ? {} : { restUrl }),
					...(embeddingModel === undefined ? {} : { embeddingModel }),
					...(rerankModel === undefined ? {} : { rerankModel }),
				},
				safety: "write",
				workspaceId: scope.workspaceId,
			};
		}
		case "tekmemo.providers_test": {
			const scope = scopeArgs(object);
			const credentialId = requiredString(
				object.credentialId,
				"credentialId",
				256,
			);
			return {
				args: { ...scope, credentialId },
				safety: "read",
				workspaceId: scope.workspaceId,
			};
		}
		default:
			throw new McpValidationError(`Unknown tool: ${toolName}.`);
	}
}

function validateSyncEvent(
	value: unknown,
	index: number,
): Record<string, unknown> {
	const event = asObject(value, `events[${index}]`);
	const clientEventId = requiredString(
		event.clientEventId,
		`events[${index}].clientEventId`,
		256,
	);
	const type = requiredString(event.type, `events[${index}].type`, 128);
	const path = optionalString(event.path, `events[${index}].path`, 1024);
	const payload =
		event.payload === undefined
			? undefined
			: toJsonObject(event.payload, `events[${index}].payload`);
	const payloadHash = optionalString(
		event.payloadHash,
		`events[${index}].payloadHash`,
		256,
	);
	const createdAt = optionalString(
		event.createdAt,
		`events[${index}].createdAt`,
		128,
	);
	const baseServerVersion = optionalInteger(
		event.baseServerVersion,
		`events[${index}].baseServerVersion`,
		0,
		Number.MAX_SAFE_INTEGER,
	);
	return {
		clientEventId,
		type,
		...(path === undefined ? {} : { path }),
		...(payload === undefined ? {} : { payload }),
		...(payloadHash === undefined ? {} : { payloadHash }),
		...(createdAt === undefined ? {} : { createdAt }),
		...(baseServerVersion === undefined ? {} : { baseServerVersion }),
	};
}
