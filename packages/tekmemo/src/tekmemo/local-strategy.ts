/**
 * Local (filesystem-backed) runtime strategy for Tekmemo.
 *
 * Uses a MemoryStore (NodeFsMemoryStore by default) plus core document/event
 * functions to implement the full Tekmemo API surface.
 *
 * @internal
 */

import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path, { resolve } from "node:path";
import type { TekMemoCloudClient } from "../cloud-client/types";
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
	bootstrapMemoryStore,
	CORE_MEMORY_PATH,
	createAgentWorkspacePaths,
	createMemoryEvent,
	createNodeFsMemoryStore,
	createSnapshotPath,
	createSnapshotRecord,
	createTekMemoAgentSession,
	extractSessionMemory,
	NOTES_MEMORY_PATH,
	readCoreMemory,
	readManifest,
	readMemoryEventsWithIssues,
	readNotesMemory,
	readSnapshotRecordsWithIssues,
	searchMemoryText,
	writeCoreMemory,
} from "../index";
import type { RecallStore } from "../recall/types";
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
	MemoryKind,
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

export interface LocalStrategyOptions {
	store: MemoryStore;
	embedder?: MemoryEmbedder;
	recallStore?: RecallStore;
	projectId: string;
	tenantId?: string;
	autoBootstrap: boolean;
	name: string;
	version: string;
}

export function createLocalStrategy(options: LocalStrategyOptions) {
	const { store, projectId } = options;
	const graphNodes = new Map<string, GraphNodeInput>();
	const graphEdges = new Map<string, GraphEdgeInput>();
	let bootstrapped = false;

	async function ensureReady(): Promise<void> {
		if (bootstrapped) return;
		if (options.autoBootstrap) {
			await bootstrapMemoryStore(store, { projectId });
		}
		bootstrapped = true;
	}

	const agentfsClient = createLocalAgentfsClient(options);

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

		if (options.embedder && options.recallStore) {
			const embedResult = await options.embedder.embedText(input.query);
			const results = await options.recallStore.query({
				embedding: embedResult.embedding,
				topK: input.limit ?? 10,
			});
			return {
				items: results.map((r) => ({
					id: r.id,
					text: r.text ?? "",
					...(r.score === undefined ? {} : { score: r.score }),
					...(r.metadata === undefined
						? {}
						: { metadata: r.metadata as JsonObject }),
				})),
			};
		}

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
					listRecentMemories: async (i) => {
						return listRecentMemories(i.limit, signal);
					},
					recall: (i, s) => localRecall(i, s),
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

			if (options.embedder && options.recallStore) {
				const noteText = `${input.title ?? input.content.slice(0, 80)}\n${input.content}`;
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
			if (signal?.aborted) throw new Error("Operation aborted.");
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
					metadata: {
						label: input?.label ?? null,
						createdBy: "tekmemo",
						...(input?.metadata ?? {}),
					},
				}),
			);
			return { id, path, created: true };
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
			for (const node of input.nodes) graphNodes.set(node.id, node);
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
			for (const edge of input.edges)
				graphEdges.set(edgeId(edge), { directed: true, weight: 1, ...edge });
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

		async syncPush(
			_input: SyncPushInput,
			signal?: AbortSignal,
		): Promise<SyncPushResult> {
			if (signal?.aborted) throw new Error("Operation aborted.");
			throw new Error("sync.push is not available in local mode.");
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

function createLocalAgentfsClient(opts: {
	store: MemoryStore;
	projectId: string;
}): AgentfsLikeClient {
	const rootDir =
		opts.store instanceof Object &&
		"rootDir" in opts.store &&
		typeof opts.store.rootDir === "string"
			? opts.store.rootDir
			: process.cwd();

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
	if (remotePath.includes("\0")) {
		throw new Error("Agent session path contains invalid characters.");
	}
	const relative = remotePath.replace(/^\/+/, "");
	const resolved = resolve(rootDir, relative);
	const normalizedRoot = rootDir.endsWith(path.sep)
		? rootDir
		: rootDir + path.sep;
	if (resolved !== rootDir && !resolved.startsWith(normalizedRoot)) {
		throw new Error("Agent session path escaped the workspace root.");
	}
	return resolved;
}

export { createNodeFsMemoryStore };
