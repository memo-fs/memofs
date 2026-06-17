/**
 * MCP Server runtime factory — thin adapter over the unified Tekmemo client.
 *
 * Creates a `new Tekmemo(config)` instance and wraps it as a `TekMemoMcpRuntime`
 * for the MCP protocol server to consume.
 *
 * @module factory
 */

import {
	type RuntimeReadPolicy,
	type RuntimeWritePolicy,
	Tekmemo,
	type TekmemoConfig,
} from "@tekbreed/tekmemo";
import type { TekMemoMcpRuntime, TekMemoRuntimeMode } from "../types";

/**
 * Options for creating an MCP runtime from Tekmemo configuration.
 */
export interface RuntimeFactoryOptions {
	mode?: TekMemoRuntimeMode;
	rootDir?: string;
	projectId?: string;
	workspaceId?: string;
	cloudClient?: TekmemoConfig["cloudClient"];
	cloud?: {
		baseUrl?: string;
		apiKey?: string;
		workspaceId?: string;
		projectId?: string;
		timeoutMs?: number;
		userAgent?: string;
		requireApiKey?: boolean;
		retry?: NonNullable<NonNullable<TekmemoConfig["cloud"]>["retry"]>;
	};
	readPolicy?: RuntimeReadPolicy;
	writePolicy?: RuntimeWritePolicy;
}

/**
 * Creates a TekMemoMcpRuntime by constructing a Tekmemo client and delegating
 * all runtime methods to it.
 *
 * @param options - Factory configuration options.
 * @returns The TekMemoMcpRuntime adapter.
 */
export function createTekMemoMcpRuntimeFromConfig(
	options: RuntimeFactoryOptions = {},
): TekMemoMcpRuntime {
	const memo = new Tekmemo({
		...(options.rootDir !== undefined ? { rootDir: options.rootDir } : {}),
		...(options.mode !== undefined ? { mode: options.mode } : {}),
		...(options.projectId !== undefined
			? { projectId: options.projectId }
			: {}),
		...(options.workspaceId !== undefined
			? { workspaceId: options.workspaceId }
			: {}),
		...(options.readPolicy !== undefined
			? { readPolicy: options.readPolicy }
			: {}),
		...(options.writePolicy !== undefined
			? { writePolicy: options.writePolicy }
			: {}),
		...(options.cloudClient !== undefined
			? { cloudClient: options.cloudClient }
			: {}),
		...(options.cloud !== undefined
			? {
					cloud: {
						...(options.cloud.baseUrl !== undefined
							? { baseUrl: options.cloud.baseUrl }
							: {}),
						...(options.cloud.apiKey !== undefined
							? { apiKey: options.cloud.apiKey }
							: {}),
						...(options.cloud.workspaceId !== undefined
							? { workspaceId: options.cloud.workspaceId }
							: {}),
						...(options.cloud.projectId !== undefined
							? { projectId: options.cloud.projectId }
							: {}),
						...(options.cloud.timeoutMs !== undefined
							? { timeoutMs: options.cloud.timeoutMs }
							: {}),
						...(options.cloud.userAgent !== undefined
							? { userAgent: options.cloud.userAgent }
							: {}),
						...(options.cloud.requireApiKey !== undefined
							? { requireApiKey: options.cloud.requireApiKey }
							: {}),
						...(options.cloud.retry !== undefined
							? { retry: options.cloud.retry }
							: {}),
					},
				}
			: {}),
	});

	return createTekMemoMcpRuntimeFromTekmemo(memo);
}

/**
 * Wraps a Tekmemo instance as a TekMemoMcpRuntime adapter.
 *
 * @param memo - The Tekmemo client instance.
 * @returns The TekMemoMcpRuntime adapter.
 */
