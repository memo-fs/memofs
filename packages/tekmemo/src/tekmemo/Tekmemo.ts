/**
 * Tekmemo — the single entry point for the TekMemo memory runtime.
 *
 * ```ts
 * import { Tekmemo } from "@tekbreed/tekmemo";
 *
 * const memo = new Tekmemo({ rootDir: "./.tekmemo", projectId: "my-app" });
 * await memo.core.read();
 * await memo.notes.record({ content: "Ship feature X" });
 * await memo.recall("architecture decisions");
 * ```
 *
 * Supports three modes: `"local"` (filesystem engine, no cloud),
 * `"hybrid"` (local engine + cloud file-replica sync), and `"memory"` (volatile,
 * for tests). There is no cloud-engine mode — the cloud is a file replica.
 * Mode is resolved from constructor args > env vars > `.tekmemo/config.json`.
 *
 * @public
 */

import { assertString } from "@repo/utils";
import type { BootstrapMemoryStoreOptions } from "../core/bootstrap/bootstrap-memory-store";
import type { ReadConversationHistoryOptions } from "../core/documents/conversations-memory";
import { writeCoreMemory } from "../core/documents/core-memory";
import type { MemoryEmbedder } from "../core/types/embeddings";
import type { MemoryCommand } from "../core/types/memory-commands";
import type {
	ConversationEntry,
	SnapshotRecord,
	TimestampedNote,
} from "../core/types/memory-documents";
import type { MemoryStore } from "../core/types/memory-store";
import type { Extractor } from "../graph/extraction/extractor";
import type { AgentfsLikeClient, AgentfsMemoryStoreConfig } from "../index";
import {
	AgentfsMemoryStore,
	appendConversationEntry,
	applyTopK,
	bootstrapMemoryStore,
	type CreateTekMemoAgentSessionOptions,
	createInMemoryRecallStore,
	createNodeFsMemoryStore,
	createSnapshotPath,
	createTekMemoAgentSession,
	createTekMemoCloudClient,
	DeterministicFallbackReranker,
	MEMORY_EVENTS_PATH,
	MemoryNotFoundError,
	NOTES_MEMORY_PATH,
	readConversationHistory,
	readSnapshotRecords,
	runMemoryCommand,
	stableSortRerankResults,
	type TekMemoAgentSession,
	type TekMemoCloudClient,
} from "../index";
import { createFsRecallStore } from "../recall/stores/fs-recall-store";
import type { RecallFilter, RecallStore } from "../recall/types";
import {
	type ResolvedTekmemoConfig,
	resolveTekmemoConfig,
	type TekmemoConfig,
} from "./config";
import { createHybridStrategy } from "./hybrid-strategy";
import { createLocalStrategy } from "./local-strategy";
import { createMemoryStrategy } from "./memory-strategy";
import { createFileSyncLayer } from "./sync/file-replication";
import type {
	AgentSessionCompleteInput,
	AgentSessionFileInput,
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
	RecallInput,
	RecallResult,
	RecentMemoryInput,
	RecentMemoryResult,
	RuntimeReadPolicy,
	RuntimeWritePolicy,
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
	TekMemoRuntimeMode,
	ValidateMemoryInput,
	ValidateMemoryResult,
	WriteMemoryInput,
	WriteMemoryResult,
} from "./types";

type Strategy = ReturnType<typeof createLocalStrategy>;

/**
 * The high-level Tekmemo client — the single entry point for all memory operations.
 *
 * @public
 */
export class Tekmemo {
	readonly mode: TekMemoRuntimeMode;
	readonly projectId: string;
	readonly tenantId?: string;
	readonly workspaceId?: string;
	readonly store: MemoryStore;
	readonly embedder?: MemoryEmbedder;
	readonly extractor?: Extractor;
	readonly recallStore?: RecallStore;
	readonly cloud?: TekMemoCloudClient;
	readonly readPolicy: RuntimeReadPolicy;
	readonly writePolicy: RuntimeWritePolicy;
	readonly name: string;
	readonly version: string;
	/** Resolved recall engine configuration. */
	readonly recallConfig: ResolvedTekmemoConfig["recall"];

	private readonly strategy: Strategy;
	private readonly resolved: ResolvedTekmemoConfig;
	private bootstrapped = false;

	readonly core = {
		read: async (signal?: AbortSignal): Promise<string> => {
			const result = await this.strategy.readCoreMemory(signal);
			return result.content;
		},

		update: async (content: string, signal?: AbortSignal): Promise<void> => {
			assertString(content, "content");
			await this.strategy.updateCoreMemory(content, signal);
		},
	};

