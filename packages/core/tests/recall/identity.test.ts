/**
 * Unit tests for the canonical recall-document identity module — the SSOT
 * joining the lexical and vector retrieval paths on one id language:
 * `{memoryId}#{ordinal}` for every indexed unit of a memory.
 */

import { describe, expect, it } from "vitest";
import {
	memoryLexicalDocId,
	memoryRecallDocId,
	parseRecallDocId,
	resolveMemoryId,
} from "../../src/recall/identity";

describe("memoryRecallDocId", () => {
	it("constructs the canonical id from memory id + ordinal", () => {
		expect(memoryRecallDocId("mem_0123456789abcdef", 0)).toBe(
			"mem_0123456789abcdef#0",
		);
		expect(memoryRecallDocId("mem_0123456789abcdef", 3)).toBe(
			"mem_0123456789abcdef#3",
		);
	});

	it("rejects an empty memory id", () => {
		expect(() => memoryRecallDocId("", 0)).toThrow();
	});

	it("rejects a negative or non-integer ordinal", () => {
		expect(() => memoryRecallDocId("mem_x", -1)).toThrow();
		expect(() => memoryRecallDocId("mem_x", 1.5)).toThrow();
	});
});

describe("memoryLexicalDocId", () => {
	it("is the ordinal-0 canonical id (the whole-note lexical doc)", () => {
		expect(memoryLexicalDocId("mem_abc")).toBe("mem_abc#0");
	});
});

describe("parseRecallDocId", () => {
	it("round-trips a canonical id", () => {
		expect(parseRecallDocId("mem_abc#0")).toEqual({
			memoryId: "mem_abc",
			ordinal: 0,
		});
		expect(parseRecallDocId("mem_abc#12")).toEqual({
			memoryId: "mem_abc",
			ordinal: 12,
		});
	});

	it("anchors on the LAST '#' so memory ids containing '#' round-trip", () => {
		expect(parseRecallDocId("mem#a#1#0")).toEqual({
			memoryId: "mem#a#1",
			ordinal: 0,
		});
	});

	it("returns undefined for non-canonical id schemes", () => {
		// Lexical graph docs, the core document, legacy content-addressed
		// chunk ids, and substring-fallback ids must never parse as memory
		// recall documents.
		expect(parseRecallDocId("graph:auth-service")).toBeUndefined();
		expect(parseRecallDocId("core:document")).toBeUndefined();
		expect(parseRecallDocId("note_2026-08-18T00:00:00.000Z:0:1a2b3c4d")).toBeUndefined();
		expect(parseRecallDocId("core_0_0123456789abcdef")).toBeUndefined();
		expect(parseRecallDocId("mem_abc")).toBeUndefined();
		expect(parseRecallDocId("")).toBeUndefined();
	});
});

describe("resolveMemoryId", () => {
	const known = new Set(["mem_abc", "legacy-plain-id"]);

	it("prefers the exact raw key (yesterday's item ids were memory ids)", () => {
		expect(resolveMemoryId("mem_abc", (k) => known.has(k))).toBe("mem_abc");
		expect(
			resolveMemoryId("legacy-plain-id", (k) => known.has(k)),
		).toBe("legacy-plain-id");
	});

	it("resolves a canonical doc id to its parent memory id", () => {
		expect(resolveMemoryId("mem_abc#0", (k) => known.has(k))).toBe("mem_abc");
		expect(resolveMemoryId("mem_abc#4", (k) => known.has(k))).toBe("mem_abc");
	});

	it("returns the raw key unchanged when neither form is known", () => {
		expect(resolveMemoryId("graph:x", (k) => known.has(k))).toBe("graph:x");
	});

	it("does not misresolve a raw memory id that itself ends in #digits", () => {
		// A pathological caller-supplied memory id ending in "#1" must be
		// found as its raw self first, not parsed apart.
		const ids = new Set(["weird#1"]);
		expect(resolveMemoryId("weird#1", (k) => ids.has(k))).toBe("weird#1");
	});
});
