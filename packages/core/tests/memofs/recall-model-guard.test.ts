/**
 * Vector-index model stamping + cross-model query guard.
 *
 * `indexDocument` stamps each chunk's producing model into its metadata, and
 * `localRecall` filters vector queries to chunks stamped with the query
 * embedder's model. Vectors from different models live in incomparable
 * spaces — a bge query scored against MiniLM chunks (or unstamped legacy
 * rows) is noise, so both must drop out of the vector path while lexical
 * recall still covers them.
 *
 * The guard is proven with two embedders whose VECTORS ARE IDENTICAL but
 * whose model labels differ: if any vector hit still fuses, the filter —
 * not the cosine math — failed.
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
 * Deterministic bag-of-words embedder with a configurable model label.
 * Two instances with different labels produce IDENTICAL vectors for the
 * same text — the label is the only variable under test.
 */
class LabeledHashingEmbedder implements MemoryEmbedder {
	readonly model: string;

	constructor(model: string) {
		this.model = model;
	}

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
			model: this.model,
			embeddings: input.texts.map((text, index) => ({
				text,
				index,
				model: this.model,
				dimensions: EMBEDDING_DIMENSIONS,
				embedding: this.vector(text),
			})),
		};
	}

	async embedText(text: string): Promise<EmbeddingRecord> {
		const result = await this.embedTexts({ texts: [text] });
		const first = result.embeddings[0];
		if (!first)
			throw new Error("LabeledHashingEmbedder produced no embedding.");
		return first;
	}
}

const DECISION_CONTENT =
	"The orbiter telemetry downlink window is 90 minutes on the halcyon relay.";
const DECISION_TITLE = "Orbiter telemetry downlink window";
const PROBE_QUERY = "orbiter telemetry downlink halcyon";

describe("vector model stamping + cross-model query guard", () => {
	let store: InMemoryMemoryStore;
	let recallStore: ReturnType<typeof createInMemoryRecallStore>;
	let embedderA: LabeledHashingEmbedder;
	let memoA: MemoFS;
	let memoryId: string;

	beforeEach(async () => {
		store = new InMemoryMemoryStore();
		recallStore = createInMemoryRecallStore();
		embedderA = new LabeledHashingEmbedder("model-a");
		memoA = new MemoFS({ store, embedder: embedderA, recallStore });
		const written = await memoA.writeMemory({
			content: DECISION_CONTENT,
			title: DECISION_TITLE,
			kind: "decision",
		});
		memoryId = written.id;
	});

	it("stamps every vector chunk with the producing model", async () => {
		const docs = await recallStore.listDocuments();
		const chunks = docs.filter((doc) => doc.metadata?.sourceId === memoryId);
		expect(chunks.length).toBeGreaterThan(0);
		for (const doc of chunks) {
			expect(doc.metadata?.model).toBe("model-a");
		}
	});

	it("fuses vector + lexical hits when the query model matches", async () => {
		const recalled = await memoA.recall(PROBE_QUERY, { limit: 10 });
		const fused = recalled.items.find((item) => item.id.includes(memoryId));
		expect(fused, "expected the memory to be recalled").toBeDefined();
		// Vector-side proof: chunk metadata (sourceId) merged into the item.
		expect(fused?.metadata?.sourceId).toBe(memoryId);
	});

	it("excludes vector chunks embedded by a different model, even with identical vectors", async () => {
		// Same store + same vector index, but queries run through an embedder
		// whose vectors are IDENTICAL — only the model label differs.
		const embedderB = new LabeledHashingEmbedder("model-b");
		const memoB = new MemoFS({ store, embedder: embedderB, recallStore });

		const recalled = await memoB.recall(PROBE_QUERY, { limit: 10 });

		// Lexical recall still surfaces the memory…
		const items = recalled.items.filter((item) => item.id.includes(memoryId));
		expect(items.length).toBeGreaterThan(0);
		// …but no vector-side evidence fuses in: without the model filter,
		// identical vectors would rank first and merge sourceId metadata.
		for (const item of recalled.items) {
			expect(
				item.metadata?.sourceId,
				"vector path leaked across models",
			).not.toBe(memoryId);
		}
	});
});