	readonly notes = {
		read: async (signal?: AbortSignal): Promise<string> => {
			const result = await this.strategy.readNotesMemory(signal);
			return result.content;
		},

		record: async (
			note: Omit<TimestampedNote, "timestamp"> & {
				timestamp?: string;
				tier?: WriteMemoryInput["tier"];
			},
			signal?: AbortSignal,
		): Promise<WriteMemoryResult> => {
			return this.strategy.writeMemory(
				{
					content: note.content,
					kind: note.kind ?? "note",
					...(note.title === undefined ? {} : { title: note.title }),
					...(note.tags === undefined ? {} : { tags: note.tags }),
					...(note.confidence === undefined
						? {}
						: { confidence: note.confidence }),
					...(note.source === undefined ? {} : { source: note.source }),
					...(note.tier === undefined ? {} : { tier: note.tier }),
					...(note.metadata === undefined
						? {}
						: { metadata: note.metadata as WriteMemoryInput["metadata"] }),
				},
				signal,
			);
		},
	};

	readonly conversations = {
		read: async (
			options?: ReadConversationHistoryOptions,
		): Promise<ConversationEntry[]> => {
			await this.ensureBootstrapped();
			try {
				return await readConversationHistory(this.store, options);
			} catch (err) {
				if (err instanceof MemoryNotFoundError) return [];
				throw err;
			}
		},

		append: async (entry: ConversationEntry): Promise<void> => {
			await this.ensureBootstrapped();
			await appendConversationEntry(this.store, entry);
		},
	};

	readonly graph = {
		upsertNodes: async (
			input: {
				nodes: GraphNodeInput[];
				projectId?: string;
				workspaceId?: string;
			},
			signal?: AbortSignal,
		): Promise<{ nodes: GraphNodeInput[] }> => {
			return this.strategy.upsertGraphNodes(input, signal);
		},

		upsertEdges: async (
			input: {
				edges: GraphEdgeInput[];
				projectId?: string;
				workspaceId?: string;
			},
			signal?: AbortSignal,
		): Promise<{ edges: GraphEdgeInput[] }> => {
			return this.strategy.upsertGraphEdges(input, signal);
		},

		neighbors: async (
			input: GraphNeighborsInput,
			signal?: AbortSignal,
		): Promise<{
			items: Array<{
				node: GraphNodeInput;
				edge: GraphEdgeInput;
				direction: "in" | "out";
			}>;
			nextCursor?: string;
		}> => {
			return this.strategy.graphNeighbors(input, signal);
		},

		path: async (
			input: GraphPathInput,
			signal?: AbortSignal,
		): Promise<GraphPathResult> => {
			return this.strategy.graphPath(input, signal);
		},

		listNodes: async (
			input: ListGraphInput,
			signal?: AbortSignal,
		): Promise<{ items: GraphNodeInput[]; nextCursor?: string }> => {
			return this.strategy.listGraphNodes(input, signal);
		},

		listEdges: async (
			input: ListGraphInput,
			signal?: AbortSignal,
		): Promise<{ items: GraphEdgeInput[]; nextCursor?: string }> => {
			return this.strategy.listGraphEdges(input, signal);
		},
	};

	readonly snapshots = {
		create: async (
			input?: SnapshotMemoryInput,
			signal?: AbortSignal,
		): Promise<SnapshotMemoryResult> => {
			return this.strategy.createSnapshot(input, signal);
		},

		list: async (): Promise<SnapshotRecord[]> => {
			await this.ensureBootstrapped();
			try {
				return await readSnapshotRecords(this.store);
			} catch (err) {
				if (err instanceof MemoryNotFoundError) return [];
				throw err;
			}
		},

		restore: async (id: string): Promise<void> => {
			await this.ensureBootstrapped();
			const path = createSnapshotPath(id);
			const raw = await this.store.read(path);
			const parsed = JSON.parse(raw);
			if (parsed.version !== 1 || !parsed.files) {
				throw new Error("Invalid or unsupported snapshot format.");
			}
			const files = parsed.files;
			if (typeof files.core === "string") {
				await writeCoreMemory(this.store, files.core);
			}
			if (typeof files.notes === "string") {
				await this.store.write(NOTES_MEMORY_PATH, files.notes);
			}
			if (Array.isArray(files.events)) {
				const eventLines =
					files.events.map((e: unknown) => JSON.stringify(e)).join("\n") +
					(files.events.length > 0 ? "\n" : "");
				await this.store.write(MEMORY_EVENTS_PATH, eventLines);
			}
		},
	};

