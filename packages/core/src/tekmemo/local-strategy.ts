/**
 * Local (filesystem-backed) runtime strategy for Tekmemo.
 *
 * Uses a MemoryStore (NodeFsMemoryStore by default) plus core document/event
 * functions to implement the full Tekmemo API surface.
 *
 * @internal
 */

// `node:crypto` stays a top-level import: it is called on the synchronous recall
// hot path (lexical `hash()`), and the cloud Worker has `nodejs_compat` enabled
// (wrangler.jsonc) so it resolves there. `node:fs` / `node:path`, by contrast,
// are used ONLY by the default node agentfs client below — so they are loaded
// lazily inside that client's methods. That keeps `local-strategy.ts` Worker-
// loadable: a Worker injects its own `createAgentfsClient` (or never creates an
// agent session) and never touches the lazy `node:fs` imports, which the
// bundler tree-shakes out of the Worker bundle. `node:crypto` (sync, hot path)
// is covered by `nodejs_compat` and intentionally not lazy.
import { createHash } from "node:crypto";
import { chunkText } from "../core/chunking/chunk-text";
import type { MemoryEmbedder } from "../core/types/embeddings";
import type {
	MemorySourceType,
	MemoryType,
} from "../core/types/memory-documents";
import type { MemoryStore } from "../core/types/memory-store";
import {
	type AgentfsLikeClient,
	appendMemoryEvent,
	appendSnapshotRecord,
	appendTimestampedNote,
	applyConsolidation,
	assertWriteAllowed,
	bootstrapMemoryStore,
	CORE_MEMORY_PATH,
	classifyDurability,
	consolidateGraph,
	createAgentWorkspacePaths,
	createBM25Store,
	createFsGraphStore,
	createMemoryEvent,
	createRuleBasedExtractor,
	createSnapshotPath,
	createSnapshotRecord,
	createTekMemoAgentSession,
	DeterministicFallbackReranker,
	type Extractor,
	extractSessionMemory,
	type GraphEdge,
	type GraphNode,
	type InMemoryGraphStore,
	type LlmClient,
	mergeHybridCandidates,
	NOTES_MEMORY_PATH,
	type Reranker,
	readCoreMemory,
	readManifest,
	readMemoryEventsWithIssues,
	readNotesMemory,
	readSnapshotRecordsWithIssues,
	searchMemoryText,
	writeCoreMemory,
} from "../index";
import type { BM25Store } from "../recall/lexical/bm25";
import type { RecallStore } from "../recall/types";
import { buildContext, paginateArray } from "./helpers";
import { ContextCache } from "./progressive";
import type { ResolveGraphEdge, ResolveGraphNode } from "./strategist";
import type { FileSyncLayer } from "./sync/file-replication";
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
	MemoryContextInput,
	MemoryContextResult,
	MemoryDocumentResult,
	RecallInput,
	RecallResult,
	RecentMemoryInput,
	RecentMemoryResult,
	SnapshotMemoryInput,
	SnapshotMemoryResult,
	SyncPullInput,
	SyncPullResult,
	SyncPushCompleteInput,
	SyncPushCompleteResult,
	SyncPushInput,
	SyncPushResult,
	SyncStatusInput,
	SyncStatusResult,
	TekMemoHealthResult,
	ValidateMemoryInput,
	ValidateMemoryResult,
	WriteMemoryInput,
	WriteMemoryResult,
} from "./types";

/**
 * Minimal store surface the local strategy consumes. Both
 * {@link InMemoryGraphStore} and {@link FsGraphStore} satisfy it; the
 * persistent store additionally exposes `hydrate()`.
 *
 * @internal
 */
type LocalGraphStore = Pick<
	InMemoryGraphStore,
	| "upsertNodes"
	| "upsertEdges"
	| "getNode"
	| "getEdge"
	| "queryNodes"
	| "queryEdges"
	| "neighbors"
	| "fewestHopsPath"
	| "weightedShortestPath"
	| "mergeNodes"
	| "stats"
	| "exportSnapshot"
	| "importSnapshot"
> & { hydrate?: () => Promise<void> };

export interface LocalStrategyOptions {
	store: MemoryStore;
	embedder?: MemoryEmbedder;
	/**
	 * Optional graph extractor (LLM-based or otherwise). When omitted, the
	 * zero-config rule-based extractor runs (ADR 0004 fallback). The write
	 * fan-out always calls this one shape regardless of which is configured.
	 */
	extractor?: Extractor;
	recallStore?: RecallStore;
	projectId: string;
	tenantId?: string;
	autoBootstrap: boolean;
	name: string;
	version: string;
	/**
	 * Optional injected reranker for hybrid recall. When omitted, the
	 * zero-config lexical token-overlap {@link DeterministicFallbackReranker}
	 * runs. Inject a provider reranker (e.g. Voyage) so hybrid recall reorders
	 * candidates by semantic relevance. Local OSS users see no behavior change
	 * when this is absent.
	 */
	reranker?: Reranker;
	/**
	 * Optional injected LLM transport (the 4th contract member, ADR 0014). When
	 * omitted, every LLM-enhanced intelligence feature runs its deterministic
	 * default — the absence of an `LlmClient` *is* the deterministic default.
	 * Slice 0 only threads the seam; the strategist (Q23) and consolidation
	 * (Q25a) consume it in later slices. Local OSS users see no behavior change
	 * when this is absent.
	 */
	llmClient?: LlmClient;
	/**
	 * Optional injected graph store. When omitted, a persistent
	 * {@link createFsGraphStore} is created so the local graph survives
	 * restarts. Pass an in-memory store for tests.
	 */
	graphStore?: LocalGraphStore;
	/**
	 * Whether to auto-extract graph facts from written memories. Defaults to
	 * `true` so the graph accumulates without human intervention.
	 */
	autoExtractGraph?: boolean;
	/**
	 * Optional file-replication sync layer. In `hybrid` mode this wires the
	 * agentfs session hooks (`sync-before-session`/`sync-after-session`) to the
	 * file-replica cloud: `pull`/`push` go through this layer, and `checkpoint`
	 * becomes a `pre-sync` snapshot. Omitted in `local`/`memory` modes, where
	 * the hooks stay no-ops (see §6.7).
	 */
	syncLayer?: FileSyncLayer;
	/**
	 * Optional factory for the agent-session I/O client. When omitted, the
	 * default node `fs`-backed client is used (lazy-loads `node:fs`/
	 * `node:path` on first session). Inject a Worker-safe client so the runtime
	 * can host agent sessions on infra with no Node `fs` (ADR 0011 Phase 3).
	 */
	createAgentfsClient?: (opts: {
		store: MemoryStore;
		projectId: string;
		syncLayer?: FileSyncLayer;
		createSnapshot?(input?: SnapshotMemoryInput): Promise<SnapshotMemoryResult>;
	}) => AgentfsLikeClient;
}

