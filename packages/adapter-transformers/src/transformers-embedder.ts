/**
 * Zero-config local embedder for MemoFS, backed by Transformers.js (ONNX in
 * process — no API key, no network after the first model download).
 *
 * The heavy runtime is imported lazily on the first `embedTexts` call so that
 * merely constructing the embedder (e.g. as a default in the MCP runtime) does
 * not pay the WASM init cost until memory is actually recalled.
 *
 * @public
 */

import {
	DEFAULT_LOCAL_EMBEDDING_MODEL,
	type EmbeddingRecord,
	type EmbedTextsInput,
	type EmbedTextsResult,
	type MemoryEmbedder,
} from "@memofs/core";
import { omitUndefined, withRetry } from "@repo/utils";
import {
	TransformersInferenceError,
	TransformersValidationError,
} from "./errors";
import { resolveModelCacheDir } from "./model-cache";
import type {
	FeatureExtractionPipeline,
	FeatureExtractionPipelineFactory,
	TransformersEmbedderOptions,
	TransformersProgressCallback,
} from "./types";

const DEFAULT_DEVICE = "cpu";
const DEFAULT_DTYPE = "q8";
const DEFAULT_BATCH_SIZE = 32;
const DEFAULT_RETRIES = 2;
const MAX_TEXT_LENGTH = 8192;

/**
 * Per-family instruction prefixes for asymmetric embedding models.
 *
 * Models like bge, e5, and nomic are instruction-tuned: they expect (or
 * recommend) different text prefixes on the query side vs the document side.
 * Prefix-less models (all-MiniLM, gte, paraphrase-*) are symmetric — no
 * prefixes apply. Matched by substring so versioned ids (e.g.
 * `Xenova/multilingual-e5-small`) resolve without an exact allowlist.
 */
const INSTRUCTION_PREFIXES: Array<{
	matches: (model: string) => boolean;
	query?: string;
	document?: string;
}> = [
	{
		// bge v1.5 en embedders (NOT rerankers — those are cross-encoders).
		matches: (m) => m.includes("bge-") && !m.includes("reranker"),
		query: "Represent this sentence for searching relevant passages: ",
	},
	{
		matches: (m) => m.includes("e5"),
		query: "query: ",
		document: "passage: ",
	},
	{
		matches: (m) => m.includes("nomic"),
		query: "search_query: ",
		document: "search_document: ",
	},
];

/**
 * Resolve the instruction prefixes for a model id.
 *
 * @internal
 */
export function instructionPrefixesFor(model: string): {
	query?: string;
	document?: string;
} {
	const lowered = model.toLowerCase();
	for (const entry of INSTRUCTION_PREFIXES) {
		if (entry.matches(lowered)) {
			return { query: entry.query, document: entry.document };
		}
	}
	return {};
}

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
 * Determine whether a pipeline-load failure is worth retrying.
 *
 * Transformers.js model loading is a network operation on first download and
 * a local file operation thereafter. We retry on network-like failures
 * (fetch errors, connection resets, timeouts) but not on configuration or
 * model-not-found errors, where retrying would only waste time.
 *
 * @param error - The error thrown by the pipeline factory.
 * @returns `true` when the error looks transient and a retry may succeed.
 */
function isPipelineLoadRetryable(error: unknown): boolean {
	if (!(error instanceof Error)) return false;
	const message = error.message.toLowerCase();
	return (
		message.includes("network") ||
		message.includes("fetch") ||
		message.includes("econnrefused") ||
		message.includes("etimedout") ||
		message.includes("enotfound") ||
		message.includes("socket hang up") ||
		message.includes("timeout")
	);
}

/**
 * Local ONNX embedder implementing MemoFS's {@link MemoryEmbedder} contract.
 *
 * @public
 */
export class TransformersEmbedder implements MemoryEmbedder {
	private readonly model: string;
	private readonly cacheDir: string;
	private readonly device: string;
	private readonly dtype: string;
	private readonly batchSize: number;
	private readonly retries: number;
	private readonly onProgress?: TransformersProgressCallback;
	private readonly pipelineFactory: FeatureExtractionPipelineFactory;