	readonly agentfs = {
		createSession: (
			options: Omit<
				CreateTekMemoAgentSessionOptions,
				"memory" | "projectId"
			> & {
				projectId?: string;
			},
		): TekMemoAgentSession => {
			return createTekMemoAgentSession({
				memory: this.store,
				projectId: options.projectId ?? this.projectId,
				...options,
			});
		},

		startSession: async (
			input: AgentSessionStartInput,
			signal?: AbortSignal,
		) => {
			return this.strategy.startAgentSession(input, signal);
		},

		readFile: async (input: AgentSessionFileInput, signal?: AbortSignal) => {
			return this.strategy.readAgentSessionFile(input, signal);
		},

		writeFile: async (input: AgentSessionFileInput, signal?: AbortSignal) => {
			return this.strategy.writeAgentSessionFile(input, signal);
		},

		appendFile: async (input: AgentSessionFileInput, signal?: AbortSignal) => {
			return this.strategy.appendAgentSessionFile(input, signal);
		},

		extract: async (
			input: { sessionId: string; workspaceId?: string; projectId?: string },
			signal?: AbortSignal,
		) => {
			return this.strategy.extractAgentSession(input, signal);
		},

		complete: async (
			input: AgentSessionCompleteInput,
			signal?: AbortSignal,
		) => {
			return this.strategy.completeAgentSession(input, signal);
		},

		store: (
			client: AgentfsLikeClient,
			config: AgentfsMemoryStoreConfig,
		): AgentfsMemoryStore => {
			return new AgentfsMemoryStore(client, config);
		},
	};

	readonly sync = {
		push: async (
			input: SyncPushInput,
			signal?: AbortSignal,
		): Promise<SyncPushResult> => {
			return this.strategy.syncPush(input, signal);
		},

		complete: async (
			input: SyncPushCompleteInput,
			signal?: AbortSignal,
		): Promise<SyncPushCompleteResult> => {
			return this.strategy.syncComplete(input, signal);
		},

		pull: async (
			input: SyncPullInput,
			signal?: AbortSignal,
		): Promise<SyncPullResult> => {
			return this.strategy.syncPull(input, signal);
		},

		status: async (
			input?: SyncStatusInput,
			signal?: AbortSignal,
		): Promise<SyncStatusResult> => {
			return this.strategy.syncStatus(input, signal);
		},
	};

	readonly rerank = {
		sort: stableSortRerankResults,
		applyTopK: applyTopK,
		createFallback: (): DeterministicFallbackReranker => {
			return new DeterministicFallbackReranker();
		},
	};

	constructor(config: TekmemoConfig = {}) {
		this.resolved = resolveTekmemoConfig({ config });

		this.mode = this.resolved.mode;
		this.projectId = this.resolved.projectId;
		this.tenantId = this.resolved.tenantId;
		this.workspaceId = this.resolved.workspaceId;
		this.readPolicy = this.resolved.readPolicy;
		this.writePolicy = this.resolved.writePolicy;
		this.name = this.resolved.name;
		this.version = this.resolved.version;
		this.recallConfig = this.resolved.recall;

		if (this.resolved.store) {
			this.store = this.resolved.store;
		} else {
			this.store = createNodeFsMemoryStore({
				rootDir: this.resolved.rootDir,
				missingFileBehavior: "empty",
				createRoot: true,
			});
		}

		this.embedder = this.resolved.embedder;
		this.extractor = this.resolved.extractor;
		if (this.embedder) {
			// When an embedder is configured, a recall store is needed to persist
			// embeddings. Default to the file-backed store so embeddings survive
			// process restarts (file-first identity); fall back to in-memory for
			// the volatile "memory" mode or when explicitly injected.
			this.recallStore =
				this.resolved.recallStore ??
				(this.resolved.mode === "memory"
					? createInMemoryRecallStore()
					: createFsRecallStore({ store: this.store }));
		} else {
			this.recallStore = this.resolved.recallStore;
		}

		if (this.resolved.cloudClient) {
			this.cloud = this.resolved.cloudClient;
		} else if (this.resolved.cloud) {
			this.cloud = createTekMemoCloudClient(this.resolved.cloud);
		}

		this.strategy = this.createStrategy();
	}

