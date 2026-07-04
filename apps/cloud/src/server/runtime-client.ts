/**
 * In-process hosted runtime client for the single Cloud Worker.
 *
 * The Cloud app no longer delegates hosted-memory reads to a second Worker.
 * Instead, each project resolves to a cached `Tekmemo` instance assembled from
 * the same provider-neutral hosted runtime factory used by the OSS server.
 */
import { type Client, createClient } from "@libsql/client";
import { createR2BlobClient } from "@tekmemo/adapter-r2";
import { createTursoMetadataStore } from "@tekmemo/adapter-turso";
import {
	createVoyageEmbedder,
	createVoyageReranker,
} from "@tekmemo/adapter-voyage";
import { createWorkersAiExtractor } from "@tekmemo/adapter-workers-ai";
import {
	createFsRecallStore,
	RemoteBlobMemoryStore,
	type Tekmemo,
} from "@tekmemo/core";
import { createHostedRuntime } from "@tekmemo/server";
import { CLOUD_NAME, cloudVersion } from "../api/health";
import type { CloudWorkerEnv } from "./env";

/** The read-method surface this client exposes today (slice 2). */
export interface RuntimeClient {
	/** Semantic recall (`Tekmemo.recall`). */
	recall(
		projectId: string,
		query: string,
		options?: { limit?: number },
	): Promise<unknown>;
	/** Task briefing / progressive-disclosure context (`Tekmemo.context`). */
	context(
		projectId: string,
		task: string,
		options?: { detail?: "compact" | "full" },
	): Promise<unknown>;
	/** Read the core-memory document (`Tekmemo.core.read`). */
	readCore(projectId: string): Promise<string>;
	/** Read the notes document (`Tekmemo.notes.read`). */
	readNotes(projectId: string): Promise<string>;
	/** List recent memory events (`Tekmemo.listRecentMemories`). */
	listRecent(
		projectId: string,
		options?: { limit?: number },
	): Promise<unknown>;
}

/** Factory used by tests to supply a fake runtime without cloud providers. */
export type RuntimeFactory = (
	env: CloudWorkerEnv,
	projectId: string,
) => Tekmemo | Promise<Tekmemo>;

/** Optional seams for {@link createRuntimeClient}. */
export interface RuntimeClientOptions {
	createRuntime?: RuntimeFactory;
}

const VOYAGE_EMBED_MODEL = "voyage-3-large";
const VOYAGE_RERANK_MODEL = "rerank-2";

const runtimeCache = new Map<string, Tekmemo>();
const libsqlClients = new Map<string, Client>();

/**
 * Builds or returns the memoized libSQL client for an env.
 *
 * @param env - The Worker env carrying Turso connection settings.
 * @returns A cached libSQL client.
 */
function getLibsqlClient(env: CloudWorkerEnv): Client {
	const key = `${env.DATABASE_URL}\0${env.DATABASE_AUTH_TOKEN ?? ""}`;
	const existing = libsqlClients.get(key);
	if (existing) return existing;
	const client = createClient({
		url: env.DATABASE_URL,
		authToken: env.DATABASE_AUTH_TOKEN,
	});
	libsqlClients.set(key, client);
	return client;
}

/** Builds a hosted `Tekmemo` runtime for one project in the single Worker. */
function createCloudRuntime(env: CloudWorkerEnv, projectId: string): Tekmemo {
	const cacheKey = `${env.DATABASE_URL}\0${projectId}`;
	const cached = runtimeCache.get(cacheKey);
	if (cached) return cached;

	const store = new RemoteBlobMemoryStore({
		blobClient: createR2BlobClient({ binding: env.BLOBS }),
		metadata: createTursoMetadataStore({
			client: getLibsqlClient(env),
			projectId,
		}),
		rootKey: projectId,
	});
	const runtime = createHostedRuntime({
		store,
		projectId,
		recallStore: createFsRecallStore({ store }),
		...(env.VOYAGE_API_KEY === undefined || env.VOYAGE_API_KEY.length === 0
			? {}
			: {
					embedder: createVoyageEmbedder({
						apiKey: env.VOYAGE_API_KEY,
						model: VOYAGE_EMBED_MODEL,
					}),
					reranker: createVoyageReranker({
						apiKey: env.VOYAGE_API_KEY,
						model: VOYAGE_RERANK_MODEL,
					}),
				}),
		...(env.AI === undefined
			? {}
			: { extractor: createWorkersAiExtractor({ ai: env.AI }) }),
		name: CLOUD_NAME,
		version: cloudVersion(),
	});
	runtimeCache.set(cacheKey, runtime);
	return runtime;
}

/**
 * Builds the typed runtime client bound to a Worker env.
 *
 * @param env - The Cloud Worker env.
 * @param options - Optional test seams.
 * @returns The hosted-memory read client.
 */
export function createRuntimeClient(
	env: CloudWorkerEnv,
	options: RuntimeClientOptions = {},
): RuntimeClient {
	const createRuntime = options.createRuntime ?? createCloudRuntime;
	const clientRuntimeCache = new Map<string, Promise<Tekmemo>>();

	function runtime(projectId: string): Promise<Tekmemo> {
		const cached = clientRuntimeCache.get(projectId);
		if (cached) return cached;
		const created = Promise.resolve(createRuntime(env, projectId));
		clientRuntimeCache.set(projectId, created);
		return created;
	}

	return {
		async recall(projectId, query, options) {
			const tekmemo = await runtime(projectId);
			return tekmemo.recall(query, {
				...(options?.limit === undefined ? {} : { limit: options.limit }),
			});
		},
		async context(projectId, task, options) {
			const tekmemo = await runtime(projectId);
			return tekmemo.context({
				query: task,
				...(options?.detail === undefined ? {} : { detail: options.detail }),
			});
		},
		async readCore(projectId) {
			const tekmemo = await runtime(projectId);
			return tekmemo.core.read();
		},
		async readNotes(projectId) {
			const tekmemo = await runtime(projectId);
			return tekmemo.notes.read();
		},
		async listRecent(projectId, options) {
			const tekmemo = await runtime(projectId);
			return tekmemo.listRecentMemories({
				...(options?.limit === undefined ? {} : { limit: options.limit }),
			});
		},
	};
}
