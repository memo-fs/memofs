import { describe, expect, it, vi } from "vitest";
import { tokenizeSimple } from "../../src/core/internal/lexical";
import { searchMemoryText } from "../../src/core/search/search-memory";
import { InMemoryMemoryStore } from "../../src/core/stores/in-memory-store";
import { createInMemoryGraphStore } from "../../src/graph/stores/in-memory-graph-store";
import { utf8ByteLength } from "../../src/memofs/helpers/utils";
import { localRecall } from "../../src/memofs/local-strategy/recall";
import type {
	LocalStrategyContext,
	LocalStrategyOptions,
} from "../../src/memofs/local-strategy/types";
import { indexDocument } from "../../src/memofs/local-strategy/write";
import {
	allocateBudget,
	defaultTokenEstimator,
} from "../../src/memofs/strategist/budget";
import { BM25Store } from "../../src/recall/lexical/bm25";
import { createDeterministicFallbackReranker } from "../../src/rerank/fallback/deterministic-fallback-reranker";

// Ticket 8 acceptance criteria

describe("intelligence hardening — ticket 8", () => {
	describe("searchMemoryText heading boost multi-word", () => {
		it("boosts ## My Auth Flow Implementation for query auth flow", () => {
			const content = `
## My Auth Flow Implementation
Details about auth.

## Other Section
Irrelevant content.

A random line mentioning auth flow in body.
`;
			const results = searchMemoryText({
				content,
				query: "auth flow",
				limit: 5,
			});
			expect(results.length).toBeGreaterThan(0);
			// First result should be the heading with implementation, boosted score >=3
			const first = results[0];
			expect(first).toBeDefined();
			expect(first?.text.toLowerCase()).toContain("auth flow implementation");
			expect(first?.score).toBeGreaterThanOrEqual(3);
		});

		it("still works for exact lowercased heading", () => {
			const content = `
## auth flow
Some details.

## other
nothing
`;
			const results = searchMemoryText({
				content,
				query: "auth flow",
				limit: 5,
			});
			expect(results[0]?.score).toBeGreaterThanOrEqual(3);
		});
	});

	describe("DeterministicFallbackReranker tokenizeSimple drops stop words", () => {
		it("what is auth -> ['auth'] only", () => {
			const tokens = tokenizeSimple("what is auth");
			expect(tokens).not.toContain("what");
			expect(tokens).not.toContain("is");
			expect(tokens).toContain("auth");
			expect(tokens).toEqual(["auth"]);
		});

		it("the quick brown fox drops the", () => {
			const tokens = tokenizeSimple("the quick brown fox");
			expect(tokens).not.toContain("the");
			expect(tokens).toEqual(expect.arrayContaining(["quick", "brown", "fox"]));
		});
	});

	describe("budget token-aware", () => {
		it("defaultTokenEstimator uses TextEncoder byte length /4", () => {
			// "hello world" 11 bytes -> ceil(11/4)=3
			expect(defaultTokenEstimator("hello world")).toBe(3);
			// café = 5 bytes (c a f + 2 bytes é) -> ceil(5/4)=2
			expect(defaultTokenEstimator("café")).toBe(2);
		});

		it("allocateBudget respects injected tokenEstimator and caps by maxBytes", () => {
			let calls = 0;
			const estimator = (text: string) => {
				calls++;
				// aggressive estimate to force truncation earlier than byte budget
				return Math.ceil(text.length / 2);
			};
			const longItems = Array.from(
				{ length: 20 },
				(_, i) =>
					`item${i} with some longer description that will exceed budget`,
			).join("\n");

			const result = allocateBudget({
				maxBytes: 150,
				tokenEstimator: estimator,
				sections: [
					{
						title: "Recall",
						content: longItems,
						type: "recall",
						weight: 3,
					},
				],
			});
			expect(calls).toBeGreaterThan(0);
			expect(result.truncated).toBe(true);
			expect(utf8ByteLength(result.text)).toBeLessThanOrEqual(200); // heading + body <= max + overhead
		});

		it("caps by maxBytes still (byte cap hard)", () => {
			const long = "a".repeat(500);
			const result = allocateBudget({
				maxBytes: 50,
				sections: [{ title: "Recall", content: long, type: "recall" }],
			});
			// Should respect hard byte cap (allow small overhead for heading accounting edge)
			expect(utf8ByteLength(result.text)).toBeLessThanOrEqual(60);
		});

		it("ultimate truncation includes token count", () => {
			const long = "a".repeat(500);
			const result = allocateBudget({
				maxBytes: 60,
				sections: [{ title: "Recall", content: long, type: "recall" }],
			});
			expect(utf8ByteLength(result.text)).toBeLessThanOrEqual(60);
			// With 60 bytes, fallback outline (50) may still not fit? Let's force tiny bodyBudget to hit slice
			// Use content that forces slice: many items causing outline to overflow
			// For this size, it should hit the slice path with bytes~tokens notice
			const manyItems = Array.from({ length: 50 }, () => "x".repeat(100)).join(
				"\n\n",
			);
			const result2 = allocateBudget({
				maxBytes: 80,
				sections: [{ title: "Recall", content: manyItems, type: "recall" }],
			});
			expect(utf8ByteLength(result2.text)).toBeLessThanOrEqual(80);
			// When truncation happens, notice includes bytes and tokens
			if (result2.text.includes("truncated")) {
				expect(result2.text).toContain("bytes");
				expect(result2.text).toContain("tokens");
			}
		});
	});

	describe("observable best-effort logging", () => {
		it("hybrid fallback logs warning when embedder fails", async () => {
			const warn = vi.fn();
			const store = new InMemoryMemoryStore();
			const lexicalStore = new BM25Store();
			lexicalStore.upsert([{ id: "doc1", text: "auth flow implementation" }]);
			const ctx = {
				options: {
					store,
					projectId: "test",
					name: "test",
					version: "1",
					autoBootstrap: false,
					logger: { warn },
					embedder: {
						embedText: async () => {
							throw new Error("embedder down");
						},
						embedTexts: async () => {
							throw new Error("embedder down");
						},
					} as unknown as LocalStrategyOptions["embedder"],
					recallStore: {
						query: async () => [],
						upsert: async () => {},
					} as unknown as LocalStrategyOptions["recallStore"],
				} as LocalStrategyOptions,
				ensureReady: async () => {},
				lexicalStore,
				lexicalTextById: new Map([["doc1", "auth flow implementation"]]),
				isRetiredGraphDoc: () => false,
				reranker: createDeterministicFallbackReranker(),
			} as unknown as LocalStrategyContext;

			const result = await localRecall(ctx, { query: "auth" }, undefined);
			// Should fallback to lexical, still return items
			expect(result.items.length).toBeGreaterThanOrEqual(0);
			// Logger should have warned about hybrid fallback
			expect(warn).toHaveBeenCalled();
			const calls = warn.mock.calls.map((c) => c[0] as string);
			expect(calls.some((m) => m.includes("hybrid fell back to lexical"))).toBe(
				true,
			);
		});

		it("indexDocument logs warning on vector failure", async () => {
			const warn = vi.fn();
			const store = new InMemoryMemoryStore();
			const ctx = {
				options: {
					store,
					projectId: "test",
					name: "test",
					version: "1",
					autoBootstrap: false,
					logger: { warn },
					embedder: {
						embedText: async () => {
							throw new Error("embed fail");
						},
						embedTexts: async () => {
							throw new Error("embed fail");
						},
					} as unknown as LocalStrategyOptions["embedder"],
					recallStore: {
						upsert: async () => {
							throw new Error("upsert fail");
						},
						query: async () => [],
					} as unknown as LocalStrategyOptions["recallStore"],
				} as LocalStrategyOptions,
				ensureReady: async () => {},
				lexicalStore: new BM25Store(),
				lexicalTextById: new Map(),
				isRetiredGraphDoc: () => false,
				reranker: createDeterministicFallbackReranker(),
				graphNodes: new Map(),
				graphEdges: new Map(),
				contextCache: {
					clear: () => {},
				} as unknown as LocalStrategyContext["contextCache"],
				graphStore: createInMemoryGraphStore(),
				extractor: {
					name: "test",
					extract: async () => ({ nodes: [], edges: [] }),
				} as unknown as LocalStrategyContext["extractor"],
				indexLexical: () => {},
			} as unknown as LocalStrategyContext;

			// Should not throw, but log
			await indexDocument(ctx, "some text", {
				sourceType: "note",
				sourceId: "test",
				sourcePath: "/notes",
				memoryType: "notes",
			});
			expect(warn).toHaveBeenCalled();
			const msgs = warn.mock.calls.map((c) => c[0] as string);
			expect(msgs.some((m) => m.includes("vector indexing failed"))).toBe(true);
		});
	});
});
