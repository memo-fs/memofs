/**
 * Zero-config local embedder for TekMemo, backed by Transformers.js (ONNX in
 * process — no API key, no network after the first model download).
 *
 * The heavy runtime is imported lazily on the first `embedTexts` call so that
 * merely constructing the embedder (e.g. as a default in the MCP runtime) does
 * not pay the WASM init cost until memory is actually recalled.
 *
 * @public
 */

import type {
	EmbeddingRecord,
	EmbedTextsInput,
	EmbedTextsResult,
	MemoryEmbedder,
} from "@tekbreed/tekmemo";
import {
	TransformersInferenceError,
	TransformersValidationError,
} from "./errors";
import type {
	FeatureExtractionPipeline,
	FeatureExtractionPipelineFactory,
	TransformersEmbedderOptions,
	TransformersProgressCallback,
} from "./types";

const DEFAULT_MODEL = "Xenova/all-MiniLM-L6-v2";
const DEFAULT_DEVICE = "cpu";
const DEFAULT_DTYPE = "fp32";
const DEFAULT_BATCH_SIZE = 32;
const MAX_TEXT_LENGTH = 8192;

/**
 * Normalize a pipeline output into a flat `number[]` embedding vector.
 *
 * Transformers.js may return either a `Tensor`-like object with `.data` and
 * `.dims`, or a typed array. We handle both defensively.
 */
function toFlatVector(
	output: { data: number[]; dims: number[] } | Float32Array | unknown,
): number[] {
	if (output instanceof Float32Array) {
		return Array.from(output);
	}
	if (output && typeof output === "object" && "data" in output) {
		const data = (output as { data: unknown }).data;
		if (data instanceof Float32Array) return Array.from(data);
		if (Array.isArray(data)) return data as number[];
	}
	throw new TransformersInferenceError(
		"Transformers pipeline returned an unsupported tensor shape.",
		{ output: String(output).slice(0, 200) },
	);
}

/**
 * Validate raw text inputs before they reach the pipeline.
 */
function validateTexts(
	texts: unknown,
	allowEmptyText?: boolean,
): asserts texts is string[] {
	if (!Array.isArray(texts)) {
		throw new TransformersValidationError("texts must be an array of strings.");
	}
	for (const [index, text] of texts.entries()) {
		if (typeof text !== "string") {
			throw new TransformersValidationError(
				`texts[${index}] must be a string.`,
				{ index },
			);
		}
		if (text.length === 0 && !allowEmptyText) {
			throw new TransformersValidationError(
				`texts[${index}] is empty. Pass allowEmptyText to permit.`,
				{ index },
			);
		}
		if (text.length > MAX_TEXT_LENGTH) {
			throw new TransformersValidationError(
				`texts[${index}] exceeds the ${MAX_TEXT_LENGTH} character limit.`,
				{ index, length: text.length },
			);
		}
	}
}

/**
 * Split an array into batches of `size`.
 */
function batch<T>(items: T[], size: number): T[][] {
	if (size <= 0) return [items];
	const batches: T[][] = [];
	for (let i = 0; i < items.length; i += size) {
		batches.push(items.slice(i, i + size));
	}
	return batches;
}

/**
 * Local ONNX embedder implementing TekMemo's {@link MemoryEmbedder} contract.
 *
 * @public
 */
export class TransformersEmbedder implements MemoryEmbedder {
	private readonly model: string;
	private readonly cacheDir?: string;
	private readonly device: string;
	private readonly dtype: string;
	private readonly batchSize: number;
	private readonly onProgress?: TransformersProgressCallback;
	private readonly pipelineFactory: FeatureExtractionPipelineFactory;

	private pipelinePromise: Promise<FeatureExtractionPipeline> | undefined;
	private inferredDimensions: number | undefined;

	constructor(options: TransformersEmbedderOptions = {}) {
		this.model = options.model ?? DEFAULT_MODEL;
		this.cacheDir = options.cacheDir;
		this.device = options.device ?? DEFAULT_DEVICE;
		this.dtype = options.dtype ?? DEFAULT_DTYPE;
		this.batchSize = options.batchSize ?? DEFAULT_BATCH_SIZE;
		this.onProgress = options.onProgress;
		// Lazy default: only resolved on first use so the heavy runtime is not
		// pulled in at construction time (keeps zero-config boot fast).
		this.pipelineFactory =
			options.pipelineFactory ?? createDefaultPipelineFactory();
	}

	/**
	 * Returns the model id this embedder will use.
	 */
	get modelName(): string {
		return this.model;
	}

