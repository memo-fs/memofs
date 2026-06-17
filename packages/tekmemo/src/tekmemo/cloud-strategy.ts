/**
 * Cloud runtime strategy for Tekmemo.
 *
 * Delegates all operations to a TekMemoCloudClient instance, translating between
 * the unified Tekmemo API types and the cloud client's project-scoped API.
 *
 * @internal
 */

import type {
	SyncEventInput as CloudSyncEvent,
	SyncPullInput as CloudSyncPullInput,
	SyncPushInput as CloudSyncPushInput,
	SyncStatusInput as CloudSyncStatusInput,
	TekMemoCloudClient,
} from "../cloud-client/types";
import { buildContext } from "./helpers";
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

type CloudJsonObject = Record<string, import("../core/types/json").JsonValue>;

export interface CloudStrategyOptions {
	client: TekMemoCloudClient;
	projectId: string;
	name: string;
	version: string;
}

export function createCloudStrategy(options: CloudStrategyOptions) {
	const { client, projectId } = options;

	function requireProjectId(override?: string): string {
		return override ?? projectId;
	}

	return {
		async health(signal?: AbortSignal): Promise<TekMemoHealthResult> {
			try {
				const health = await client.health(signal);
				return {
					ok: health.ok,
					name: health.name ?? options.name,
					version: health.version ?? options.version,
					mode: "cloud",
					capabilities: [
						"context",
						"recall",
						"remember",
						"readCoreMemory",
						"readNotesMemory",
						"listRecentMemories",
						"updateCoreMemory",
						"sync",
						"agentSessions",
						"cloud",
					],
					...(health.warnings?.length ? { warnings: health.warnings } : {}),
				};
			} catch (error) {
				return {
					ok: false,
					name: options.name,
					version: options.version,
					mode: "cloud",
					capabilities: ["cloud"],
					warnings: [error instanceof Error ? error.message : String(error)],
				};
			}
		},

		async context(
			input: MemoryContextInput,
			signal?: AbortSignal,
		): Promise<MemoryContextResult> {
			return buildContext(
				{
					readCoreMemory: async (s) => {
						const doc = await client.memory.readCore({ projectId }, s);
						return { content: doc.content };
					},
					readNotesMemory: async (s) => {
						const page = await client.memory.listNotes(
							{ limit: 50, projectId },
							s,
						);
						return {
							content: formatNotes(page.items),
							...(page.nextCursor
								? { warnings: ["Cloud notes were truncated."] }
								: {}),
						};
					},
					listRecentMemories: async (i, s) => {
						const page = await client.memory.listNotes(
							{ limit: i.limit ?? 20, projectId },
							s,
						);
						return {
							items: page.items.map((note) => ({
								id: note.id,
								type: `note.${note.kind}`,
								...(note.createdAt === undefined
									? {}
									: { timestamp: note.createdAt }),
								summary: note.title ?? truncate(note.content, 160),
							})),
							...(page.nextCursor
								? { warnings: ["Cloud notes were truncated."] }
								: {}),
						};
					},
					recall: async (i, s) => {
						const result = await client.recall.query(
							{
								projectId,
								query: i.query,
								...(i.limit === undefined ? {} : { topK: i.limit }),
								...(i.filters === undefined
									? {}
									: { filters: i.filters as CloudJsonObject }),
							},
							s,
						);
						return {
							items: result.items.map((item) => ({
								id: item.id,
								text: item.text,
								...(item.score === undefined ? {} : { score: item.score }),
								...(item.metadata === undefined
									? {}
									: { metadata: item.metadata as JsonObject }),
								...(item.sourceType || item.sourceId || item.sourcePath
									? {
											sourceRefs: [
												{
													sourceType: item.sourceType ?? "cloud-recall",
													...(item.sourceId === undefined
														? {}
														: { sourceId: item.sourceId }),
													...(item.sourcePath === undefined
														? {}
														: { path: item.sourcePath }),
												},
											],
										}
									: {}),
							})),
							...(result.warnings?.length ? { warnings: result.warnings } : {}),
						};
					},
				},
				input,
				signal,
			);
		},

		async recall(
			input: RecallInput,
			signal?: AbortSignal,
		): Promise<RecallResult> {
			const result = await client.recall.query(
				{
					projectId: requireProjectId(input.projectId),
					query: input.query,
					...(input.limit === undefined ? {} : { topK: input.limit }),
					...(input.filters === undefined
						? {}
						: { filters: input.filters as CloudJsonObject }),
				},
				signal,
			);
			const items: RecallItem[] = result.items.map((item) => ({
				id: item.id,
				text: item.text,
				...(item.score === undefined ? {} : { score: item.score }),
				...(item.metadata === undefined
					? {}
					: { metadata: item.metadata as JsonObject }),
				...(item.sourceType || item.sourceId || item.sourcePath
					? {
							sourceRefs: [
								{
									sourceType: item.sourceType ?? "cloud-recall",
									...(item.sourceId === undefined
										? {}
										: { sourceId: item.sourceId }),
									...(item.sourcePath === undefined
										? {}
										: { path: item.sourcePath }),
								},
							],
						}
					: {}),
			}));
			return {
				items,
				...(result.warnings?.length ? { warnings: result.warnings } : {}),
			};
		},

		async writeMemory(
			input: WriteMemoryInput,
			signal?: AbortSignal,
		): Promise<WriteMemoryResult> {
			const note = await client.memory.createNote(
				{
					projectId: requireProjectId(input.projectId),
					content: input.content,
					kind: input.kind ?? "note",
					...(input.title === undefined ? {} : { title: input.title }),
					...(input.tags === undefined ? {} : { tags: input.tags }),
					...(input.confidence === undefined
						? {}
						: { confidence: input.confidence }),
					...(input.source === undefined
						? { source: "tekmemo" }
						: { source: input.source }),
					metadata: {
						...(input.workspaceId === undefined
							? {}
							: { workspaceId: input.workspaceId }),
						...(input.metadata ?? {}),
					},
				},
				signal,
			);
			return {
				id: note.id,
				created: true,
				...(input.sourceRefs === undefined
					? {}
					: { sourceRefs: input.sourceRefs }),
			};
		},

		async readCoreMemory(signal?: AbortSignal): Promise<MemoryDocumentResult> {
			const doc = await client.memory.readCore({ projectId }, signal);
			return { content: doc.content };
		},

		async readNotesMemory(signal?: AbortSignal): Promise<MemoryDocumentResult> {
			const page = await client.memory.listNotes(
				{ limit: 50, projectId },
				signal,
			);
			return {
				content: formatNotes(page.items),
				...(page.nextCursor
					? {
							warnings: [
								"Cloud notes were truncated. Use list_recent_memories for more.",
							],
						}
					: {}),
			};
		},

		async updateCoreMemory(
			content: string,
			signal?: AbortSignal,
		): Promise<MemoryDocumentResult> {
			const doc = await client.memory.updateCore(
				{ projectId, content },
				signal,
			);
			return { content: doc.content };
		},

		async listRecentMemories(
			input?: RecentMemoryInput,
			signal?: AbortSignal,
		): Promise<RecentMemoryResult> {
			const page = await client.memory.listNotes(
				{
					limit: input?.limit ?? 20,
					projectId: requireProjectId(input?.projectId),
				},
				signal,
			);
			return {
				items: page.items.map((note) => ({
					id: note.id,
					type: `note.${note.kind}`,
					...(note.createdAt === undefined
						? {}
						: { timestamp: note.createdAt }),
					summary: note.title ?? truncate(note.content, 160),
					...(note.metadata === undefined
						? {}
						: { metadata: note.metadata as JsonObject }),
				})),
				...(page.nextCursor
					? { warnings: ["Cloud notes were truncated."] }
					: {}),
			};
		},

		async validate(
			_input?: ValidateMemoryInput,
			signal?: AbortSignal,
		): Promise<ValidateMemoryResult> {
			const warnings: string[] = [];
			const errors: string[] = [];
			try {
				const health = await client.health(signal);
				if (!health.ok) errors.push("cloud health returned ok=false");
				if (health.warnings?.length) warnings.push(...health.warnings);
			} catch (error) {
				errors.push(error instanceof Error ? error.message : String(error));
			}
			try {
				await client.memory.readCore({ projectId }, signal);
			} catch (error) {
				errors.push(
					`core memory read failed: ${error instanceof Error ? error.message : String(error)}`,
				);
			}
			return { ok: errors.length === 0, warnings, errors };
		},

		async createSnapshot(
			_input?: SnapshotMemoryInput,
			signal?: AbortSignal,
		): Promise<SnapshotMemoryResult> {
			if (signal?.aborted) throw new Error("Operation aborted.");
			throw new Error("Cloud snapshots are not available yet.");
		},

		async startAgentSession(
			input: AgentSessionStartInput,
			signal?: AbortSignal,
		): Promise<AgentSessionResult> {
			const session = await client.agentSessions.create(
				{
					projectId: requireProjectId(input.projectId),
					sessionId: input.sessionId ?? `session_${Date.now()}`,
					task: input.task,
					actorId: input.actorId,
					workspaceProvider: "agentfs",
				},
				signal,
			);
			return {
				sessionId: session.sessionId,
				root: session.workspaceRoot ?? "",
				paths: { root: session.workspaceRoot ?? "" },
			};
		},

		async readAgentSessionFile(
			_input: AgentSessionFileInput,
			signal?: AbortSignal,
		): Promise<{ content: string }> {
			if (signal?.aborted) throw new Error("Operation aborted.");
			throw new Error(
				"Agent session file reads are not available in cloud mode.",
			);
		},

		async writeAgentSessionFile(
			_input: AgentSessionFileInput,
			signal?: AbortSignal,
		): Promise<{ written: true; path: string }> {
			if (signal?.aborted) throw new Error("Operation aborted.");
			throw new Error(
				"Agent session file writes are not available in cloud mode.",
			);
		},

		async appendAgentSessionFile(
			_input: AgentSessionFileInput,
			signal?: AbortSignal,
		): Promise<{ appended: true; path: string }> {
			if (signal?.aborted) throw new Error("Operation aborted.");
			throw new Error(
				"Agent session file appends are not available in cloud mode.",
			);
		},

		async extractAgentSession(
			input: { sessionId: string; workspaceId?: string; projectId?: string },
			signal?: AbortSignal,
		): Promise<AgentSessionExtractResult> {
			const extraction = await client.agentSessions.extract(
				{
					projectId: requireProjectId(input.projectId),
					sessionId: input.sessionId,
				},
				signal,
			);
			return {
				sessionId: input.sessionId,
				extracted: extraction as unknown as JsonObject,
			};
		},

		async completeAgentSession(
			input: AgentSessionCompleteInput,
			signal?: AbortSignal,
		): Promise<AgentSessionExtractResult & { durableMemoryWritten: boolean }> {
			const session = await client.agentSessions.complete(
				{
					projectId: requireProjectId(input.projectId),
					sessionId: input.sessionId,
					status: "completed",
					checkpointLabel: input.checkpointLabel,
				},
				signal,
			);
			return {
				sessionId: session.sessionId,
				extracted: {},
				durableMemoryWritten: false,
			};
		},

		async upsertGraphNodes(
			_input: {
				workspaceId?: string;
				projectId?: string;
				nodes: GraphNodeInput[];
			},
			signal?: AbortSignal,
		): Promise<{ nodes: GraphNodeInput[] }> {
			if (signal?.aborted) throw new Error("Operation aborted.");
			throw new Error("Cloud graph APIs are not available yet.");
		},

		async upsertGraphEdges(
			_input: {
				workspaceId?: string;
				projectId?: string;
				edges: GraphEdgeInput[];
			},
			signal?: AbortSignal,
		): Promise<{ edges: GraphEdgeInput[] }> {
			if (signal?.aborted) throw new Error("Operation aborted.");
			throw new Error("Cloud graph APIs are not available yet.");
		},

		async graphNeighbors(
			_input: GraphNeighborsInput,
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
			throw new Error("Cloud graph APIs are not available yet.");
		},

		async graphPath(
			_input: GraphPathInput,
			signal?: AbortSignal,
		): Promise<GraphPathResult> {
			if (signal?.aborted) throw new Error("Operation aborted.");
			throw new Error("Cloud graph APIs are not available yet.");
		},

		async listGraphNodes(
			_input: ListGraphInput,
			signal?: AbortSignal,
		): Promise<{ items: GraphNodeInput[]; nextCursor?: string }> {
			if (signal?.aborted) throw new Error("Operation aborted.");
			throw new Error("Cloud graph APIs are not available yet.");
		},

		async listGraphEdges(
			_input: ListGraphInput,
			signal?: AbortSignal,
		): Promise<{ items: GraphEdgeInput[]; nextCursor?: string }> {
			if (signal?.aborted) throw new Error("Operation aborted.");
			throw new Error("Cloud graph APIs are not available yet.");
		},

		async syncPush(
			input: SyncPushInput,
			signal?: AbortSignal,
		): Promise<SyncPushResult> {
			return client.sync.push(
				{
					projectId: requireProjectId(input.projectId),
					clientId: input.clientId,
					events: input.events as CloudSyncEvent[],
					...(input.checkpoint === undefined
						? {}
						: { checkpoint: input.checkpoint }),
				},
				signal,
			);
		},

		async syncPull(
			input: SyncPullInput,
			signal?: AbortSignal,
		): Promise<SyncPullResult> {
			return client.sync.pull(
				{
					projectId: requireProjectId(input.projectId),
					clientId: input.clientId,
					...(input.sinceServerVersion === undefined
						? {}
						: { sinceServerVersion: input.sinceServerVersion }),
					...(input.limit === undefined ? {} : { limit: input.limit }),
				},
				signal,
			);
		},

		async syncStatus(
			input?: SyncStatusInput,
			signal?: AbortSignal,
		): Promise<SyncStatusResult> {
			return client.sync.status(
				{
					projectId: requireProjectId(input?.projectId),
					...(input?.clientId === undefined
						? {}
						: { clientId: input.clientId }),
				},
				signal,
			);
		},
	};
}

import type { JsonObject } from "./types";

function formatNotes(
	notes: Array<{
		kind: MemoryKind;
		title?: string;
		content: string;
		tags?: string[];
		createdAt?: string;
	}>,
): string {
	if (notes.length === 0) return "# Notes\n\nNo cloud notes found.\n";
	return [
		"# Notes",
		...notes.map((note) => {
			const heading =
				note.title ??
				`${note.kind}${note.createdAt ? ` — ${note.createdAt}` : ""}`;
			const tags = note.tags?.length ? `\n- tags: ${note.tags.join(", ")}` : "";
			return `\n## ${heading}\n- kind: ${note.kind}${tags}\n\n${note.content}`;
		}),
		"",
	].join("\n");
}

function truncate(value: string, max: number): string {
	return value.length <= max ? value : `${value.slice(0, max - 1)}…`;
}
