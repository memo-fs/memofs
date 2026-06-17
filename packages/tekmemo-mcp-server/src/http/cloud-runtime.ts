/**
 * Worker-safe cloud runtime factory for the HTTP MCP adapter.
 *
 * This module only depends on the fetch-based TekMemo Cloud client. It avoids
 * the local filesystem runtime used by stdio/CLI entrypoints.
 *
 * @module cloud-runtime
 */

import {
	createTekMemoCloudClient,
	type TekMemoCloudClient,
	type TekMemoCloudClientOptions,
} from "@tekbreed/tekmemo/cloud-client";
import type {
	GraphEdgeInput,
	GraphNodeInput,
	JsonObject,
	MemoryContextResult,
	RecallItem,
	TekMemoHealthResult,
	TekMemoMcpRuntime,
} from "../types";

/**
 * Configuration for the Worker-safe TekMemo Cloud MCP runtime.
 */
export interface TekMemoCloudMcpRuntimeOptions
	extends Omit<TekMemoCloudClientOptions, "defaultProjectId"> {
	client?: TekMemoCloudClient;
	projectId?: string;
	workspaceId?: string;
	name?: string;
	version?: string;
}

/**
 * Creates a TekMemo MCP runtime backed only by TekMemo Cloud APIs.
 *
 * @param options - Cloud client, default project scope, and metadata options.
 * @returns MCP runtime implementation suitable for Web/Worker deployments.
 */