export function createLocalStrategy(options: LocalStrategyOptions) {
	const { store, projectId } = options;
	// The extractor the write fan-out calls. When none is configured, fall back
	// to the zero-config rule-based extractor (ADR 0004) so the graph still
	// accumulates from regex patterns with no API key. An LLM adapter layers on
	// top only when provided.
	const extractor: Extractor = options.extractor ?? createRuleBasedExtractor();
	// Persistent graph store: survives restarts by hydrating from / persisting
	// to .tekmemo/graph/{nodes,edges}.jsonl. Falls back to a plain in-memory
	// store when one is injected (tests).
	const graphStore: LocalGraphStore =
		options.graphStore ?? createFsGraphStore({ store });
	const lexicalStore: BM25Store = createBM25Store();
	// Sidecar map from lexical document id -> text, so BM25 search results
	// (which return only id + score) can be resolved back to their content for
	// reranking and display.
	const lexicalTextById = new Map<string, string>();
	// The reranker that reorders hybrid-recall candidates. When none is
	// configured, fall back to the zero-config lexical token-overlap reranker so
	// hybrid recall still works with no API key. A provider reranker (e.g.
	// Voyage) layers on top only when injected.
	const reranker: Reranker =
		options.reranker ?? new DeterministicFallbackReranker();

	/**
	 * Index a document into the lexical store and remember its text so BM25
	 * search results can be resolved back to content.
	 *
	 * @internal
	 */
	function indexLexical(doc: { id: string; text: string }): void {
		lexicalTextById.set(doc.id, doc.text);
		lexicalStore.upsert([doc]);
	}

	/**
	 * Drop documents from the lexical store and the sidecar text map (the
	 * disposable index prunes — the source-of-truth files keep everything).
	 * Called by consolidation when it retires or merges a graph node.
	 *
	 * @internal
	 */
	function pruneLexical(ids: string[]): void {
		if (ids.length === 0) return;
		lexicalStore.delete(ids);
		for (const id of ids) lexicalTextById.delete(id);
	}

	/**
	 * Whether a lexical document id refers to a graph node that consolidation
	 * (or a manual upsert) has marked `deprecated`. Used by recall to skip
	 * retired facts so the staleness loop (ADR 0009 Component 5) closes.
	 *
	 * @internal
	 */
	function isRetiredGraphDoc(lexicalId: string): boolean {
		if (!lexicalId.startsWith("graph:")) return false;
		const node = graphNodes.get(lexicalId.slice("graph:".length));
		return node?.status === "deprecated";
	}

	/**
	 * The set of `graph:{id}` lexical doc ids for all currently-deprecated
	 * graph nodes. Fed to the strategist's Filter stage (Component 5) so
	 * vector-sourced recall candidates referencing retired facts are dropped —
	 * the lexical path already skips them at search time via
	 * {@link isRetiredGraphDoc}; this is the belt-and-suspenders path.
	 *
	 * @internal
	 */
	function collectRetiredGraphDocIds(): Set<string> {
		const out = new Set<string>();
		for (const [id, node] of graphNodes) {
			if (node.status === "deprecated") out.add(`graph:${id}`);
		}
		return out;
	}
	// Keep the legacy in-memory maps in sync with the persistent store so the
	// existing list/neighbors/path fast paths keep working without a rewrite.
	const graphNodes = new Map<string, GraphNodeInput>();
	const graphEdges = new Map<string, GraphEdgeInput>();
	// Per-instance progressive-disclosure cache (ADR 0009 Component 4 / Q27).
	// Holds the resolved pointers from a compact call so an expand call
	// re-resolves one section fast. One cache per Tekmemo instance, never
	// global; LRU + TTL bounded (see ContextCache).
	const contextCache = new ContextCache();
	let bootstrapped = false;

	async function ensureReady(): Promise<void> {
		if (bootstrapped) return;
		if (options.autoBootstrap) {
			await bootstrapMemoryStore(store, { projectId });
			// Rehydrate the persistent graph into the fast-path maps.
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
				// Seed the lexical index from rehydrated graph node labels so graph
				// concepts participate in lexical recall alongside memory chunks.
				for (const node of nodes) {
					indexLexical({
						id: `graph:${node.id}`,
						text: `${node.label}${node.summary ? ` ${node.summary}` : ""}`,
					});
				}
			} catch {
				// Hydration is best-effort; never block boot.
			}
		}
		bootstrapped = true;
	}

	/**
	 * Snapshot creation, hoisted out of the strategy object so the agentfs
	 * sync hooks (and the strategy's own `createSnapshot` method) share one
	 * implementation. Depends only on closure locals (`ensureReady`, `store`).
	 *
	 * @internal
	 */
	async function createSnapshotImpl(
		input?: SnapshotMemoryInput,
		signal?: AbortSignal,
	): Promise<SnapshotMemoryResult> {
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

	// Agent-session I/O client. Defaults to the node `fs`-backed client; a Worker
	// runtime injects its own (`createAgentfsClient`) so agent sessions can run on
	// infra with no Node `fs` (ADR 0011 Phase 3). The default client lazily loads
	// `node:fs`/`node:path` on first use, so a Worker that injects its own (or
	// never opens a session) never touches the lazy node imports.
	const agentfsClient = (
		options.createAgentfsClient ?? createLocalAgentfsClient
	)({
		store: options.store,
		projectId: options.projectId,
		syncLayer: options.syncLayer,
		createSnapshot: (input) => createSnapshotImpl(input),
	});

	function assertWritableAgentSessionPath(filePath: string): void {
		if (!filePath.includes("/working/") && !filePath.includes("/output/")) {
			throw new Error(
				"Only working/ and output/ agent session files are writable.",
			);
		}
	}

	function edgeId(edge: GraphEdgeInput): string {
		return (
			edge.id ??
			`${edge.from}|${edge.type}|${edge.to}|${edge.directed ?? true}|${edge.dedupeKey ?? ""}`
		);
	}

	async function localRecall(
		input: RecallInput,
		signal?: AbortSignal,
	): Promise<RecallResult> {
		await ensureReady();
		if (signal?.aborted) throw new Error("Operation aborted.");

		const limit = input.limit ?? 10;

		// --- Lexical path: always available, zero-config ---
		// Index current core + notes on the fly (cheap at local scale) so lexical
		// recall reflects the latest memory even when no embedder is configured.
		const lexicalCandidates = await runLexicalRecall(input.query, limit);

		// --- Vector path: only when an embedder is configured ---
		const vectorCandidates = new Map<
			string,
			{ text: string; score: number; metadata?: Record<string, unknown> }
		>();
		if (options.embedder && options.recallStore) {
			try {
				const embedResult = await options.embedder.embedText(input.query);
				const results = await options.recallStore.query({
					embedding: embedResult.embedding,
					topK: limit * 3,
				});
				for (const r of results) {
					vectorCandidates.set(r.id, {
						text: r.text ?? "",
						score: r.score ?? 0,
						...(r.metadata === undefined
							? {}
							: { metadata: r.metadata as Record<string, unknown> }),
					});
				}
			} catch {
				// Vector path is an enhancement; fall through to lexical-only.
			}
		}

		// --- Merge: when only one path ran, short-circuit; otherwise hybrid-merge ---
		const hasVector = vectorCandidates.size > 0;
		const hasLexical = lexicalCandidates.size > 0;

		if (!hasVector && !hasLexical) {
			return { items: [] };
		}

		// Build the unified candidate map for the hybrid merger.
		const ids = new Set<string>([
			...vectorCandidates.keys(),
			...lexicalCandidates.keys(),
		]);
		const candidates = new Map<string, ReturnType<typeof candidateShape>>();
		for (const id of ids) {
			const v = vectorCandidates.get(id);
			const l = lexicalCandidates.get(id);
			candidates.set(id, candidateShape(id, v, l));
		}

		const items = await mergeHybridCandidates(candidates as never, {
			query: input.query,
			topK: limit,
			reranker,
		});

		return { items };
	}

	/**
	 * Run the lexical (BM25 + fuzzy) path over core + notes memory, returning
	 * candidates keyed by a stable id. This is the zero-config baseline that
	 * works with no embedder.
	 */
	async function runLexicalRecall(
		query: string,
		limit: number,
	): Promise<
		Map<
			string,
			{ text: string; score: number; metadata?: Record<string, unknown> }
		>
	> {
		const out = new Map<
			string,
			{ text: string; score: number; metadata?: Record<string, unknown> }
		>();

		// Primary lexical path: query the BM25 store (token + fuzzy matching).
		// It is populated on every write and on boot rehydration, so it reflects
		// the current memory set without re-reading notes.md each call.
		try {
			const bm25Results = lexicalStore.search(query, { topK: limit * 2 });
			for (const result of bm25Results) {
				// Staleness loop (ADR 0009 Component 5): a graph node retired by
				// consolidation is marked `deprecated` but was already indexed into
				// the lexical store when it was written. Skip it here so recall stops
				// serving the old answer. `consolidateMemory` prunes these eagerly
				// too; this guard also covers manual deprecations and any race before
				// the prune runs. v1 drops `deprecated` only (v1.x will surface
				// `unverified` with a warning rather than hiding it).
				if (isRetiredGraphDoc(result.id)) continue;
				const text = lexicalTextById.get(result.id) ?? "";
				out.set(result.id, {
					text,
					score: result.score,
					metadata: { source: "bm25" },
				});
			}
		} catch {
			// Best-effort BM25.
		}

		// Secondary lexical path: substring search over core + notes memory.
		// Catches exact-phrase matches BM25 tokenization might split, and covers
		// memories written before this process started (cold start).
		try {
			const core = await readCoreMemory(store);
			const notes = await readNotesMemory(store);
			for (const [source, content] of [
				["core", core],
				["notes", notes],
			] as const) {
				const results = searchMemoryText({
					content,
					query,
					limit: limit * 2,
					mode: "auto",
				});
				for (const result of results) {
					const id = `${source}_${result.index}_${hash(result.text).slice(0, 12)}`;
					// Prefer the higher of the two signals when both fire.
					const existing = out.get(id);
					const score = result.score / 10; // normalize substring score toward [0,1]
					if (!existing || score > existing.score) {
						out.set(id, {
							text: result.text,
							score,
							metadata: { source, index: result.index },
						});
					}
				}
			}
		} catch {
			// Best-effort substring recall.
		}
		return out;
	}

	return {
		async health(signal?: AbortSignal): Promise<TekMemoHealthResult> {
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
					recall: (i, s) => localRecall(i, s),
					// Strategist Resolve (ADR 0009 Component 2): supply the graph node
					// snapshot so the query's expanded terms resolve to entities. The
					// map is rehydrated on boot and kept in sync on writes.
					listGraphNodes: async () =>
						[...graphNodes.values()] as ResolveGraphNode[],
					// Strategist entity enrichment (ADR 0009 Component 3 / Q26): supply
					// the active edge snapshot so each resolved entity renders its
					// current state derived from active edges. `graphEdges` is kept in
					// sync with the persistent store on writes and on consolidation.
					listGraphEdges: async () =>
						[...graphEdges.values()] as ResolveGraphEdge[],
					// Strategist Filter (ADR 0009 Component 5): the lexical doc ids for
					// deprecated graph nodes, so vector-sourced recall candidates are
					// dropped here too (the lexical path already skips them at search).
					retiredGraphDocIds: collectRetiredGraphDocIds(),
					// Progressive disclosure (ADR 0009 Component 4 / Q27): the cache
					// lets a compact call hand off resolved pointers to an expand call.
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
			return localRecall(input, signal);
		},

		async writeMemory(
			input: WriteMemoryInput,
			signal?: AbortSignal,
		): Promise<WriteMemoryResult> {
			if (signal?.aborted) throw new Error("Operation aborted.");
			await ensureReady();
			// Write intelligence gate (ADR 0009 Component 6, layer 1): hard-reject
			// secrets/PII before they reach syncable notes.md. Scans the two
			// user-controlled text fields (title + content); metadata/tags are
			// structured and not prose the agent leaks secrets into.
			assertWriteAllowed(
				[input.content, ...(input.title === undefined ? [] : [input.title])],
				NOTES_MEMORY_PATH,
			);
			// Layer 2: durability tier. `transient` memories are written to
			// notes.md (the audit trail) but NOT indexed into recall/graph — they
			// don't pollute retrieval. The file keeps everything; the disposable
			// index prunes by tier (ADR 0009 invariant).
			const tierDecision = classifyDurability({
				content: input.content,
				...(input.kind === undefined ? {} : { kind: input.kind }),
				...(input.confidence === undefined
					? {}
					: { confidence: input.confidence }),
				...(input.tier === undefined ? {} : { tier: input.tier }),
			});
			const durable = tierDecision.tier === "durable";
			const now = new Date().toISOString();
			// Q3 (ADR 0002): a caller-supplied stable id (e.g. a content-derived
			// connector id) wins over the default wall-clock-seeded hash. Omitted →
			// unchanged historical behavior.
			const id =
				input.id ?? `mem_${hash(`${now}:${input.content}`).slice(0, 16)}`;
			await appendTimestampedNote(store, {
				timestamp: now,
				kind: input.kind ?? "note",
				content: input.content,
				...(input.title === undefined ? {} : { title: input.title }),
				...(input.tags === undefined ? {} : { tags: input.tags }),
				...(input.confidence === undefined
					? {}
					: { confidence: input.confidence }),
				...(input.source === undefined
					? { source: "tekmemo" }
					: { source: input.source }),
				metadata: {
					id,
					...(input.workspaceId === undefined
						? {}
						: { workspaceId: input.workspaceId }),
					...(input.projectId === undefined
						? {}
						: { projectId: input.projectId }),
					...(input.sourceRefs === undefined
						? {}
						: { sourceRefs: input.sourceRefs }),
					...(input.metadata ?? {}),
				},
			});
			await appendMemoryEvent(
				store,
				createMemoryEvent({
					type: "memory.created",
					...((input.projectId ?? projectId)
						? { projectId: input.projectId ?? projectId }
						: {}),
					actor: { type: "agent", id: "tekmemo" },
					summary: input.title ?? input.content.slice(0, 160),
					metadata: {
						id,
						kind: input.kind ?? "note",
						tags: input.tags ?? [],
					},
				}),
			);

			const noteText = `${input.title ?? input.content.slice(0, 80)}\n${input.content}`;

			// Index only durable memories. Transient ones stay in notes.md (audit
			// trail + listRecentMemories) but never reach the recall store, the
			// lexical index, or the graph — so they can't steer retrieval.
			if (durable) {
				if (options.embedder && options.recallStore) {
					await indexDocument(noteText, {
						sourceType: "note",
						sourceId: now,
						sourcePath: NOTES_MEMORY_PATH,
						memoryType: "notes",
						tags: input.tags,
						kind: input.kind,
						confidence: input.confidence,
					});
				}

				// Always index into the lexical store so zero-config recall (no
				// embedder) still surfaces this memory, and so the lexical path
				// stays warm even when a vector index exists.
				indexLexical({ id, text: noteText });

				// Auto-extract graph facts from the written memory so the graph
				// accumulates without human intervention. Best-effort.
				if (options.autoExtractGraph !== false) {
					await autoExtractGraph(noteText, {
						sourceType: "note",
						sourceId: id,
					});
				}
			}

			return {
				id,
				created: true,
				tier: tierDecision.tier,
				tierReason: tierDecision.reason,
				...(input.sourceRefs === undefined
					? {}
					: { sourceRefs: input.sourceRefs }),
			};
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
			if (signal?.aborted) throw new Error("Operation aborted.");
			await ensureReady();
			// Write intelligence gate (ADR 0009 Component 6): core memory syncs to
			// the cloud replica, so it gets the same secret rejection as notes.
			assertWriteAllowed([content], CORE_MEMORY_PATH);
			await writeCoreMemory(store, content);
			await appendMemoryEvent(
				store,
				createMemoryEvent({
					type: "memory.updated",
					...(projectId ? { projectId } : {}),
					actor: { type: "agent", id: "tekmemo" },
					summary: "Core memory updated.",
				}),
			);

			if (options.embedder && options.recallStore) {
				await indexDocument(content, {
					sourceType: "document",
					sourceId: "core",
					sourcePath: CORE_MEMORY_PATH,
					memoryType: "core",
				});
			}

			// Keep the lexical index in sync with core memory edits.
			indexLexical({ id: "core:document", text: content });

			// Auto-extract graph facts from core memory edits too.
			if (options.autoExtractGraph !== false) {
				await autoExtractGraph(content, {
					sourceType: "document",
					sourceId: "core",
				});
			}

			return { content: await readCoreMemory(store) };
		},

		async listRecentMemories(
			input?: RecentMemoryInput,
			signal?: AbortSignal,
		): Promise<RecentMemoryResult> {
			if (signal?.aborted) throw new Error("Operation aborted.");
			return listRecentMemories(input?.limit, signal);
		},

		async validate(
			input?: ValidateMemoryInput,
			signal?: AbortSignal,
		): Promise<ValidateMemoryResult> {
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

		async createSnapshot(
			input?: SnapshotMemoryInput,
			signal?: AbortSignal,
		): Promise<SnapshotMemoryResult> {
			return createSnapshotImpl(input, signal);
		},

		async startAgentSession(
			input: AgentSessionStartInput,
			signal?: AbortSignal,
		): Promise<AgentSessionResult> {
			if (signal?.aborted) throw new Error("Operation aborted.");
			await ensureReady();
			const session = createTekMemoAgentSession({
				client: agentfsClient,
				memory: store,
				task: input.task,
				projectId: input.projectId ?? projectId,
				actorId: input.actorId,
				sessionId: input.sessionId,
			});
			await session.prepare();
			return {
				sessionId: session.sessionId,
				root: session.paths.root,
				paths: session.paths as unknown as JsonObject,
			};
		},

		async readAgentSessionFile(
			input: AgentSessionFileInput,
			signal?: AbortSignal,
		): Promise<{ content: string }> {
			if (signal?.aborted) throw new Error("Operation aborted.");
			await ensureReady();
			return { content: await agentfsClient.readText(input.path) };
		},

		async writeAgentSessionFile(
			input: AgentSessionFileInput,
			signal?: AbortSignal,
		): Promise<{ written: true; path: string }> {
			if (signal?.aborted) throw new Error("Operation aborted.");
			await ensureReady();
			assertWritableAgentSessionPath(input.path);
			await agentfsClient.writeText(input.path, input.content ?? "");
			return { written: true, path: input.path };
		},

		async appendAgentSessionFile(
			input: AgentSessionFileInput,
			signal?: AbortSignal,
		): Promise<{ appended: true; path: string }> {
			if (signal?.aborted) throw new Error("Operation aborted.");
			await ensureReady();
			assertWritableAgentSessionPath(input.path);
			await agentfsClient.appendText?.(input.path, input.content ?? "");
			return { appended: true, path: input.path };
		},

		async extractAgentSession(
			input: { sessionId: string; workspaceId?: string; projectId?: string },
			signal?: AbortSignal,
		): Promise<AgentSessionExtractResult> {
			if (signal?.aborted) throw new Error("Operation aborted.");
			await ensureReady();
			const paths = createAgentWorkspacePaths(input.sessionId);
			const extracted = await extractSessionMemory(agentfsClient, paths);
			return {
				sessionId: input.sessionId,
				extracted: extracted as unknown as JsonObject,
			};
		},

		async completeAgentSession(
			input: AgentSessionCompleteInput,
			signal?: AbortSignal,
		): Promise<AgentSessionExtractResult & { durableMemoryWritten: boolean }> {
			if (signal?.aborted) throw new Error("Operation aborted.");
			await ensureReady();
			const session = createTekMemoAgentSession({
				client: agentfsClient,
				memory: store,
				task: "Agent session",
				projectId: input.projectId ?? projectId,
				sessionId: input.sessionId,
			});
			const result = await session.complete({
				extractDurableMemory: input.extractDurableMemory,
				checkpointLabel: input.checkpointLabel,
			});
			return {
				sessionId: input.sessionId,
				extracted: result.extracted as unknown as JsonObject,
				durableMemoryWritten: result.durableMemoryWritten,
			};
		},

		async upsertGraphNodes(
			input: {
				workspaceId?: string;
				projectId?: string;
				nodes: GraphNodeInput[];
			},
			signal?: AbortSignal,
		): Promise<{ nodes: GraphNodeInput[] }> {
			if (signal?.aborted) throw new Error("Operation aborted.");
			await ensureReady();
			for (const node of input.nodes) graphNodes.set(node.id, node);
			// Persist + index for lexical recall. Best-effort: never break writes.
			try {
				await graphStore.upsertNodes(input.nodes as GraphNode[]);
				for (const node of input.nodes) {
					indexLexical({
						id: `graph:${node.id}`,
						text: `${node.label}${node.summary ? ` ${node.summary}` : ""}`,
					});
				}
			} catch {
				// Fall back to in-memory only.
			}
			return { nodes: input.nodes };
		},

		async upsertGraphEdges(
			input: {
				workspaceId?: string;
				projectId?: string;
				edges: GraphEdgeInput[];
			},
			signal?: AbortSignal,
		): Promise<{ edges: GraphEdgeInput[] }> {
			if (signal?.aborted) throw new Error("Operation aborted.");
			await ensureReady();
			for (const edge of input.edges)
				graphEdges.set(edgeId(edge), { directed: true, weight: 1, ...edge });
			try {
				await graphStore.upsertEdges(input.edges as GraphEdge[]);
			} catch {
				// Fall back to in-memory only.
			}
			return { edges: input.edges };
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
			if (signal?.aborted) throw new Error("Operation aborted.");
			const direction = input.direction ?? "both";
			const results: Array<{
				node: GraphNodeInput;
				edge: GraphEdgeInput;
				direction: "in" | "out";
			}> = [];
			for (const edge of graphEdges.values()) {
				if (input.edgeTypes && !input.edgeTypes.includes(edge.type)) continue;
				if (
					input.minWeight !== undefined &&
					(edge.weight ?? 1) < input.minWeight
				)
					continue;
				if (
					(direction === "out" || direction === "both") &&
					edge.from === input.nodeId
				) {
					const node = graphNodes.get(edge.to);
					if (node) results.push({ node, edge, direction: "out" });
				}
				if (
					(direction === "in" || direction === "both") &&
					edge.to === input.nodeId
				) {
					const node = graphNodes.get(edge.from);
					if (node) results.push({ node, edge, direction: "in" });
				}
			}
			return paginateArray(
				results,
				{
					cursor: input.cursor,
					limit: input.limit,
					defaultLimit: 25,
					maxLimit: 100,
				},
				`neighbors:${input.nodeId}`,
			);
		},

		async graphPath(
			input: GraphPathInput,
			signal?: AbortSignal,
		): Promise<GraphPathResult> {
			if (signal?.aborted) throw new Error("Operation aborted.");
			const start = graphNodes.get(input.from);
			if (!start) return { found: false, nodes: [], edges: [] };
			const maxDepth = input.maxDepth ?? 10;
			const queue: Array<{
				id: string;
				nodePath: GraphNodeInput[];
				edgePath: GraphEdgeInput[];
			}> = [{ id: input.from, nodePath: [start], edgePath: [] }];
			const seen = new Set<string>([input.from]);
			while (queue.length > 0) {
				const current = queue.shift();
				if (!current) break;
				if (current.id === input.to) {
					const totalWeight = current.edgePath.reduce(
						(sum, edge) => sum + (edge.weight ?? 1),
						0,
					);
					return {
						found: true,
						nodes: current.nodePath,
						edges: current.edgePath,
						totalWeight,
					};
				}
				if (current.edgePath.length >= maxDepth) continue;
				for (const edge of graphEdges.values()) {
					if (edge.from !== current.id) continue;
					if (input.edgeTypes && !input.edgeTypes.includes(edge.type)) continue;
					if (
						input.minWeight !== undefined &&
						(edge.weight ?? 1) < input.minWeight
					)
						continue;
					if (seen.has(edge.to)) continue;
					const next = graphNodes.get(edge.to);
					if (!next) continue;
					seen.add(edge.to);
					queue.push({
						id: edge.to,
						nodePath: [...current.nodePath, next],
						edgePath: [...current.edgePath, edge],
					});
				}
			}
			return { found: false, nodes: [], edges: [] };
		},

		async listGraphNodes(
			input: ListGraphInput,
			signal?: AbortSignal,
		): Promise<{ items: GraphNodeInput[]; nextCursor?: string }> {
			if (signal?.aborted) throw new Error("Operation aborted.");
			return paginateArray(
				[...graphNodes.values()],
				{
					cursor: input.cursor,
					limit: input.limit,
					defaultLimit: 25,
					maxLimit: 100,
				},
				"graph:nodes",
			);
		},

		async listGraphEdges(
			input: ListGraphInput,
			signal?: AbortSignal,
		): Promise<{ items: GraphEdgeInput[]; nextCursor?: string }> {
			if (signal?.aborted) throw new Error("Operation aborted.");
			return paginateArray(
				[...graphEdges.values()],
				{
					cursor: input.cursor,
					limit: input.limit,
					defaultLimit: 25,
					maxLimit: 100,
				},
				"graph:edges",
			);
		},

		async consolidateMemory(
			input: ConsolidateMemoryInput,
			signal?: AbortSignal,
		): Promise<ConsolidateMemoryResult> {
			if (signal?.aborted) throw new Error("Operation aborted.");
			await ensureReady();
			const apply = input.apply ?? true;
			// Reason over the whole graph snapshot — every active + inactive node
			// and edge — so the plan accounts for the full audit trail, not just
			// the fast-path view. The pure `consolidateGraph` decides; the store
			// stays the source of truth for applying.
			const nodes = await graphStore.queryNodes({ includeInactive: true });
			const edges = await graphStore.queryEdges({ includeInactive: true });
			const plan = consolidateGraph({
				nodes,
				edges,
				...(input.now === undefined ? {} : { now: input.now }),
				...(input.supersedingEdgeType === undefined
					? {}
					: { supersedingEdgeType: input.supersedingEdgeType }),
			});
			if (!apply || !plan.changed) {
				return {
					plan: {
						merges: plan.merges.length,
						retiredEdges: plan.retiredEdges.length,
						retiredNodes: plan.retiredNodes.length,
						changed: plan.changed,
						now: plan.now,
					},
					mergesApplied: 0,
					retirementsApplied: 0,
					applied: false,
				};
			}
			// Apply the plan best-effort (mirrors `autoExtractGraph`): a failing
			// merge/retirement never breaks the whole pass — the graph converges
			// over successive runs.
			const applied = await applyConsolidation(graphStore, plan);
			// Mirror applied retirements into the fast-path maps so list/neighbors
			// reflect them without waiting for a re-hydrate, and prune the disposable
			// lexical index so recall stops serving retired facts (ADR 0009 Component 5
			// staleness loop — the derived index prunes, the files keep everything).
			const retiredNodeIds = new Set(plan.retiredNodes.map((r) => r.id));
			for (const id of retiredNodeIds) {
				const existing = graphNodes.get(id);
				if (!existing) continue;
				graphNodes.set(id, { ...existing, status: "deprecated" });
			}
			for (const r of plan.retiredEdges) {
				for (const edge of graphEdges.values()) {
					if (edge.id !== r.id) continue;
					graphEdges.set(
						edge.id ?? stableEdgeKey(edge.from, edge.type, edge.to),
						{
							...edge,
							status: "deprecated",
						},
					);
				}
			}
			// Merges delete the absorbed node from the store; drop it from the
			// fast-path map so it stops appearing in neighbors/path/list, and prune its
			// lexical doc so it stops surfacing in recall.
			for (const merge of plan.merges) {
				graphNodes.delete(merge.sourceId);
			}
			// Prune the lexical index for every retired and absorbed node. Best-effort.
			pruneLexical([
				...plan.retiredNodes.map((r) => `graph:${r.id}`),
				...plan.merges.map((m) => `graph:${m.sourceId}`),
			]);
			return {
				plan: {
					merges: plan.merges.length,
					retiredEdges: plan.retiredEdges.length,
					retiredNodes: plan.retiredNodes.length,
					changed: plan.changed,
					now: plan.now,
				},
				mergesApplied: applied.mergesApplied,
				retirementsApplied: applied.retirementsApplied,
				applied: true,
			};
		},

		async syncPush(
			_input: SyncPushInput,
			signal?: AbortSignal,
		): Promise<SyncPushResult> {
			if (signal?.aborted) throw new Error("Operation aborted.");
			throw new Error("sync.push is not available in local mode.");
		},

		async syncComplete(
			_input: SyncPushCompleteInput,
			signal?: AbortSignal,
		): Promise<SyncPushCompleteResult> {
			if (signal?.aborted) throw new Error("Operation aborted.");
			throw new Error("sync.complete is not available in local mode.");
		},

		async syncPull(
			_input: SyncPullInput,
			signal?: AbortSignal,
		): Promise<SyncPullResult> {
			if (signal?.aborted) throw new Error("Operation aborted.");
			throw new Error("sync.pull is not available in local mode.");
		},

		async syncStatus(
			_input?: SyncStatusInput,
			signal?: AbortSignal,
		): Promise<SyncStatusResult> {
			if (signal?.aborted) throw new Error("Operation aborted.");
			throw new Error("sync.status is not available in local mode.");
		},

		store,
	};

	/**
	 * Index a memory's chunks into the vector store. Best-effort: the embedder
	 * may be a lazy local ONNX adapter whose optional runtime is missing, or the
	 * recall store may be unavailable. Neither must break the caller's write —
	 * lexical recall (always available) keeps the memory discoverable.
	 *
	 * @internal
	 */
	async function indexDocument(
		text: string,
		meta: {
			sourceType: MemorySourceType;
			sourceId: string;
			sourcePath: string;
			memoryType: MemoryType;
			tags?: string[];
			kind?: string;
			confidence?: number;
		},
	): Promise<void> {
		if (!options.embedder || !options.recallStore) return;
		try {
			const chunks = chunkText(text, {
				source: {
					projectId,
					...(options.tenantId !== undefined
						? { tenantId: options.tenantId }
						: {}),
					sourceType: meta.sourceType,
					sourceId: meta.sourceId,
					sourcePath: meta.sourcePath,
				},
				memoryType: meta.memoryType,
				metadata: {
					...(meta.tags !== undefined ? { tags: meta.tags } : {}),
					...(meta.kind !== undefined ? { kind: meta.kind } : {}),
					...(meta.confidence !== undefined
						? { confidence: meta.confidence }
						: {}),
				},
			});
			if (chunks.length === 0) return;
			const texts = chunks.map((c) => c.text);
			const embedResult = await options.embedder.embedTexts({ texts });
			const docs = chunks.map((c, i) => {
				const embRecord = embedResult.embeddings[i];
				if (!embRecord)
					throw new Error("Mismatch between chunk index and embedding output.");
				const safeRecallId = c.id.replace(/[^A-Za-z0-9._:@#-]/g, "_");
				return {
					id: safeRecallId,
					text: c.text,
					embedding: embRecord.embedding,
					metadata: {
						projectId,
						...(options.tenantId !== undefined
							? { tenantId: options.tenantId }
							: {}),
						sourceType: meta.sourceType,
						sourceId: meta.sourceId,
						memoryType: meta.memoryType,
						...c.metadata,
					},
				};
			});
			await options.recallStore.upsert(docs);
		} catch {
			// The vector index is an enhancement over lexical recall; a missing
			// or failing embedder must never break a write.
		}
	}

	/**
	 * Run the configured graph extractor over a text blob and persist any facts
	 * (nodes + edges) to the graph store and lexical index. Best-effort:
	 * extraction or persistence failures never break the caller.
	 *
	 * The extractor is either a configured LLM adapter or the zero-config
	 * rule-based fallback (ADR 0004); both satisfy the {@link Extractor} contract,
	 * so the write fan-out calls one shape. Contradictions an adapter reports
	 * (same subject + predicate, disagreeing object) become `supersedes` edges
	 * the consolidation pass later consumes to mark facts retired.
	 *
	 * @internal
	 */
	async function autoExtractGraph(
		text: string,
		source: { sourceType: string; sourceId: string },
	): Promise<void> {
		try {
			const sourceRef = {
				sourceType: source.sourceType,
				sourceId: source.sourceId,
			};
			const result = await extractor.extract({
				text,
				sourceRef,
				defaultNodeType: "concept",
			});
			// Normalize any reported contradictions into `supersedes` edges so the
			// graph encodes them uniformly (consolidation reads both shapes, but a
			// single edge stream keeps the store's invariants the source of truth).
			const contradictionEdges: GraphEdge[] = (result.contradictions ?? []).map(
				(c) => ({
					from: c.from,
					to: c.to,
					type: c.type === "" ? "supersedes" : c.type,
					directed: true,
					weight: 0.5,
					confidence: 0.5,
					sourceRefs: [sourceRef],
					metadata: { extractor: extractor.name, contradiction: true },
				}),
			);
			const edges = [...result.edges, ...contradictionEdges];
			if (result.nodes.length === 0 && edges.length === 0) {
				return;
			}
			// Persist nodes first, then mirror into the fast-path map + lexical
			// index so a later edge failure does not discard the nodes.
			if (result.nodes.length > 0) {
				await graphStore.upsertNodes(result.nodes);
				for (const node of result.nodes) {
					graphNodes.set(node.id, toGraphNodeInput(node));
					indexLexical({
						id: `graph:${node.id}`,
						text: `${node.label}${node.summary ? ` ${node.summary}` : ""}`,
					});
				}
			}
			// Edges reference the nodes above; persist best-effort (the store
			// validates references and may reject self-loops or duplicates).
			for (const edge of edges) {
				try {
					await graphStore.upsertEdges([edge]);
					graphEdges.set(stableEdgeKey(edge.from, edge.type, edge.to), {
						directed: true,
						weight: 1,
						...toGraphEdgeInput(edge),
					});
				} catch {
					// Skip an edge that the store rejects; keep the rest.
				}
			}
		} catch {
			// Graph extraction is an enhancement; never block writes/recall.
		}
	}

	async function listRecentMemories(
		limit?: number,
		signal?: AbortSignal,
	): Promise<RecentMemoryResult> {
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
				metadata: entry.metadata as JsonObject,
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
}

import type { JsonObject } from "./types";

function hash(value: string): string {
	return createHash("sha256").update(value).digest("hex");
}

/**
 * Build a {@link HybridCandidate}-shaped object from vector + lexical hits.
 *
 * @internal
 */
function candidateShape(
	id: string,
	vector:
		| { text: string; score: number; metadata?: Record<string, unknown> }
		| undefined,
	lexical:
		| { text: string; score: number; metadata?: Record<string, unknown> }
		| undefined,
) {
	return {
		id,
		text: vector?.text ?? lexical?.text ?? "",
		vectorScore: vector?.score ?? 0,
		lexicalScore: lexical?.score ?? 0,
		...((vector?.metadata ?? lexical?.metadata === undefined)
			? {}
			: {
					metadata: (vector?.metadata ?? lexical?.metadata) as Record<
						string,
						unknown
					>,
				}),
	};
}

/**
 * Stable key for an edge used by the in-memory fast-path maps.
 *
 * @internal
 */
function stableEdgeKey(from: string, type: string, to: string): string {
	return `${from}|${type}|${to}`;
}

/**
 * Coerce a stored graph node into the strategy's lightweight input shape.
 *
 * @internal
 */
function toGraphNodeInput(node: GraphNode): GraphNodeInput {
	return {
		id: node.id,
		type: node.type,
		label: node.label,
		...(node.summary === undefined ? {} : { summary: node.summary }),
		...(node.aliases === undefined ? {} : { aliases: node.aliases }),
		...(node.confidence === undefined ? {} : { confidence: node.confidence }),
		...(node.importance === undefined ? {} : { importance: node.importance }),
		...(node.status === undefined ? {} : { status: node.status }),
		...(node.metadata === undefined ? {} : { metadata: node.metadata }),
		...(node.sourceRefs === undefined ? {} : { sourceRefs: node.sourceRefs }),
	} as GraphNodeInput;
}

/**
 * Coerce a stored graph edge into the strategy's lightweight input shape.
 *
 * @internal
 */
function toGraphEdgeInput(edge: GraphEdge): GraphEdgeInput {
	return {
		id: edge.id,
		from: edge.from,
		to: edge.to,
		type: edge.type,
		directed: edge.directed ?? true,
		...(edge.weight === undefined ? {} : { weight: edge.weight }),
		...(edge.confidence === undefined ? {} : { confidence: edge.confidence }),
		...(edge.dedupeKey === undefined ? {} : { dedupeKey: edge.dedupeKey }),
		...(edge.status === undefined ? {} : { status: edge.status }),
		...(edge.metadata === undefined ? {} : { metadata: edge.metadata }),
		...(edge.sourceRefs === undefined ? {} : { sourceRefs: edge.sourceRefs }),
	} as GraphEdgeInput;
}

function snapshotId(label?: string): string {
	const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
	const suffix = label
		?.trim()
		.toLowerCase()
		.replace(/[^a-z0-9_.-]+/g, "-")
		.replace(/^-+|-+$/g, "");
	return suffix ? `snap_${timestamp}_${suffix}` : `snap_${timestamp}`;
}

function message(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

/**
 * Lazily-loaded Node `fs`/`path` modules for the default agentfs client. These
 * are imported on first agent-session use (not at module load), so importing
 * `local-strategy.ts` in a Worker never pulls `node:fs`. `nodejs_compat`
 * resolves them when a Node runtime actually creates a session; a Worker
 * injects its own `createAgentfsClient` and never reaches this cache.
 */
type NodeFs = typeof import("node:fs/promises");
type NodePath = typeof import("node:path");
let nodeFsPromise: Promise<NodeFs> | undefined;
let nodePathPromise: Promise<NodePath> | undefined;
function loadNodeFs(): Promise<NodeFs> {
	return (nodeFsPromise ??= import("node:fs/promises"));
}
function loadNodePath(): Promise<NodePath> {
	return (nodePathPromise ??= import("node:path"));
}

function createLocalAgentfsClient(opts: {
	store: MemoryStore;
	projectId: string;
	/**
	 * File-replication sync layer. In `hybrid` mode the agentfs session hooks
	 * drive it: `pull`/`push` mirror file replicas of `.tekmemo/` (§6.7), and
	 * `push` runs the full two-phase flow. Omitted in `local`/`memory` modes,
	 * where the hooks stay no-op.
	 */
	syncLayer?: FileSyncLayer;
	/**
	 * Creates a `pre-sync` snapshot. In `hybrid` mode this backs the agentfs
	 * `checkpoint(label)` hook (D6 safety net before push).
	 */
	createSnapshot?(input?: SnapshotMemoryInput): Promise<SnapshotMemoryResult>;
}): AgentfsLikeClient {
	// `process.cwd()` only fires for the Node OSS path where the store exposes no
	// `rootDir` (e.g. a custom store). Workers inject their own client, so this
	// branch is never reached there.
	const rootDir =
		opts.store instanceof Object &&
		"rootDir" in opts.store &&
		typeof opts.store.rootDir === "string"
			? opts.store.rootDir
			: process.cwd();
	const { syncLayer, createSnapshot } = opts;

	return {
		async readText(remotePath: string) {
			const fs = await loadNodeFs();
			const path = await loadNodePath();
			return fs.readFile(resolveAgentPath(path, rootDir, remotePath), "utf8");
		},
		async writeText(remotePath: string, content: string) {
			const fs = await loadNodeFs();
			const path = await loadNodePath();
			const target = resolveAgentPath(path, rootDir, remotePath);
			await fs.mkdir(path.dirname(target), { recursive: true });
			await fs.writeFile(target, content, "utf8");
		},
		async appendText(remotePath: string, content: string) {
			const fs = await loadNodeFs();
			const path = await loadNodePath();
			const target = resolveAgentPath(path, rootDir, remotePath);
			await fs.mkdir(path.dirname(target), { recursive: true });
			await fs.appendFile(target, content, "utf8");
		},
		async exists(remotePath: string) {
			const fs = await loadNodeFs();
			const path = await loadNodePath();
			try {
				await fs.stat(resolveAgentPath(path, rootDir, remotePath));
				return true;
			} catch {
				return false;
			}
		},
		async deleteText(remotePath: string) {
			const fs = await loadNodeFs();
			const path = await loadNodePath();
			const target = resolveAgentPath(path, rootDir, remotePath);
			await fs.rm(target, { force: true });
		},
		sync: {
			// §6.7: in hybrid mode, pull = file-replica pull (download changed
			// files, remove deleted ones, re-derive indexes). No-op otherwise.
			pull: syncLayer
				? async () => {
						await syncLayer.pull();
					}
				: async () => {},
			// §6.7 + §8: in hybrid mode, push = full two-phase push
			// (compute manifest → upload → complete), with a pre-sync snapshot
			// taken inside the layer. No-op otherwise.
			push: syncLayer
				? async () => {
						await syncLayer.pushFull();
					}
				: async () => {},
			// D6: checkpoint = pre-sync snapshot (the safety net before push).
			// `syncAfterSession` calls `checkpoint(label)` before `push()`.
			checkpoint: createSnapshot
				? async (label: string) => {
						await createSnapshot({
							type: "pre-sync",
							label: label || `agentfs-checkpoint-${new Date().toISOString()}`,
						});
					}
				: async () => {},
		},
	};
}

function resolveAgentPath(
	path: NodePath,
	rootDir: string,
	remotePath: string,
): string {
	if (remotePath.includes("\0")) {
		throw new Error("Agent session path contains invalid characters.");
	}
	const relative = remotePath.replace(/^\/+/, "");
	const resolved = path.resolve(rootDir, relative);
	const normalizedRoot = rootDir.endsWith(path.sep)
		? rootDir
		: rootDir + path.sep;
	if (resolved !== rootDir && !resolved.startsWith(normalizedRoot)) {
		throw new Error("Agent session path escaped the workspace root.");
	}
	return resolved;
}
