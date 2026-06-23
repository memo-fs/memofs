/**
 * Unit tests for the progressive-recall machinery (ADR 0009 Component 4 / Q27).
 *
 * The end-to-end behavior (compact briefing → expand round-trip) is covered in
 * `context-progressive.test.ts`. This file pins the pure pieces in isolation:
 * the {@link ContextCache} (LRU + TTL + key derivation), the cursor
 * encode/decode round-trip, and the expansion-affordance builders.
 */

import { describe, expect, it } from "vitest";
import {
	buildExpansionAffordances,
	type CachedRecentEvent,
	ContextCache,
	type ContextCacheEntry,
	decodeExpansionCursor,
	encodeExpansionCursor,
	expandAffordanceLine,
} from "../../src/tekmemo/progressive";

function makeEntry(
	overrides: Partial<ContextCacheEntry> = {},
): ContextCacheEntry {
	const now = Date.now();
	return {
		createdAt: now,
		accessedAt: now,
		expandedTerms: ["auth"],
		recallItems: [],
		recentItems: [],
		hasNotes: false,
		hasEntities: false,
		...overrides,
	};
}

describe("ContextCache", () => {
	it("stores and retrieves an entry by key", () => {
		const cache = new ContextCache();
		const key = cache.generateKey({ query: "auth" }, ["auth", "jwt"]);
		cache.put(key, makeEntry({ hasEntities: true }));
		expect(cache.get(key)?.hasEntities).toBe(true);
	});

	it("returns undefined on a miss", () => {
		const cache = new ContextCache();
		expect(cache.get("nope")).toBeUndefined();
	});

	it("derives the key from query + scope + expanded terms", () => {
		const cache = new ContextCache();
		const k1 = cache.generateKey({ query: "auth" }, ["auth"]);
		const k2 = cache.generateKey({ query: "auth" }, ["auth"]);
		const k3 = cache.generateKey({ query: "auth" }, ["auth", "jwt"]);
		const k4 = cache.generateKey({ query: "auth", projectId: "p" }, ["auth"]);
		expect(k1).toBe(k2); // same inputs → same key
		expect(k1).not.toBe(k3); // different terms → different key
		expect(k1).not.toBe(k4); // different scope → different key
	});

	it("evicts the least-recently-used entry when over capacity", () => {
		const cache = new ContextCache({ maxEntries: 3 });
		cache.put("a", makeEntry());
		cache.put("b", makeEntry());
		cache.put("c", makeEntry());
		// Touch "a" so "b" becomes LRU.
		cache.get("a");
		cache.put("d", makeEntry()); // over capacity → evict LRU ("b")
		expect(cache.get("b")).toBeUndefined();
		expect(cache.get("a")).toBeDefined();
		expect(cache.get("c")).toBeDefined();
		expect(cache.get("d")).toBeDefined();
		expect(cache.size).toBe(3);
	});

	it("expires entries after the TTL", () => {
		const cache = new ContextCache({ ttlMs: 10 });
		cache.put("a", makeEntry({ createdAt: Date.now() }));
		expect(cache.get("a")).toBeDefined();
		// Backdate the entry past the TTL.
		const entry = cache.get("a");
		if (entry) entry.createdAt = Date.now() - 100;
		// The next get reads createdAt via the stored entry; force expiry by
		// re-putting a backdated entry.
		cache.put("a", makeEntry({ createdAt: Date.now() - 100 }));
		expect(cache.get("a")).toBeUndefined();
		expect(cache.size).toBe(0);
	});

	it("re-putting an existing key reorders it to most-recently-used", () => {
		const cache = new ContextCache({ maxEntries: 2 });
		cache.put("a", makeEntry());
		cache.put("b", makeEntry());
		cache.put("a", makeEntry()); // "a" is now MRU
		cache.put("c", makeEntry()); // over capacity → evict "b" (LRU)
		expect(cache.get("a")).toBeDefined();
		expect(cache.get("b")).toBeUndefined();
		expect(cache.get("c")).toBeDefined();
	});

	it("clear() empties the cache", () => {
		const cache = new ContextCache();
		cache.put("a", makeEntry());
		cache.clear();
		expect(cache.size).toBe(0);
		expect(cache.get("a")).toBeUndefined();
	});
});

