/**
 * Working fusion + ghost-chunk scrub — facade-level coverage.
 *
 * Two behaviors the recall pipeline owes after identity unification:
 *
 * 1. **Per-memory rerank input.** A memory chunked across several vector
 *    documents (ordinals 0..N) must surface as ONE recall entry carrying the
 *    best-chunk evidence plus the lexical whole-note signal — the lexical hit
 *    lives at ordinal 0 while the query-relevant text may live in a later
 *    chunk, so the fusion join must work ACROSS ordinals, not just at 0.
 *
 * 2. **One-time legacy-row scrub.** Embedding rows stamped with the legacy
 *    wall-clock-timestamp `sourceId` (written before identity unification)
 *    are unreachable by `deleteBySource` and must be dropped exactly once on
 *    the first hydration after upgrade — a manifest maintenance flag prevents
 *    re-scrubbing, and only `note`-source rows are touched.
 *
 * Uses the deterministic bag-of-words hashing embedder so token overlap ≈
 * cosine similarity (the shared length-based fixture cannot express semantic
 * closeness).
 */

import { beforeEach, describe, expect, it } from "vitest";
import {
	createFsRecallStore,
	EMBEDDINGS_INDEX_PATH,
	type EmbeddingRecord,
	type EmbedTextsInput,
	type EmbedTextsResult,
	InMemoryMemoryStore,
	MemoFS,
	type MemoryEmbedder,
	parseRecallDocId,
	readManifest,
	writeManifest,
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

// ---------------------------------------------------------------------------
// Per-memory consolidation over a multi-chunk memory
// ---------------------------------------------------------------------------

/** Query + the sentence carrying its answer tokens (lands in a LATER chunk). */
const PROBE_SENTENCE =
	"The quokka sanctuary rotation cadence for nectar feeders is fixed at twelve hours by the wildlife board.";
const PROBE_QUERY = "quokka sanctuary rotation cadence nectar feeders";

/**
 * Filler paragraphs (~1.6k chars) free of probe tokens so the chunker places
 * the probe sentence in chunk >= 1 while chunk 0 stays semantically cold.
 */
const FILLER_PARAGRAPH =
	"The observability rollout across the western provinces proceeded through three distinct phases of platform migration, each gated by a review board that inspected dashboards, alert routing tables, and the postmortem backlog before granting approval to advance to the next stage of the planned rollout window.";
const MULTI_CHUNK_CONTENT = [
	FILLER_PARAGRAPH,
	FILLER_PARAGRAPH,
	FILLER_PARAGRAPH,
	FILLER_PARAGRAPH,
	FILLER_PARAGRAPH,
	PROBE_SENTENCE,
].join("\n\n");

/** Shares exactly one probe token ("rotation") with the query. */
const DISTRACTOR_CONTENT =
	"Sentry handover schedules for the on-call pager roster follow a weekly cycle across the support team.";

describe("per-memory fusion over chunked memories", () => {
	let store: InMemoryMemoryStore;
	let embedder: HashingEmbedder;
	let memo: MemoFS;

	beforeEach(() => {
		store = new InMemoryMemoryStore();
		embedder = new HashingEmbedder();
		memo = new MemoFS({
			store,
			embedder,
			recallStore: createFsRecallStore({ store }),
		});
	});

	it("surfaces one fused entry per memory when the query-relevant text is in a later chunk", async () => {
		const written = await memo.writeMemory({
			content: MULTI_CHUNK_CONTENT,
			title: "Quokka feeder rotation policy",
			kind: "decision",
		});
		const distractor = await memo.writeMemory({
			content: DISTRACTOR_CONTENT,
			title: "Pager rotation",
			kind: "decision",
		});

		// Fixture guard: the memory must actually be chunked past ordinal 0.
		const probe = await embedder.embedText(PROBE_QUERY);
		const chunks = await (await createFsRecallStore({ store })).query({
			embedding: probe.embedding,
			topK: 100,
			filter: { sourceId: written.id },
		});
		const ordinals = chunks.map((hit) => parseRecallDocId(hit.id)?.ordinal);
		expect(
			ordinals.some((ordinal) => ordinal !== undefined && ordinal > 0),
			"fixture must produce more than one chunk",
		).toBe(true);

		const recalled = await memo.recall(PROBE_QUERY, { limit: 10 });

		// ONE list entry for the memory — not one per chunk.
		const fused = recalled.items.filter(
			(item) => parseRecallDocId(item.id)?.memoryId === written.id,
		);
		expect(fused).toHaveLength(1);

		// Cross-ordinal fusion proof: the single entry carries BOTH the
		// vector-side marker (chunk metadata, sourceId = memory id — the best
		// chunk was NOT ordinal 0) and the lexical-side marker (bm25, which
		// lives on the ordinal-0 whole-note doc).
		expect(fused[0]?.metadata?.sourceId).toBe(written.id);
		expect(fused[0]?.metadata?.source).toBe("bm25");

		// The fused memory outranks a distractor sharing a single query token.
		const fusedEntry = fused[0];
		expect(fusedEntry, "fused entry must exist").toBeDefined();
		const distractorItems = recalled.items.filter(
			(item) => parseRecallDocId(item.id)?.memoryId === distractor.id,
		);
		if (distractorItems.length > 0) {
			expect(recalled.items.indexOf(fusedEntry)).toBeLessThan(
				recalled.items.indexOf(distractorItems[0]),
			);
		}
	});
});

// ---------------------------------------------------------------------------
// One-time legacy ghost-row scrub
// ---------------------------------------------------------------------------

/** Distinctive tokens used to detect rows by content. */
const SCRUB_CONTENT =
	"The lyrebird sentinel displays replay attacker recordings within nine seconds of detection on the mezzanine.";
const GHOST_TEXT =
	"The wobblecrane assembly binds its torque fixtures during the winter maintenance window.";
const CONTROL_TEXT =
	"The keystone core document excerpt describes the canonical file layout.";

/** A 64-dim nonzero embedding matching the HashingEmbedder's dimensionality. */
function staticEmbedding(): number[] {
	return Array.from({ length: EMBEDDING_DIMENSIONS }, (_, i) =>
		i === 0 ? 1 : 0,
	);
}

/** Appends JSONL rows to the persisted embeddings index. */
async function appendEmbeddingRows(
	store: InMemoryMemoryStore,
	rows: Array<Record<string, unknown>>,
): Promise<void> {
	const current = await store.read(EMBEDDINGS_INDEX_PATH);
	const base =
		current.length === 0 || current.endsWith("\n") ? current : `${current}\n`;
	await store.write(
		EMBEDDINGS_INDEX_PATH,
		rows
			.map((row) => `${JSON.stringify(row)}\n`)
			.reduce((acc, line) => acc + line, base),
	);
}

describe("one-time legacy embedding-row scrub on hydration", () => {
	it("drops timestamp-sourceId note rows once, keeps other source types, and flags the manifest", async () => {
		const store = new InMemoryMemoryStore();
		const embedder = new HashingEmbedder();
		const memo1 = new MemoFS({
			store,
			embedder,
			recallStore: createFsRecallStore({ store }),
		});
		const written = await memo1.writeMemory({
			content: SCRUB_CONTENT,
			title: "Lyrebird sentinel policy",
			kind: "decision",
		});

		// Simulate the pre-upgrade manifest: the maintenance marker predates
		// the scrub capability and must be absent.
		const manifest = await readManifest(store);
		delete manifest.maintenance;
		await writeManifest(store, manifest);

		// Inject one legacy ghost (timestamp sourceId, note source) and one
		// control row (document source) that the bounded scrub must keep.
		await appendEmbeddingRows(store, [
			{
				id: "notes.md:0:deadbeefcafe",
				text: GHOST_TEXT,
				embedding: staticEmbedding(),
				metadata: {
					projectId: "default",
					sourceType: "note",
					sourceId: "2026-08-01T10:00:00.000Z",
					memoryType: "notes",
				},
			},
			{
				id: "core-control-row",
				text: CONTROL_TEXT,
				embedding: staticEmbedding(),
				metadata: {
					projectId: "default",
					sourceType: "document",
					sourceId: "core",
					memoryType: "core",
				},
			},
		]);

		// A fresh runtime hydrates: the scrub fires during ensureReady.
		const secondStore = createFsRecallStore({ store });
		const memo2 = new MemoFS({
			store,
			embedder: new HashingEmbedder(),
			recallStore: secondStore,
		});
		await memo2.recall("lyrebird sentinel replay detection", { limit: 5 });

		const probe = await embedder.embedText("lyrebird sentinel replay");
		const afterScrub = await secondStore.query({
			embedding: probe.embedding,
			topK: 100,
		});
		// Ghost gone; control and legit rows survive.
		expect(
			afterScrub.some((hit) => (hit.text ?? "").includes("wobblecrane")),
			"legacy timestamp-sourceId note rows must be scrubbed",
		).toBe(false);
		expect(
			afterScrub.some((hit) => (hit.text ?? "").includes("keystone")),
			"document-source rows must survive the bounded scrub",
		).toBe(true);
		expect(
			afterScrub.some(
				(hit) => parseRecallDocId(hit.id)?.memoryId === written.id,
			),
			"live memory chunks must survive the scrub",
		).toBe(true);

		// Manifest flag recorded.
		const scrubbedManifest = await readManifest(store);
		const scrubbedAt = scrubbedManifest.maintenance?.legacyEmbeddingsScrubbedAt;
		expect(typeof scrubbedAt).toBe("string");

		// Second hydration no-ops: a freshly injected ghost SURVIVES because
		// the flag prevents re-scrubbing, and the flag value is unchanged.
		await appendEmbeddingRows(store, [
			{
				id: "notes.md:1:feedface",
				text: "The frangipane orchard drips resin beside the northern wall.",
				embedding: staticEmbedding(),
				metadata: {
					projectId: "default",
					sourceType: "note",
					sourceId: "2026-08-02T10:00:00.000Z",
					memoryType: "notes",
				},
			},
		]);
		const thirdStore = createFsRecallStore({ store });
		const memo3 = new MemoFS({
			store,
			embedder: new HashingEmbedder(),
			recallStore: thirdStore,
		});
		await memo3.recall("lyrebird sentinel replay detection", { limit: 5 });

		const afterThird = await thirdStore.query({
			embedding: probe.embedding,
			topK: 100,
		});
		expect(
			afterThird.some((hit) => (hit.text ?? "").includes("frangipane")),
			"the maintenance flag must prevent a second scrub",
		).toBe(true);
		const thirdManifest = await readManifest(store);
		expect(thirdManifest.maintenance?.legacyEmbeddingsScrubbedAt).toBe(
			scrubbedAt,
		);
	});

	it("skips the scrub (flag unset) when no memory ids hydrated — fail-closed", async () => {
		// Zero known memory ids means hydration produced nothing: a broken
		// read or foreign data, never a valid post-upgrade state. The scrub
		// must refuse to run rather than treat every note row as a ghost.
		const store = new InMemoryMemoryStore();
		await store.write(EMBEDDINGS_INDEX_PATH, "");
		await appendEmbeddingRows(store, [
			{
				id: "notes.md:0:cafebaed",
				text: GHOST_TEXT,
				embedding: staticEmbedding(),
				metadata: {
					projectId: "default",
					sourceType: "note",
					sourceId: "2026-08-01T10:00:00.000Z",
					memoryType: "notes",
				},
			},
		]);

		const recallStore = createFsRecallStore({ store });
		const memo = new MemoFS({
			store,
			embedder: new HashingEmbedder(),
			recallStore,
		});
		await memo.recall("wobblecrane torque fixtures", { limit: 5 });

		const probe = await new HashingEmbedder().embedText("wobblecrane torque");
		const after = await recallStore.query({
			embedding: probe.embedding,
			topK: 100,
		});
		expect(
			after.some((hit) => (hit.text ?? "").includes("wobblecrane")),
			"with no known memory ids the scrub must not delete anything",
		).toBe(true);
		const manifest = await readManifest(store);
		expect(
			manifest.maintenance?.legacyEmbeddingsScrubbedAt,
			"the flag must stay unset so a healthy hydration retries the scrub",
		).toBeUndefined();
	});
});
