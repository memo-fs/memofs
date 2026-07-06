/**
 * MCP Server runtime factory — thin adapter over the unified MemoFS client.
 *
 * Creates a `new MemoFS(config)` instance and wraps it as a `MemoFSMcpRuntime`
 * for the MCP protocol server to consume.
 *
 * @module factory
 */

import {
	createLazyLocalEmbedder,
	type RuntimeReadPolicy,
	type RuntimeWritePolicy,
	MemoFS,
	type MemoFsConfig,
} from "@memofs/core";
import {
	createNodeFsMemoryStore,
	readMemoFsConfigFileSync,
} from "@memofs/core/node-fs";
import type { MemoFSMcpRuntime, MemoFSRuntimeMode } from "../types";

/**
 * Options for creating an MCP runtime from MemoFS configuration.
 */
export interface RuntimeFactoryOptions {
	mode?: MemoFSRuntimeMode;
	rootDir?: string;
	projectId?: string;
	workspaceId?: string;
	cloudClient?: MemoFsConfig["cloudClient"];
	cloud?: {
		baseUrl?: string;
		apiKey?: string;
		workspaceId?: string;
		projectId?: string;
		timeoutMs?: number;
		userAgent?: string;
		requireApiKey?: boolean;
		retry?: NonNullable<NonNullable<MemoFsConfig["cloud"]>["retry"]>;
	};
	readPolicy?: RuntimeReadPolicy;
	writePolicy?: RuntimeWritePolicy;
	/**
	 * Recall engine configuration. When `recall.localEmbeddings` is true (the
	 * default for the MCP runtime), a local ONNX embedder is lazy-loaded so
	 * hybrid (vector + lexical) recall works with zero API keys. Set
	 * `localEmbeddings: false` to keep the runtime import-light (lexical-only).
	 */
	recall?: MemoFsConfig["recall"];
}

/**
 * Creates a MemoFSMcpRuntime by constructing a MemoFS client and delegating
 * all runtime methods to it.
 *
 * @param options - Factory configuration options.
 * @returns The MemoFSMcpRuntime adapter.
 */
export function createMemoFSMcpRuntimeFromConfig(
	options: RuntimeFactoryOptions = {},
): MemoFSMcpRuntime {
	const localEmbeddings =
		options.recall?.localEmbeddings ??
		(process.env.MEMOFS_LOCAL_EMBEDDINGS !== "0" &&
			process.env.MEMOFS_LOCAL_EMBEDDINGS?.toLowerCase() !== "false");
	const embeddingModel =
		options.recall?.embeddingModel ??
		(typeof process.env.MEMOFS_EMBEDDING_MODEL === "string" &&
		process.env.MEMOFS_EMBEDDING_MODEL.length > 0
			? process.env.MEMOFS_EMBEDDING_MODEL
			: undefined);

	// Local ONNX embedder is lazy: constructing it is synchronous and cheap.
	// The heavy runtime is imported on first recall. Memory mode is volatile and
	// never persists vectors, so skip wiring the local embedder there.
	const useLocalEmbedder = localEmbeddings && options.mode !== "memory";
	const embedder = useLocalEmbedder
		? createLazyLocalEmbedder({
				...(embeddingModel === undefined ? {} : { model: embeddingModel }),
			})
		: undefined;

	if (embedder && typeof embedder.prewarm === "function") {
		embedder.prewarm().catch((err: unknown) => {
			console.error("[mcp] embedder pre-warm failed in background:", err);
		});
	}

	const memo = new MemoFS({
		// The MCP server is Node-only: inject the filesystem-backed store
		// explicitly. The root `@memofs/core` barrel is Worker-safe (no
		// `node:fs` default), so a `local`/`hybrid` runtime requires a `store`.
		// The volatile "memory" mode defaults to an in-memory store inside the
		// constructor.
		...(options.mode === "memory"
			? {}
			: {
					store: createNodeFsMemoryStore({
						rootDir: options.rootDir ?? ".",
						createRoot: true,
						missingFileBehavior: "empty",
					}),
				}),
		// Core no longer reads `.memofs/config.json` (the read moved out of the
		// Worker-loadable barrel). The MCP server is Node-only, so it reads the
		// file here and passes it as `fileConfig`.
		fileConfig: readMemoFsConfigFileSync(options.rootDir ?? "."),
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
		...(embedder !== undefined ? { embedder } : {}),
		...(options.recall !== undefined ? { recall: options.recall } : {}),
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

	return createMemoFSMcpRuntimeFromMemoFS(memo);
}

/**
 * Wraps a MemoFS instance as a MemoFSMcpRuntime adapter.
 *
 * @param memo - The MemoFS client instance.
 * @returns The MemoFSMcpRuntime adapter.
 */
export function createMemoFSMcpRuntimeFromMemoFS(
	memo: MemoFS,
): MemoFSMcpRuntime {
	return {
		async health(signal) {
			return memo.health(signal);
		},

		async context(input, signal) {
			return memo.context(input, signal);
		},

		async recall(input, _signal) {
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
			return memo.sync.pull(input, signal);
		},

		async syncStatus(input, signal) {
			return memo.sync.status(input, signal);
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

		async consolidateMemory(input, signal) {
			return memo.consolidate(input, signal);
		},

		async readiness(signal) {
			if (memo.cloud) return memo.cloud.readiness(signal);
			return { ok: true };
		},
	};
}
