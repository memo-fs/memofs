import { describe, expect, it } from "vitest";
import type { HybridCandidate, JsonObject } from "../../src/index";
import {
	createDeterministicFallbackReranker,
	HYBRID_SCORING_DEFAULTS,
	HYBRID_SINGLE_PATH_WEIGHTS,
	mergeHybridCandidates,
	parseRecallDocId,
	readConfidence,
	recencyBoost,
} from "../../src/index";

function candidate(
	id: string,
	vectorScore: number,
	lexicalScore: number,
	metadata?: JsonObject,
): HybridCandidate {
	return {
		id,
		text: id === "auth" ? "authentication login flow" : id,
		vectorScore,
		lexicalScore,
		...(metadata === undefined ? {} : { metadata }),
	};
}

describe("recencyBoost", () => {
	const now = new Date("2026-06-19T00:00:00Z");

	it("scores 1 for a memory created now", () => {
		expect(
			recencyBoost({ createdAt: "2026-06-19T00:00:00Z" }, now, 30),
		).toBeCloseTo(1, 5);
	});

	it("halves over one half-life", () => {
		// 30 days ago, half-life 30 days → 0.5
		expect(
			recencyBoost({ createdAt: "2026-05-20T00:00:00Z" }, now, 30),
		).toBeCloseTo(0.5, 1);
	});

	it("decays further over two half-lives", () => {
		expect(
			recencyBoost({ createdAt: "2026-04-20T00:00:00Z" }, now, 30),
		).toBeCloseTo(0.25, 1);
	});

	it("returns neutral 0.5 for missing timestamps", () => {
		expect(recencyBoost({}, now, 30)).toBe(0.5);
	});
});

describe("readConfidence", () => {
	it("reads a numeric confidence", () => {
		expect(readConfidence({ confidence: 0.9 })).toBe(0.9);
	});
	it("clamps out-of-range values", () => {
		expect(readConfidence({ confidence: 5 })).toBe(1);
	});
	it("defaults to neutral 0.5", () => {
		expect(readConfidence(undefined)).toBe(0.5);
	});
});

describe("mergeHybridCandidates", () => {
	it("ranks a candidate that wins both signals on top", async () => {
		const candidates = new Map<string, HybridCandidate>([
			["winner", candidate("winner", 0.95, 0.9, { confidence: 0.9 })],
			["loser", candidate("loser", 0.2, 0.1)],
		]);
		const result = await mergeHybridCandidates(candidates, {
			query: "login",
			topK: 2,
		});
		expect(result[0]?.id).toBe("winner");
		expect(result[0]?.score).toBeGreaterThan(result[1]?.score ?? 0);
	});

	it("boosts recent memories over stale ones at equal relevance", async () => {
		const recent = "2026-06-18T00:00:00Z";
		const stale = "2025-01-01T00:00:00Z";
		const candidates = new Map<string, HybridCandidate>([
			["recent", candidate("recent", 0.5, 0.5, { createdAt: recent })],
			["stale", candidate("stale", 0.5, 0.5, { createdAt: stale })],
		]);
		const result = await mergeHybridCandidates(candidates, {
			query: "memory",
			topK: 2,
			now: () => new Date("2026-06-19T00:00:00Z"),
		});
		expect(result[0]?.id).toBe("recent");
	});

	it("respects topK truncation", async () => {
		const candidates = new Map<string, HybridCandidate>([
			["a", candidate("a", 0.9, 0.9)],
			["b", candidate("b", 0.5, 0.5)],
			["c", candidate("c", 0.1, 0.1)],
		]);
		const result = await mergeHybridCandidates(candidates, {
			query: "x",
			topK: 2,
		});
		expect(result).toHaveLength(2);
	});

	it("folds a reranker opinion into the score", async () => {
		// Vector says "vectordoc" is better, but the lexical reranker will favor
		// "auth" because its text shares query terms.
		const candidates = new Map<string, HybridCandidate>([
			[
				"auth",
				{
					id: "auth",
					text: "authentication login flow",
					vectorScore: 0.3,
					lexicalScore: 0.2,
				},
			],
			[
				"vectordoc",
				{
					id: "vectordoc",
					text: "database connection pooling",
					vectorScore: 0.95,
					lexicalScore: 0,
				},
			],
		]);
		const reranker = createDeterministicFallbackReranker();
		const result = await mergeHybridCandidates(candidates, {
			query: "authentication login flow",
			topK: 2,
			reranker,
		});
		// "auth" matches the query lexically and should beat "vectordoc".
		expect(result[0]?.id).toBe("auth");
	});

	it("returns [] for no candidates", async () => {
		const result = await mergeHybridCandidates(new Map(), {
			query: "x",
			topK: 5,
		});
		expect(result).toEqual([]);
	});

	it("never throws if the reranker fails", async () => {
		const candidates = new Map<string, HybridCandidate>([
			["a", candidate("a", 0.9, 0.9)],
		]);
		const failingReranker = {
			async rerank() {
				throw new Error("boom");
			},
		};
		const result = await mergeHybridCandidates(candidates, {
			query: "x",
			topK: 1,
			reranker: failingReranker,
		});
		expect(result).toHaveLength(1);
	});
});