	/**
	 * Returns the embedding dimension, once known (after the first call).
	 */
	get dimensions(): number | undefined {
		return this.inferredDimensions;
	}

	async embedText(
		text: string,
		options?: Omit<EmbedTextsInput, "texts">,
	): Promise<EmbeddingRecord> {
		const result = await this.embedTexts({ ...options, texts: [text] });
		const first = result.embeddings[0];
		if (!first) {
			throw new TransformersInferenceError(
				"Transformers pipeline returned no embedding for a single input.",
			);
		}
		return first;
	}

	async embedTexts(input: EmbedTextsInput): Promise<EmbedTextsResult> {
		const allowEmpty = input.allowEmptyText ?? false;
		validateTexts(input.texts, allowEmpty);

		if (input.texts.length === 0) {
			return { embeddings: [], model: this.model, usage: { totalTokens: 0 } };
		}

		const pipeline = await this.loadPipeline();
		const batchSize = input.batchSize ?? this.batchSize;
		const batches = batch(input.texts, batchSize);

		const records: EmbeddingRecord[] = [];
		let approxTokens = 0;

		for (const [batchIndex, texts] of batches.entries()) {
			const raw = await pipeline(texts, {
				pooling: "mean",
				normalize: true,
			});
			const flat = toFlatVector(raw);

			if (this.inferredDimensions === undefined) {
				this.inferredDimensions = flat.length / texts.length;
				if (
					!Number.isInteger(this.inferredDimensions) ||
					this.inferredDimensions <= 0
				) {
					throw new TransformersInferenceError(
						"Could not infer a valid embedding dimension from the pipeline output.",
						{ rawLength: flat.length, batchSize: texts.length },
					);
				}
			}

			const dim = this.inferredDimensions;
			for (const [i, text] of texts.entries()) {
				const start = i * dim;
				const embedding = flat.slice(start, start + dim);
				const originalIndex = batchIndex * batchSize + i;
				// Rough token estimate (words) — used only for usage accounting.
				approxTokens += text.split(/\s+/).filter(Boolean).length;
				records.push({
					text,
					embedding,
					index: originalIndex,
					model: this.model,
					dimensions: dim,
				});
			}
		}

		records.sort((a, b) => a.index - b.index);

		return {
			embeddings: records,
			model: this.model,
			usage: { totalTokens: approxTokens },
		};
	}

	/**
	 * Lazily resolve (and memoize) the feature-extraction pipeline.
	 */
	private loadPipeline(): Promise<FeatureExtractionPipeline> {
		if (this.pipelinePromise) return this.pipelinePromise;
		this.pipelinePromise = this.pipelineFactory({
			model: this.model,
			...(this.cacheDir === undefined ? {} : { cacheDir: this.cacheDir }),
			device: this.device,
			dtype: this.dtype,
			...(this.onProgress === undefined
				? {}
				: { progress_callback: this.onProgress }),
		}).catch((error: unknown) => {
			// Allow a subsequent call to retry instead of caching the rejection.
			this.pipelinePromise = undefined;
			throw new TransformersInferenceError(
				`Failed to load Transformers.js model "${this.model}": ${
					error instanceof Error ? error.message : String(error)
				}`,
			);
		});
		return this.pipelinePromise;
	}
}

/**
 * Factory for the default local embedder.
 *
 * @public
 * @param options - Embedder configuration.
 * @returns A {@link TransformersEmbedder} instance.
 */
export function createTransformersEmbedder(
	options?: TransformersEmbedderOptions,
): TransformersEmbedder {
	return new TransformersEmbedder(options);
}

/**
 * Default lazy factory that dynamically imports Transformers.js only when a
 * pipeline is first requested. This keeps the package import-light for hosts
 * that construct an embedder without ever recalling.
 *
 * @internal
 */
function createDefaultPipelineFactory(): FeatureExtractionPipelineFactory {
	return async (options) => {
		const mod = await import("@huggingface/transformers");
		// `pipeline` is a named export of @huggingface/transformers.
		const pipeline = mod.pipeline as unknown as (
			task: string,
			model: string,
			cfg?: Record<string, unknown>,
		) => Promise<FeatureExtractionPipeline>;
		return pipeline("feature-extraction", options.model, {
			...(options.cacheDir === undefined
				? {}
				: { cache_dir: options.cacheDir }),
			device: options.device,
			dtype: options.dtype,
			...(options.progress_callback === undefined
				? {}
				: { progress_callback: options.progress_callback }),
		});
	};
}
