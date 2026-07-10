/**
 * Local (filesystem-backed) runtime strategy for MemoFS.
 *
 * Uses a MemoryStore (NodeFsMemoryStore by default) plus core document/event
 * functions to implement the full MemoFS API surface.
 *
 * @internal
 */

import { bootstrapMemoryStore } from "../core/bootstrap/bootstrap-memory-store";
import { readCoreMemory } from "../core/documents/core-memory";
import { readNotesMemory } from "../core/documents/notes-memory";
import type { JsonObject } from "../core/types/json";
import {
	createRuleBasedExtractor,
	type Extractor,
} from "../graph/extraction/extractor";
import { createFsGraphStore } from "../graph/stores/fs-graph-store";
import type { BM25Store } from "../recall/lexical/bm25";
import { createBM25Store } from "../recall/lexical/bm25";
import { DeterministicFallbackReranker } from "../rerank/fallback/deterministic-fallback-reranker";
import { buildContext } from "./helpers";
import { createLocalAgentfsClient } from "./local-strategy/client";
import {
	consolidateMemory,
	graphNeighbors,
	graphPath,
	listGraphEdges,
	listGraphNodes,
	upsertGraphEdges,
	upsertGraphNodes,
} from "./local-strategy/graph";
import {
	stableEdgeKey,
	toGraphEdgeInput,
	toGraphNodeInput,
} from "./local-strategy/helpers";
import { localRecall } from "./local-strategy/recall";
import { listRecentMemories as listRecentMemoriesFn } from "./local-strategy/recent";
import {
	appendAgentSessionFile,
	completeAgentSession,
	extractAgentSession,
	readAgentSessionFile,
	startAgentSession,
	writeAgentSessionFile,
} from "./local-strategy/session";
import { createSnapshot as createSnapshotFn } from "./local-strategy/snapshot";
import type {
	LocalGraphStore,
	LocalStrategyContext,
	LocalStrategyOptions,
} from "./local-strategy/types";
import { validateStore } from "./local-strategy/validate";
import { updateCoreMemory, writeMemory } from "./local-strategy/write";
import { ContextCache } from "./progressive";
import type { ResolveGraphEdge, ResolveGraphNode } from "./strategist";
import type {
	AgentSessionCompleteInput,
	AgentSessionExtractResult,
	AgentSessionFileInput,
	AgentSessionResult,
	AgentSessionStartInput,
	ConsolidateMemoryInput,
	ConsolidateMemoryResult,
	GraphEdgeInput,
	GraphNeighborsInput,
	GraphNodeInput,
	GraphPathInput,
	GraphPathResult,
	ListGraphInput,
	MemoFSHealthResult,
	MemoryContextInput,
	MemoryContextResult,
	MemoryDocumentResult,
	RecallInput,
	RecallResult,
	SnapshotMemoryInput,
	WriteMemoryInput,
	WriteMemoryResult,
} from "./types";

export type { LocalGraphStore, LocalStrategyOptions };

