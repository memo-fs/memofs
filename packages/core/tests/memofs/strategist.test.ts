/**
 * Unit tests for the 4-stage retrieval strategist (ADR 0009 Component 2 / Q23).
 *
 * Each stage is a pure function, so each is tested in isolation — mirroring the
 * `consolidateGraph` / `applyConsolidation` split. The end-to-end behavior
 * (does `memofs.context` actually use the strategist?) lives in the regression
 * harness + the intelligence story tests.
 */

import { describe, expect, it } from "vitest";
import type { RecallItem } from "../../src/index";
import {
	allocateBudget,
	filterCandidates,
	type ResolveGraphEdge,
	type ResolveGraphNode,
	resolveEntities,
	resolveEntityState,
	rewriteQuery,
	SECTION_WEIGHTS,
} from "../../src/memofs/strategist";

// ---------------------------------------------------------------------------
// Stage 1 — Rewrite
// ---------------------------------------------------------------------------

describe("rewriteQuery (stage 1)", () => {
	it("returns the original tokens when no lexicon entry matches", () => {
		const result = rewriteQuery({ query: "totally unknown zyx" });
		expect(result.tokens).toEqual(["totally", "unknown", "zyx"]);
		expect(result.expanded).toBe(false);
		expect(result.expandedTerms).toEqual(["totally", "unknown", "zyx"]);
	});

	it("expands 'auth' into authentication/jwt/oauth/login", () => {
		const result = rewriteQuery({ query: "auth flow" });
		expect(result.expanded).toBe(true);
		expect(result.expandedTerms).toContain("authentication");
		expect(result.expandedTerms).toContain("jwt");
		expect(result.expandedTerms).toContain("oauth");
		expect(result.expandedTerms).toContain("login");
		// Original tokens always retained.
		expect(result.expandedTerms).toContain("auth");
		expect(result.expandedTerms).toContain("flow");
	});

	it("expands 'ci' into continuous integration + github actions", () => {
		const result = rewriteQuery({ query: "ci pipeline" });
		expect(result.expandedTerms).toContain("continuous integration");
		expect(result.expandedTerms).toContain("github actions");
	});

	it("merges adapter expansions with the lexicon", () => {
		const result = rewriteQuery({
			query: "auth",
			adapterExpansions: ["saml", "openid"],
		});
		expect(result.expandedTerms).toContain("saml");
		expect(result.expandedTerms).toContain("openid");
		expect(result.expandedTerms).toContain("jwt");
	});

	it("tokenizes punctuation and lowercases", () => {
		const result = rewriteQuery({ query: "Auth/Login.Flow!" });
		expect(result.tokens).toContain("auth");
		expect(result.tokens).toContain("login");
		expect(result.tokens).toContain("flow");
	});

	it("dedupes expansions", () => {
		const result = rewriteQuery({ query: "auth authentication" });
		const jwtCount = result.expandedTerms.filter((t) => t === "jwt").length;
		expect(jwtCount).toBe(1);
	});
});

// ---------------------------------------------------------------------------
// Stage 2 — Resolve
// ---------------------------------------------------------------------------

const SAMPLE_NODES: ResolveGraphNode[] = [
	{
		id: "node-jwt",
		type: "concept",
		label: "JWT",
		aliases: ["JSON Web Token"],
		summary: "Token format for authentication.",
		status: "active",
	},
	{
		id: "node-oauth",
		type: "concept",
		label: "OAuth2",
		summary: "Authorization framework.",
		status: "active",
	},
	{
		id: "node-old-auth",
		type: "concept",
		label: "Legacy Auth",
		summary: "Retired auth mechanism.",
		status: "deprecated",
	},
];

