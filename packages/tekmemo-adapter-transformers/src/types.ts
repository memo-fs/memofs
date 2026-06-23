/**
 * Public types for the Transformers.js local embedder adapter.
 *
 * @public
 */

import type {
	EmbeddingRecord,
	EmbedTextsInput,
	EmbedTextsResult,
	MemoryEmbedder,
} from "@tekbreed/tekmemo";

export type {
	EmbeddingRecord,
	EmbedTextsInput,
	EmbedTextsResult,
	MemoryEmbedder,
};

/**
 * Progress callback invoked while the ONNX model weights are downloaded or
 * loaded from cache. Useful for surfacing a one-time "warming up" notice to
 * users on first run.
 *
 * @public
 */
export type TransformersProgressCallback = (info: {
	/** Overall progress fraction between 0 and 1. */
	progress: number;
	/** Human-readable status from the runtime (e.g. "download", "decode"). */
	status: string;
	/** Filename or resource name when applicable. */
	file?: string;
}) => void;

/**
 * Options for {@link createTransformersEmbedder}.
 *
 * @public
 */
export interface TransformersEmbedderOptions {
	/**
	 * Hugging Face model id (or a local path under `cacheDir`) supported by
	 * Transformers.js. Defaults to a small, fast sentence-embedding model that
	 * needs no API key and downloads once.
	 * @defaultValue `"Xenova/all-MiniLM-L6-v2"`
	 */
	model?: string;
	/**
	 * Directory used to cache downloaded ONNX weights. Defaults to a
	 * `.tekmemo/models` directory when resolved by the runtime, or the
	 * Transformers.js default cache otherwise.
	 */
	cacheDir?: string;
	/**
	 * Optional callback for model download/load progress. Use this to tell a
	 * user the first embedding call is warming up.
	 */
	onProgress?: TransformersProgressCallback;
	/**
	 * Device to run inference on. Defaults to `"cpu"`. Use `"gpu"` or `"wasm"`
	 * when the runtime supports it.
	 * @defaultValue `"cpu"`
	 */
	device?: "cpu" | "gpu" | "wasm";
	/**
	 * ONNX runtime data type. `"fp32"` is safest across platforms.
	 * @defaultValue `"fp32"`
	 */
	dtype?: "fp32" | "fp16" | "q8" | "int8";
	/**
	 * Maximum texts per inference batch. Larger batches trade memory for
	 * throughput.
	 * @defaultValue `32`
	 */
	batchSize?: number;
	/**
	 * Optional injected pipeline factory for testing. When omitted, the real
	 * Transformers.js `pipeline` is used (loaded lazily on first call).
	 * @internal
	 */
	pipelineFactory?: FeatureExtractionPipelineFactory;
}

/**
 * Minimal shape of a Transformers.js feature-extraction pipeline.
 *
 * Kept structural so this package does not export the heavy runtime types
 * publicly; it is only used internally and for test injection.
 *
 * @internal
 */
export type FeatureExtractionPipeline = (
	inputs: string[],
	options: {
		pooling: "mean";
		normalize: boolean;
	},
) => Promise<{ data: number[]; dims: number[] } | Float32Array>;

/**
 * Factory that resolves a feature-extraction pipeline (lazy-loaded).
 *
 * @internal
 */
export type FeatureExtractionPipelineFactory = (options: {
	model: string;
	cacheDir?: string;
	device?: string;
	dtype?: string;
	progress_callback?: TransformersProgressCallback;
}) => Promise<FeatureExtractionPipeline>;