	private pipelinePromise: Promise<FeatureExtractionPipeline> | undefined;
	private inferredDimensions: number | undefined;

	constructor(options: TransformersEmbedderOptions = {}) {
		this.model = options.model ?? DEFAULT_LOCAL_EMBEDDING_MODEL;
		// Always explicit: a shared user-level cache means weights download
		// once per machine instead of once per process working directory.
		this.cacheDir = options.cacheDir ?? resolveModelCacheDir();
		this.device = options.device ?? DEFAULT_DEVICE;
		this.dtype = options.dtype ?? DEFAULT_DTYPE;
		this.batchSize = options.batchSize ?? DEFAULT_BATCH_SIZE;
		this.retries = options.retries ?? DEFAULT_RETRIES;
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

	async prewarm(): Promise<void> {
		await this.loadPipeline();
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

	/**
	 * Embed a retrieval query with the model's query-side instruction prefix
	 * applied (bge/e5/nomic families). Records still carry the original text.
	 */
	async embedQuery(
		text: string,
		options?: Omit<EmbedTextsInput, "texts" | "purpose">,
	): Promise<EmbeddingRecord> {
		const result = await this.embedTexts({
			...options,
			texts: [text],
			purpose: "query",
		});
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
			return {
				embeddings: [],
				model: this.model,
				usage: { promptTokens: 0, totalTokens: 0 },
			};
		}

		const pipeline = await this.loadPipeline();
		const batchSize = input.batchSize ?? this.batchSize;

		// Instruction-tuned models expect a purpose-specific prefix; the
		// prefix feeds the pipeline only — returned records keep the
		// caller's original text.
		const prefixes = instructionPrefixesFor(this.model);
		const prefix =
			(input.purpose ?? "document") === "query"
				? prefixes.query
				: prefixes.document;
		const effectiveTexts = prefix
			? input.texts.map((text) => prefix + text)
			: input.texts;
		const batches = batch(effectiveTexts, batchSize);

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
			if (
				input.expectedDimensions !== undefined &&
				input.expectedDimensions !== dim
			) {
				throw new TransformersValidationError(
					`Embedding dimension mismatch: model "${this.model}" produces ${dim}-dimensional vectors but expectedDimensions was ${input.expectedDimensions}.`,
					{ expected: input.expectedDimensions, actual: dim },
				);
			}
			for (const [i] of texts.entries()) {
				const start = i * dim;
				const embedding = flat.slice(start, start + dim);
				const originalIndex = batchIndex * batchSize + i;
				const text = input.texts[originalIndex];
				if (text === undefined) {
					throw new TransformersInferenceError(
						"Batch bookkeeping desynced from the input texts.",
						{ originalIndex },
					);
				}
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
			usage: { promptTokens: approxTokens, totalTokens: approxTokens },
		};
	}

	/**
	 * Lazily resolve (and memoize) the feature-extraction pipeline.
	 *
	 * The underlying model download/load is wrapped in {@link withRetry} so
	 * transient network failures during the first weight download are retried
	 * automatically. If all retries are exhausted the rejection is cleared so
	 * a subsequent call can try again.
	 */
	private loadPipeline(): Promise<FeatureExtractionPipeline> {
		if (this.pipelinePromise) return this.pipelinePromise;
		this.pipelinePromise = withRetry(
			() =>
				this.pipelineFactory({
					model: this.model,
					device: this.device,
					dtype: this.dtype,
					...omitUndefined({
						cacheDir: this.cacheDir,
						progress_callback: this.onProgress,
					}),
				}),
			{
				maxRetries: this.retries,
				isRetryable: isPipelineLoadRetryable,
			},
		).catch((error: unknown) => {
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
		return pipeline(
			"feature-extraction",
			options.model,
			omitUndefined({
				cache_dir: options.cacheDir,
				device: options.device,
				dtype: options.dtype,
				progress_callback: options.progress_callback,
			}),
		);
	};
}
