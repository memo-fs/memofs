/**
 * In-process hosted runtime client for the single Cloud Worker.
 *
 * The Cloud app no longer delegates hosted-memory reads to a second Worker.
 * Instead, each project resolves to a cached `MemoFS` instance assembled from
 * the same provider-neutral hosted runtime factory used by the OSS server.
 */

import { env } from "cloudflare:workers";
import { createClient } from "@libsql/client";
import { createR2BlobClient } from "@memofs/adapter-r2";
import { createTursoMetadataStore } from "@memofs/adapter-turso";
import {
	createVoyageEmbedder,
	createVoyageReranker,
} from "@memofs/adapter-voyage";
import { createWorkersAiExtractor } from "@memofs/adapter-workers-ai";
import {
	createFsRecallStore,
	type MemoFS,
	RemoteBlobMemoryStore,
} from "@memofs/core";
import { createHostedRuntime } from "@memofs/server";
import { CLOUD_NAME, cloudVersion } from "./api/health";
import { getDB } from "./db";
import { logMemoryEvent } from "./queries";

/** The read-method surface this client exposes today (slice 2). */
export interface RuntimeClient {
	/** Semantic recall (`MemoFS.recall`). */
	recall(
		projectId: string,
		query: string,
		options?: { limit?: number },
	): Promise<unknown>;
	/** Task briefing / progressive-disclosure context (`MemoFS.context`). */
	context(
		projectId: string,
		task: string,
		options?: { detail?: "compact" | "full" },
	): Promise<unknown>;
	/** Read the core-memory document (`MemoFS.core.read`). */
	readCore(projectId: string): Promise<string>;
	/** Read the notes document (`MemoFS.notes.read`). */
	readNotes(projectId: string): Promise<string>;
	/** List recent memory events (`MemoFS.listRecentMemories`). */
	listRecent(projectId: string, options?: { limit?: number }): Promise<unknown>;
	/** Run a memory consolidation pass (`MemoFS.consolidate`). */
	consolidate(
		projectId: string,
		options?: { apply?: boolean },
	): Promise<unknown>;
}

/** Factory used by tests to supply a fake runtime without cloud providers. */
export type RuntimeFactory = (projectId: string) => MemoFS | Promise<MemoFS>;

/** Optional seams for {@link createRuntimeClient}. */
export interface RuntimeClientOptions {
	createRuntime?: RuntimeFactory;
}

const VOYAGE_EMBED_MODEL = "voyage-3-large";
const VOYAGE_RERANK_MODEL = "rerank-2";

/** Builds a hosted `MemoFS` runtime for one project in the single Worker. */
function createCloudRuntime(projectId: string): MemoFS {
	const client = createClient({
		url: env.DATABASE_URL,
		authToken: env.DATABASE_AUTH_TOKEN,
	});

	const store = new RemoteBlobMemoryStore({
		blobClient: createR2BlobClient({ binding: env.BLOBS! }),
		metadata: createTursoMetadataStore({
			client,
			projectId,
		}),
		rootKey: projectId,
	});
	const runtime = createHostedRuntime({
		store,
		projectId,
		recallStore: createFsRecallStore({ store }),
		...((env.VOYAGE_API_KEY !== undefined || env.VOYAGE_API_KEY.length > 0) && {
			embedder: createVoyageEmbedder({
				apiKey: env.VOYAGE_API_KEY,
				model: VOYAGE_EMBED_MODEL,
			}),
			reranker: createVoyageReranker({
				apiKey: env.VOYAGE_API_KEY,
				model: VOYAGE_RERANK_MODEL,
			}),
		}),
		...(env.AI !== undefined && {
			extractor: createWorkersAiExtractor({ ai: env.AI }),
		}),
		name: CLOUD_NAME,
		version: cloudVersion(),
	});
	return runtime;
}

/**
 * Builds the typed runtime client bound to a Worker env.
 *
 * @param options - Optional test seams.
 * @returns The hosted-memory read client.
 */
export function createRuntimeClient(
	options: RuntimeClientOptions = {},
): RuntimeClient {
	const createRuntime = options.createRuntime ?? createCloudRuntime;
	const clientRuntimeCache = new Map<string, Promise<MemoFS>>();

	function runtime(projectId: string): Promise<MemoFS> {
		const cached = clientRuntimeCache.get(projectId);
		if (cached) return cached;
		const created = Promise.resolve(createRuntime(projectId));
		clientRuntimeCache.set(projectId, created);
		return created;
	}

	return {
		async recall(projectId, query, options) {
			const memofs = await runtime(projectId);
			return memofs.recall(query, {
				...(options?.limit !== undefined && { limit: options.limit }),
			});
		},
		async context(projectId, task, options) {
			const memofs = await runtime(projectId);
			return memofs.context({
				query: task,
				...(options?.detail !== undefined && { detail: options.detail }),
			});
		},
		async readCore(projectId) {
			const memofs = await runtime(projectId);
			return memofs.core.read();
		},
		async readNotes(projectId) {
			const memofs = await runtime(projectId);
			return memofs.notes.read();
		},
		async listRecent(projectId, options) {
			const memofs = await runtime(projectId);
			return memofs.listRecentMemories({
				...(options?.limit !== undefined && { limit: options.limit }),
			});
		},
		async consolidate(projectId, options) {
			const memofs = await runtime(projectId);
			const result = await memofs.consolidate({
				...(options?.apply !== undefined && { apply: options.apply }),
			});

			if (result.applied && env.DATABASE_URL) {
				const merges = result.mergesApplied;
				const retirements = result.retirementsApplied;
				const summary = `Consolidation merged ${merges} node${merges === 1 ? "" : "s"} and retired ${retirements} relation${retirements === 1 ? "" : "s"}.`;
				await logMemoryEvent(getDB(), {
					projectId,
					kind: "consolidation",
					summary,
					actor: "hosted",
				});
			}

			return result;
		},
	};
}
