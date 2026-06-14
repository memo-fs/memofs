import type {
	GraphEdgeInput,
	GraphNeighborsInput,
	GraphNodeInput,
	GraphPathInput,
	ListGraphInput,
	MemoryContextInput,
	RecallInput,
	RecallItem,
	RecallResult,
	RecentMemoryInput,
	TekMemoMcpRuntime,
	WriteMemoryInput,
	WriteMemoryResult,
} from "../types";
import { paginateArray } from "../utils/pagination";
import { buildRuntimeContext } from "./helpers";

export interface InMemoryTekMemoRuntimeOptions {
	name?: string;
	version?: string;
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

export function createInMemoryTekMemoRuntime(
	options: InMemoryTekMemoRuntimeOptions = {},
): TekMemoMcpRuntime {
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
		async health() {
			return {
				ok: true,
				name: options.name ?? "in-memory-tekmemo-runtime",
				version: options.version ?? "0.1.0",
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

		async context(input: MemoryContextInput, signal?: AbortSignal) {
			return buildRuntimeContext(this, input, signal);
		},

		async readCoreMemory() {
			return { content: "# Core Memory\n" };
		},

		async readNotesMemory() {
			const content = [
				"# Notes",
				...[...notes.values()].map(
					(note) =>
						`## ${note.createdAt} — ${note.title ?? note.id}\n- kind: ${note.kind ?? "note"}\n- tags: ${note.tags?.join(", ") ?? "none"}\n\n${note.content}`,
				),
			].join("\n\n");
			return { content };
		},

		async listRecentMemories(input?: RecentMemoryInput) {
			const limit = input?.limit ?? 20;
			const items = [...notes.values()]
				.slice(-limit)
				.reverse()
				.map((note) => ({
					id: note.id,
					type: `memory.${note.kind ?? "note"}`,
					timestamp: note.createdAt,
					summary: note.title ?? note.content.slice(0, 160),
					metadata: { tags: note.tags ?? [] },
				}));
			return { items };
		},

		async validate() {
			return { ok: true, warnings: [], errors: [] };
		},

		async createSnapshot() {
			return { id: `snap_${Date.now()}`, created: true };
		},

		async recall(input: RecallInput): Promise<RecallResult> {
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
						metadata: { title: note.title ?? null, createdAt: note.createdAt },
					});
				}
			}
			return { items: items.slice(0, limit) };
		},

		async writeMemory(input: WriteMemoryInput): Promise<WriteMemoryResult> {
			const id = `note_${notes.size + 1}`;
			const note: StoredNote = {
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
			};
			notes.set(id, note);
			return {
				id,
				created: true,
				...(input.sourceRefs === undefined
					? {}
					: { sourceRefs: input.sourceRefs }),
			};
		},

		async upsertGraphNodes(input: {
			workspaceId?: string;
			nodes: GraphNodeInput[];
		}) {
			for (const node of input.nodes) nodes.set(node.id, node);
			return { nodes: input.nodes };
		},

		async upsertGraphEdges(input: {
			workspaceId?: string;
			edges: GraphEdgeInput[];
		}) {
			for (const edge of input.edges) {
				if (!nodes.has(edge.from) || !nodes.has(edge.to)) {
					// MCP adapter leaves strong endpoint policy to the graph package, but the in-memory test runtime guards obvious mistakes.
					continue;
				}
				edges.set(edgeId(edge), { directed: true, weight: 1, ...edge });
			}
			return { edges: input.edges };
		},

		async graphNeighbors(input: GraphNeighborsInput) {
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

		async graphPath(input: GraphPathInput) {
			const maxDepth = input.maxDepth ?? 10;
			const queue: Array<{
				id: string;
				nodePath: GraphNodeInput[];
				edgePath: GraphEdgeInput[];
			}> = [];
			const start = nodes.get(input.from);
			if (!start) return { found: false, nodes: [], edges: [] };
			queue.push({ id: input.from, nodePath: [start], edgePath: [] });
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

		async listGraphNodes(input: ListGraphInput) {
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

		async listGraphEdges(input: ListGraphInput) {
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
	};
}
