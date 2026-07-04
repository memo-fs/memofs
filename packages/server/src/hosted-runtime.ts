/**
 * Provider-neutral hosted-runtime factory for TekMemo.
 *
 * @remarks
 * Assembles a {@link Tekmemo} instance for the hosted/server runtime from
 * **injected** adapters — the same engine the cloud runs, with **no provider
 * hardcoding**. The caller supplies its own bundle: a `MemoryStore` (required —
 * the file replica is the foundation), and an optional `embedder` / `reranker`
 * / `extractor` / `llmClient`. This mirrors how {@link createLocalStrategy} in
 * core already works: the strategy assembles from injected slots; the cloud
 * supplies one provider bundle (R2 + Turso + Voyage + Workers AI), an OSS
 * self-hoster supplies another (e.g. S3 + Postgres + OpenAI). The factory is
 * the realization of's "self-host the same engine free" thesis
 * ([CONTEXT.md](../../docs/CONTEXT.md) S3-Q1) — the cloud and the OSS
 * self-hoster run **identical** factory code; the only difference is the
 * adapters injected.
 *
 * ## Scope (slice 0)
 *
 * Slice 0 lands this factory + the {@link LlmClient} core contract. The HTTP
 * surface (`recall` / `context` / `graph` / `memory` over JSON-RPC) is slice 1;
 * the cloud's `apps/cloud/src/server/hosted-runtime.ts` (which hardcodes
 * Voyage + Workers AI from env) is **deleted in slice 2** when the cloud
 * delegates to this shared factory. Today both coexist — the slice-2 deletion
 * is the cutover.
 *
 * ## The deterministic-default seam
 *
 * `store` is required (no memory without files). The intelligence slots
 * (`embedder`, `reranker`, `extractor`, `llmClient`) are **all optional** —
 * each has a zero-config deterministic default the core runtime runs when it is
 * absent (lexical recall, the rule-based extractor, the deterministic
 * `consolidateGraph`, the regex strategist). Inject a provider adapter to
 * upgrade that slot. This is the same "deterministic default + adapter-enhanced"
 * seam the embedder/reranker/extractor/`LlmClient` family locks, expressed once
 * at the factory boundary.
 *
 * @see — the `LlmClient` contract this factory threads.
 * @see {@link Tekmemo} — the client this factory assembles.
 *
 * @public
 */

import {
	type Extractor,
	type LlmClient,
	type MemoryEmbedder,
	type MemoryStore,
	type RecallStore,
	type Reranker,
	Tekmemo,
} from "@tekmemo/core";

/**
 * The injected adapter bundle the hosted runtime assembles from.
 *
 * `store` is required. Every intelligence slot is optional — its deterministic
 * default runs when absent. `projectId` scopes the runtime (the store's
 * `rootKey`); `name` / `version` surface in health output.
 */
export interface HostedRuntimeOptions {
	/** The memory store (the file replica) — required. No memory without files. */
	store: MemoryStore;
	/** The project id scoping this runtime (the store's `rootKey`). */
	projectId: string;
	/** Optional embedder. When omitted, recall is lexical-only (zero config). */
	embedder?: MemoryEmbedder;
	/**
	 * Optional recall store (for persisted embeddings). When an `embedder` is
	 * supplied but this is omitted, the core runtime builds a file-backed recall
	 * store from `store` so embeddings survive restarts.
	 */
	recallStore?: RecallStore;
	/** Optional reranker for hybrid recall. When omitted, the lexical fallback runs. */
	reranker?: Reranker;
	/** Optional graph extractor. When omitted, the zero-config rule-based extractor runs. */
	extractor?: Extractor;
	/**
	 * Optional LLM transport. When omitted, every LLM-enhanced
	 * intelligence feature runs its deterministic default. Slice 0 threads the
	 * seam; the strategist (Q23) and consolidation (Q25a) consume it later.
	 */
	llmClient?: LlmClient;
	/** Runtime name surfaced in health output. Defaults to `"tekmemo-server"`. */
	name?: string;
	/** Runtime version surfaced in health output. Defaults to `"0.1.0"`. */
	version?: string;
}

/**
 * Builds a hosted {@link Tekmemo} runtime from injected adapters.
 *
 * The factory is **provider-neutral**: it never reads env vars, never imports an
 * adapter package, and never hardcodes a provider. Every adapter the runtime
 * uses arrives via {@link HostedRuntimeOptions}. The cloud and the OSS
 * self-hoster pass different bundles; the assembled engine is identical.
 *
 * `store` is the only required slot. Missing it throws a clear error — the
 * store is the foundation, and there is no sensible default (the cloud builds
 * it from R2 + Turso; a self-hoster from S3 + Postgres). Every intelligence slot
 * is optional and degrades to its deterministic default when absent.
 *
 * @returns a ready {@link Tekmemo} instance for the project.
 * @throws {Error} when `store` is omitted (the one required slot).
 *
 * @public
 */
export function createHostedRuntime(options: HostedRuntimeOptions): Tekmemo {
	if (options.store === undefined || options.store === null) {
		throw new Error(
			"createHostedRuntime: `store` is required. The memory store (the file replica) is the foundation of the hosted runtime — there is no default to fall back on.",
		);
	}

	return new Tekmemo({
		store: options.store,
		projectId: options.projectId,
		// The hosted runtime always runs the local engine over the injected store.
		// The cloud is a file replica reached via explicit sync verbs, never an
		// implicit read policy (S3-Q5 / P-Cut) — so `mode: "local"` is correct
		// whether the store is R2 or S3-resident.
		mode: "local",
		...(options.embedder === undefined ? {} : { embedder: options.embedder }),
		...(options.recallStore === undefined
			? {}
			: { recallStore: options.recallStore }),
		...(options.reranker === undefined ? {} : { reranker: options.reranker }),
		...(options.extractor === undefined
			? {}
			: { extractor: options.extractor }),
		...(options.llmClient === undefined
			? {}
			: { llmClient: options.llmClient }),
		autoBootstrap: true,
		name: options.name ?? "tekmemo-server",
		version: options.version ?? "0.1.0",
	});
}
