import { describe, expect, it } from "vitest";
import {
	createBM25Store,
	fuzzyOverlapScore,
	fuzzyScore,
	termFrequency,
	tokenize,
} from "../../src/index";

describe("tokenize", () => {
	it("lowercases and splits on non-alphanumeric boundaries", () => {
		expect(tokenize("Auth-Login flow!")).toEqual(["auth", "login", "flow"]);
	});

	it("drops stop words by default", () => {
		expect(tokenize("how do we handle the auth")).toEqual(["handle", "auth"]);
	});

	it("keeps stop words when dropStopWords is false", () => {
		expect(tokenize("how do we handle auth", { dropStopWords: false })).toEqual(
			["how", "do", "we", "handle", "auth"],
		);
	});
});

describe("termFrequency", () => {
	it("counts repeated tokens", () => {
		expect(Object.fromEntries(termFrequency(["a", "a", "b"]))).toEqual({
			a: 2,
			b: 1,
		});
	});
});

describe("fuzzyOverlapScore / fuzzyScore", () => {
	it("scores identical token sets at 1", () => {
		expect(fuzzyOverlapScore(["auth", "login"], ["auth", "login"])).toBe(1);
	});

	it("gives partial credit for substring overlap", () => {
		// "auth" is contained in "authentication"
		const score = fuzzyOverlapScore(["auth"], ["authentication"]);
		expect(score).toBeGreaterThan(0);
		expect(score).toBeLessThan(1);
	});

	it("returns 0 for disjoint terms", () => {
		expect(fuzzyOverlapScore(["alpha"], ["bravo", "charlie"])).toBe(0);
	});

	it("fuzzyScore wraps tokenization", () => {
		expect(fuzzyScore("auth login", "auth login")).toBe(1);
	});
});

describe("BM25Store", () => {
	it("ranks documents by term relevance", () => {
		const store = createBM25Store();
		store.upsert([
			{ id: "a", text: "authentication login flow with JWT" },
			{ id: "b", text: "database connection pooling notes" },
			{ id: "c", text: "login auth middleware configuration" },
		]);

		const results = store.search("login auth", { topK: 3 });
		expect(results.map((r) => r.id)).toContain("a");
		expect(results.map((r) => r.id)).toContain("c");
		// Document b does not match either term.
		expect(results.map((r) => r.id)).not.toContain("b");
	});

	it("returns scores normalized within [0, 1]", () => {
		const store = createBM25Store();
		store.upsert([
			{ id: "a", text: "memory runtime for agents" },
			{ id: "b", text: "memory runtime for agents memory memory" },
		]);
		const results = store.search("memory agents");
		for (const r of results) {
			expect(r.score).toBeGreaterThanOrEqual(0);
			expect(r.score).toBeLessThanOrEqual(1);
		}
	});

	it("folds fuzzy overlap so partials still surface", () => {
		const store = createBM25Store({ fuzzyBoost: 0.5 });
		// BM25 exact match on "auth" misses "authentication", but the fuzzy
		// boost (substring) should still surface it above a no-match doc.
		store.upsert([
			{ id: "partial", text: "authentication session handling" },
			{ id: "nomatch", text: "weather forecast for tomorrow" },
		]);
		const results = store.search("auth", { topK: 2 });
		expect(results[0]?.id).toBe("partial");
		expect(results.map((r) => r.id)).not.toContain("nomatch");
	});

	it("isolates namespaces", () => {
		const store = createBM25Store();
		store.upsert([{ id: "a", text: "alpha beta", namespace: "ns1" }]);
		store.upsert([{ id: "a", text: "gamma delta", namespace: "ns2" }]);
		expect(
			store.search("alpha", { namespace: "ns1" }).map((r) => r.id),
		).toEqual(["a"]);
		expect(store.search("alpha", { namespace: "ns2" })).toEqual([]);
	});

	it("re-indexes a document id, replacing prior content", () => {
		const store = createBM25Store();
		store.upsert([{ id: "a", text: "alpha beta" }]);
		store.upsert([{ id: "a", text: "gamma delta" }]);
		expect(store.search("alpha")).toEqual([]);
		expect(store.search("gamma").map((r) => r.id)).toEqual(["a"]);
	});

	it("supports delete and clear", () => {
		const store = createBM25Store();
		store.upsert([
			{ id: "a", text: "alpha" },
			{ id: "b", text: "alpha beta" },
		]);
		store.delete(["a"]);
		expect(store.count()).toBe(1);
		expect(store.search("alpha").map((r) => r.id)).toEqual(["b"]);
		store.clear();
		expect(store.count()).toBe(0);
	});

	it("returns empty for an empty query or empty store", () => {
		const store = createBM25Store();
		store.upsert([{ id: "a", text: "alpha" }]);
		expect(store.search("   ")).toEqual([]);
		expect(createBM25Store().search("alpha")).toEqual([]);
	});

	it("rejects invalid documents", () => {
		const store = createBM25Store();
		expect(() => store.upsert([{ id: "a", text: 1 } as never])).toThrow();
	});
});
