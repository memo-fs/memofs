/**
 * Tekmemo — the single entry point for the TekMemo memory runtime.
 *
 * @public
 */

import { assertString } from "@repo/utils";
import type {
	CreateTekMemoAgentSessionOptions,
	TekMemoAgentSession,
} from "../agentfs/session/agent-session";
import type { LlmClient } from "../ai-runtime/llm-client";
import type { BootstrapMemoryStoreOptions } from "../core/bootstrap/bootstrap-memory-store";
import type { ReadConversationHistoryOptions } from "../core/documents/conversations-memory";
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
	applyTopK,
	bootstrapMemoryStore,
	createTekMemoCloudClient,
	DeterministicFallbackReranker,
	runMemoryCommand,
	stableSortRerankResults,
	type TekMemoCloudClient,
} from "../index";
import type { RecallFilter, RecallStore } from "../recall/types";
import type { Reranker } from "../rerank/types";
import {
	type ResolvedTekmemoConfig,
	resolveTekmemoConfig,
	type TekmemoConfig,
} from "./config";
import type { createLocalStrategy } from "./local-strategy";
import {
	agentfsCreateSession,
	conversationsAppend,
	conversationsRead,
	coreRead,
	coreUpdate,
	createStrategy,
	notesRead,
	notesRecord,
	snapshotsList,
	snapshotsRestore,
} from "./Tekmemo/delegates";
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
	readonly reranker?: Reranker;
	readonly llmClient?: LlmClient;
	readonly recallStore?: RecallStore;
	readonly cloud?: TekMemoCloudClient;
	readonly readPolicy: RuntimeReadPolicy;
	readonly writePolicy: RuntimeWritePolicy;
	readonly name: string;
	readonly version: string;
	readonly recallConfig: ResolvedTekmemoConfig["recall"];

	private readonly strategy: Strategy;
	private readonly resolved: ResolvedTekmemoConfig;
	private bootstrapped = false;

	readonly core = {
		read: async (signal?: AbortSignal): Promise<string> => {
			return coreRead(this, signal);
		},

		update: async (content: string, signal?: AbortSignal): Promise<void> => {
			return coreUpdate(this, content, signal);
		},
	};

	readonly notes = {
		read: async (signal?: AbortSignal): Promise<string> => {
			return notesRead(this, signal);
		},

		record: async (
			note: Omit<TimestampedNote, "timestamp"> & {
				timestamp?: string;
				tier?: WriteMemoryInput["tier"];
			},
			signal?: AbortSignal,
		): Promise<WriteMemoryResult> => {
			return notesRecord(this, note, signal);
		},
	};

	readonly conversations = {
		read: async (
			options?: ReadConversationHistoryOptions,
		): Promise<ConversationEntry[]> => {
			return conversationsRead(this, options);
		},

		append: async (entry: ConversationEntry): Promise<void> => {
			return conversationsAppend(this, entry);
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
			return snapshotsList(this);
		},

		restore: async (id: string): Promise<void> => {
			return snapshotsRestore(this, id);
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
			return agentfsCreateSession(this, options);
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

		this.store = this.resolved.store as MemoryStore;
		this.embedder = this.resolved.embedder;
		this.extractor = this.resolved.extractor;
		this.reranker = this.resolved.reranker;
		this.llmClient = this.resolved.llmClient;
		this.recallStore = this.resolved.recallStore;
		if (this.resolved.cloudClient) {
			this.cloud = this.resolved.cloudClient;
		} else if (this.resolved.cloud) {
			this.cloud = createTekMemoCloudClient(this.resolved.cloud);
		}

		this.strategy = createStrategy(this, this.resolved);
	}

	/**
	 * Returns the resolved cloud configuration options, if any.
	 *
	 * @internal
	 */
	getCloudOptions():
		| import("../cloud-client/types").TekMemoCloudClientOptions
		| undefined {
		return this.resolved.cloud;
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
