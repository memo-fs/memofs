import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path, { resolve } from "node:path";
import {
	type AgentfsLikeClient,
	createAgentWorkspacePaths,
	createTekMemoAgentSession,
	extractSessionMemory,
} from "@tekmemo/agentfs";
import { createNodeFsMemoryStore } from "@tekmemo/fs";
import {
	appendMemoryEvent,
	appendSnapshotRecord,
	appendTimestampedNote,
	bootstrapMemoryStore,
	createMemoryEvent,
	createSnapshotPath,
	createSnapshotRecord,
	readCoreMemory,
	readManifest,
	readMemoryEventsWithIssues,
	readNotesMemory,
	readSnapshotRecordsWithIssues,
	searchMemoryText,
	writeCoreMemory,
} from "tekmemo";
import type {
	GraphEdgeInput,
	GraphNeighborsInput,
	GraphNodeInput,
	GraphPathInput,
	ListGraphInput,
	MemoryContextInput,
	RecallInput,
	RecallItem,
	RecentMemoryInput,
	SnapshotMemoryInput,
	TekMemoMcpRuntime,
	ValidateMemoryInput,
	WriteMemoryInput,
} from "../types.js";
import { paginateArray } from "../utils/pagination.js";
import { buildRuntimeContext } from "./helpers.js";

export interface LocalTekMemoMcpRuntimeOptions {
	rootDir?: string;
	projectId?: string;
	name?: string;
	version?: string;
	autoBootstrap?: boolean;
}

