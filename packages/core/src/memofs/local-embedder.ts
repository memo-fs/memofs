/**
 * @file Lazy local embedder — a {@link MemoryEmbedder} proxy that defers the
 * (optional) `@memofs/adapter-transformers` runtime to the first call.
 *
 * @remarks
 * This keeps the core package dependency-free: the transformers adapter is an
 * optional peer, dynamically imported only when an embedding is actually
 * requested. If the adapter is not installed, recall gracefully falls back to
 * the lexical (BM25 + fuzzy) path — no hard failure, no broken boot.
 *
 * The proxy is synchronous to construct, so the MCP runtime factory can wire
 * it up without becoming async (the adapter import is deferred to `embedTexts`).
 *
 * @public
 */

import {
	DEFAULT_LOCAL_EMBEDDING_MODEL,
	type EmbeddingRecord,
	type EmbedTextsInput,
	type EmbedTextsResult,
	type MemoryEmbedder,
} from "../core/types/embeddings";

/**
 * Options for {@link createLazyLocalEmbedder}.
 *
 * @public
 */
export interface LazyLocalEmbedderOptions {
	/**
	 * Transformers.js-compatible model id. Loaded by the adapter on first use.
	 * @defaultValue {@link DEFAULT_LOCAL_EMBEDDING_MODEL}
	 */
	model?: string;
	/**
	 * Module specifier of the adapter to dynamically import. Overridable for tests.
	 * @defaultValue `"@memofs/adapter-transformers"`
	 */
	adapterModule?: string;
	/**
	 * Optional cache directory forwarded to the adapter (ONNX model cache).
	 */
	cacheDir?: string;
	/**
	 * Optional progress callback forwarded to the adapter during model
	 * download/load. Use this to surface a "warming up" notice to users on
	 * first run.
	 */
	onProgress?: (info: {
		progress: number;
		status: string;
		file?: string;
	}) => void;
	/**
	 * Injected factory for tests so the dynamic import is not exercised. When
	 * provided, it must return a {@link MemoryEmbedder}.
	 */
	adapterFactory?: (options: {
		model: string;
		cacheDir?: string;
		onProgress?: (info: {
			progress: number;
			status: string;
			file?: string;
		}) => void;
	}) => Promise<MemoryEmbedder>;
}

/**
 * Create a lazy {@link MemoryEmbedder} backed by the local ONNX adapter.
 *
 * The underlying model is not loaded until the first `embedText`/`embedTexts`
 * call. If the adapter package is missing at runtime, the methods reject with a
 * clear error so callers (the local strategy) can fall back to lexical recall.
 *
 * @public
 * @param options - Embedder configuration.
 * @returns A {@link MemoryEmbedder} proxy with lazy initialization.
 */
export function createLazyLocalEmbedder(
	options: LazyLocalEmbedderOptions = {},
): MemoryEmbedder {
	const model = options.model ?? DEFAULT_LOCAL_EMBEDDING_MODEL;
	const adapterModule = options.adapterModule ?? "@memofs/adapter-transformers";

	let embedderPromise: Promise<MemoryEmbedder> | undefined;

	async function loadEmbedder(): Promise<MemoryEmbedder> {
		if (embedderPromise) return embedderPromise;
		embedderPromise = (async () => {
			if (options.adapterFactory) {
				return options.adapterFactory({
					model,
					...(options.cacheDir === undefined
						? {}
						: { cacheDir: options.cacheDir }),
					...(options.onProgress === undefined
						? {}
						: { onProgress: options.onProgress }),
				});
			}
			// Dynamic import keeps the adapter an optional peer dependency.
			// `import(variable)` requires the relative-specifier form to be valid
			// for the bundler; we pass the bare specifier directly.
			const mod = (await import(adapterModule)) as {
				createTransformersEmbedder?: (opts: {
					model: string;
					cacheDir?: string;
					onProgress?: (info: {
						progress: number;
						status: string;
						file?: string;
					}) => void;
				}) => MemoryEmbedder;
			};
			const factory = mod.createTransformersEmbedder;
			if (typeof factory !== "function") {
				throw new Error(
					`Local embeddings are enabled but "${adapterModule}" did not export createTransformersEmbedder. Install it to enable hybrid recall.`,
				);
			}
			return factory({
				model,
				...(options.cacheDir === undefined
					? {}
					: { cacheDir: options.cacheDir }),
				...(options.onProgress === undefined
					? {}
					: { onProgress: options.onProgress }),
			});
		})().catch((error: unknown) => {
			// Allow a subsequent call to retry instead of caching the rejection.
			embedderPromise = undefined;
			throw new Error(
				`Failed to initialize the local embedder: ${
					error instanceof Error ? error.message : String(error)
				}`,
			);
		});
		return embedderPromise;
	}

	return {
		async prewarm(): Promise<void> {
			await loadEmbedder();
		},
		async embedTexts(input: EmbedTextsInput): Promise<EmbedTextsResult> {
			const embedder = await loadEmbedder();
			return embedder.embedTexts(input);
		},
		async embedText(
			text: string,
			options?: Omit<EmbedTextsInput, "texts">,
		): Promise<EmbeddingRecord> {
			const embedder = await loadEmbedder();
			return embedder.embedText(text, options);
		},
		async embedQuery(
			text: string,
			options?: Omit<EmbedTextsInput, "texts" | "purpose">,
		): Promise<EmbeddingRecord> {
			const embedder = await loadEmbedder();
			// Adapters without query-side handling degrade to the generic path.
			if (!embedder.embedQuery) return embedder.embedText(text, options);
			return embedder.embedQuery(text, options);
		},
	};
}
