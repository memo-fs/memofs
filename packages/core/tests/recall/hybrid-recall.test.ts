import { describe, expect, it } from "vitest";
import type { HybridCandidate, JsonObject } from "../../src/index";
import {
	createDeterministicFallbackReranker,
	mergeHybridCandidates,
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