export function createLocalTekMemoMcpRuntime(
	options: LocalTekMemoMcpRuntimeOptions = {},
): TekMemoMcpRuntime {
	const rootDir = resolve(options.rootDir ?? process.cwd());
	const projectId = options.projectId;
	const store = createNodeFsMemoryStore({
		rootDir,
		missingFileBehavior: "empty",
		createRoot: true,
	});
	const graphNodes = new Map<string, GraphNodeInput>();
	const graphEdges = new Map<string, GraphEdgeInput>();
	let bootstrapped = false;

	async function ensureReady(): Promise<void> {
		if (bootstrapped) return;
		if (options.autoBootstrap !== false) {
			await bootstrapMemoryStore(store, {
				...(projectId === undefined ? {} : { projectId }),
			});
		}
		bootstrapped = true;
	}

	const agentfsClient = createLocalAgentfsClient(rootDir);

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

	async function localRecall(input: RecallInput) {
		await ensureReady();
		const limit = input.limit ?? 10;
		const core = await readCoreMemory(store);
		const notes = await readNotesMemory(store);
		const items: RecallItem[] = [];
		for (const [source, content] of [
			["core", core],
			["notes", notes],
		] as const) {
			const results = searchMemoryText({
				content,
				query: input.query,
				limit,
				mode: "auto",
			});
			for (const result of results) {
				items.push({
					id: `${source}_${result.index}_${hash(result.text).slice(0, 12)}`,
					text: result.text,
					score: result.score,
					metadata: { source, index: result.index },
				});
			}
		}
		items.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
		return { items: items.slice(0, limit) };
	}

	return {
		async health() {
			return {
				ok: true,
				name: options.name ?? "local-tekmemo-runtime",
				version: options.version ?? "0.1.0",
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

		async context(input: MemoryContextInput, signal?: AbortSignal) {
			await ensureReady();
			return buildRuntimeContext(this, input, signal);
		},

		async recall(input: RecallInput) {
			return localRecall(input);
		},

		async writeMemory(input: WriteMemoryInput) {
			await ensureReady();
			const now = new Date().toISOString();
			const id = `mem_${hash(`${now}:${input.content}`).slice(0, 16)}`;
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
					? { source: "mcp" }
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
					actor: { type: "agent", id: "mcp" },
					summary: input.title ?? input.content.slice(0, 160),
					metadata: { id, kind: input.kind ?? "note", tags: input.tags ?? [] },
				}),
			);
			return {
				id,
				created: true,
				...(input.sourceRefs === undefined
					? {}
					: { sourceRefs: input.sourceRefs }),
			};
		},

		async readCoreMemory() {
			await ensureReady();
			return { content: await readCoreMemory(store) };
		},

		async readNotesMemory() {
			await ensureReady();
			return { content: await readNotesMemory(store) };
		},

		async listRecentMemories(input?: RecentMemoryInput) {
			await ensureReady();
			const result = await readMemoryEventsWithIssues(store, {
				malformedLineMode: "skip",
			});
			const limit = input?.limit ?? 20;
			const items = result.entries
				.slice(-limit)
				.reverse()
				.map((entry) => ({
					id: entry.id,
					type: entry.type,
					timestamp: entry.timestamp,
					summary: entry.summary,
					metadata: entry.metadata as never,
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
		},

		async validate(input?: ValidateMemoryInput) {
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

		async createSnapshot(input?: SnapshotMemoryInput) {
			await ensureReady();
			const id = snapshotId(input?.label);
			const path = createSnapshotPath(id);
			const now = new Date().toISOString();
			const files = {
				core: await readCoreMemory(store),
				notes: await readNotesMemory(store),
				events: (
					await readMemoryEventsWithIssues(store, { malformedLineMode: "skip" })
				).entries,
			};
			await store.write(
				path,
				`${JSON.stringify({ version: 1, id, createdAt: now, files }, null, 2)}\n`,
			);
			await appendSnapshotRecord(
				store,
				createSnapshotRecord({
					id,
					type: input?.type ?? "manual",
					createdAt: now,
					metadata: { label: input?.label ?? null, createdBy: "tekmemo-mcp" },
				}),
			);
			return { id, path, created: true };
		},

		async startAgentSession(input) {
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
				paths: session.paths as never,
			};
		},

		async readAgentSessionFile(input) {
			await ensureReady();
			return { content: await agentfsClient.readText(input.path) };
		},

		async writeAgentSessionFile(input) {
			await ensureReady();
			assertWritableAgentSessionPath(input.path);
			await agentfsClient.writeText(input.path, input.content ?? "");
			return { written: true, path: input.path };
		},

		async appendAgentSessionFile(input) {
			await ensureReady();
			assertWritableAgentSessionPath(input.path);
			await agentfsClient.appendText?.(input.path, input.content ?? "");
			return { appended: true, path: input.path };
		},

		async extractAgentSession(input) {
			await ensureReady();
			const paths = createAgentWorkspacePaths(input.sessionId);
			const extracted = await extractSessionMemory(agentfsClient, paths);
			return { sessionId: input.sessionId, extracted: extracted as never };
		},

		async completeAgentSession(input) {
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
				extracted: result.extracted as never,
				durableMemoryWritten: result.durableMemoryWritten,
			};
		},

		async updateCoreMemory(input) {
			await ensureReady();
			await writeCoreMemory(store, input.content);
			await appendMemoryEvent(
				store,
				createMemoryEvent({
					type: "memory.updated",
					...((input.projectId ?? projectId)
						? { projectId: input.projectId ?? projectId }
						: {}),
					actor: { type: "agent", id: "mcp" },
					summary: "Core memory updated by MCP.",
				}),
			);
			return { content: await readCoreMemory(store) };
		},

		async upsertGraphNodes(input) {
			for (const node of input.nodes) graphNodes.set(node.id, node);
			return { nodes: input.nodes };
		},

		async upsertGraphEdges(input) {
			for (const edge of input.edges)
				graphEdges.set(edgeId(edge), { directed: true, weight: 1, ...edge });
			return { edges: input.edges };
		},

		async graphNeighbors(input: GraphNeighborsInput) {
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

		async graphPath(input: GraphPathInput) {
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
				if (current.id === input.to)
					return {
						found: true,
						nodes: current.nodePath,
						edges: current.edgePath,
					};
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

		async listGraphNodes(input: ListGraphInput) {
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

		async listGraphEdges(input: ListGraphInput) {
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
	};
}

function hash(value: string): string {
	return createHash("sha256").update(value).digest("hex");
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

function createLocalAgentfsClient(rootDir: string): AgentfsLikeClient {
	return {
		async readText(remotePath: string) {
			return fs.readFile(resolveAgentPath(rootDir, remotePath), "utf8");
		},
		async writeText(remotePath: string, content: string) {
			const target = resolveAgentPath(rootDir, remotePath);
			await fs.mkdir(path.dirname(target), { recursive: true });
			await fs.writeFile(target, content, "utf8");
		},
		async appendText(remotePath: string, content: string) {
			const target = resolveAgentPath(rootDir, remotePath);
			await fs.mkdir(path.dirname(target), { recursive: true });
			await fs.appendFile(target, content, "utf8");
		},
		async exists(remotePath: string) {
			try {
				await fs.stat(resolveAgentPath(rootDir, remotePath));
				return true;
			} catch {
				return false;
			}
		},
		sync: {
			pull: async () => {},
			push: async () => {},
			checkpoint: async () => {},
		},
	};
}

function resolveAgentPath(rootDir: string, remotePath: string): string {
	const relative = remotePath.replace(/^\/+/, "");
	const resolved = resolve(rootDir, relative);
	if (!resolved.startsWith(rootDir)) {
		throw new Error("Agent session path escaped the workspace root.");
	}
	return resolved;
}