describe("per-memory consolidation (reranker input is per memory, not per chunk)", () => {
	it("collapses a memory's chunks into one best-evidence candidate", async () => {
		// Chunk 0 carries the lexical whole-note hit (strongest combined
		// evidence); chunk 2 carries the strongest vector evidence. One
		// memory → one list entry joining BOTH chunks' signals.
		const candidates = new Map<string, HybridCandidate>([
			["mem_a#0", candidate("mem_a#0", 0.1, 0.9, { source: "bm25" })],
			["mem_a#2", candidate("mem_a#2", 0.8, 0, { sourceId: "mem_a" })],
			["graph:node1", candidate("graph:node1", 0.5, 0.5)],
		]);

		const result = await mergeHybridCandidates(candidates, {
			query: "x",
			topK: 10,
		});

		const memA = result.filter(
			(item) => parseRecallDocId(item.id)?.memoryId === "mem_a",
		);
		expect(
			memA,
			"one memory in N chunks must surface as exactly one list entry",
		).toHaveLength(1);
		// Highest-evidence chunk wins the surfaced id and text (here the
		// ordinal-0 whole-note doc: 0.1 + 0.9 beats 0.8 + 0).
		expect(memA[0]?.id).toBe("mem_a#0");
		// Fused metadata: the vector marker from chunk 2 merged in.
		expect(memA[0]?.metadata?.source).toBe("bm25");
		expect(memA[0]?.metadata?.sourceId).toBe("mem_a");
		// Non-canonical ids are never consolidated.
		expect(result.some((item) => item.id === "graph:node1")).toBe(true);
	});

	it("merges per-path scores as the group max", async () => {
		const candidates = new Map<string, HybridCandidate>([
			["mem_a#0", candidate("mem_a#0", 0.2, 0.7)],
			["mem_a#1", candidate("mem_a#1", 0.9, 0.3)],
			["mem_b#0", candidate("mem_b#0", 0.85, 0)],
		]);

		const result = await mergeHybridCandidates(candidates, {
			query: "x",
			topK: 10,
		});

		const memA = result.find(
			(item) => parseRecallDocId(item.id)?.memoryId === "mem_a",
		);
		expect(memA).toBeDefined();
		// mem_a carries max(vector)=0.9 AND max(lexical)=0.7 of its chunks,
		// which must outrank mem_b's strong vector-only 0.85.
		expect(result[0]?.id).toBe("mem_a#1");
	});

	it("tie-breaks equal-evidence chunks toward the lower ordinal", async () => {
		const candidates = new Map<string, HybridCandidate>([
			["mem_a#3", candidate("mem_a#3", 0.6, 0.2)],
			["mem_a#1", candidate("mem_a#1", 0.2, 0.6)],
		]);

		const result = await mergeHybridCandidates(candidates, {
			query: "x",
			topK: 10,
		});

		expect(result).toHaveLength(1);
		expect(result[0]?.id).toBe("mem_a#1");
	});
});

describe("double-hit fusion bonus", () => {
	it("ranks an equal-base double hit above equal-base single-path hits", async () => {
		const candidates = new Map<string, HybridCandidate>([
			["mem_b#0", candidate("mem_b#0", 0.5, 0.5)],
			["mem_c#0", candidate("mem_c#0", 0.5, 0)],
			["mem_d#0", candidate("mem_d#0", 0, 0.5)],
		]);

		const result = await mergeHybridCandidates(candidates, {
			query: "x",
			topK: 3,
		});

		expect(result.map((item) => item.id)).toEqual([
			"mem_b#0",
			"mem_c#0",
			"mem_d#0",
		]);
	});

	it("lets a moderate double hit overtake a strong single-path hit", async () => {
		// The fusion reward the hybrid model promises: evidence from BOTH
		// retrieval paths beats an extreme score from one path alone.
		const candidates = new Map<string, HybridCandidate>([
			["mem_vec#0", candidate("mem_vec#0", 1.0, 0)],
			["mem_both#0", candidate("mem_both#0", 0.5, 0.5)],
		]);

		const result = await mergeHybridCandidates(candidates, {
			query: "x",
			topK: 2,
		});

		expect(result[0]?.id).toBe("mem_both#0");
	});

	it("keeps a strong single-path hit above a weak double hit", async () => {
		// The bonus is gated by the weaker path's score, so weak second-path
		// evidence must not flip a clear winner.
		const candidates = new Map<string, HybridCandidate>([
			["mem_strong#0", candidate("mem_strong#0", 0.9, 0)],
			["mem_weak#0", candidate("mem_weak#0", 0.25, 0.2)],
		]);

		const result = await mergeHybridCandidates(candidates, {
			query: "x",
			topK: 2,
		});

		expect(result[0]?.id).toBe("mem_strong#0");
	});

	it("exposes the locked formula as frozen named constants", () => {
		expect(Object.isFrozen(HYBRID_SCORING_DEFAULTS)).toBe(true);
		expect(HYBRID_SCORING_DEFAULTS.vectorWeight).toBe(0.6);
		expect(HYBRID_SCORING_DEFAULTS.doubleHitBonusWeight).toBeGreaterThan(0);
		expect(HYBRID_SCORING_DEFAULTS.doubleHitBonusWeight).toBeLessThanOrEqual(1);
		expect(Object.isFrozen(HYBRID_SINGLE_PATH_WEIGHTS)).toBe(true);
		expect(HYBRID_SINGLE_PATH_WEIGHTS.lexicalOnly).toBe(0);
		expect(HYBRID_SINGLE_PATH_WEIGHTS.vectorOnly).toBe(1);
	});
});