export function createTekMemoCloudMcpRuntime(
	options: TekMemoCloudMcpRuntimeOptions,
): TekMemoMcpRuntime {
	const projectId = options.projectId ?? "default";
	const client =
		options.client ??
		createTekMemoCloudClient({
			...options,
			defaultProjectId: projectId,
			...(options.workspaceId === undefined
				? {}
				: { defaultWorkspaceId: options.workspaceId }),
		});

	const withProject = <T extends Record<string, unknown>>(
		input: T = {} as T,
	) => ({
		...input,
		projectId: (input.projectId as string | undefined) ?? projectId,
	});

	return {
		async health(signal) {
			return toHealthResult(
				await client.health(signal),
				options.name ?? "tekmemo-cloud-mcp",
				options.version ?? "0.1.0",
			);
		},

		async readiness(signal) {
			return client.readiness(signal);
		},

		async context(input, signal) {
			return client.context.compose(
				withProject(input as never),
				signal,
			) as unknown as Promise<MemoryContextResult>;
		},

		async recall(input, signal) {
			const result = await client.recall.query(
				{
					projectId: input.projectId ?? projectId,
					query: input.query,
					...(input.limit === undefined ? {} : { topK: input.limit }),
					...(input.filters === undefined
						? {}
						: { filters: input.filters as JsonObject }),
				},
				signal,
			);
			return {
				items: result.items.map(toRecallItem),
				...(result.warnings?.length ? { warnings: result.warnings } : {}),
			};
		},

		async writeMemory(input, signal) {
			const note = await client.memory.createNote(
				{
					projectId: input.projectId ?? projectId,
					content: input.content,
					kind: input.kind ?? "note",
					...(input.title === undefined ? {} : { title: input.title }),
					...(input.tags === undefined ? {} : { tags: input.tags }),
					...(input.confidence === undefined
						? {}
						: { confidence: input.confidence }),
					...(input.source === undefined
						? { source: "tekmemo-mcp" }
						: { source: input.source }),
					metadata: {
						...(input.workspaceId === undefined
							? {}
							: { workspaceId: input.workspaceId }),
						...(input.metadata ?? {}),
					},
				},
				signal,
			);
			return { id: note.id, created: true, memory: note as never };
		},

		async readCoreMemory(input, signal) {
			return client.memory.readCore(withProject(input as never), signal);
		},

		async readNotesMemory(input, signal) {
			const page = await client.memory.listNotes(
				{ projectId: input?.projectId ?? projectId, limit: 100 },
				signal,
			);
			return {
				content: page.items
					.map(
						(note) => `- ${note.title ? `${note.title}: ` : ""}${note.content}`,
					)
					.join("\n"),
			};
		},

		async updateCoreMemory(input, signal) {
			return client.memory.updateCore(withProject(input as never), signal);
		},

		async listRecentMemories(input, signal) {
			const page = await client.memory.listNotes(
				withProject(input as never),
				signal,
			);
			return {
				items: page.items.map((note) => ({
					id: note.id,
					type: `note.${note.kind}`,
					...(note.createdAt === undefined
						? {}
						: { timestamp: note.createdAt }),
					summary: note.title ?? note.content.slice(0, 160),
				})),
				...(page.nextCursor === undefined
					? {}
					: { warnings: ["More cloud notes are available."] }),
			};
		},

		async validate(_input, signal) {
			const health = await client.health(signal);
			return {
				ok: health.ok,
				warnings: health.warnings ?? [],
				errors: health.ok ? [] : ["TekMemo Cloud health check failed."],
			};
		},

		async createSnapshot(input, signal) {
			return client.snapshots.create(
				withProject(input as never),
				signal,
			) as never;
		},

		async startAgentSession(input, signal) {
			return client.agentSessions.create(
				{
					projectId: input.projectId ?? projectId,
					sessionId: input.sessionId ?? `session_${Date.now()}`,
					task: input.task,
					actorId: input.actorId,
					workspaceProvider: "hosted",
				},
				signal,
			) as never;
		},

		async readAgentSessionFile() {
			throw new Error(
				"Agent session file reads are not available in cloud MCP.",
			);
		},

		async writeAgentSessionFile() {
			throw new Error(
				"Agent session file writes are not available in cloud MCP.",
			);
		},

		async appendAgentSessionFile() {
			throw new Error(
				"Agent session file appends are not available in cloud MCP.",
			);
		},

		async extractAgentSession(input, signal) {
			return client.agentSessions.extract(
				withProject(input as never),
				signal,
			) as never;
		},

		async completeAgentSession(input, signal) {
			const record = await client.agentSessions.complete(
				withProject(input as never),
				signal,
			);
			return { ...record, durableMemoryWritten: false } as never;
		},

		async syncPush(input, signal) {
			return client.sync.push(withProject(input as never), signal);
		},

		async syncPull(input, signal) {
			return client.sync.pull(withProject(input as never), signal);
		},

		async syncStatus(input, signal) {
			return client.sync.status(withProject(input as never), signal);
		},

		async resolveSyncConflict(input, signal) {
			const resolutionMap: Record<string, string> = {
				keep_cloud: "keep_existing",
				use_client: "use_incoming",
				ignore: "dismiss",
			};
			return client.conflicts.resolve(
				{
					conflictId: input.conflictId,
					resolution: resolutionMap[input.resolution] ?? input.resolution,
					projectId: input.projectId ?? projectId,
					...(input.content === undefined
						? {}
						: { mergedContent: JSON.stringify(input.content) }),
				} as never,
				signal,
			);
		},

		async upsertGraphNodes(input, signal) {
			const nodes = await Promise.all(
				input.nodes.map((node) =>
					client.graph.createNode(withProject(node as never), signal),
				),
			);
			return { nodes: nodes as unknown as GraphNodeInput[] };
		},

		async upsertGraphEdges(input, signal) {
			const edges = await Promise.all(
				input.edges.map((edge) =>
					client.graph.createEdge(withProject(edge as never), signal),
				),
			);
			return { edges: edges as unknown as GraphEdgeInput[] };
		},

		async graphNeighbors(input, signal) {
			const result = await client.graph.neighbors(
				withProject(input as never),
				signal,
			);
			const nodesById = new Map(
				result.nodes.map((node) => [node.nodeId, node]),
			);
			return {
				items: result.edges.map((edge) => ({
					node: (nodesById.get(edge.toNodeId) ??
						nodesById.get(edge.fromNodeId)) as never,
					edge: edge as never,
					direction: "out" as const,
				})),
			};
		},

		async graphPath(input, signal) {
			return client.graph.path(withProject(input as never), signal) as never;
		},

		async listGraphNodes(input, signal) {
			return client.graph.listNodes(
				withProject(input as never),
				signal,
			) as never;
		},

		async listGraphEdges(input, signal) {
			return client.graph.listEdges(
				withProject(input as never),
				signal,
			) as never;
		},

		async contextCompose(input, signal) {
			return client.context.compose(withProject(input as never), signal);
		},

		async graphListNodes(input, signal) {
			return client.graph.listNodes(withProject(input as never), signal);
		},

		async graphCreateNode(input, signal) {
			return client.graph.createNode(withProject(input as never), signal);
		},

		async graphListEdges(input, signal) {
			return client.graph.listEdges(withProject(input as never), signal);
		},

		async graphCreateEdge(input, signal) {
			return client.graph.createEdge(withProject(input as never), signal);
		},

		async extractionRun(input, signal) {
			return client.extraction.run(withProject(input as never), signal);
		},

		async extractionJobs(input, signal) {
			return client.extraction.jobs(withProject(input as never), signal);
		},

		async evalsRun(input, signal) {
			return client.evals.run(withProject(input as never), signal);
		},

		async benchmarksRun(input, signal) {
			return client.benchmarks.run(withProject(input as never), signal);
		},

		async exportsCreate(input, signal) {
			return client.exports.create(withProject(input as never), signal);
		},

		async exportsDownload(input, signal) {
			return client.exports.downloadUrl(withProject(input as never), signal);
		},

		async snapshotsCreate(input, signal) {
			return client.snapshots.create(withProject(input as never), signal);
		},

		async snapshotsDownload(input, signal) {
			return client.snapshots.downloadUrl(withProject(input as never), signal);
		},

		async providersList(input, signal) {
			return client.providers.list(withProject(input as never), signal);
		},

		async providersCreate(input, signal) {
			return client.providers.create(withProject(input as never), signal);
		},

		async providersTest(input, signal) {
			return client.providers.test(withProject(input as never), signal);
		},
	};
}