describe("resolveEntities (stage 2)", () => {
	it("matches nodes by exact label", () => {
		const result = resolveEntities(SAMPLE_NODES, ["jwt"]);
		expect(result).toHaveLength(1);
		expect(result[0]?.nodeId).toBe("node-jwt");
	});

	it("matches nodes by alias", () => {
		const result = resolveEntities(SAMPLE_NODES, ["json web token"]);
		expect(result).toHaveLength(1);
		expect(result[0]?.nodeId).toBe("node-jwt");
	});

	it("matches nodes by substring (3+ char terms)", () => {
		const result = resolveEntities(SAMPLE_NODES, ["oauth"]);
		expect(result.some((e) => e.nodeId === "node-oauth")).toBe(true);
	});

	it("skips deprecated nodes (staleness)", () => {
		const result = resolveEntities(SAMPLE_NODES, ["auth"]);
		// "auth" matches both JWT (label), Legacy Auth (label), but Legacy Auth
		// is deprecated. Only active nodes resolve.
		const ids = result.map((e) => e.nodeId);
		expect(ids).not.toContain("node-old-auth");
	});

	it("returns empty for an empty term set", () => {
		expect(resolveEntities(SAMPLE_NODES, [])).toEqual([]);
	});

	it("dedupes when multiple terms match the same node", () => {
		const result = resolveEntities(SAMPLE_NODES, ["jwt", "json web token"]);
		const jwtMatches = result.filter((e) => e.nodeId === "node-jwt");
		expect(jwtMatches).toHaveLength(1);
	});

	it("records which term matched (provenance)", () => {
		const result = resolveEntities(SAMPLE_NODES, ["oauth"]);
		expect(result[0]?.matchedTerm).toBe("oauth");
	});
});

// ---------------------------------------------------------------------------
// Stage 2b — Resolve: entity enrichment (ADR 0009 Component 3 / Q26)
// ---------------------------------------------------------------------------

/**
 * Shared edge fixture for the enrichment tests. Mirrors what the rule-based
 * extractor + consolidation produce: an active `uses` edge, a `supersedes`
 * edge marking the staleness story, and a deprecated edge that must be dropped.
 */
const SAMPLE_EDGES: ResolveGraphEdge[] = [
	{
		from: "node-jwt",
		to: "node-oauth",
		type: "uses",
		status: "active",
		sourceRefs: [{ sourceType: "note", path: "notes.md" }],
	},
	{
		from: "node-oauth",
		to: "node-jwt",
		type: "supersedes",
		status: "active",
		sourceRefs: [{ sourceType: "note", sourceId: "mem_abc" }],
	},
	{
		from: "node-jwt",
		to: "node-old-auth",
		type: "uses",
		status: "deprecated", // Component 5 filter: dropped.
	},
];

const SAMPLE_NODE_MAP = new Map<string, ResolveGraphNode>(
	SAMPLE_NODES.map((node) => [node.id, node]),
);

