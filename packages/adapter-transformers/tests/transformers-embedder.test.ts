import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
	createTransformersEmbedder,
	type FeatureExtractionPipelineFactory,
	resolveModelCacheDir,
	TransformersInferenceError,
	TransformersValidationError,
} from "../src/index";
import {
	createFakePipeline,
	createFakePipelineFactory,
} from "../src/testing/fake-pipeline";

function embedderWith(dimensions = 384) {
	return createTransformersEmbedder({
		model: "fake/all-MiniLM-L6-v2",
		pipelineFactory: createFakePipelineFactory({ dimensions }),
	});
}

describe("TransformersEmbedder", () => {
	describe("embedText", () => {
		it("returns a single embedding record with model metadata", async () => {
			const embedder = embedderWith();
			const record = await embedder.embedText("hello world");

			expect(record.text).toBe("hello world");
			expect(record.model).toBe("fake/all-MiniLM-L6-v2");
			expect(record.dimensions).toBe(384);
			expect(record.embedding).toHaveLength(384);
		});

		it("is deterministic — same text yields the same vector", async () => {
			const embedder = embedderWith();
			const a = await embedder.embedText("auth login flow");
			const b = await embedder.embedText("auth login flow");
			expect(a.embedding).toEqual(b.embedding);
		});
	});

	describe("embedTexts", () => {
		it("returns embeddings in input order with correct indices", async () => {
			const embedder = embedderWith();
			const result = await embedder.embedTexts({
				texts: ["alpha", "beta", "gamma"],
			});

			expect(result.embeddings).toHaveLength(3);
			expect(result.embeddings.map((r) => r.index)).toEqual([0, 1, 2]);
			expect(result.embeddings.map((r) => r.text)).toEqual([
				"alpha",
				"beta",
				"gamma",
			]);
			expect(result.usage?.totalTokens).toBe(3);
		});

		it("returns an empty result set for empty input", async () => {
			const embedder = embedderWith();
			const result = await embedder.embedTexts({ texts: [] });
			expect(result.embeddings).toEqual([]);
			expect(result.model).toBe("fake/all-MiniLM-L6-v2");
		});

		it("respects a custom batch size across multiple batches", async () => {
			const embedder = embedderWith();
			const result = await embedder.embedTexts({
				texts: ["one", "two", "three", "four", "five"],
				batchSize: 2,
			});

			expect(result.embeddings.map((r) => r.index)).toEqual([0, 1, 2, 3, 4]);
			for (const record of result.embeddings) {
				expect(record.dimensions).toBe(384);
				expect(record.embedding).toHaveLength(384);
			}
		});

		it("rejects non-string inputs", async () => {
			const embedder = embedderWith();
			await expect(
				// @ts-expect-error exercising runtime validation
				embedder.embedTexts({ texts: ["ok", 42] }),
			).rejects.toBeInstanceOf(TransformersValidationError);
		});

		it("rejects empty texts unless allowEmptyText is set", async () => {
			const embedder = embedderWith();
			await expect(embedder.embedTexts({ texts: [""] })).rejects.toBeInstanceOf(
				TransformersValidationError,
			);
			await expect(
				embedder.embedTexts({ texts: [""], allowEmptyText: true }),
			).resolves.toMatchObject({ embeddings: [{ text: "" }] });
		});

		it("caches the inferred dimension across calls", async () => {
			const embedder = createTransformersEmbedder({
				model: "fake/256d",
				pipelineFactory: createFakePipelineFactory({ dimensions: 256 }),
			});
			expect(embedder.dimensions).toBeUndefined();
			await embedder.embedText("warmup");
			expect(embedder.dimensions).toBe(256);
		});

		it("rejects texts exceeding the character limit", async () => {
			const embedder = embedderWith();
			const longText = "a".repeat(8193);
			await expect(
				embedder.embedTexts({ texts: [longText] }),
			).rejects.toBeInstanceOf(TransformersValidationError);
		});

		it("populates both promptTokens and totalTokens in usage", async () => {
			const embedder = embedderWith();
			const result = await embedder.embedTexts({
				texts: ["hello world", "foo bar baz"],
			});
			expect(result.usage?.promptTokens).toBe(5);
			expect(result.usage?.totalTokens).toBe(5);
		});

		it("throws when expectedDimensions does not match the model output", async () => {
			const embedder = embedderWith(384);
			await expect(
				embedder.embedTexts({ texts: ["test"], expectedDimensions: 512 }),
			).rejects.toBeInstanceOf(TransformersValidationError);
		});

		it("accepts expectedDimensions that matches the model output", async () => {
			const embedder = embedderWith(384);
			const result = await embedder.embedTexts({
				texts: ["test"],
				expectedDimensions: 384,
			});
			expect(result.embeddings[0]?.dimensions).toBe(384);
		});
	});

	describe("error handling", () => {
		it("wraps non-retryable pipeline load failures in TransformersInferenceError", async () => {
			const failingFactory: FeatureExtractionPipelineFactory = async () => {
				throw new Error("model not found");
			};
			const embedder = createTransformersEmbedder({
				model: "fake/missing",
				retries: 2,
				pipelineFactory: failingFactory,
			});
			await expect(embedder.embedText("test")).rejects.toBeInstanceOf(
				TransformersInferenceError,
			);
		});

		it("retries pipeline load on transient network errors", async () => {
			let calls = 0;
			const fake = createFakePipelineFactory({ dimensions: 384 });
			const retryableFactory: FeatureExtractionPipelineFactory = async (
				options,
			) => {
				calls += 1;
				if (calls < 2) throw new Error("network error: fetch failed");
				return fake(options);
			};
			const embedder = createTransformersEmbedder({
				model: "fake/retry",
				retries: 1,
				pipelineFactory: retryableFactory,
			});
			const record = await embedder.embedText("retry me");
			expect(record.dimensions).toBe(384);
			expect(calls).toBe(2);
		});

		it("clears the cached promise after failure so a subsequent call retries", async () => {
			let shouldFail = true;
			const fake = createFakePipelineFactory({ dimensions: 384 });
			const flakyFactory: FeatureExtractionPipelineFactory = async (
				options,
			) => {
				if (shouldFail) throw new Error("network error: fetch failed");
				return fake(options);
			};
			const embedder = createTransformersEmbedder({
				model: "fake/flaky",
				retries: 0,
				pipelineFactory: flakyFactory,
			});
			await expect(embedder.embedText("first")).rejects.toBeInstanceOf(
				TransformersInferenceError,
			);
			shouldFail = false;
			const record = await embedder.embedText("second");
			expect(record.dimensions).toBe(384);
		});
	});

	describe("prewarm", () => {
		it("pre-warms the internal pipeline", async () => {
			const embedder = embedderWith();
			await expect(embedder.prewarm()).resolves.toBeUndefined();
		});
	});

	describe("defaults", () => {
		it("uses the canonical default model name", () => {
			const embedder = createTransformersEmbedder({
				pipelineFactory: createFakePipelineFactory(),
			});
			expect(embedder.modelName).toBe("Xenova/bge-small-en-v1.5");
		});

		it("loads quantized weights by default", async () => {
			const seen: Array<Record<string, unknown>> = [];
			const embedder = createTransformersEmbedder({
				pipelineFactory: async (options) => {
					seen.push(options);
					return createFakePipeline();
				},
			});
			await embedder.prewarm();
			expect(seen[0]?.dtype).toBe("q8");
		});
	});

	describe("model cache", () => {
		it("resolves XDG_CACHE_HOME when set", () => {
			expect(
				resolveModelCacheDir({ XDG_CACHE_HOME: "/tmp/custom-cache" }),
			).toBe(path.join("/tmp/custom-cache", "memofs", "models"));
		});

		it("falls back to ~/.cache when XDG_CACHE_HOME is unset or blank", () => {
			const expected = path.join(os.homedir(), ".cache", "memofs", "models");
			expect(resolveModelCacheDir({})).toBe(expected);
			expect(resolveModelCacheDir({ XDG_CACHE_HOME: "   " })).toBe(expected);
		});

		it("defaults the pipeline cacheDir to the shared user-level cache", async () => {
			const seen: Array<Record<string, unknown>> = [];
			const embedder = createTransformersEmbedder({
				pipelineFactory: async (options) => {
					seen.push(options);
					return createFakePipeline();
				},
			});
			await embedder.prewarm();
			expect(seen[0]?.cacheDir).toBe(resolveModelCacheDir());
		});

		it("passes an explicit cacheDir through unchanged", async () => {
			const seen: Array<Record<string, unknown>> = [];
			const embedder = createTransformersEmbedder({
				cacheDir: "/tmp/memofs-custom-cache",
				pipelineFactory: async (options) => {
					seen.push(options);
					return createFakePipeline();
				},
			});
			await embedder.prewarm();
			expect(seen[0]?.cacheDir).toBe("/tmp/memofs-custom-cache");
		});
	});

	describe("instruction prefixes", () => {
		function capturingPipeline() {
			const inputs: string[][] = [];
			const pipeline = async (texts: string[]) => {
				inputs.push(texts);
				return createFakePipeline()(texts, {
					pooling: "mean",
					normalize: true,
				});
			};
			return { inputs, pipeline };
		}

		it("embedQuery applies the bge query prefix and keeps the original text", async () => {
			const { inputs, pipeline } = capturingPipeline();
			const embedder = createTransformersEmbedder({
				model: "Xenova/bge-small-en-v1.5",
				pipelineFactory: async () => pipeline,
			});
			const record = await embedder.embedQuery("vault rotation cadence");
			expect(inputs[0]?.[0]).toBe(
				"Represent this sentence for searching relevant passages: vault rotation cadence",
			);
			expect(record.text).toBe("vault rotation cadence");
		});

		it("embedTexts applies the e5 passage prefix to documents by default", async () => {
			const { inputs, pipeline } = capturingPipeline();
			const embedder = createTransformersEmbedder({
				model: "Xenova/multilingual-e5-small",
				pipelineFactory: async () => pipeline,
			});
			const result = await embedder.embedTexts({ texts: ["memory one"] });
			expect(inputs[0]?.[0]).toBe("passage: memory one");
			expect(result.embeddings[0]?.text).toBe("memory one");
		});

		it("embedTexts honors an explicit query purpose", async () => {
			const { inputs, pipeline } = capturingPipeline();
			const embedder = createTransformersEmbedder({
				model: "Xenova/multilingual-e5-small",
				pipelineFactory: async () => pipeline,
			});
			await embedder.embedTexts({
				texts: ["memory one"],
				purpose: "query",
			});
			expect(inputs[0]?.[0]).toBe("query: memory one");
		});

		it("adds no prefix for symmetric models", async () => {
			const { inputs, pipeline } = capturingPipeline();
			const embedder = createTransformersEmbedder({
				model: "Xenova/all-MiniLM-L6-v2",
				pipelineFactory: async () => pipeline,
			});
			await embedder.embedQuery("plain query");
			await embedder.embedTexts({ texts: ["plain document"] });
			expect(inputs[0]?.[0]).toBe("plain query");
			expect(inputs[1]?.[0]).toBe("plain document");
		});
	});
});
