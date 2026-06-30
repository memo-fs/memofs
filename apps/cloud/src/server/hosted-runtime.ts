/**
 * Hosted Tekmemo runtime assembly (ADR 0011 Phase 3 — foundation).
 *
 * Builds a hosted `Tekmemo` instance per project, reading/writing the *same*
 * R2 blobs + Turso `project_files` manifest the file-replica sync handler owns
 * (ADR 0012 reuse sub-decision — one set of files, the runtime is a new
 * reader/writer over them, not a parallel store). Intelligence is pinned to:
 *
 *   - **Voyage** for the embedder + reranker (the user's provider choice for the
 *     web/hosted intelligence layer — not OpenAI). Voyage's HTTP client is
 *     Worker-safe (`fetch`-based, no Node coupling).
 *   - **Workers AI** for the frontier extractor (Q18). The `Ai` binding coupling
 *     lives in the adapter, never here.
 *
 * Foundation scope: this assembles the runtime + is exercised by an integration
 * test, but is NOT yet mounted on a public route. A later increment adds the
 * `/v1/projects/:id/memory/*` surface and wraps hosted writes in the phase-1
 * concurrency lock (`acquireWriteLock`) so concurrent hosted + sync writes stay
 * consistent.
 *
 * @see docs/adr/0011-managed-runtime-sequencing.md — Phase 3 sequencing.
 * @see docs/adr/0012-r2-memory-store-adapter.md — the remote-blob store contract.
 */

import {
	createFsRecallStore,
	type Extractor,
	type MemoryEmbedder,
	RemoteBlobMemoryStore,
	type Reranker,
	Tekmemo,
} from "@tekbreed/tekmemo";
import {
	createR2BlobClient,
	createTursoMetadataStore,
} from "@tekbreed/tekmemo-adapter-r2";
import {
	createVoyageEmbedder,
	createVoyageReranker,
} from "@tekbreed/tekmemo-adapter-voyage";
import { createWorkersAiExtractor } from "@tekbreed/tekmemo-adapter-workers-ai";
import { CLOUD_NAME, CLOUD_VERSION } from "../api/health";
import type { Database } from "../db/index.server";
import type { CloudWorkerEnv } from "./env";

/**
 * Default Voyage models for the hosted intelligence layer. The embedder writes
 * `embeddings.jsonl` through the R2 store (content-addressed, shared blobs); the
 * reranker reorders hybrid-recall candidates by semantic relevance.
 */
const VOYAGE_EMBED_MODEL = "voyage-3-large";
const VOYAGE_RERANK_MODEL = "rerank-2";

/**
 * Optional test-only overrides for {@link createHostedRuntime}. Production
 * callers omit these (the Voyage embedder/reranker + Workers AI extractor are
 * built from the env). Tests inject fakes so the integration suite proves the
 * substrate (R2 + Turso reuse) without live network calls.
 */
export interface HostedRuntimeOverrides {
	/** Replaces the Voyage embedder. Test seam only. */
	embedder?: MemoryEmbedder;
	/** Replaces the Voyage reranker. Test seam only. */
	reranker?: Reranker;
	/** Replaces the Workers AI extractor. Test seam only. */
	extractor?: Extractor;
}

/** Options for {@link createHostedRuntime}. */
export interface CreateHostedRuntimeOptions {
	/** The Worker environment (R2 + AI bindings + Voyage key). */
	env: CloudWorkerEnv;
	/** The drizzle client (its raw libSQL client backs the metadata store). */
	db: Database;
	/** The project id scoping this runtime (the store `rootKey`). */
	projectId: string;
	/**
	 * Optional test-only dependency overrides. Omit in production — the hosted
	 * runtime builds the Voyage + Workers AI adapters from the env.
	 */
	overrides?: HostedRuntimeOverrides;
}

/**
 * Builds a hosted `Tekmemo` runtime against R2-resident files for one project.
 *
 * The store is the `RemoteBlobMemoryStore` (ADR 0012): R2 blobs (keyed by sha256,
 * reusing the `BLOBS` binding) + the Turso `project_files` manifest (via
 * `db.$client`). Recall persistence flows through the same store
 * (`embeddings.jsonl` is just another canonical file).
 *
 * @returns a ready {@link Tekmemo} instance for the project.
 */
export function createHostedRuntime(
	options: CreateHostedRuntimeOptions,
): Tekmemo {
	const { env, db, projectId, overrides } = options;

	const store = new RemoteBlobMemoryStore({
		blobClient: createR2BlobClient({ binding: env.BLOBS }),
		metadata: createTursoMetadataStore({ client: db.$client, projectId }),
		rootKey: projectId,
	});

	return new Tekmemo({
		store,
		projectId,
		mode: "local",
		embedder:
			overrides?.embedder ??
			createVoyageEmbedder({
				apiKey: env.VOYAGE_API_KEY,
				model: VOYAGE_EMBED_MODEL,
			}),
		reranker:
			overrides?.reranker ??
			createVoyageReranker({
				apiKey: env.VOYAGE_API_KEY,
				model: VOYAGE_RERANK_MODEL,
			}),
		extractor: overrides?.extractor ?? createWorkersAiExtractor({ ai: env.AI }),
		// Embeddings persist as `.tekmemo/indexes/embeddings.jsonl` through the R2
		// store (a vector index is a later scale choice; this is sufficient for
		// the foundation and keeps one set of files).
		recallStore: createFsRecallStore({ store }),
		autoBootstrap: true,
		name: CLOUD_NAME,
		version: CLOUD_VERSION,
	});
}