/**
 * Converts a Cloud health response into the runtime health shape.
 *
 * @param health - Cloud health payload.
 * @param name - Runtime fallback name.
 * @param version - Runtime fallback version.
 * @returns TekMemo runtime health result.
 */
function toHealthResult(
	health: Awaited<ReturnType<TekMemoCloudClient["health"]>>,
	name: string,
	version: string,
): TekMemoHealthResult {
	return {
		ok: health.ok,
		name: health.name ?? name,
		version: health.version ?? version,
		mode: "cloud",
		capabilities: [
			"context",
			"recall",
			"remember",
			"readCoreMemory",
			"readNotesMemory",
			"sync",
			"graph",
			"cloud",
		],
		...(health.warnings?.length ? { warnings: health.warnings } : {}),
	};
}

/**
 * Converts a Cloud recall item into the MCP runtime recall item shape.
 *
 * @param item - Cloud recall result item.
 * @returns Runtime recall item.
 */
function toRecallItem(
	item: Awaited<
		ReturnType<TekMemoCloudClient["recall"]["query"]>
	>["items"][number],
): RecallItem {
	return {
		id: item.id,
		text: item.text,
		...(item.score === undefined ? {} : { score: item.score }),
		...(item.metadata === undefined
			? {}
			: { metadata: item.metadata as JsonObject }),
		...(item.sourceType || item.sourceId || item.sourcePath
			? {
					sourceRefs: [
						{
							sourceType: item.sourceType ?? "cloud-recall",
							...(item.sourceId === undefined
								? {}
								: { sourceId: item.sourceId }),
							...(item.sourcePath === undefined
								? {}
								: { path: item.sourcePath }),
						},
					],
				}
			: {}),
	};
}
