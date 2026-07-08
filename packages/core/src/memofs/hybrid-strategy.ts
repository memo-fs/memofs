/**
 * Hybrid runtime strategy for MemoFS.
 *
 * After the cloud-sync refactor (see `docs/architecture/cloud-sync-and-refactor.md`),
 * `hybrid` means: a local engine (recall, memory CRUD, graph, extraction,
 * agent sessions — all local) **plus** file replication to/from the cloud via
 * a {@link FileSyncLayer}. The cloud is a file replica, never an engine
 * (§0/§5).
 *
 * Reads and writes always go to the local engine. The only cloud-facing
 * surface is the four sync methods (`push`, `complete`, `pull`, `status`),
 * which mirror the frozen cloud-client contract (§7).
 *
 * @internal
 */

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
	MemoFSHealthResult,
	MemoryContextInput,
	MemoryContextResult,
	MemoryDocumentResult,
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
	ValidateMemoryInput,
	ValidateMemoryResult,
	WriteMemoryInput,
	WriteMemoryResult,
} from "./types";

export interface HybridStrategyOptions {
	local: ReturnType<typeof import("./local-strategy").createLocalStrategy>;
	/** File-replication sync layer (the only cloud-facing surface). */
	sync: FileSyncLayer;
	readPolicy: RuntimeReadPolicy;
	writePolicy: RuntimeWritePolicy;
}

export function createHybridStrategy(options: HybridStrategyOptions) {
	const { local, sync } = options;

	return {
		async health(signal?: AbortSignal): Promise<MemoFSHealthResult> {
			const warnings: string[] = [];
			try {
				const localHealth = await local.health(signal);
				if (!localHealth.ok) {
					warnings.push("local runtime reported ok=false");
				}
			} catch (error) {
				warnings.push(`local runtime unhealthy: ${formatError(error)}`);
			}
			// Sync reachability is best-effort: a down cloud does not make the
			// runtime unhealthy, only unable to replicate.
			try {
				await sync.status(undefined, signal);
			} catch (error) {
				warnings.push(`cloud sync unreachable: ${formatError(error)}`);
			}
			return {
				ok: true,
				name: "hybrid-memofs",
				version: "0.1.0",
				mode: "hybrid",
				capabilities: [
					"context",
					"recall",
					"remember",
					"readCoreMemory",
					"readNotesMemory",
					"listRecentMemories",
					"updateCoreMemory",
					"sync",
					"local",
					"hybrid",
				],
				...(warnings.length === 0 ? {} : { warnings }),
			};
		},

		async context(
			input: MemoryContextInput,
			signal?: AbortSignal,
		): Promise<MemoryContextResult> {
			return local.context(input, signal);
		},

		async recall(
			input: RecallInput,
			signal?: AbortSignal,
		): Promise<RecallResult> {
			return local.recall(input, signal);
		},

		async writeMemory(
			input: WriteMemoryInput,
			signal?: AbortSignal,
		): Promise<WriteMemoryResult> {
			return local.writeMemory(input, signal);
		},

		async readCoreMemory(signal?: AbortSignal): Promise<MemoryDocumentResult> {
			return local.readCoreMemory(signal);
		},

		async readNotesMemory(signal?: AbortSignal): Promise<MemoryDocumentResult> {
			return local.readNotesMemory(signal);
		},

		async updateCoreMemory(
			content: string,
			signal?: AbortSignal,
		): Promise<MemoryDocumentResult> {
			return local.updateCoreMemory(content, signal);
		},

		async listRecentMemories(
			input?: RecentMemoryInput,
			signal?: AbortSignal,
		): Promise<RecentMemoryResult> {
			return local.listRecentMemories(input, signal);
		},

		async validate(
			input?: ValidateMemoryInput,
			signal?: AbortSignal,
		): Promise<ValidateMemoryResult> {
			return local.validate(input, signal);
		},

		async createSnapshot(
			input?: SnapshotMemoryInput,
			signal?: AbortSignal,
		): Promise<SnapshotMemoryResult> {
			return local.createSnapshot(input, signal);
		},

		async startAgentSession(
			input: AgentSessionStartInput,
			signal?: AbortSignal,
		): Promise<AgentSessionResult> {
			return local.startAgentSession(input, signal);
		},

		async readAgentSessionFile(
			input: AgentSessionFileInput,
			signal?: AbortSignal,
		): Promise<{ content: string }> {
			return local.readAgentSessionFile(input, signal);
		},

		async writeAgentSessionFile(
			input: AgentSessionFileInput,
			signal?: AbortSignal,
		): Promise<{ written: true; path: string }> {
			return local.writeAgentSessionFile(input, signal);
		},

		async appendAgentSessionFile(
			input: AgentSessionFileInput,
			signal?: AbortSignal,
		): Promise<{ appended: true; path: string }> {
			return local.appendAgentSessionFile(input, signal);
		},

		async extractAgentSession(
			input: { sessionId: string; workspaceId?: string; projectId?: string },
			signal?: AbortSignal,
		): Promise<AgentSessionExtractResult> {
			return local.extractAgentSession(input, signal);
		},

		async completeAgentSession(
			input: AgentSessionCompleteInput,
			signal?: AbortSignal,
		): Promise<AgentSessionExtractResult & { durableMemoryWritten: boolean }> {
			return local.completeAgentSession(input, signal);
		},

		async upsertGraphNodes(
			input: {
				workspaceId?: string;
				projectId?: string;
				nodes: GraphNodeInput[];
			},
			signal?: AbortSignal,
		): Promise<{ nodes: GraphNodeInput[] }> {
			return local.upsertGraphNodes(input, signal);
		},

		async upsertGraphEdges(
			input: {
				workspaceId?: string;
				projectId?: string;
				edges: GraphEdgeInput[];
			},
			signal?: AbortSignal,
		): Promise<{ edges: GraphEdgeInput[] }> {
			return local.upsertGraphEdges(input, signal);
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
			return local.graphNeighbors(input, signal);
		},

		async graphPath(
			input: GraphPathInput,
			signal?: AbortSignal,
		): Promise<GraphPathResult> {
			return local.graphPath(input, signal);
		},

		async listGraphNodes(
			input: ListGraphInput,
			signal?: AbortSignal,
		): Promise<{ items: GraphNodeInput[]; nextCursor?: string }> {
			return local.listGraphNodes(input, signal);
		},

		async listGraphEdges(
			input: ListGraphInput,
			signal?: AbortSignal,
		): Promise<{ items: GraphEdgeInput[]; nextCursor?: string }> {
			return local.listGraphEdges(input, signal);
		},

		async consolidateMemory(
			input: ConsolidateMemoryInput,
			signal?: AbortSignal,
		): Promise<ConsolidateMemoryResult> {
			return local.consolidateMemory(input, signal);
		},

		// --- Sync surface: the four file-replica methods (§7) ---------------

		async syncPush(
			input: SyncPushInput,
			signal?: AbortSignal,
		): Promise<SyncPushResult> {
			return sync.push(input, signal);
		},

		async syncComplete(
			input: SyncPushCompleteInput,
			signal?: AbortSignal,
		): Promise<SyncPushCompleteResult> {
			return sync.complete(input, signal);
		},

		async syncPull(
			input: SyncPullInput,
			signal?: AbortSignal,
		): Promise<SyncPullResult> {
			return sync.pull(input, signal);
		},

		async syncStatus(
			input?: SyncStatusInput,
			signal?: AbortSignal,
		): Promise<SyncStatusResult> {
			return sync.status(input, signal);
		},
	};
}

function formatError(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}
