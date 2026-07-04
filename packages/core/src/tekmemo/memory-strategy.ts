/**
 * In-memory runtime strategy for Tekmemo.
 *
 * Provides a volatile, Map-backed implementation useful for testing and
 * sandbox environments. No data persists after the instance is discarded.
 *
 * @internal
 */

import { NOTES_MEMORY_PATH } from "../core/constants/memory-paths";
import { classifyDurability } from "../security/durability-tier";
import { assertWriteAllowed } from "../security/secret-blocklist";
import { buildContext, paginateArray } from "./helpers";
import { ContextCache } from "./progressive";
import {
	edgeId,
	memoryGraphNeighbors,
	memoryGraphPath,
} from "./memory-strategy/graph";
import { memoryConsolidateMemory } from "./memory-strategy/consolidate";
import { memoryRecall } from "./memory-strategy/recall";
import type { StoredNote } from "./memory-strategy/types";
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
	SyncPushInput,
	SyncPushResult,
	SyncStatusInput,
	SyncStatusResult,
	TekMemoHealthResult,
	ValidateMemoryInput,
	ValidateMemoryResult,
	WriteMemoryInput,
	WriteMemoryResult,
	JsonObject,
} from "./types";

export interface MemoryStrategyOptions {
	name: string;
	version: string;
}