export function createTekMemoMcpRuntimeFromTekmemo(
	memo: Tekmemo,
): TekMemoMcpRuntime {
	return {
		async health(signal) {
			return memo.health(signal);
		},

		async context(input, signal) {
			return memo.context(input, signal);
		},

		async recall(input, signal) {
			return memo.recall(input.query, {
				...(input.limit === undefined ? {} : { limit: input.limit }),
				...(input.workspaceId === undefined
					? {}
					: { workspaceId: input.workspaceId }),
				...(input.projectId === undefined
					? {}
					: { projectId: input.projectId }),
			});
		},

		async writeMemory(input, signal) {
			return memo.writeMemory(input, signal);
		},

		async readCoreMemory(_input, signal) {
			return { content: await memo.core.read(signal) };
		},

		async readNotesMemory(_input, signal) {
			return { content: await memo.notes.read(signal) };
		},

		async updateCoreMemory(input, signal) {
			await memo.core.update(input.content, signal);
			return { content: await memo.core.read(signal) };
		},

		async listRecentMemories(input, signal) {
			return memo.listRecentMemories(input, signal);
		},

		async validate(input, signal) {
			return memo.validate(input, signal);
		},

		async createSnapshot(input, signal) {
			return memo.snapshots.create(input, signal);
		},

		async startAgentSession(input, signal) {
			return memo.agentfs.startSession(input, signal);
		},

		async readAgentSessionFile(input, signal) {
			return memo.agentfs.readFile(input, signal);
		},

		async writeAgentSessionFile(input, signal) {
			return memo.agentfs.writeFile(input, signal);
		},

		async appendAgentSessionFile(input, signal) {
			return memo.agentfs.appendFile(input, signal);
		},

		async extractAgentSession(input, signal) {
			return memo.agentfs.extract(input, signal);
		},

		async completeAgentSession(input, signal) {
			return memo.agentfs.complete(input, signal);
		},

		async syncPush(input, signal) {
			return memo.sync.push(input, signal);
		},

		async syncPull(input, signal) {
			return memo.sync.pull(input, signal) as Promise<unknown> as Promise<
				import("../types").SyncPullResult
			>;
		},

		async syncStatus(input, signal) {
			return memo.sync.status(input, signal) as Promise<unknown> as Promise<
				import("../types").SyncStatusResult
			>;
		},

		async resolveSyncConflict(input, signal) {
			if (memo.cloud?.conflicts) {
				const resolutionMap: Record<string, string> = {
					keep_cloud: "keep_existing",
					use_client: "use_incoming",
					ignore: "dismiss",
				};
				return memo.cloud.conflicts.resolve(
					{
						conflictId: input.conflictId,
						resolution: (resolutionMap[input.resolution] ?? input.resolution) as
							| "keep_existing"
							| "use_incoming"
							| "merge"
							| "dismiss",
						...(input.projectId === undefined
							? {}
							: { projectId: input.projectId }),
						...(input.content === undefined
							? {}
							: { mergedContent: JSON.stringify(input.content) }),
					},
					signal,
				);
			}
			throw new Error("Conflict resolution is not available in this mode.");
		},

		async upsertGraphNodes(input, signal) {
			return memo.graph.upsertNodes(input, signal);
		},

		async upsertGraphEdges(input, signal) {
			return memo.graph.upsertEdges(input, signal);
		},

		async graphNeighbors(input, signal) {
			return memo.graph.neighbors(input, signal);
		},

		async graphPath(input, signal) {
			return memo.graph.path(input, signal);
		},

		async listGraphNodes(input, signal) {
			return memo.graph.listNodes(input, signal);
		},

		async listGraphEdges(input, signal) {
			return memo.graph.listEdges(input, signal);
		},

		async readiness(signal) {
			if (memo.cloud) return memo.cloud.readiness(signal);
			return { ok: true };
		},

		async contextCompose(input, signal) {
			if (memo.cloud) return memo.cloud.context.compose(input as never, signal);
			throw new Error("Context compose is not available in this mode.");
		},

		async graphListNodes(input, signal) {
			return memo.graph.listNodes(input, signal);
		},

		async graphListEdges(input, signal) {
			return memo.graph.listEdges(input, signal);
		},

		async graphCreateNode(input, signal) {
			if (memo.cloud)
				return memo.cloud.graph.createNode(input as never, signal);
			throw new Error("Graph node creation is not available in this mode.");
		},

		async graphCreateEdge(input, signal) {
			if (memo.cloud)
				return memo.cloud.graph.createEdge(input as never, signal);
			throw new Error("Graph edge creation is not available in this mode.");
		},

		async extractionRun(input, signal) {
			if (memo.cloud) return memo.cloud.extraction.run(input as never, signal);
			throw new Error("Extraction is not available in this mode.");
		},

		async extractionJobs(input, signal) {
			if (memo.cloud) return memo.cloud.extraction.jobs(input as never, signal);
			throw new Error("Extraction jobs are not available in this mode.");
		},

		async evalsRun(input, signal) {
			if (memo.cloud) return memo.cloud.evals.run(input as never, signal);
			throw new Error("Evals are not available in this mode.");
		},

		async benchmarksRun(input, signal) {
			if (memo.cloud) return memo.cloud.benchmarks.run(input as never, signal);
			throw new Error("Benchmarks are not available in this mode.");
		},

		async exportsCreate(input, signal) {
			if (memo.cloud) return memo.cloud.exports.create(input as never, signal);
			throw new Error("Exports are not available in this mode.");
		},

		async exportsDownload(input, signal) {
			if (memo.cloud)
				return memo.cloud.exports.downloadUrl(input as never, signal);
			throw new Error("Exports download is not available in this mode.");
		},

		async snapshotsCreate(input, signal) {
			if (memo.cloud)
				return memo.cloud.snapshots.create(input as never, signal);
			throw new Error("Cloud snapshots are not available in this mode.");
		},

		async snapshotsDownload(input, signal) {
			if (memo.cloud)
				return memo.cloud.snapshots.downloadUrl(input as never, signal);
			throw new Error("Cloud snapshot download is not available in this mode.");
		},

		async providersList(input, signal) {
			if (memo.cloud) return memo.cloud.providers.list(input as never, signal);
			throw new Error("Providers are not available in this mode.");
		},

		async providersCreate(input, signal) {
			if (memo.cloud)
				return memo.cloud.providers.create(input as never, signal);
			throw new Error("Provider creation is not available in this mode.");
		},

		async providersTest(input, signal) {
			if (memo.cloud) return memo.cloud.providers.test(input as never, signal);
			throw new Error("Provider testing is not available in this mode.");
		},
	};
}
