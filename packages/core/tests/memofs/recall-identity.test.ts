/**
 * Canonical recall-document identity — `{memoryId}#{ordinal}`.
 *
 * Every document indexed for a memory (lexical whole-note doc = ordinal 0,
 * vector chunks = ordinals 0..N) must share one id scheme keyed by the
 * memory id, with `metadata.sourceId` set to the memory id so:
 *
 * - vector + lexical hits for the same memory FUSE into one hybrid candidate
 *   (both retrieval signals folded into a single score instead of two
 *   half-scored siblings),
 * - `deleteBySource` can reach every chunk of a memory (archive cascades,
 *   no ghost chunks left in the vector store),
 * - restore re-indexes under the SAME stable ids it was archived under.
 *
 * Uses a deterministic bag-of-words hashing embedder (token → FNV-1a →
 * dimension index) so query/memory token overlap ≈ cosine similarity —
 * the shared fixtures' length-based embedder cannot express "the query is
 * semantically close to this memory".
 */

import { beforeEach, describe, expect, it } from "vitest";
import {
	createInMemoryRecallStore,
	type EmbeddingRecord,
	type EmbedTextsInput,
	type EmbedTextsResult,
	InMemoryMemoryStore,
	MemoFS,
	type MemoryEmbedder,
	memoryLexicalDocId,
	parseRecallDocId,
} from "../../src/index";

const EMBEDDING_DIMENSIONS = 64;

/** FNV-1a 32-bit hash of a token. */
function fnv1a(token: string): number {
	let hash = 0x811c9dc5;
	for (let i = 0; i < token.length; i++) {
		hash ^= token.charCodeAt(i);
		hash = Math.imul(hash, 0x01000193) >>> 0;
	}
	return hash >>> 0;
}

/**
 * Deterministic bag-of-words embedder: token → dimension index → +1 →
 * L2 normalize. Cosine similarity between two texts tracks their token
 * overlap, which is exactly what the fusion assertions need.
 */
class HashingEmbedder implements MemoryEmbedder {
	readonly dimensions = EMBEDDING_DIMENSIONS;

	private vector(text: string): number[] {
		const vec = new Array<number>(EMBEDDING_DIMENSIONS).fill(0);
		const tokens = text
			.toLowerCase()
			.split(/[^a-z0-9]+/)
			.filter((token) => token.length > 0);
		for (const token of tokens) {
			vec[fnv1a(token) % EMBEDDING_DIMENSIONS] += 1;
		}
		let norm = 0;
		for (const value of vec) norm += value * value;
		norm = Math.sqrt(norm);
		if (norm === 0) return vec;
		return vec.map((value) => value / norm);
	}

	async embedTexts(input: EmbedTextsInput): Promise<EmbedTextsResult> {
		return {
			model: "hashing-embedder",
			embeddings: input.texts.map((text, index) => ({
				text,
				index,
				model: "hashing-embedder",
				dimensions: EMBEDDING_DIMENSIONS,
				embedding: this.vector(text),
			})),
		};
	}

	async embedText(text: string): Promise<EmbeddingRecord> {
		const result = await this.embedTexts({ texts: [text] });
		const first = result.embeddings[0];
		if (!first) throw new Error("HashingEmbedder produced no embedding.");
		return first;
	}
}

/** Distinctive body token — used to detect ghost chunks by text content. */
const DECISION_CONTENT =
	"The nightly rotation cadence for vault credentials is 30 days on the zendara cluster.";
const DECISION_TITLE = "Vault credential rotation policy";
const PROBE_QUERY = "vault credentials rotation cadence zendara";

/** Canonical-id items for `memoryId` within a recall result. */
function canonicalItemsFor(
	items: Array<{ id: string }>,
	memoryId: string,
): Array<{ id: string }> {
	return items.filter(
		(item) => parseRecallDocId(item.id)?.memoryId === memoryId,
	);
}

