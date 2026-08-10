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
import { readMemoryEventsWithIssues } from "../core/events/memory-events";
import { readManifest, writeManifest } from "../core/manifest/manifest";
import { splitSearchBlocks } from "../core/search/search-memory";
import type { JsonObject } from "../core/types/json";
import type { AnchorHashCacheEntry } from "../core/types/memory-documents";
import {
	createRuleBasedExtractor,
	type Extractor,
} from "../graph/extraction/extractor";
import { createFsGraphStore } from "../graph/stores/fs-graph-store";
import type { BM25Store } from "../recall/lexical/bm25";
import { createBM25Store } from "../recall/lexical/bm25";
import { DeterministicFallbackReranker } from "../rerank/fallback/deterministic-fallback-reranker";
import { buildContext } from "./helpers";
import {
	ANCHOR_HASH_CACHE_TTL_MS,
	type AnchorHashCache,
	createAnchorHashCache,
	isValidAnchorRef,
} from "./local-strategy/anchor-drift";
import { createLocalAgentfsClient } from "./local-strategy/client";
import { EXPIRY_DAYS, type MemoryDecayMeta } from "./local-strategy/decay";
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
import type { MigrateAnchorsResult } from "./local-strategy/migrate-anchors";
import { migrateAnchors } from "./local-strategy/migrate-anchors";
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
	AnchorRef,
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
	MemoryKind,
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
	const anchorByMemoryId = new Map<string, AnchorRef>();
	const anchorHashCache: AnchorHashCache = createAnchorHashCache();
	const memoryMetaByMemoryId = new Map<string, MemoryDecayMeta>();
	const graphNodesByMemoryId = new Map<string, string[]>();
	const rootDir = options.rootDir ?? ".";

	/**
	 * Rebuilds the `memory id → graph node ids` reverse index from the
	 * current `graphNodes` map. Called at boot and after each
	 * `autoExtractGraph` so the drift-detection seam can find bound
	 * graph nodes without scanning the whole graph per recall call.
	 */
	function reindexGraphNodesByMemoryId(): void {
		graphNodesByMemoryId.clear();
		for (const [nodeId, node] of graphNodes) {
			if (!node.sourceRefs) continue;
			for (const sr of node.sourceRefs) {
				if (sr.sourceType === "memory" && sr.sourceId) {
					const list = graphNodesByMemoryId.get(sr.sourceId);
					if (list === undefined) {
						graphNodesByMemoryId.set(sr.sourceId, [nodeId]);
					} else if (!list.includes(nodeId)) {
						list.push(nodeId);
					}
				}
			}
		}
	}

	/**
	 * Walks `memory-events.jsonl` and populates `anchorByMemoryId` from
	 * event metadata. Cold-start recovery for anchors written by a prior
	 * process. Events without an `anchor` field are skipped (today's
	 * default). Best-effort: malformed events don't break the loop.
	 */
	async function hydrateAnchorsFromEvents(): Promise<void> {
		try {
			const result = await readMemoryEventsWithIssues(store, {
				malformedLineMode: "skip",
			});
			for (const entry of result.entries) {
				if (entry.type !== "memory.created") continue;
				const meta = entry.metadata as
					| { id?: unknown; anchor?: unknown }
					| undefined;
				if (!meta || typeof meta.id !== "string") continue;
				if (!isValidAnchorRef(meta.anchor)) continue;
				anchorByMemoryId.set(meta.id, meta.anchor);
			}
		} catch (error) {
			options.logger?.warn(
				"anchor hydration from events failed (best-effort)",
				{
					error: error instanceof Error ? error.message : String(error),
				},
			);
		}
	}

	/**
	 * Walks `memory-events.jsonl` and populates `memoryMetaByMemoryId`
	 * with the `kind` + `createdAt` (event timestamp) for each
	 * `memory.created` event. Cold-start recovery for decay detection —
	 * a fresh process needs the age of each memory to compute the
	 * `EXPIRY_DAYS[kind]` floor at query time. Events without a `kind`
	 * or with a `kind` outside the expiry table are skipped (backward-
	 * compat — no false-positive `unverified`). Best-effort: malformed
	 * events don't break the loop. Last event per memory id wins.
	 */
	async function hydrateMemoryMetaFromEvents(): Promise<void> {
		try {
			const result = await readMemoryEventsWithIssues(store, {
				malformedLineMode: "skip",
			});
			for (const entry of result.entries) {
				if (entry.type !== "memory.created") continue;
				const meta = entry.metadata as
					| { id?: unknown; kind?: unknown }
					| undefined;
				if (!meta || typeof meta.id !== "string") continue;
				if (typeof meta.kind !== "string") continue;
				if (EXPIRY_DAYS[meta.kind as MemoryKind] === undefined) continue;
				memoryMetaByMemoryId.set(meta.id as string, {
					kind: meta.kind as MemoryKind,
					createdAt: entry.timestamp,
				});
			}
		} catch (error) {
			options.logger?.warn(
				"memory-meta hydration from events failed (best-effort)",
				{
					error: error instanceof Error ? error.message : String(error),
				},
			);
		}
	}

	/**
	 * Repopulates the BM25 lexical store from `notes.md` sections on cold
	 * start. Each `## <timestamp>` section carries a `- metadata: <json>`
	 * line with the original `mem_...` id; indexing the section text under
	 * that id lets {@link localRecall} surface memories by their original
	 * id immediately after a fresh process spins up against an existing
	 * rootDir (no warm `lexicalStore` in memory yet).
	 *
	 * Per-id idempotency through `lexicalTextById.has(id)` keeps this a
	 * safe no-op for entries the live process has already indexed via
	 * {@link writeMemory} ahead of the first `ensureReady` call.
	 *
	 * Best-effort: malformed sections don't break the loop.
	 */
	async function hydrateLexicalFromNotes(): Promise<void> {
		try {
			const notes = await readNotesMemory(store);
			const sections = splitSearchBlocks(notes, "markdown-section");
			for (const section of sections) {
				const metaMatch = section.match(/^- metadata:\s*(\{.*\})\s*$/m);
				if (!metaMatch?.[1]) continue;
				let metadata: { id?: unknown } | undefined;
				try {
					metadata = JSON.parse(metaMatch[1]) as { id?: unknown };
				} catch {
					continue;
				}
				if (!metadata || typeof metadata.id !== "string") continue;
				const id = metadata.id;
				if (!id.startsWith("mem_")) continue;
				if (lexicalTextById.has(id)) continue;
				indexLexical({ id, text: section });
			}
		} catch (error) {
			options.logger?.warn(
				"lexical cold-start hydration from notes failed (best-effort)",
				{
					error: error instanceof Error ? error.message : String(error),
				},
			);
		}
	}

	/**
	 * Warm-starts {@link anchorHashCache} from `.memofs/manifest.json`
	 * (cross-session cache persistence). Entries past the 5-minute TTL
	 * are dropped so a stale entry never masks a recomputation.
	 * Best-effort: a missing or malformed manifest is treated as a cold
	 * cache (the validator already rejects malformed manifests on read).
	 */
	async function hydrateAnchorHashCacheFromManifest(): Promise<void> {
		try {
			const manifest = await readManifest(store);
			const persisted = manifest.anchorHashCache;
			if (!persisted) return;
			const now = Date.now();
			for (const [file, entry] of Object.entries(persisted)) {
				if (now - entry.ts >= ANCHOR_HASH_CACHE_TTL_MS) continue;
				if (anchorHashCache.has(file)) continue;
				anchorHashCache.set(file, entry);
			}
		} catch {
			// Cold start: manifest may not exist yet, or prior process predated
			// the anchorHashCache field. Treat as empty cache (best-effort).
		}
	}

	/**
	 * Persists {@link anchorHashCache} back to `.memofs/manifest.json`
	 * (cross-session cache persistence). Entries past the 5-minute TTL
	 * are not written (they would be recomputed on the next read
	 * anyway). Best-effort: a write failure logs a warning and does not
	 * break recall.
	 */
	async function flushAnchorHashCacheToManifest(): Promise<void> {
		try {
			const manifest = await readManifest(store);
			const entries: Record<string, AnchorHashCacheEntry> = {};
			const now = Date.now();
			for (const [file, entry] of anchorHashCache) {
				if (now - entry.ts >= ANCHOR_HASH_CACHE_TTL_MS) continue;
				entries[file] = entry;
			}
			manifest.anchorHashCache = entries;
			await writeManifest(store, manifest);
		} catch (error) {
			options.logger?.warn(
				"anchor-hash cache flush to manifest failed (best-effort)",
				{
					error: error instanceof Error ? error.message : String(error),
				},
			);
		}
	}

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
	const graphEdges = new Map<string, GraphEdgeInput>();
	const contextCache = new ContextCache();
	let bootstrapped = false;

	async function setBootstrapped(val: boolean) {
		bootstrapped = val;
	}

	async function ensureReady(): Promise<void> {
		if (bootstrapped) return;
		if (options.autoBootstrap) {
			await bootstrapMemoryStore(store, { projectId });
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
			reindexGraphNodesByMemoryId();
			await hydrateAnchorsFromEvents();
			await hydrateMemoryMetaFromEvents();
			await hydrateLexicalFromNotes();
			await hydrateAnchorHashCacheFromManifest();
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
		rootDir,
		anchorByMemoryId,
		anchorHashCache,
		flushAnchorHashCache: flushAnchorHashCacheToManifest,
		graphNodesByMemoryId,
		reindexGraphNodesByMemoryId,
		memoryMetaByMemoryId,
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

		async migrateAnchors(): Promise<MigrateAnchorsResult> {
			return migrateAnchors(store, rootDir, options.logger);
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
