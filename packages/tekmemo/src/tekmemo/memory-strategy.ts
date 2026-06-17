/**
 * In-memory runtime strategy for Tekmemo.
 *
 * Provides a volatile, Map-backed implementation useful for testing and
 * sandbox environments. No data persists after the instance is discarded.
 *
 * @internal
 */

import { buildContext, paginateArray } from "./helpers";
import type {
	AgentSessionCompleteInput,
	AgentSessionExtractResult,
	AgentSessionFileInput,
	AgentSessionResult,
	AgentSessionStartInput,
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
	RecallItem,
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
} from "./types";

export interface MemoryStrategyOptions {
	name: string;
	version: string;
}

interface StoredNote {
	id: string;
	title?: string;
	content: string;
	kind?: string;
	workspaceId?: string;
	projectId?: string;
	tags?: string[];
	createdAt: string;
}

export function createMemoryStrategy(options: MemoryStrategyOptions) {
	const notes = new Map<string, StoredNote>();
	const nodes = new Map<string, GraphNodeInput>();
	const edges = new Map<string, GraphEdgeInput>();

	function edgeId(edge: GraphEdgeInput): string {
		return (
			edge.id ??
			`${edge.from}|${edge.type}|${edge.to}|${edge.directed ?? true}|${edge.dedupeKey ?? ""}`
		);
	}

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
					recall: (i) => recallImpl(i),
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
			return recallImpl(input);
		},

		async writeMemory(
			input: WriteMemoryInput,
			signal?: AbortSignal,
		): Promise<WriteMemoryResult> {
			if (signal?.aborted) throw new Error("Operation aborted.");
			const id = `note_${notes.size + 1}`;
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
			const direction = input.direction ?? "both";
			const results: Array<{
				node: GraphNodeInput;
				edge: GraphEdgeInput;
				direction: "in" | "out";
			}> = [];
			for (const edge of edges.values()) {
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
					const node = nodes.get(edge.to);
					if (node) results.push({ node, edge, direction: "out" });
				}
				if (
					(direction === "in" || direction === "both") &&
					edge.to === input.nodeId
				) {
					const node = nodes.get(edge.from);
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
			const maxDepth = input.maxDepth ?? 10;
			const start = nodes.get(input.from);
			if (!start) return { found: false, nodes: [], edges: [] };
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
				for (const edge of edges.values()) {
					if (edge.from !== current.id) continue;
					if (input.edgeTypes && !input.edgeTypes.includes(edge.type)) continue;
					if (
						input.minWeight !== undefined &&
						(edge.weight ?? 1) < input.minWeight
					)
						continue;
					if (seen.has(edge.to)) continue;
					const next = nodes.get(edge.to);
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

	async function recallImpl(input: RecallInput): Promise<RecallResult> {
		const query = input.query.toLowerCase();
		const limit = input.limit ?? 10;
		const items: RecallItem[] = [];
		for (const note of notes.values()) {
			if (
				input.workspaceId !== undefined &&
				note.workspaceId !== input.workspaceId
			)
				continue;
			if (input.projectId !== undefined && note.projectId !== input.projectId)
				continue;
			const haystack =
				`${note.title ?? ""}\n${note.content}\n${note.tags?.join(" ") ?? ""}`.toLowerCase();
			if (haystack.includes(query)) {
				items.push({
					id: note.id,
					text: note.content,
					score: 1,
					metadata: {
						title: note.title ?? null,
						createdAt: note.createdAt,
					} as JsonObject,
				});
			}
		}
		return { items: items.slice(0, limit) };
	}
}

import type { JsonObject } from "./types";
