import { describe, expect, it, vi } from "vitest";
import {
	createInMemoryRecallStore,
	type MemoryEmbedder,
	MemoFS,
} from "../../src/index";
import { createNodeFsMemoryStore } from "../../src/node-fs";
import { createTempMemoFsDir } from "../../src/testing/temp-dir";

/**
 * End-to-end intelligence story: a zero-config local MemoFS (no embedder, no
 * API key) still feels intelligent — memories are recalled by meaning, the
 * graph accumulates automatically, and recall returns ranked, recent results.
 */
describe("local-first intelligence (zero config)", () => {
	it("recalls a written memory via lexical hybrid recall with no embedder", async () => {
		const { rootDir, cleanup } = await createTempMemoFsDir();
		try {
			const memo = new MemoFS({
				store: createNodeFsMemoryStore({
					rootDir,
					createRoot: true,
					missingFileBehavior: "empty",
				}),
				rootDir,
				projectId: "intel",
				mode: "local",
			});

			await memo.notes.record({
				content: "Authentication uses JWT tokens issued by the login flow.",
				kind: "decision",
				title: "Auth strategy",
			});

			const result = await memo.recall("login auth", { limit: 5 });
			expect(result.items.length).toBeGreaterThan(0);
			expect(result.items[0]?.text).toMatch(/authentication/i);
			expect(result.items[0]?.score).toBeGreaterThan(0);
		} finally {
			await cleanup();
		}
	});

	it("auto-extracts graph facts from written memory", async () => {
		const { rootDir, cleanup } = await createTempMemoFsDir();
		try {
			const memo = new MemoFS({
				store: createNodeFsMemoryStore({
					rootDir,
					createRoot: true,
					missingFileBehavior: "empty",
				}),
				rootDir,
				projectId: "intel",
				mode: "local",
			});

			// The rule-based extractor recognizes "X uses Y" patterns.
			await memo.notes.record({
				content: "MemoFS uses BM25 for lexical recall.",
				kind: "decision",
			});

			// Give the in-memory graph a tick to settle, then inspect via listNodes.
			const nodes = await memo.graph.listNodes({ limit: 50 });
			const labels = nodes.items.map((n) => n.label);
			expect(labels.some((l) => /memofs/i.test(l))).toBe(true);
			expect(labels.some((l) => /bm25/i.test(l))).toBe(true);
		} finally {
			await cleanup();
		}
	});

	it("persists graph across a restart via FsGraphStore rehydration", async () => {
		const { rootDir, cleanup } = await createTempMemoFsDir();
		try {
			// First instance: write a memory that extracts a graph fact.
			const first = new MemoFS({
				store: createNodeFsMemoryStore({
					rootDir,
					createRoot: true,
					missingFileBehavior: "empty",
				}),
				rootDir,
				projectId: "intel",
				mode: "local",
			});
			await first.notes.record({
				content: "Postgres depends on disk I/O.",
				kind: "constraint",
			});
			const firstNodes = await first.graph.listNodes({ limit: 50 });
			expect(firstNodes.items.length).toBeGreaterThan(0);

			// Second instance over the same root: graph must survive.
			const second = new MemoFS({
				store: createNodeFsMemoryStore({
					rootDir,
					createRoot: true,
					missingFileBehavior: "empty",
				}),
				rootDir,
				projectId: "intel",
				mode: "local",
			});
			// Force bootstrap + hydration by reading core memory.
			await second.core.read();
			const secondNodes = await second.graph.listNodes({ limit: 50 });
			const labels = secondNodes.items.map((n) => n.label);
			expect(labels.some((l) => /postgres/i.test(l))).toBe(true);
		} finally {
			await cleanup();
		}
	});

	it("returns ranked results ordered by score", async () => {
		const { rootDir, cleanup } = await createTempMemoFsDir();
		try {
			const memo = new MemoFS({
				store: createNodeFsMemoryStore({
					rootDir,
					createRoot: true,
					missingFileBehavior: "empty",
				}),
				rootDir,
				projectId: "intel",
				mode: "local",
			});

			await memo.notes.record({
				content: "The deployment pipeline runs on GitHub Actions.",
				kind: "reference",
			});
			await memo.notes.record({
				content: "We prefer pnpm for package management.",
				kind: "preference",
			});

			const result = await memo.recall("deployment pipeline", { limit: 5 });
			expect(result.items.length).toBeGreaterThan(0);
			// The deployment note should outrank the pnpm note for this query.
			const top = result.items[0];
			expect(top?.text).toMatch(/deployment pipeline/i);
		} finally {
			await cleanup();
		}
	});
});

/**
 * Best-effort write path: a configured embedder that throws (e.g. a missing
 * local ONNX runtime, a rejected lazy init, or a broken API adapter) must never
 * break the caller's write. Lexical recall keeps the memory discoverable.
 */
