import {
	createCloudTekMemoRuntime,
	type TekMemoCloudClient,
	TekMemoCloudConfigurationError,
} from "@tekbreed/tekmemo";
import { McpNotFoundError } from "../errors";
import type {
	MemoryContextInput,
	MemoryKind,
	RecallInput,
	RecallItem,
	TekMemoMcpRuntime,
	WriteMemoryInput,
} from "../types";
import { buildRuntimeContext } from "./helpers";

export type TekMemoCloudClientLike = TekMemoCloudClient;

export interface CloudTekMemoMcpRuntimeOptions {
	client: TekMemoCloudClientLike;
	projectId?: string;
	name?: string;
	version?: string;
}

/**
 * Creates an MCP runtime backed by TekMemo Cloud's current project-scoped API.
 *
 * This runtime deliberately talks to @tekbreed/tekmemo/cloud instead of raw URLs.
 * The cloud client owns /api/v1/projects/:projectId route construction,
 * { data, meta } / { error, meta } envelope parsing, retries, timeouts,
 * request IDs, and API-key redaction.
 */
export function createCloudTekMemoMcpRuntime(
	options: CloudTekMemoMcpRuntimeOptions,
): TekMemoMcpRuntime {
	const client = options.client;
	const projectId = options.projectId;
	const cloudRuntime = projectId
		? createCloudTekMemoRuntime({ client, projectId })
		: undefined;

	function requireCloudRuntime() {
		if (!cloudRuntime) {
			throw new TekMemoCloudConfigurationError({
				code: "missing_project_id",
				message:
					"Cloud MCP runtime requires projectId from --project-id, TEKMEMO_PROJECT_ID, or .tekmemo/config.json.",
			});
		}
		return cloudRuntime;
	}

	return {
		async health(signal?: AbortSignal) {
			try {
				const health = await client.health(signal);
				return {
					ok: health.ok,
					name: health.name ?? options.name ?? "cloud-tekmemo-runtime",
					version: health.version ?? options.version ?? "0.1.0",
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
					name: options.name ?? "cloud-tekmemo-runtime",
					version: options.version ?? "0.1.0",
					mode: "cloud",
					capabilities: ["cloud"],
					warnings: [error instanceof Error ? error.message : String(error)],
				};
			}
		},

		async context(input: MemoryContextInput, signal?: AbortSignal) {
			return buildRuntimeContext(this, input, signal);
		},

		async recall(input: RecallInput, signal?: AbortSignal) {
			const runtime = requireCloudRuntime();
			const result = await runtime.recall(
				{
					query: input.query,
					...(input.limit === undefined ? {} : { topK: input.limit }),
					...(input.filters === undefined ? {} : { filters: input.filters }),
				},
				signal,
			);
			const items: RecallItem[] = result.items.map((item) => ({
				id: item.id,
				text: item.text,
				...(item.score === undefined ? {} : { score: item.score }),
				...(item.metadata === undefined ? {} : { metadata: item.metadata }),
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

		async writeMemory(input: WriteMemoryInput, signal?: AbortSignal) {
			const runtime = requireCloudRuntime();
			const note = await runtime.createNote(
				{
					content: input.content,
					kind: input.kind ?? "note",
					...(input.title === undefined ? {} : { title: input.title }),
					...(input.tags === undefined ? {} : { tags: input.tags }),
					...(input.confidence === undefined
						? {}
						: { confidence: input.confidence }),
					...(input.source === undefined
						? { source: "mcp" }
						: { source: input.source }),
					metadata: {
						...(input.workspaceId === undefined
							? {}
							: { workspaceId: input.workspaceId }),
						...(input.projectId === undefined
							? {}
							: { projectId: input.projectId }),
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

		async readCoreMemory(_input, signal?: AbortSignal) {
			const runtime = requireCloudRuntime();
			return { content: (await runtime.readCoreMemory(signal)).content };
		},

		async readNotesMemory(input, signal?: AbortSignal) {
			const runtime = requireCloudRuntime();
			const page = await runtime.listNotes(
				{
					limit:
						input && "limit" in input && typeof input.limit === "number"
							? input.limit
							: 50,
				},
				signal,
			);
			return {
				content: formatNotes(page.items),
				...(page.nextCursor
					? {
							warnings: [
								"Cloud notes were truncated. Use list_recent_memories or cloud note pagination for more.",
							],
						}
					: {}),
			};
		},

		async listRecentMemories(input, signal?: AbortSignal) {
			const runtime = requireCloudRuntime();
			const page = await runtime.listNotes(
				{ limit: input?.limit ?? 20 },
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
					...(note.metadata === undefined ? {} : { metadata: note.metadata }),
				})),
				...(page.nextCursor
					? {
							warnings: [
								"Cloud notes were truncated because more notes are available.",
							],
						}
					: {}),
			};
		},

		async validate(_input, signal?: AbortSignal) {
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
				await requireCloudRuntime().readCoreMemory(signal);
			} catch (error) {
				errors.push(
					`core memory read failed: ${error instanceof Error ? error.message : String(error)}`,
				);
			}
			return { ok: errors.length === 0, warnings, errors };
		},

		async createSnapshot() {
			throw new McpNotFoundError(
				"Cloud snapshots are not available yet. The aligned runbook marks R2 snapshots/exports as a future milestone.",
			);
		},

		async startAgentSession(input, signal) {
			const session = await client.agentSessions.create(
				{
					...((input.projectId ?? projectId)
						? { projectId: input.projectId ?? projectId }
						: {}),
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
				paths: {
					root: session.workspaceRoot ?? "",
				},
			};
		},

		async extractAgentSession(input, signal) {
			const extraction = await client.agentSessions.extract(
				{
					...((input.projectId ?? projectId)
						? { projectId: input.projectId ?? projectId }
						: {}),
					sessionId: input.sessionId,
				},
				signal,
			);
			return { sessionId: input.sessionId, extracted: extraction as never };
		},

		async completeAgentSession(input, signal) {
			const session = await client.agentSessions.complete(
				{
					...((input.projectId ?? projectId)
						? { projectId: input.projectId ?? projectId }
						: {}),
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

		async updateCoreMemory(input, signal?: AbortSignal) {
			const runtime = requireCloudRuntime();
			return {
				content: (
					await runtime.updateCoreMemory({ content: input.content }, signal)
				).content,
			};
		},

		syncPush(input, signal) {
			return requireCloudRuntime().syncPush?.(
				{
					clientId: input.clientId,
					events: input.events,
					...(input.checkpoint === undefined
						? {}
						: { checkpoint: input.checkpoint }),
				},
				signal,
			) as never;
		},
		syncPull(input, signal) {
			return requireCloudRuntime().syncPull?.(
				{
					clientId: input.clientId,
					...(input.sinceServerVersion === undefined
						? {}
						: { sinceServerVersion: input.sinceServerVersion }),
					...(input.limit === undefined ? {} : { limit: input.limit }),
				},
				signal,
			) as never;
		},
		syncStatus(input, signal) {
			return requireCloudRuntime().syncStatus?.(
				input?.clientId === undefined ? {} : { clientId: input.clientId },
				signal,
			) as never;
		},


		upsertGraphNodes: unsupportedGraphWrite,
		upsertGraphEdges: unsupportedGraphWrite,
		graphNeighbors: unsupportedGraphRead,
		graphPath: unsupportedGraphPath,
		listGraphNodes: unsupportedGraphList,
		listGraphEdges: unsupportedGraphList,
	};
}

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

async function unsupportedGraphWrite(): Promise<never> {
	throw new McpNotFoundError(
		"Cloud graph APIs are not available yet. Install/wire @tekbreed/tekmemo/graph in TekMemo Cloud before enabling graph tools in cloud mode.",
	);
}

async function unsupportedGraphRead(): Promise<never> {
	throw new McpNotFoundError(
		"Cloud graph APIs are not available yet. Install/wire @tekbreed/tekmemo/graph in TekMemo Cloud before enabling graph tools in cloud mode.",
	);
}

async function unsupportedGraphPath(): Promise<never> {
	throw new McpNotFoundError(
		"Cloud graph APIs are not available yet. Install/wire @tekbreed/tekmemo/graph in TekMemo Cloud before enabling graph tools in cloud mode.",
	);
}

async function unsupportedGraphList(): Promise<never> {
	throw new McpNotFoundError(
		"Cloud graph APIs are not available yet. Install/wire @tekbreed/tekmemo/graph in TekMemo Cloud before enabling graph resources in cloud mode.",
	);
}