describe("resolveEntityState (stage 2b — entity enrichment)", () => {
	it("derives current state from active outgoing edges", () => {
		const resolved = resolveEntities(SAMPLE_NODES, ["jwt"]);
		const enriched = resolveEntityState(
			resolved,
			SAMPLE_EDGES,
			SAMPLE_NODE_MAP,
		);
		const jwt = enriched.find((e) => e.nodeId === "node-jwt");
		expect(jwt).toBeDefined();
		// The active `uses OAuth2` edge renders as current state.
		expect(jwt?.currentState).toContain("uses OAuth2");
	});

	it("names the retired neighbor for supersedes edges", () => {
		const resolved = resolveEntities(SAMPLE_NODES, ["oauth"]);
		const enriched = resolveEntityState(
			resolved,
			SAMPLE_EDGES,
			SAMPLE_NODE_MAP,
		);
		const oauth = enriched.find((e) => e.nodeId === "node-oauth");
		// `supersedes JWT` surfaces the staleness story in one line.
		expect(oauth?.currentState).toContain("supersedes JWT");
	});

	it("drops deprecated edges (Component 5 staleness filter)", () => {
		const resolved = resolveEntities(SAMPLE_NODES, ["jwt"]);
		const enriched = resolveEntityState(
			resolved,
			SAMPLE_EDGES,
			SAMPLE_NODE_MAP,
		);
		const jwt = enriched.find((e) => e.nodeId === "node-jwt");
		// The deprecated `uses Legacy Auth` edge must NOT contribute.
		expect(jwt?.currentState).not.toContain("Legacy Auth");
	});

	it("counts active edges touching the entity", () => {
		const resolved = resolveEntities(SAMPLE_NODES, ["jwt"]);
		const enriched = resolveEntityState(
			resolved,
			SAMPLE_EDGES,
			SAMPLE_NODE_MAP,
		);
		const jwt = enriched.find((e) => e.nodeId === "node-jwt");
		// JWT touches: 1 active outgoing `uses` + 1 incoming `supersedes`
		// (from OAuth2) + 1 deprecated `uses` (dropped). Active count = 2.
		expect(jwt?.activeEdgeCount).toBe(2);
	});

	it("extracts provenance from the first active edge's source ref", () => {
		const resolved = resolveEntities(SAMPLE_NODES, ["jwt"]);
		const enriched = resolveEntityState(
			resolved,
			SAMPLE_EDGES,
			SAMPLE_NODE_MAP,
		);
		const jwt = enriched.find((e) => e.nodeId === "node-jwt");
		// First touching active edge is `uses OAuth2` with path "notes.md".
		expect(jwt?.provenance).toBe("notes.md");
	});

	it("falls back to the static summary when no active edges describe it", () => {
		// OAuth2 has an incoming `uses` (from JWT) and an outgoing `supersedes`.
		// The outgoing `supersedes` does contribute, but if we strip all edges,
		// currentState must be empty and summary is what the caller renders.
		const resolved = resolveEntities(SAMPLE_NODES, ["oauth"]);
		const enriched = resolveEntityState(resolved, [], SAMPLE_NODE_MAP);
		const oauth = enriched.find((e) => e.nodeId === "node-oauth");
		expect(oauth?.currentState).toBe("");
		expect(oauth?.summary).toBe("Authorization framework.");
		expect(oauth?.provenance).toBeUndefined();
	});

	it("handles an empty entity list", () => {
		expect(resolveEntityState([], SAMPLE_EDGES, SAMPLE_NODE_MAP)).toEqual([]);
	});

	it("joins multiple state parts with a semicolon", () => {
		const resolved = resolveEntities(SAMPLE_NODES, ["oauth"]);
		const enriched = resolveEntityState(
			resolved,
			SAMPLE_EDGES,
			SAMPLE_NODE_MAP,
		);
		const oauth = enriched.find((e) => e.nodeId === "node-oauth");
		// Only one stateful outgoing edge (`supersedes JWT`); verify clean join.
		expect(oauth?.currentState).toBe("supersedes JWT");
	});
});

// ---------------------------------------------------------------------------
// Stage 3 — Filter
// ---------------------------------------------------------------------------

const SAMPLE_ITEMS: RecallItem[] = [
	{ id: "a", text: "alpha", score: 0.9 },
	{ id: "b", text: "beta", score: 0.5 },
	{ id: "c", text: "gamma", score: 0.1 },
	{ id: "graph:retired", text: "old fact", score: 0.8 },
	{ id: "a", text: "alpha dup", score: 0.95 }, // duplicate id, higher score
];

describe("filterCandidates (stage 3)", () => {
	it("drops retired graph docs", () => {
		const result = filterCandidates({
			items: SAMPLE_ITEMS,
			retiredGraphDocIds: new Set(["graph:retired"]),
		});
		expect(result.some((i) => i.id === "graph:retired")).toBe(false);
	});

	it("dedupes by id, keeping the first occurrence", () => {
		const result = filterCandidates({ items: SAMPLE_ITEMS });
		const aItems = result.filter((i) => i.id === "a");
		expect(aItems).toHaveLength(1);
		// First occurrence (score 0.9) is kept, not the higher-scored dup.
		expect(aItems[0]?.score).toBe(0.9);
	});

	it("applies a minimum score cut", () => {
		const result = filterCandidates({ items: SAMPLE_ITEMS, minScore: 0.4 });
		expect(result.some((i) => i.id === "c")).toBe(false);
		expect(result.some((i) => i.id === "b")).toBe(true);
	});

	it("keeps everything when no filters apply", () => {
		const result = filterCandidates({ items: SAMPLE_ITEMS });
		expect(result.length).toBe(4); // 5 minus the duplicate
	});

	it("handles an empty item list", () => {
		expect(filterCandidates({ items: [] })).toEqual([]);
	});
});

// ---------------------------------------------------------------------------
// Stage 4 — Budget
// ---------------------------------------------------------------------------