describe("expansion cursor encode/decode", () => {
	it("round-trips a valid payload", () => {
		const cursor = encodeExpansionCursor({
			v: 1,
			key: "abc",
			section: "recall",
		});
		const decoded = decodeExpansionCursor(cursor);
		expect(decoded).toEqual({ v: 1, key: "abc", section: "recall" });
	});

	it("round-trips all four section types", () => {
		for (const section of ["entities", "recall", "recent", "notes"] as const) {
			const cursor = encodeExpansionCursor({ v: 1, key: "k", section });
			expect(decodeExpansionCursor(cursor)?.section).toBe(section);
		}
	});

	it("returns undefined for malformed base64", () => {
		expect(decodeExpansionCursor("!!!not-base64!!!")).toBeUndefined();
	});

	it("returns undefined for malformed JSON", () => {
		const badJson = Buffer.from("{not json", "utf8").toString("base64url");
		expect(decodeExpansionCursor(badJson)).toBeUndefined();
	});

	it("returns undefined for a wrong version", () => {
		const wrongVersion = Buffer.from(
			JSON.stringify({ v: 99, key: "k", section: "recall" }),
			"utf8",
		).toString("base64url");
		expect(decodeExpansionCursor(wrongVersion)).toBeUndefined();
	});

	it("returns undefined for a missing key", () => {
		const noKey = Buffer.from(
			JSON.stringify({ v: 1, section: "recall" }),
			"utf8",
		).toString("base64url");
		expect(decodeExpansionCursor(noKey)).toBeUndefined();
	});

	it("returns undefined for an invalid section", () => {
		const badSection = Buffer.from(
			JSON.stringify({ v: 1, key: "k", section: "bogus" }),
			"utf8",
		).toString("base64url");
		expect(decodeExpansionCursor(badSection)).toBeUndefined();
	});
});

describe("buildExpansionAffordances", () => {
	it("emits a recall affordance when fragments remain beyond the compact cap", () => {
		const cache = new ContextCache();
		const key = cache.generateKey({ query: "auth" }, ["auth"]);
		const entry = makeEntry({
			recallItems: [
				{ id: "1", text: "a" },
				{ id: "2", text: "b" },
				{ id: "3", text: "c" },
				{ id: "4", text: "d" },
				{ id: "5", text: "e" },
			],
		});
		const affordances = buildExpansionAffordances(key, entry, {
			renderedRecall: 3,
			renderedRecent: 0,
		});
		const recallAffordance = affordances.find((a) => a.section === "recall");
		expect(recallAffordance).toBeDefined();
		expect(recallAffordance?.available).toBe(2);
		expect(recallAffordance?.hint).toMatch(/2 more recall fragments/);
		// The cursor must round-trip.
		expect(decodeExpansionCursor(recallAffordance?.cursor ?? "")?.section).toBe(
			"recall",
		);
	});

	it("omits the recall affordance when nothing remains", () => {
		const cache = new ContextCache();
		const key = cache.generateKey({ query: "auth" }, ["auth"]);
		const entry = makeEntry({ recallItems: [{ id: "1", text: "a" }] });
		const affordances = buildExpansionAffordances(key, entry, {
			renderedRecall: 1,
			renderedRecent: 0,
		});
		expect(affordances.find((a) => a.section === "recall")).toBeUndefined();
	});

	it("emits an entities affordance when entities resolved", () => {
		const cache = new ContextCache();
		const key = cache.generateKey({ query: "auth" }, ["auth"]);
		const entry = makeEntry({ hasEntities: true });
		const affordances = buildExpansionAffordances(key, entry, {
			renderedRecall: 0,
			renderedRecent: 0,
		});
		expect(affordances.find((a) => a.section === "entities")).toBeDefined();
	});

	it("emits a recent affordance when events remain", () => {
		const cache = new ContextCache();
		const key = cache.generateKey({ query: "auth" }, ["auth"]);
		const recent: CachedRecentEvent[] = [
			{ id: "1" },
			{ id: "2" },
			{ id: "3" },
			{ id: "4" },
		];
		const entry = makeEntry({ recentItems: recent });
		const affordances = buildExpansionAffordances(key, entry, {
			renderedRecall: 0,
			renderedRecent: 2,
		});
		const recentAffordance = affordances.find((a) => a.section === "recent");
		expect(recentAffordance?.available).toBe(2);
		expect(recentAffordance?.hint).toMatch(/2 more recent events/);
	});

	it("emits a notes affordance when notes are available", () => {
		const cache = new ContextCache();
		const key = cache.generateKey({ query: "auth" }, ["auth"]);
		const entry = makeEntry({ hasNotes: true });
		const affordances = buildExpansionAffordances(key, entry, {
			renderedRecall: 0,
			renderedRecent: 0,
		});
		const notesAffordance = affordances.find((a) => a.section === "notes");
		expect(notesAffordance).toBeDefined();
		expect(notesAffordance?.hint).toMatch(/full notes memory/);
	});

	it("emits nothing when the entry is empty", () => {
		const cache = new ContextCache();
		const key = cache.generateKey({ query: "auth" }, ["auth"]);
		const entry = makeEntry();
		const affordances = buildExpansionAffordances(key, entry, {
			renderedRecall: 0,
			renderedRecent: 0,
		});
		expect(affordances).toEqual([]);
	});
});

describe("expandAffordanceLine", () => {
	it("renders a copy-pasteable expand instruction with a count", () => {
		const line = expandAffordanceLine({
			section: "recall",
			cursor: "xyz",
			available: 14,
			hint: "14 more recall fragments",
		});
		expect(line).toContain('tekmemo.context(section="recall"');
		expect(line).toContain("expand=");
		expect(line).toContain("(14 more)");
	});

	it("omits the count when available is undefined", () => {
		const line = expandAffordanceLine({
			section: "notes",
			cursor: "xyz",
			hint: "full notes memory",
		});
		expect(line).not.toMatch(/\(\d+ more\)/);
		expect(line).toContain('section="notes"');
	});
});
