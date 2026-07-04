/**
 * Local (filesystem-backed) runtime strategy for Tekmemo.
 *
 * Uses a MemoryStore (NodeFsMemoryStore by default) plus core document/event
 * functions to implement the full Tekmemo API surface.
 *
 * @internal
 */

import { chunkText } from "../core/chunking/chunk-text";
import {
	type AgentfsLikeClient,
	appendMemoryEvent,
	appendSnapshotRecord,
	appendTimestampedNote,
	bootstrapMemoryStore,
	CORE_MEMORY_PATH,
	createBM25Store,
	createFsGraphStore,
	createMemoryEvent,
	createRuleBasedExtractor,
	createSnapshotPath,
	createSnapshotRecord,
	DeterministicFallbackReranker,
	type Extractor,
	type GraphEdge,
	type GraphNode,
	type InMemoryGraphStore,
	type LlmClient,
	NOTES_MEMORY_PATH,
	type Reranker,
	readCoreMemory,
	readManifest,
	readMemoryEventsWithIssues,
	readNotesMemory,
	readSnapshotRecordsWithIssues,
	writeCoreMemory,
} from "../index";
import type { BM25Store } from "../recall/lexical/bm25";
import type { RecallStore } from "../recall/types";
import { buildContext } from "./helpers";
import { ContextCache } from "./progressive";
import type { ResolveGraphEdge, ResolveGraphNode } from "./strategist";
import type { FileSyncLayer } from "./sync/file-replication";
import { createLocalAgentfsClient } from "./local-strategy/client";
import {
	hash,
	toGraphNodeInput,
	toGraphEdgeInput,
	snapshotId,
	message,
	stableEdgeKey,
} from "./local-strategy/helpers";
import {
	type LocalGraphStore,
	type LocalStrategyOptions,
	type LocalStrategyContext,
} from "./local-strategy/types";
import {
	startAgentSession,
	readAgentSessionFile,
	writeAgentSessionFile,
	appendAgentSessionFile,
	extractAgentSession,
	completeAgentSession,
} from "./local-strategy/session";
import {
	upsertGraphNodes,
	upsertGraphEdges,
	graphNeighbors,
	graphPath,
	listGraphNodes,
	listGraphEdges,
	consolidateMemory,
} from "./local-strategy/graph";
import { writeMemory, updateCoreMemory } from "./local-strategy/write";
import { localRecall } from "./local-strategy/recall";

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

	const graphNodes = new Map<string, any>();
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

	async function createSnapshotImpl(
		input?: any,
		signal?: AbortSignal,
	): Promise<any> {
		if (signal?.aborted) throw new Error("Operation aborted.");
		await ensureReady();
		const id = snapshotId(input?.label);
		const snapshotPath = createSnapshotPath(id);
		const now = new Date().toISOString();
		const files = {
			core: await readCoreMemory(store),
			notes: await readNotesMemory(store),
			events: (
				await readMemoryEventsWithIssues(store, { malformedLineMode: "skip" })
			).entries,
		};
		await store.write(
			snapshotPath,
			`${JSON.stringify({ version: 1, id, createdAt: now, files }, null, 2)}\n`,
		);
		await appendSnapshotRecord(
			store,
			createSnapshotRecord({
				id,
				type: input?.type ?? "manual",
				createdAt: now,
				metadata: {
					label: input?.label ?? null,
					createdBy: "tekmemo",
					...(input?.metadata ?? {}),
				},
			}),
		);
		return { id, path: snapshotPath, created: true };
	}

	async function listRecentMemories(
		limit?: number,
		signal?: AbortSignal,
	): Promise<any> {
		if (signal?.aborted) throw new Error("Operation aborted.");
		await ensureReady();
		const result = await readMemoryEventsWithIssues(store, {
			malformedLineMode: "skip",
		});
		const max = limit ?? 20;
		const items = result.entries
			.slice(-max)
			.reverse()
			.map((entry) => ({
				id: entry.id,
				type: entry.type,
				timestamp: entry.timestamp,
				summary: entry.summary,
				metadata: entry.metadata as any,
			}));
		return {
			items,
			...(result.issues.length === 0
				? {}
				: {
						warnings: result.issues.map(
							(issue) =>
								`Invalid memory event line ${issue.lineNumber}: ${issue.message}`,
						),
					}),
		};
	}

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
		async health(signal?: AbortSignal): Promise<any> {
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

		async context(input: any, signal?: AbortSignal): Promise<any> {
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

		async recall(input: any, signal?: AbortSignal): Promise<any> {
			return localRecall(ctx, input, signal);
		},

		async writeMemory(input: any, signal?: AbortSignal): Promise<any> {
			return writeMemory(ctx, input, signal);
		},

		async readCoreMemory(signal?: AbortSignal): Promise<any> {
			if (signal?.aborted) throw new Error("Operation aborted.");
			await ensureReady();
			return { content: await readCoreMemory(store) };
		},

		async readNotesMemory(signal?: AbortSignal): Promise<any> {
			if (signal?.aborted) throw new Error("Operation aborted.");
			await ensureReady();
			return { content: await readNotesMemory(store) };
		},

		async updateCoreMemory(
			content: string,
			signal?: AbortSignal,
		): Promise<any> {
			return updateCoreMemory(ctx, content, signal);
		},

		async listRecentMemories(input?: any, signal?: AbortSignal): Promise<any> {
			if (signal?.aborted) throw new Error("Operation aborted.");
			return listRecentMemories(input?.limit, signal);
		},

		async validate(input?: any, signal?: AbortSignal): Promise<any> {
			if (signal?.aborted) throw new Error("Operation aborted.");
			await ensureReady();
			const warnings: string[] = [];
			const errors: string[] = [];
			try {
				await readManifest(store);
			} catch (error) {
				errors.push(`manifest: ${message(error)}`);
			}
			try {
				await readCoreMemory(store);
			} catch (error) {
				errors.push(`core memory: ${message(error)}`);
			}
			try {
				await readNotesMemory(store);
			} catch (error) {
				errors.push(`notes memory: ${message(error)}`);
			}
			try {
				const events = await readMemoryEventsWithIssues(store, {
					malformedLineMode: "skip",
				});
				warnings.push(
					...events.issues.map(
						(issue) =>
							`memory-events line ${issue.lineNumber}: ${issue.message}`,
					),
				);
			} catch (error) {
				errors.push(`memory events: ${message(error)}`);
			}
			try {
				const snapshots = await readSnapshotRecordsWithIssues(store, {
					malformedLineMode: "skip",
				});
				warnings.push(
					...snapshots.issues.map(
						(issue) => `snapshots line ${issue.lineNumber}: ${issue.message}`,
					),
				);
			} catch (error) {
				warnings.push(`snapshot index: ${message(error)}`);
			}
			return {
				ok: errors.length === 0 && (!input?.strict || warnings.length === 0),
				warnings,
				errors,
			};
		},

		async createSnapshot(input?: any, signal?: AbortSignal): Promise<any> {
			return createSnapshotImpl(input, signal);
		},

		async startAgentSession(input: any, signal?: AbortSignal): Promise<any> {
			return startAgentSession(ctx, input, signal);
		},

		async readAgentSessionFile(input: any, signal?: AbortSignal): Promise<any> {
			return readAgentSessionFile(ctx, input, signal);
		},

		async writeAgentSessionFile(
			input: any,
			signal?: AbortSignal,
		): Promise<any> {
			return writeAgentSessionFile(ctx, input, signal);
		},

		async appendAgentSessionFile(
			input: any,
			signal?: AbortSignal,
		): Promise<any> {
			return appendAgentSessionFile(ctx, input, signal);
		},

		async extractAgentSession(input: any, signal?: AbortSignal): Promise<any> {
			return extractAgentSession(ctx, input, signal);
		},

		async completeAgentSession(input: any, signal?: AbortSignal): Promise<any> {
			return completeAgentSession(ctx, input, signal);
		},

		async upsertGraphNodes(input: any, signal?: AbortSignal): Promise<any> {
			return upsertGraphNodes(ctx, input, signal);
		},

		async upsertGraphEdges(input: any, signal?: AbortSignal): Promise<any> {
			return upsertGraphEdges(ctx, input, signal);
		},

		async graphNeighbors(input: any, signal?: AbortSignal): Promise<any> {
			return graphNeighbors(ctx, input, signal);
		},

		async graphPath(input: any, signal?: AbortSignal): Promise<any> {
			return graphPath(ctx, input, signal);
		},

		async listGraphNodes(input: any, signal?: AbortSignal): Promise<any> {
			return listGraphNodes(ctx, input, signal);
		},

		async listGraphEdges(input: any, signal?: AbortSignal): Promise<any> {
			return listGraphEdges(ctx, input, signal);
		},

		async consolidateMemory(input: any, signal?: AbortSignal): Promise<any> {
			return consolidateMemory(ctx, input, signal);
		},

		async syncPush(_input: any, signal?: AbortSignal): Promise<any> {
			if (signal?.aborted) throw new Error("Operation aborted.");
			throw new Error("sync.push is not available in local mode.");
		},

		async syncComplete(_input: any, signal?: AbortSignal): Promise<any> {
			if (signal?.aborted) throw new Error("Operation aborted.");
			throw new Error("sync.complete is not available in local mode.");
		},

		async syncPull(_input: any, signal?: AbortSignal): Promise<any> {
			if (signal?.aborted) throw new Error("Operation aborted.");
			throw new Error("sync.pull is not available in local mode.");
		},

		async syncStatus(_input?: any, signal?: AbortSignal): Promise<any> {
			if (signal?.aborted) throw new Error("Operation aborted.");
			throw new Error("sync.status is not available in local mode.");
		},

		store,
	};
}