describe("best-effort write path (failing embedder)", () => {
	it("records a note even when the embedder rejects on every call", async () => {
		const { rootDir, cleanup } = await createTempMemoFsDir();
		try {
			// An embedder that always fails — mimics a lazy local embedder whose
			// optional runtime is missing, or an adapter whose init rejected.
			const brokenEmbedder: MemoryEmbedder = {
				embedTexts: vi
					.fn()
					.mockRejectedValue(new Error("onnx runtime missing")),
				embedText: vi.fn().mockRejectedValue(new Error("onnx runtime missing")),
			};

			const memo = new MemoFS({
				store: createNodeFsMemoryStore({
					rootDir,
					createRoot: true,
					missingFileBehavior: "empty",
				}),
				rootDir,
				projectId: "fail-embedder",
				mode: "local",
				embedder: brokenEmbedder,
				// In-memory recall store so we don't touch the disk vector index.
				recallStore: createInMemoryRecallStore(),
			});

			// The write must succeed despite the failing embedder.
			const result = await memo.notes.record({
				content: "We deploy via blue-green releases on Kubernetes.",
				kind: "decision",
				title: "Deploy strategy",
			});
			expect(result.created).toBe(true);

			// The embedder was exercised by the write path...
			expect(brokenEmbedder.embedTexts).toHaveBeenCalled();
			// ...and recall still surfaces the memory via the lexical path.
			const recall = await memo.recall("deploy kubernetes", { limit: 5 });
			expect(recall.items.length).toBeGreaterThan(0);
			expect(recall.items[0]?.text).toMatch(/blue-green/i);
		} finally {
			await cleanup();
		}
	});

	it("records a note even when the recall store rejects", async () => {
		const { rootDir, cleanup } = await createTempMemoFsDir();
		try {
			const goodEmbedder: MemoryEmbedder = {
				embedTexts: vi.fn().mockResolvedValue({
					embeddings: [
						{
							text: "x",
							embedding: [0.1, 0.2, 0.3],
							index: 0,
							model: "test",
							dimensions: 3,
						},
					],
					model: "test",
				}),
				embedText: vi.fn().mockResolvedValue({
					text: "x",
					embedding: [0.1, 0.2, 0.3],
					index: 0,
					model: "test",
					dimensions: 3,
				}),
			};
			// A recall store whose upsert always throws.
			const brokenStore = createInMemoryRecallStore();
			brokenStore.upsert = vi.fn().mockRejectedValue(new Error("disk full"));

			const memo = new MemoFS({
				store: createNodeFsMemoryStore({
					rootDir,
					createRoot: true,
					missingFileBehavior: "empty",
				}),
				rootDir,
				projectId: "fail-store",
				mode: "local",
				embedder: goodEmbedder,
				recallStore: brokenStore,
			});

			const result = await memo.notes.record({
				content: "Feature flags are toggled via LaunchDarkly.",
				kind: "reference",
			});
			expect(result.created).toBe(true);

			// Lexical recall still works without the vector index.
			const recall = await memo.recall("feature flags", { limit: 5 });
			expect(recall.items.length).toBeGreaterThan(0);
		} finally {
			await cleanup();
		}
	});
});

/**
 * Consolidation end-to-end: the second half of v1 intelligence (ADR 0004).
 * Extraction grows the graph from prose; consolidation keeps it tidy by
 * retiring facts a `supersedes` edge marks as replaced — without ever deleting
 * (the audit trail is preserved).
 */
describe("consolidation (end-to-end)", () => {
	it("previews the plan without persisting when apply is false", async () => {
		const { rootDir, cleanup } = await createTempMemoFsDir();
		try {
			const memo = new MemoFS({
				store: createNodeFsMemoryStore({
					rootDir,
					createRoot: true,
					missingFileBehavior: "empty",
				}),
				rootDir,
				projectId: "consolidate",
				mode: "local",
			});

			// The rule-based extractor emits a `supersedes` edge from this prose.
			await memo.notes.record({
				content: "OAuth2 supersedes JWT for authentication.",
				kind: "decision",
			});

			const preview = await memo.consolidate({ apply: false });
			expect(preview.applied).toBe(false);
			expect(preview.mergesApplied).toBe(0);
			expect(preview.retirementsApplied).toBe(0);
			// The plan still describes what *would* change.
			expect(preview.plan.changed).toBe(true);
			expect(preview.plan.retiredNodes).toBeGreaterThan(0);
		} finally {
			await cleanup();
		}
	});

	it("retires a superseded fact and preserves the audit trail when applied", async () => {
		const { rootDir, cleanup } = await createTempMemoFsDir();
		try {
			const memo = new MemoFS({
				store: createNodeFsMemoryStore({
					rootDir,
					createRoot: true,
					missingFileBehavior: "empty",
				}),
				rootDir,
				projectId: "consolidate",
				mode: "local",
			});

			await memo.notes.record({
				content: "OAuth2 supersedes JWT for authentication.",
				kind: "decision",
			});

			const result = await memo.consolidate({ apply: true });
			expect(result.applied).toBe(true);
			expect(result.plan.retiredNodes).toBeGreaterThan(0);
			// At least the superseded node should be retired; the JWT node was
			// extracted from prose and marked deprecated by the pass.
			expect(result.retirementsApplied).toBeGreaterThanOrEqual(1);
		} finally {
			await cleanup();
		}
	});

	it("reports an unchanged plan when there is nothing to consolidate", async () => {
		const { rootDir, cleanup } = await createTempMemoFsDir();
		try {
			const memo = new MemoFS({
				store: createNodeFsMemoryStore({
					rootDir,
					createRoot: true,
					missingFileBehavior: "empty",
				}),
				rootDir,
				projectId: "consolidate",
				mode: "local",
			});
			// No supersession, no duplicates.
			await memo.notes.record({
				content: "MemoFS uses BM25 for lexical recall.",
				kind: "reference",
			});
			const result = await memo.consolidate();
			expect(result.plan.changed).toBe(false);
			expect(result.applied).toBe(false);
		} finally {
			await cleanup();
		}
	});
});