describe("allocateBudget (stage 4)", () => {
	it("includes non-negotiable sections whole and carves them out first", () => {
		const result = allocateBudget({
			sections: [
				{
					type: "directive",
					title: "Directive",
					content: "be good",
					nonNegotiable: true,
				},
				{
					type: "core",
					title: "Core Memory",
					content: "A".repeat(100),
					nonNegotiable: true,
				},
				{
					type: "recall",
					title: "Recall",
					content: "B".repeat(200),
					weight: SECTION_WEIGHTS.recall,
				},
			],
			maxBytes: 10_000,
		});
		expect(result.text).toContain("be good");
		expect(result.text).toContain("A".repeat(100));
		// Recall fit within budget, so no truncation.
		expect(result.truncated).toBe(false);
	});

	it("never truncates core memory to make room for recall", () => {
		const coreContent = "C".repeat(500);
		const result = allocateBudget({
			sections: [
				{
					type: "core",
					title: "Core Memory",
					content: coreContent,
					nonNegotiable: true,
				},
				{
					type: "recall",
					title: "Recall",
					content: "R".repeat(5000),
					weight: SECTION_WEIGHTS.recall,
				},
			],
			maxBytes: 1000,
		});
		// Core appears in full.
		expect(result.text).toContain(coreContent);
		// Recall was truncated.
		expect(result.truncated).toBe(true);
		expect(result.text).toMatch(/Omitted/);
	});

	it("divides remaining budget across negotiable sections by weight", () => {
		const tiny = "X".repeat(10);
		const result = allocateBudget({
			sections: [
				{
					type: "directive",
					title: "Directive",
					content: tiny,
					nonNegotiable: true,
				},
				{
					type: "recall",
					title: "Recall",
					content: "R".repeat(5000),
					weight: SECTION_WEIGHTS.recall,
				},
				{
					type: "recent",
					title: "Recent",
					content: "N".repeat(5000),
					weight: SECTION_WEIGHTS.recent,
				},
			],
			maxBytes: 1000,
		});
		// Both negotiable sections present (truncated), weighted recall > recent.
		expect(result.text).toMatch(/## Recall/);
		expect(result.text).toMatch(/## Recent/);
		const recallLen = (result.text.match(/R+/g) ?? []).join("").length;
		const recentLen = (result.text.match(/N+/g) ?? []).join("").length;
		// recall weight 3 > recent weight 1, so recall gets ~3x the bytes.
		expect(recallLen).toBeGreaterThan(recentLen);
	});

	it("skips empty negotiable sections", () => {
		const result = allocateBudget({
			sections: [
				{
					type: "directive",
					title: "Directive",
					content: "d",
					nonNegotiable: true,
				},
				{ type: "recall", title: "Recall", content: "   ", weight: 1 },
				{
					type: "recent",
					title: "Recent",
					content: "recent content",
					weight: 1,
				},
			],
			maxBytes: 10_000,
		});
		expect(result.text).not.toMatch(/## Recall/);
		expect(result.text).toMatch(/## Recent/);
	});

	it("never exceeds maxBytes", () => {
		const result = allocateBudget({
			sections: [
				{
					type: "directive",
					title: "Directive",
					content: "d",
					nonNegotiable: true,
				},
				{
					type: "core",
					title: "Core",
					content: "C".repeat(200),
					nonNegotiable: true,
				},
				{
					type: "recall",
					title: "Recall",
					content: "R".repeat(5000),
					weight: 1,
				},
			],
			maxBytes: 500,
		});
		expect(Buffer.byteLength(result.text, "utf8")).toBeLessThanOrEqual(500);
	});

	it("generates an adaptive compaction outline for truncated items", () => {
		const itemsText = Array.from(
			{ length: 20 },
			(_, i) => `${i + 1}. Item ${String.fromCharCode(65 + i)} description`,
		).join("\n\n");
		const result = allocateBudget({
			sections: [
				{
					type: "directive",
					title: "Directive",
					content: "d",
					nonNegotiable: true,
				},
				{
					type: "recall",
					title: "Recall",
					content: itemsText,
					weight: 1,
				},
			],
			maxBytes: 400,
		});
		expect(result.truncated).toBe(true);
		expect(result.text).toMatch(/Omitted \d+ items to fit context budget/);
		expect(result.text).toMatch(/↳ \[Omitted: "Item C description"\]/);
		expect(result.text).toMatch(/↳ \[Omitted: "Item G description"\]/);
		expect(result.text).toMatch(/↳ \[and 13 more items...\]/);
	});
});