	private createStrategy(): Strategy {
		if (this.resolved.mode === "memory") {
			return createMemoryStrategy({
				name: this.name,
				version: this.version,
			}) as Strategy;
		}

		if (this.resolved.mode === "hybrid") {
			if (!this.cloud) {
				throw new Error(
					"Hybrid mode requires cloud configuration (baseUrl + apiKey) or a cloudClient instance.",
				);
			}
			// The cloud is a file replica, not an engine: the only cloud-facing
			// surface is the file-replication sync layer (§7/§8). The local
			// engine handles recall/memory/graph/extraction/agent sessions.
			//
			// Lazy ref breaks the construction cycle: the sync layer needs the
			// local strategy's `createSnapshot` for its pre-sync snapshot, and
			// the local strategy needs the sync layer to wire the agentfs
			// session hooks. Both callbacks are invoked lazily (only during an
			// actual sync, after construction), so the ref is always set by then.
			let local: ReturnType<typeof createLocalStrategy>;
			const sync = createFileSyncLayer({
				client: this.cloud,
				store: this.store,
				projectId: this.projectId,
				snapshot: (input) => local.createSnapshot(input),
				reindex: () =>
					bootstrapMemoryStore(this.store, { projectId: this.projectId }),
			});
			local = createLocalStrategy({
				store: this.store,
				embedder: this.embedder,
				extractor: this.extractor,
				recallStore: this.recallStore,
				projectId: this.projectId,
				tenantId: this.tenantId,
				autoBootstrap: this.resolved.autoBootstrap,
				name: this.name,
				version: this.version,
				syncLayer: sync,
			});
			return createHybridStrategy({
				local,
				sync,
				readPolicy: this.readPolicy,
				writePolicy: this.writePolicy,
			}) as Strategy;
		}

		return createLocalStrategy({
			store: this.store,
			embedder: this.embedder,
			extractor: this.extractor,
			recallStore: this.recallStore,
			projectId: this.projectId,
			tenantId: this.tenantId,
			autoBootstrap: this.resolved.autoBootstrap,
			name: this.name,
			version: this.version,
		}) as Strategy;
	}

	async recall(
		query: string,
		options?: {
			limit?: number;
			filter?: RecallFilter;
			namespace?: string;
			workspaceId?: string;
			projectId?: string;
		},
	): Promise<RecallResult> {
		return this.strategy.recall(
			{
				query,
				...(options?.limit === undefined ? {} : { limit: options.limit }),
				...(options?.filter === undefined
					? {}
					: { filters: options.filter as RecallInput["filters"] }),
				...(options?.namespace === undefined
					? {}
					: { namespace: options.namespace }),
				...(options?.workspaceId === undefined
					? {}
					: { workspaceId: options.workspaceId }),
				...(options?.projectId === undefined
					? {}
					: { projectId: options.projectId }),
			},
			undefined,
		);
	}

	async context(
		input: MemoryContextInput,
		signal?: AbortSignal,
	): Promise<MemoryContextResult> {
		return this.strategy.context(input, signal);
	}

	async writeMemory(
		input: WriteMemoryInput,
		signal?: AbortSignal,
	): Promise<WriteMemoryResult> {
		return this.strategy.writeMemory(input, signal);
	}

	async listRecentMemories(
		input?: RecentMemoryInput,
		signal?: AbortSignal,
	): Promise<RecentMemoryResult> {
		return this.strategy.listRecentMemories(input, signal);
	}

	async validate(
		input?: ValidateMemoryInput,
		signal?: AbortSignal,
	): Promise<ValidateMemoryResult> {
		return this.strategy.validate(input, signal);
	}

	/**
	 * Run a memory consolidation pass over the local graph.
	 *
	 * Consolidation is a deterministic, local pass that merges duplicate
	 * entities and retires facts superseded by a `supersedes` edge — never
	 * deleting (the audit trail is preserved; facts are marked `deprecated`).
	 * It is the second half of v1 intelligence (ADR 0004): extraction grows the
	 * graph, consolidation keeps it tidy.
	 *
	 * Pass `{ apply: false }` to preview the plan without persisting it.
	 *
	 * @public
	 */
	async consolidate(
		input?: ConsolidateMemoryInput,
		signal?: AbortSignal,
	): Promise<ConsolidateMemoryResult> {
		return this.strategy.consolidateMemory(input ?? {}, signal);
	}

	async health(signal?: AbortSignal): Promise<TekMemoHealthResult> {
		return this.strategy.health(signal);
	}

	async runCommand(command: MemoryCommand): Promise<string> {
		await this.ensureBootstrapped();
		return runMemoryCommand(this.store, command);
	}

	async bootstrap(options?: BootstrapMemoryStoreOptions): Promise<void> {
		await bootstrapMemoryStore(this.store, options);
		this.bootstrapped = true;
	}

	private async ensureBootstrapped(): Promise<void> {
		if (this.bootstrapped) return;
		if (this.resolved.autoBootstrap) {
			await bootstrapMemoryStore(this.store);
		}
		this.bootstrapped = true;
	}
}
