import { describe, expect, it, vi } from "vitest";
import type { MemoryEmbedder } from "../../src/core/types/embeddings";
import { createLazyLocalEmbedder } from "../../src/index";

/**
 * Helpers to build a fake inner embedder and an adapterFactory that tracks how
 * many times it is invoked — the core of "lazy" behavior.
 */
function fakeEmbedder(): MemoryEmbedder & { embedTextsCalls: number } {
	let embedTextsCalls = 0;
	const embedTexts: MemoryEmbedder["embedTexts"] = async (input) => {
		embedTextsCalls += 1;
		return {
			embeddings: input.texts.map((text, index) => ({
				text,
				embedding: [0.1, 0.2, 0.3],
				index,
				model: "fake",
				dimensions: 3,
			})),
			model: "fake",
			usage: { totalTokens: input.texts.length },
		};
	};
	const embedText: MemoryEmbedder["embedText"] = async (text) => {
		// Mirror the real adapter: embedText delegates to embedTexts.
		const result = await embedTexts({ texts: [text] });
		const first = result.embeddings[0];
		if (!first) throw new Error("fake: no embedding");
		return first;
	};
	return {
		embedTexts,
		embedText,
		get embedTextsCalls() {
			return embedTextsCalls;
		},
	} as MemoryEmbedder & { embedTextsCalls: number };
}

describe("createLazyLocalEmbedder", () => {
	describe("laziness", () => {
		it("does not invoke the adapter factory at construction time", () => {
			const factory = vi.fn();
			// Constructing the proxy must be side-effect free.
			createLazyLocalEmbedder({ adapterFactory: factory });
			expect(factory).not.toHaveBeenCalled();
		});

		it("loads the adapter on the first embedText call and memoizes it", async () => {
			const inner = fakeEmbedder();
			const factory = vi.fn(async () => inner);
			const embedder = createLazyLocalEmbedder({ adapterFactory: factory });

			await embedder.embedText("first");
			await embedder.embedText("second");

			// The factory runs exactly once; subsequent calls reuse the embedder.
			expect(factory).toHaveBeenCalledTimes(1);
			expect(inner.embedTextsCalls).toBe(2);
		});

		it("loads the adapter on the first embedTexts call", async () => {
			const inner = fakeEmbedder();
			const factory = vi.fn(async () => inner);
			const embedder = createLazyLocalEmbedder({ adapterFactory: factory });

			const result = await embedder.embedTexts({ texts: ["a", "b"] });
			expect(factory).toHaveBeenCalledTimes(1);
			expect(result.embeddings).toHaveLength(2);
		});

		it("pre-warms the adapter by invoking the factory", async () => {
			const inner = fakeEmbedder();
			const factory = vi.fn(async () => inner);
			const embedder = createLazyLocalEmbedder({ adapterFactory: factory });

			expect(typeof embedder.prewarm).toBe("function");
			await expect(embedder.prewarm!()).resolves.toBeUndefined();
			expect(factory).toHaveBeenCalledTimes(1);
		});
	});

	describe("delegation", () => {
		it("delegates embedText to the loaded adapter and returns its record", async () => {
			const embedder = createLazyLocalEmbedder({
				adapterFactory: async () => fakeEmbedder(),
			});
			const record = await embedder.embedText("hello");
			expect(record.text).toBe("hello");
			expect(record.embedding).toEqual([0.1, 0.2, 0.3]);
		});

		it("delegates embedTexts and preserves input order/indices", async () => {
			const embedder = createLazyLocalEmbedder({
				adapterFactory: async () => fakeEmbedder(),
			});
			const result = await embedder.embedTexts({ texts: ["x", "y", "z"] });
			expect(result.embeddings.map((r) => r.text)).toEqual(["x", "y", "z"]);
			expect(result.embeddings.map((r) => r.index)).toEqual([0, 1, 2]);
		});
	});

	describe("factory options forwarding", () => {
		it("forwards the default model id to the adapter factory", async () => {
			const seen = vi.fn();
			const embedder = createLazyLocalEmbedder({
				adapterFactory: async (opts) => {
					seen(opts);
					return fakeEmbedder();
				},
			});
			await embedder.embedText("warmup");
			expect(seen).toHaveBeenCalledWith({
				model: "Xenova/all-MiniLM-L6-v2",
			});
		});

		it("forwards a custom model and cacheDir", async () => {
			const seen = vi.fn();
			const embedder = createLazyLocalEmbedder({
				model: "custom/model",
				cacheDir: "/tmp/cache",
				adapterFactory: async (opts) => {
					seen(opts);
					return fakeEmbedder();
				},
			});
			await embedder.embedText("warmup");
			expect(seen).toHaveBeenCalledWith({
				model: "custom/model",
				cacheDir: "/tmp/cache",
			});
		});

		it("omits cacheDir from the factory args when not provided", async () => {
			const seen = vi.fn();
			const embedder = createLazyLocalEmbedder({
				adapterFactory: async (opts) => {
					seen(opts);
					return fakeEmbedder();
				},
			});
			await embedder.embedText("warmup");
			expect(seen.mock.calls[0]?.[0]).not.toHaveProperty("cacheDir");
		});
	});

	describe("error handling", () => {
		it("rejects when the dynamic import target lacks createTransformersEmbedder", async () => {
			const embedder = createLazyLocalEmbedder({
				// Point at a module that exists but does not export the factory.
				adapterModule: "node:assert",
			});
			await expect(embedder.embedText("x")).rejects.toThrow(
				/Failed to initialize the local embedder/i,
			);
		});

		it("does not cache a rejection — a later call can retry", async () => {
			let calls = 0;
			const embedder = createLazyLocalEmbedder({
				adapterFactory: async () => {
					calls += 1;
					if (calls === 1) throw new Error("transient");
					return fakeEmbedder();
				},
			});
			await expect(embedder.embedText("first")).rejects.toThrow(
				/Failed to initialize the local embedder: transient/,
			);
			// Second call should retry and succeed.
			const record = await embedder.embedText("second");
			expect(record.text).toBe("second");
			expect(calls).toBe(2);
		});

		it("wraps non-Error rejections into a readable message", async () => {
			const embedder = createLazyLocalEmbedder({
				adapterFactory: async () => {
					throw "string error"; // eslint-disable-line no-throw-literal
				},
			});
			await expect(embedder.embedText("x")).rejects.toThrow(
				/Failed to initialize the local embedder: string error/,
			);
		});
	});
});