describe("recall document identity (canonical {memoryId}#ordinal ids)", () => {
	let store: InMemoryMemoryStore;
	let embedder: HashingEmbedder;
	let recallStore: ReturnType<typeof createInMemoryRecallStore>;
	let memo: MemoFS;

	beforeEach(() => {
		store = new InMemoryMemoryStore();
		embedder = new HashingEmbedder();
		recallStore = createInMemoryRecallStore();
		memo = new MemoFS({ store, embedder, recallStore });
	});

	it("fuses vector + lexical hits into one candidate at the canonical id", async () => {
		const written = await memo.writeMemory({
			content: DECISION_CONTENT,
			title: DECISION_TITLE,
			kind: "decision",
		});

		const recalled = await memo.recall(PROBE_QUERY, { limit: 10 });

		// Exactly one canonical candidate for the memory — not one per path.
		const canonical = canonicalItemsFor(recalled.items, written.id);
		expect(
			canonical,
			"expected exactly one canonical candidate for the memory",
		).toHaveLength(1);

		// The lexical whole-note doc and vector chunk 0 share ordinal 0.
		const fused = canonical[0];
		expect(fused?.id).toBe(memoryLexicalDocId(written.id));
		// Vector-side proof: chunk metadata (sourceId = memory id) merged in.
		expect(fused?.metadata?.sourceId).toBe(written.id);
		// Lexical-side proof: the BM25 candidate merged into the same item.
		expect(fused?.metadata?.source).toBe("bm25");
	});

	it("indexes vector chunks under canonical ids with sourceId = memory id", async () => {
		const written = await memo.writeMemory({
			content: DECISION_CONTENT,
			title: DECISION_TITLE,
			kind: "decision",
		});

		const probe = await embedder.embedText(PROBE_QUERY);
		const hits = await recallStore.query({
			embedding: probe.embedding,
			topK: 100,
			filter: { sourceId: written.id },
		});

		// deleteBySource reachability: every chunk of the memory is filed
		// under its memory id and carries a canonical doc id.
		expect(
			hits.length,
			"expected the memory's chunks to be findable by sourceId",
		).toBeGreaterThan(0);
		for (const hit of hits) {
			expect(parseRecallDocId(hit.id)?.memoryId).toBe(written.id);
		}
	});

	it("cascades archive deletion to vector chunks (no ghost chunks)", async () => {
		const written = await memo.writeMemory({
			content: DECISION_CONTENT,
			title: DECISION_TITLE,
			kind: "decision",
		});

		await memo.graph.upsertNodes({
			nodes: [
				{
					id: `stale_${written.id}`,
					type: "concept",
					label: DECISION_TITLE,
					status: "deprecated",
					sourceRefs: [{ sourceType: "memory", sourceId: written.id }],
				},
			],
		});
		const archiveResult = await memo.archiveDeprecated();
		expect(archiveResult.archived).toBe(1);

		// The vector store must not retain any chunk of the archived body.
		const probe = await embedder.embedText(PROBE_QUERY);
		const all = await recallStore.query({
			embedding: probe.embedding,
			topK: 100,
		});
		const ghosts = all.filter((result) =>
			(result.text ?? "").includes("zendara"),
		);
		expect(
			ghosts,
			"archived memory chunks must not linger in the store",
		).toHaveLength(0);

		// And recall no longer surfaces the memory.
		const recalled = await memo.recall(PROBE_QUERY, { limit: 10 });
		expect(canonicalItemsFor(recalled.items, written.id)).toHaveLength(0);
	});

	it("restores an archived memory under the same stable canonical ids", async () => {
		const written = await memo.writeMemory({
			content: DECISION_CONTENT,
			title: DECISION_TITLE,
			kind: "decision",
		});
		await memo.graph.upsertNodes({
			nodes: [
				{
					id: `stale_${written.id}`,
					type: "concept",
					label: DECISION_TITLE,
					status: "deprecated",
					sourceRefs: [{ sourceType: "memory", sourceId: written.id }],
				},
			],
		});
		await memo.archiveDeprecated();

		const restoreResult = await memo.restoreMemory(written.id);
		expect(restoreResult.restored).toBe(true);

		// Lexical: the restored body is recallable at the canonical id.
		const recalled = await memo.recall(PROBE_QUERY, { limit: 10 });
		const canonical = canonicalItemsFor(recalled.items, written.id);
		expect(canonical).toHaveLength(1);
		expect(canonical[0]?.id).toBe(memoryLexicalDocId(written.id));

		// Vector: restore re-indexes chunks under the memory's identity.
		const probe = await embedder.embedText(PROBE_QUERY);
		const hits = await recallStore.query({
			embedding: probe.embedding,
			topK: 100,
			filter: { sourceId: written.id },
		});
		expect(
			hits.length,
			"restored memory must be vector-indexed again",
		).toBeGreaterThan(0);
	});

	it("hydrates lexical ids canonically on cold start", async () => {
		const written = await memo.writeMemory({
			content: DECISION_CONTENT,
			title: DECISION_TITLE,
			kind: "decision",
		});

		// A second runtime over the same memory store starts with empty
		// process-local indices and must rehydrate from notes.md.
		const coldMemo = new MemoFS({
			store,
			embedder: new HashingEmbedder(),
			recallStore: createInMemoryRecallStore(),
		});
		const recalled = await coldMemo.recall(PROBE_QUERY, { limit: 10 });

		const canonical = canonicalItemsFor(recalled.items, written.id);
		expect(canonical).toHaveLength(1);
		expect(canonical[0]?.id).toBe(memoryLexicalDocId(written.id));
	});
});
