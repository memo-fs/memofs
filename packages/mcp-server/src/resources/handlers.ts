/**
 * MCP Resource definitions and read operation handlers.
 *
 * @module handlers
 */

import { McpNotFoundError, McpValidationError, toSafeError } from "../errors";
import type { McpResourceDefinition, MemoFSMcpOptions } from "../types";
import { safeJsonStringify } from "../utils/json";
import { normalizeLimit } from "../utils/pagination";

/**
 * Creates and returns all available MCP Resource definitions.
 *
 * @returns An array of McpResourceDefinitions.
 */
export function createResourceDefinitions(): McpResourceDefinition[] {
	return [
		{
			uri: "memofs://agent-sessions/{sessionId}/context/core",
			name: "MemoFS Agent Session Core Context",
			description: "Core context file for an AgentFS-backed session.",
			mimeType: "text/markdown",
		},
		{
			uri: "memofs://agent-sessions/{sessionId}/output/durable-memory",
			name: "MemoFS Agent Session Durable Memory",
			description:
				"Candidate durable memory output for an AgentFS-backed session.",
			mimeType: "text/markdown",
		},
		{
			uri: "memofs://health",
			name: "MemoFS MCP Health",
			description: "Runtime health, version, and capability summary.",
			mimeType: "application/json",
		},
		{
			uri: "memofs://context",
			name: "MemoFS Agent Context",
			description:
				"Task-ready context. Query parameters: query, workspaceId, projectId, limit, maxBytes.",
			mimeType: "application/json",
		},
		{
			uri: "memofs://memory/core",
			name: "MemoFS Core Memory",
			description: "Stable project/workspace core memory.",
			mimeType: "text/markdown",
		},
		{
			uri: "memofs://memory/notes",
			name: "MemoFS Notes Memory",
			description: "Working notes and lower-confidence observations.",
			mimeType: "text/markdown",
		},
		{
			uri: "memofs://memory/recent",
			name: "MemoFS Recent Memory Events",
			description:
				"Recent memory events. Query parameters: workspaceId, projectId, limit.",
			mimeType: "application/json",
		},
		{
			uri: "memofs://graph/nodes",
			name: "MemoFS Graph Nodes",
			description:
				"A paginated JSON view of graph memory nodes. Query parameters: workspaceId, cursor, limit.",
			mimeType: "application/json",
		},
		{
			uri: "memofs://graph/edges",
			name: "MemoFS Graph Edges",
			description:
				"A paginated JSON view of graph memory edges. Query parameters: workspaceId, cursor, limit.",
			mimeType: "application/json",
		},
	];
}

/**
 * Reads a MemoFS resource by URI, resolving parameters and queries.
 *
 * @param options - Configuration options for the MCP server.
 * @param uri - The requested resource URI.
 * @returns The resolved resource contents array.
 * @throws {McpValidationError} If URI is invalid or query parameters fail validation.
 * @throws {McpNotFoundError} If the resource cannot be found or matched.
 */