/**
 * The staleness loop (ADR 0009 Component 5): consolidation retires a superseded
 * fact, and recall must stop serving it. Before the fix, `runLexicalRecall`
 * served graph facts from the BM25 store without ever consulting node status, so
 * a `deprecated` JWT kept surfacing after "OAuth2 supersedes JWT" was
 * consolidated. The fix is two-layer: consolidation eagerly prunes the retired
 * node's lexical doc (the disposable index prunes), and recall lazily skips any
 * `graph:*` hit whose node is `deprecated` (safety net for manual deprecations).
 */
describe("staleness loop — recall honors consolidation retirements", () => {
	it("does not surface a superseded graph fact in recall after consolidation", async () => {
		const { rootDir, cleanup } = await createTempMemoFsDir();
		try {
			const memo = new MemoFS({
				store: createNodeFsMemoryStore({
					rootDir,
					createRoot: true,
					missingFileBehavior: "empty",
				}),
				rootDir,
				projectId: "staleness",
				mode: "local",
			});

			// The rule-based extractor emits a `supersedes` edge (JWT → retired)
			// and indexes both nodes into the lexical store under `graph:{id}`.
			await memo.notes.record({
				content: "OAuth2 supersedes JWT for authentication.",
				kind: "decision",
			});

			// Identify the JWT graph node's lexical doc id before consolidation.
			const nodesBefore = await memo.graph.listNodes({ limit: 50 });
			const jwtNode = nodesBefore.items.find(
				(n) => /jwt/i.test(n.label) && !/oauth/i.test(n.label),
			);
			expect(jwtNode).toBeDefined();
			const jwtDocId = `graph:${(jwtNode as NonNullable<typeof jwtNode>).id}`;

			// Sanity: the JWT graph doc is served before consolidation.
			const before = await memo.recall("JWT authentication", { limit: 10 });
			expect(before.items.some((item) => item.id === jwtDocId)).toBe(true);

			// Consolidate: the JWT node is marked `deprecated` and pruned from the
			// disposable lexical index.
			const result = await memo.consolidate({ apply: true });
			expect(result.applied).toBe(true);
			expect(result.plan.retiredNodes).toBeGreaterThan(0);

			// After consolidation, recall must not serve the retired JWT graph
			// doc. (The note chunk recording the supersession may still match —
			// that's the audit trail, not the retired fact.)
			const after = await memo.recall("JWT authentication", { limit: 10 });
			expect(after.items.some((item) => item.id === jwtDocId)).toBe(false);
		} finally {
			await cleanup();
		}
	});

	it("drops a manually deprecated graph node from lexical recall", async () => {
		const { rootDir, cleanup } = await createTempMemoFsDir();
		try {
			const memo = new MemoFS({
				store: createNodeFsMemoryStore({
					rootDir,
					createRoot: true,
					missingFileBehavior: "empty",
				}),
				rootDir,
				projectId: "staleness",
				mode: "local",
			});

			// "uses" triggers the rule-based extractor so a Fly.io node exists to
			// deprecate. (A sentence with no relation verb extracts nothing.)
			await memo.notes.record({
				content: "MemoFS uses Fly.io for deployment.",
				kind: "decision",
			});

			const nodes = await memo.graph.listNodes({ limit: 50 });
			const flyNode = nodes.items.find((n) => /fly\.io/i.test(n.label));
			expect(flyNode).toBeDefined();
			const typedFlyNode = flyNode as NonNullable<typeof flyNode>;
			const flyDocId = `graph:${typedFlyNode.id}`;

			// Sanity: the Fly.io graph doc is retrievable before deprecation.
			const before = await memo.recall("Fly deployment", { limit: 10 });
			expect(before.items.some((item) => item.id === flyDocId)).toBe(true);

			// Manually deprecate the Fly.io node (bypassing consolidation) to prove
			// the lazy filter is the real guarantee, not just the eager prune.
			await memo.graph.upsertNodes({
				nodes: [{ ...typedFlyNode, status: "deprecated" }],
			});

			// The lazy filter must drop the deprecated node from BM25 results even
			// though no consolidation pass ran.
			const after = await memo.recall("Fly deployment", { limit: 10 });
			expect(after.items.some((item) => item.id === flyDocId)).toBe(false);
		} finally {
			await cleanup();
		}
	});
});