export function createLocalStrategy(options: LocalStrategyOptions) {
	const { store, projectId } = options;

	const extractor: Extractor = options.extractor ?? createRuleBasedExtractor();
	const graphStore: LocalGraphStore =
		options.graphStore ?? createFsGraphStore({ store });
	const lexicalStore: BM25Store = createBM25Store();
	const lexicalTextById = new Map<string, string>();

	function indexLexical(doc: { id: string; text: string }): void {
		lexicalTextById.set(doc.id, doc.text);
		lexicalStore.upsert([doc]);
	}

	function pruneLexical(ids: string[]): void {
		if (ids.length === 0) return;
		lexicalStore.delete(ids);
		for (const id of ids) lexicalTextById.delete(id);
	}

	function isRetiredGraphDoc(lexicalId: string): boolean {
		if (!lexicalId.startsWith("graph:")) return false;
		const node = graphNodes.get(lexicalId.slice("graph:".length));
		return node?.status === "deprecated";
	}

	function collectRetiredGraphDocIds(): Set<string> {
		const out = new Set<string>();
		for (const [id, node] of graphNodes) {
			if (node.status === "deprecated") out.add(`graph:${id}`);
		}
		return out;
	}

	const graphNodes = new Map<string, GraphNodeInput>();
	// biome-ignore lint/suspicious/noExplicitAny: graphEdges stored as any for compatibility with LocalStrategyContext which expects GraphEdgeInput but receives ResolveGraphEdge
	const graphEdges = new Map<string, any>();
	const contextCache = new ContextCache();
	let bootstrapped = false;

	async function setBootstrapped(val: boolean) {
		bootstrapped = val;
	}

	async function ensureReady(): Promise<void> {
		if (bootstrapped) return;
		if (options.autoBootstrap) {
			await bootstrapMemoryStore(store, { projectId });
			try {
				await graphStore.hydrate?.();
				const nodes = await graphStore.queryNodes();
				const edges = await graphStore.queryEdges();
				for (const node of nodes) {
					graphNodes.set(node.id, toGraphNodeInput(node));
				}
				for (const edge of edges) {
					const id = stableEdgeKey(edge.from, edge.type, edge.to);
					graphEdges.set(id, toGraphEdgeInput(edge));
				}
				for (const node of nodes) {
					indexLexical({
						id: `graph:${node.id}`,
						text: `${node.label}${node.summary ? ` ${node.summary}` : ""}`,
					});
				}
			} catch {
				// Best-effort.
			}
		}
		bootstrapped = true;
	}

	const createSnapshotImpl = (
		input?: SnapshotMemoryInput,
		signal?: AbortSignal,
	) => createSnapshotFn(store, ensureReady, input, signal);

	const listRecentMemories = (limit?: number, signal?: AbortSignal) =>
		listRecentMemoriesFn(store, ensureReady, limit, signal);

	const agentfsClient = (
		options.createAgentfsClient ?? createLocalAgentfsClient
	)({
		store: options.store,
		projectId: options.projectId,
		syncLayer: options.syncLayer,
		createSnapshot: (input) => createSnapshotImpl(input),
	});

	const ctx: LocalStrategyContext = {
		options,
		bootstrapped,
		setBootstrapped,
		graphNodes,
		graphEdges,
		lexicalStore,
		lexicalTextById,
		contextCache,
		agentfsClient,
		extractor,
		graphStore,
		reranker: options.reranker ?? new DeterministicFallbackReranker(),
		ensureReady,
		indexLexical,
		pruneLexical,
		isRetiredGraphDoc,
		collectRetiredGraphDocIds,
		createSnapshotImpl,
		listRecentMemories,
	};

	return {
		async health(signal?: AbortSignal): Promise<MemoFSHealthResult> {
			if (signal?.aborted) throw new Error("Operation aborted.");
			return {
				ok: true,
				name: options.name,
				version: options.version,
				mode: "local",
				capabilities: [
					"context",
					"recall",
					"remember",
					"readCoreMemory",
					"readNotesMemory",
					"listRecentMemories",
					"validate",
					"snapshot",
					"agentSessions",
					"graphNodes",
					"graphEdges",
				],
			};
		},

		async context(
			input: MemoryContextInput,
			signal?: AbortSignal,
		): Promise<MemoryContextResult> {
			await ensureReady();
			return buildContext(
				{
					readCoreMemory: async () => ({
						content: await readCoreMemory(store),
					}),
					readNotesMemory: async () => ({
						content: await readNotesMemory(store),
					}),
					listRecentMemories: (i) => {
						return listRecentMemories(i.limit, signal);
					},
					recall: (i, s) => localRecall(ctx, i, s),
					listGraphNodes: async () =>
						[...graphNodes.values()] as ResolveGraphNode[],
					listGraphEdges: async () =>
						[...graphEdges.values()] as ResolveGraphEdge[],
					retiredGraphDocIds: collectRetiredGraphDocIds(),
					cache: contextCache,
				},
				input,
				signal,
			);
		},

		async recall(
			input: RecallInput,
			signal?: AbortSignal,
		): Promise<RecallResult> {
			return localRecall(ctx, input, signal);
		},

		async writeMemory(
			input: WriteMemoryInput,
			signal?: AbortSignal,
		): Promise<WriteMemoryResult> {
			return writeMemory(ctx, input, signal);
		},

		async readCoreMemory(signal?: AbortSignal): Promise<MemoryDocumentResult> {
			if (signal?.aborted) throw new Error("Operation aborted.");
			await ensureReady();
			return { content: await readCoreMemory(store) };
		},

		async readNotesMemory(signal?: AbortSignal): Promise<MemoryDocumentResult> {
			if (signal?.aborted) throw new Error("Operation aborted.");
			await ensureReady();
			return { content: await readNotesMemory(store) };
		},

		async updateCoreMemory(
			content: string,
			signal?: AbortSignal,
		): Promise<MemoryDocumentResult> {
			return updateCoreMemory(ctx, content, signal);
		},

		async listRecentMemories(
			input?: { limit?: number },
			signal?: AbortSignal,
		): Promise<{
			items: Array<{
				id: string;
				type: string;
				timestamp: string;
				summary: string;
				metadata?: JsonObject;
			}>;
			warnings?: string[];
		}> {
			if (signal?.aborted) throw new Error("Operation aborted.");
			return listRecentMemories(input?.limit, signal);
		},

		async validate(
			input?: { strict?: boolean },
			signal?: AbortSignal,
		): Promise<{ ok: boolean; warnings: string[]; errors: string[] }> {
			return validateStore(store, ensureReady, signal, input);
		},

		async createSnapshot(
			input?: SnapshotMemoryInput,
			signal?: AbortSignal,
		): Promise<{ id: string; path: string; created: boolean }> {
			return createSnapshotImpl(input, signal);
		},

		async startAgentSession(
			input: AgentSessionStartInput,
			signal?: AbortSignal,
		): Promise<AgentSessionResult> {
			return startAgentSession(ctx, input, signal);
		},

		async readAgentSessionFile(
			input: AgentSessionFileInput,
			signal?: AbortSignal,
		): Promise<{ content: string }> {
			return readAgentSessionFile(ctx, input, signal);
		},

		async writeAgentSessionFile(
			input: AgentSessionFileInput,
			signal?: AbortSignal,
		): Promise<{ written: true; path: string }> {
			return writeAgentSessionFile(ctx, input, signal);
		},

		async appendAgentSessionFile(
			input: AgentSessionFileInput,
			signal?: AbortSignal,
		): Promise<{ appended: true; path: string }> {
			return appendAgentSessionFile(ctx, input, signal);
		},

		async extractAgentSession(
			input: { sessionId: string; workspaceId?: string; projectId?: string },
			signal?: AbortSignal,
		): Promise<AgentSessionExtractResult> {
			return extractAgentSession(ctx, input, signal);
		},

		async completeAgentSession(
			input: AgentSessionCompleteInput,
			signal?: AbortSignal,
		): Promise<AgentSessionExtractResult & { durableMemoryWritten: boolean }> {
			return completeAgentSession(ctx, input, signal);
		},

		async upsertGraphNodes(
			input: { nodes: GraphNodeInput[] },
			signal?: AbortSignal,
		): Promise<{ nodes: GraphNodeInput[] }> {
			return upsertGraphNodes(ctx, input, signal);
		},

		async upsertGraphEdges(
			input: { edges: GraphEdgeInput[] },
			signal?: AbortSignal,
		): Promise<{ edges: GraphEdgeInput[] }> {
			return upsertGraphEdges(ctx, input, signal);
		},

		async graphNeighbors(
			input: GraphNeighborsInput,
			signal?: AbortSignal,
		): Promise<{
			items: Array<{
				node: GraphNodeInput;
				edge: GraphEdgeInput;
				direction: "in" | "out";
			}>;
			nextCursor?: string;
		}> {
			return graphNeighbors(ctx, input, signal);
		},

		async graphPath(
			input: GraphPathInput,
			signal?: AbortSignal,
		): Promise<GraphPathResult> {
			return graphPath(ctx, input, signal);
		},

		async listGraphNodes(
			input: ListGraphInput,
			signal?: AbortSignal,
		): Promise<{ items: GraphNodeInput[]; nextCursor?: string }> {
			return listGraphNodes(ctx, input, signal);
		},

		async listGraphEdges(
			input: ListGraphInput,
			signal?: AbortSignal,
		): Promise<{ items: GraphEdgeInput[]; nextCursor?: string }> {
			return listGraphEdges(ctx, input, signal);
		},

		async consolidateMemory(
			input: ConsolidateMemoryInput,
			signal?: AbortSignal,
		): Promise<ConsolidateMemoryResult> {
			return consolidateMemory(ctx, input, signal);
		},

		async syncPush(_input: unknown, signal?: AbortSignal): Promise<never> {
			if (signal?.aborted) throw new Error("Operation aborted.");
			throw new Error("sync.push is not available in local mode.");
		},

		async syncComplete(_input: unknown, signal?: AbortSignal): Promise<never> {
			if (signal?.aborted) throw new Error("Operation aborted.");
			throw new Error("sync.complete is not available in local mode.");
		},

		async syncPull(_input: unknown, signal?: AbortSignal): Promise<never> {
			if (signal?.aborted) throw new Error("Operation aborted.");
			throw new Error("sync.pull is not available in local mode.");
		},

		async syncStatus(_input?: unknown, signal?: AbortSignal): Promise<never> {
			if (signal?.aborted) throw new Error("Operation aborted.");
			throw new Error("sync.status is not available in local mode.");
		},

		store,
	};
}