export async function readMemoFSResource(
	options: MemoFSMcpOptions,
	uri: string,
): Promise<{
	contents: Array<{ uri: string; mimeType: string; text: string }>;
}> {
	if (typeof uri !== "string" || uri.length > 2048)
		throw new McpValidationError("uri is invalid.");
	const parsed = parseMemoFSUri(uri);
	try {
		switch (parsed.pathname) {
			case "health":
				return content(
					uri,
					"application/json",
					safeJsonStringify(await options.runtime.health()),
				);
			case "context": {
				if (!options.runtime.context)
					throw new McpNotFoundError(
						"Runtime does not support context resources.",
					);
				const query = parsed.search.query ?? "current task";
				return content(
					uri,
					"application/json",
					safeJsonStringify(
						await options.runtime.context({
							query,
							...(parsed.search.workspaceId === undefined
								? {}
								: { workspaceId: parsed.search.workspaceId }),
							...(parsed.search.projectId === undefined
								? {}
								: { projectId: parsed.search.projectId }),
							...(parsed.search.limit === undefined
								? {}
								: { limit: parsed.search.limit }),
							...(parsed.search.maxBytes === undefined
								? {}
								: { maxBytes: parsed.search.maxBytes }),
						}),
					),
				);
			}
			case "memory/core": {
				if (!options.runtime.readCoreMemory)
					throw new McpNotFoundError(
						"Runtime does not support core memory resources.",
					);
				const result = await options.runtime.readCoreMemory(parsed.search);
				return content(uri, "text/markdown", result.content);
			}
			case "memory/notes": {
				if (!options.runtime.readNotesMemory)
					throw new McpNotFoundError(
						"Runtime does not support notes memory resources.",
					);
				const result = await options.runtime.readNotesMemory(parsed.search);
				return content(uri, "text/markdown", result.content);
			}
			case "memory/recent": {
				if (!options.runtime.listRecentMemories)
					throw new McpNotFoundError(
						"Runtime does not support recent memory resources.",
					);
				return content(
					uri,
					"application/json",
					safeJsonStringify(
						await options.runtime.listRecentMemories({
							...(parsed.search.workspaceId === undefined
								? {}
								: { workspaceId: parsed.search.workspaceId }),
							...(parsed.search.projectId === undefined
								? {}
								: { projectId: parsed.search.projectId }),
							...(parsed.search.limit === undefined
								? {}
								: { limit: parsed.search.limit }),
						}),
					),
				);
			}
			case "graph/nodes": {
				if (!options.runtime.listGraphNodes)
					throw new McpNotFoundError(
						"Runtime does not support graph node resources.",
					);
				return content(
					uri,
					"application/json",
					safeJsonStringify(
						await options.runtime.listGraphNodes({
							...(parsed.search.workspaceId === undefined
								? {}
								: { workspaceId: parsed.search.workspaceId }),
							...(parsed.search.cursor === undefined
								? {}
								: { cursor: parsed.search.cursor }),
							...(parsed.search.limit === undefined
								? {}
								: { limit: parsed.search.limit }),
						}),
					),
				);
			}
			case "graph/edges": {
				if (!options.runtime.listGraphEdges)
					throw new McpNotFoundError(
						"Runtime does not support graph edge resources.",
					);
				return content(
					uri,
					"application/json",
					safeJsonStringify(
						await options.runtime.listGraphEdges({
							...(parsed.search.workspaceId === undefined
								? {}
								: { workspaceId: parsed.search.workspaceId }),
							...(parsed.search.cursor === undefined
								? {}
								: { cursor: parsed.search.cursor }),
							...(parsed.search.limit === undefined
								? {}
								: { limit: parsed.search.limit }),
						}),
					),
				);
			}
			default:
				if (parsed.pathname.startsWith("agent-sessions/")) {
					return readAgentSessionResource(options, uri, parsed.pathname);
				}
				throw new McpNotFoundError(`Unknown MemoFS resource: ${uri}.`);
		}
	} catch (error) {
		return content(
			uri,
			"application/json",
			safeJsonStringify({ error: toSafeError(error) }),
		);
	}
}

async function readAgentSessionResource(
	options: MemoFSMcpOptions,
	uri: string,
	pathname: string,
): Promise<{
	contents: Array<{ uri: string; mimeType: string; text: string }>;
}> {
	if (!options.runtime.readAgentSessionFile) {
		throw new McpNotFoundError(
			"Runtime does not support agent session resources.",
		);
	}
	const parts = pathname.split("/");
	const sessionId = parts[1];
	if (!sessionId) {
		throw new McpNotFoundError("Agent session resource requires a session ID.");
	}
	const filePath = `/${parts.join("/")}`;
	const result = await options.runtime.readAgentSessionFile({
		sessionId,
		path: filePath,
	});
	return content(uri, "text/markdown", result.content);
}

function content(
	uri: string,
	mimeType: string,
	text: string,
): { contents: Array<{ uri: string; mimeType: string; text: string }> } {
	return { contents: [{ uri, mimeType, text }] };
}

function parseMemoFSUri(uri: string): {
	pathname: string;
	search: {
		workspaceId?: string;
		projectId?: string;
		query?: string;
		cursor?: string;
		limit?: number;
		maxBytes?: number;
	};
} {
	let url: URL;
	try {
		url = new URL(uri);
	} catch {
		throw new McpValidationError("uri must be a valid URI.");
	}
	if (url.protocol !== "memofs:")
		throw new McpValidationError("Only memofs:// resources are supported.");
	const host = url.hostname;
	const tail = url.pathname.replace(/^\//, "");
	const pathname = tail ? `${host}/${tail}` : host;
	const workspaceId = url.searchParams.get("workspaceId") ?? undefined;
	const projectId = url.searchParams.get("projectId") ?? undefined;
	const query = url.searchParams.get("query") ?? undefined;
	const cursor = url.searchParams.get("cursor") ?? undefined;
	const rawLimit = url.searchParams.get("limit");
	const rawMaxBytes = url.searchParams.get("maxBytes");
	const limit =
		rawLimit === null ? undefined : normalizeLimit(Number(rawLimit), 25, 100);
	const maxBytes =
		rawMaxBytes === null
			? undefined
			: normalizeLimit(Number(rawMaxBytes), 64_000, 262_144);
	return {
		pathname,
		search: {
			...(workspaceId ? { workspaceId } : {}),
			...(projectId ? { projectId } : {}),
			...(query ? { query } : {}),
			...(cursor ? { cursor } : {}),
			...(limit === undefined ? {} : { limit }),
			...(maxBytes === undefined ? {} : { maxBytes }),
		},
	};
}