export function createMemoryStrategy(options: MemoryStrategyOptions) {
	const notes = new Map<string, StoredNote>();
	const nodes = new Map<string, GraphNodeInput>();
	const edges = new Map<string, GraphEdgeInput>();
	const contextCache = new ContextCache();

	return {
		async health(signal?: AbortSignal): Promise<TekMemoHealthResult> {
			if (signal?.aborted) throw new Error("Operation aborted.");
			return {
				ok: true,
				name: options.name,
				version: options.version,
				mode: "memory",
				capabilities: [
					"context",
					"recall",
					"remember",
					"graphNodes",
					"graphEdges",
					"graphNeighbors",
					"graphPath",
				],
			};
		},

		async context(
			input: MemoryContextInput,
			signal?: AbortSignal,
		): Promise<MemoryContextResult> {
			return buildContext(
				{
					readCoreMemory: async () => ({ content: "# Core Memory\n" }),
					readNotesMemory: async () => {
						const content = [
							"# Notes",
							...[...notes.values()].map(
								(note) =>
									`## ${note.createdAt} — ${note.title ?? note.id}\n- kind: ${note.kind ?? "note"}\n- tags: ${note.tags?.join(", ") ?? "none"}\n\n${note.content}`,
							),
						].join("\n\n");
						return { content };
					},
					listRecentMemories: async (i) => {
						const limit = i.limit ?? 20;
						return {
							items: [...notes.values()]
								.slice(-limit)
								.reverse()
								.map((note) => ({
									id: note.id,
									type: `memory.${note.kind ?? "note"}`,
									timestamp: note.createdAt,
									summary: note.title ?? note.content.slice(0, 160),
								})),
						};
					},
					recall: (i) => Promise.resolve(memoryRecall(notes, i)),
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
			if (signal?.aborted) throw new Error("Operation aborted.");
			return memoryRecall(notes, input);
		},

		async writeMemory(
			input: WriteMemoryInput,
			signal?: AbortSignal,
		): Promise<WriteMemoryResult> {
			if (signal?.aborted) throw new Error("Operation aborted.");
			assertWriteAllowed(
				[input.content, ...(input.title === undefined ? [] : [input.title])],
				NOTES_MEMORY_PATH,
			);
			const tierDecision = classifyDurability({
				content: input.content,
				...(input.kind === undefined ? {} : { kind: input.kind }),
				...(input.confidence === undefined
					? {}
					: { confidence: input.confidence }),
				...(input.tier === undefined ? {} : { tier: input.tier }),
			});
			const id = input.id ?? `note_${notes.size + 1}`;
			notes.set(id, {
				id,
				content: input.content,
				...(input.kind === undefined ? {} : { kind: input.kind }),
				createdAt: new Date().toISOString(),
				...(input.title === undefined ? {} : { title: input.title }),
				...(input.workspaceId === undefined
					? {}
					: { workspaceId: input.workspaceId }),
				...(input.projectId === undefined
					? {}
					: { projectId: input.projectId }),
				...(input.tags === undefined ? {} : { tags: input.tags }),
			});
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
			return { content: "# Core Memory\n" };
		},

		async readNotesMemory(signal?: AbortSignal): Promise<MemoryDocumentResult> {
			if (signal?.aborted) throw new Error("Operation aborted.");
			const content = [
				"# Notes",
				...[...notes.values()].map(
					(note) =>
						`## ${note.createdAt} — ${note.title ?? note.id}\n- kind: ${note.kind ?? "note"}\n- tags: ${note.tags?.join(", ") ?? "none"}\n\n${note.content}`,
				),
			].join("\n\n");
			return { content };
		},

		async updateCoreMemory(
			_content: string,
			signal?: AbortSignal,
		): Promise<MemoryDocumentResult> {
			if (signal?.aborted) throw new Error("Operation aborted.");
			return { content: "# Core Memory\n" };
		},

		async listRecentMemories(
			input?: RecentMemoryInput,
			signal?: AbortSignal,
		): Promise<RecentMemoryResult> {
			if (signal?.aborted) throw new Error("Operation aborted.");
			const limit = input?.limit ?? 20;
			return {
				items: [...notes.values()]
					.slice(-limit)
					.reverse()
					.map((note) => ({
						id: note.id,
						type: `memory.${note.kind ?? "note"}`,
						timestamp: note.createdAt,
						summary: note.title ?? note.content.slice(0, 160),
						metadata: { tags: note.tags ?? [] } as JsonObject,
					})),
			};
		},

		async validate(
			_input?: ValidateMemoryInput,
			signal?: AbortSignal,
		): Promise<ValidateMemoryResult> {
			if (signal?.aborted) throw new Error("Operation aborted.");
			return { ok: true, warnings: [], errors: [] };
		},

		async createSnapshot(
			_input?: SnapshotMemoryInput,
			signal?: AbortSignal,
		): Promise<SnapshotMemoryResult> {
			if (signal?.aborted) throw new Error("Operation aborted.");
			return { id: `snap_${Date.now()}`, created: true };
		},

		async startAgentSession(
			_input: AgentSessionStartInput,
			signal?: AbortSignal,
		): Promise<AgentSessionResult> {
			if (signal?.aborted) throw new Error("Operation aborted.");
			throw new Error("Agent sessions are not available in memory mode.");
		},

		async readAgentSessionFile(
			_input: AgentSessionFileInput,
			signal?: AbortSignal,
		): Promise<{ content: string }> {
			if (signal?.aborted) throw new Error("Operation aborted.");
			throw new Error("Agent sessions are not available in memory mode.");
		},

		async writeAgentSessionFile(
			_input: AgentSessionFileInput,
			signal?: AbortSignal,
		): Promise<{ written: true; path: string }> {
			if (signal?.aborted) throw new Error("Operation aborted.");
			throw new Error("Agent sessions are not available in memory mode.");
		},

		async appendAgentSessionFile(
			_input: AgentSessionFileInput,
			signal?: AbortSignal,
		): Promise<{ appended: true; path: string }> {
			if (signal?.aborted) throw new Error("Operation aborted.");
			throw new Error("Agent sessions are not available in memory mode.");
		},

		async extractAgentSession(
			_input: { sessionId: string; workspaceId?: string; projectId?: string },
			signal?: AbortSignal,
		): Promise<AgentSessionExtractResult> {
			if (signal?.aborted) throw new Error("Operation aborted.");
			throw new Error("Agent sessions are not available in memory mode.");
		},

		async completeAgentSession(
			_input: AgentSessionCompleteInput,
			signal?: AbortSignal,
		): Promise<AgentSessionExtractResult & { durableMemoryWritten: boolean }> {
			if (signal?.aborted) throw new Error("Operation aborted.");
			throw new Error("Agent sessions are not available in memory mode.");
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
			for (const node of input.nodes) nodes.set(node.id, node);
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
			for (const edge of input.edges) {
				if (!nodes.has(edge.from) || !nodes.has(edge.to)) continue;
				edges.set(edgeId(edge), { directed: true, weight: 1, ...edge });
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
			return memoryGraphNeighbors(nodes, edges, input);
		},

		async graphPath(
			input: GraphPathInput,
			signal?: AbortSignal,
		): Promise<GraphPathResult> {
			if (signal?.aborted) throw new Error("Operation aborted.");
			return memoryGraphPath(nodes, edges, input);
		},

		async listGraphNodes(
			input: ListGraphInput,
			signal?: AbortSignal,
		): Promise<{ items: GraphNodeInput[]; nextCursor?: string }> {
			if (signal?.aborted) throw new Error("Operation aborted.");
			return paginateArray(
				[...nodes.values()],
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
				[...edges.values()],
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
			return memoryConsolidateMemory(nodes, edges, input);
		},

		async syncPush(
			_input: SyncPushInput,
			signal?: AbortSignal,
		): Promise<SyncPushResult> {
			if (signal?.aborted) throw new Error("Operation aborted.");
			throw new Error("sync.push is not available in memory mode.");
		},

		async syncPull(
			_input: SyncPullInput,
			signal?: AbortSignal,
		): Promise<SyncPullResult> {
			if (signal?.aborted) throw new Error("Operation aborted.");
			throw new Error("sync.pull is not available in memory mode.");
		},

		async syncStatus(
			_input?: SyncStatusInput,
			signal?: AbortSignal,
		): Promise<SyncStatusResult> {
			if (signal?.aborted) throw new Error("Operation aborted.");
			throw new Error("sync.status is not available in memory mode.");
		},
	};
}
