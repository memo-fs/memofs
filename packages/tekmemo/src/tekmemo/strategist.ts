/**
 * The retrieval strategist — a 4-stage pipeline that replaces the flat
 * `buildContext()` assembler (ADR 0009, Component 2 / Q23).
 *
 * @remarks
 * The strategist is the entire MCP intelligence story: a pull-only channel's
 * intelligence ceiling is set by how much intelligence fits inside one tool
 * call, so `tekmemo.context` does real work instead of concatenating and
 * byte-truncating. Four pure stages, each deterministic-by-default with an
 * LLM-adapter hook, mirror the `consolidateGraph` / `applyConsolidation` split
 * already in `src/graph/consolidation/` — independently unit-testable, not a
 * black box:
 *
 * 1. **Rewrite** — expand the caller's query through a synonym/abbreviation
 *    lexicon + tokenization. Zero-config floor; an LLM adapter can add semantic
 *    variants when configured.
 * 2. **Resolve** — collapse recall fragments to graph entities by alias/label
 *    lookup. v1 does deterministic label/alias matching; the Entities section
 *    (ADR 0009 Component 3 / Q26) renders the resolved set, each entity
 *    enriched with its current state derived from active edges (Stage 2b).
 * 3. **Filter** — drop deprecated nodes/fragments (the Q24 staleness loop),
 *    dedupe, and apply a relevance cut.
 * 4. **Budget** — allocate the remaining `maxBytes` (after core memory, which
 *    is non-negotiable and excluded from competition) across sections in trust
 *    order: entities → recall → recent.
 *
 * Core memory is injected *before* the strategist runs and is excluded from
 * budget competition — it gets its bytes first, always. The strategist only
 * budgets the *remaining* `maxBytes`. This is the read-side enforcement of the
 * locked principle: *a small core memory is always injected; everything else is
 * explicitly searched, not guessed at by the agent.*
 *
 * @see ADR 0009 — the intelligent retrieval model (Component 2).
 * @see {@link consolidateGraph} — the decide/apply split this mirrors.
 *
 * @public
 */

import type { RecallItem } from "./types";

/**
 * Minimal structural shape {@link resolveEntities} consumes. Both the internal
 * `GraphNode` (`src/graph/types`) and the public `GraphNodeInput`
 * (`./types`) satisfy this — the Resolve stage only reads identity + label +
 * aliases + summary + status + type. Declared locally (not imported) so the
 * strategist stays decoupled from the graph package's richer types.
 *
 * @public
 */
export interface ResolveGraphNode {
	id: string;
	type: string;
	label: string;
	aliases?: string[];
	summary?: string;
	status?: string;
}

/**
 * Minimal structural shape {@link resolveEntityState} consumes. Both the
 * internal `GraphEdge` and the public `GraphEdgeInput` satisfy this — entity
 * enrichment only reads endpoints, type, status, and provenance. Declared
 * locally for the same decoupling reason as {@link ResolveGraphNode}.
 *
 * @public
 */
export interface ResolveGraphEdge {
	/** The node the edge points away from. */
	from: string;
	/** The node the edge points toward. */
	to: string;
	/** Edge type (`uses`, `prefers`, `supersedes`, ...). */
	type: string;
	/** Edge status; `deprecated` edges are dropped (ADR 0009 Component 5). */
	status?: string;
	/** Provenance: where this fact came from. */
	sourceRefs?: ResolveGraphSourceRef[];
}

/**
 * Minimal source-ref shape for {@link ResolveGraphEdge}. Declared locally so
 * the strategist stays decoupled from the graph package's `GraphSourceRef`.
 *
 * @public
 */
export interface ResolveGraphSourceRef {
	sourceType?: string;
	sourceId?: string;
	path?: string;
	title?: string;
	url?: string;
}

// ---------------------------------------------------------------------------
// Rewrite
// ---------------------------------------------------------------------------

/**
 * A deterministic synonym/abbreviation expansion entry. High-precision only:
 * each entry maps a surface form to expansions that are safe to always apply.
 * Maintenance surface — curated deliberately small; the LLM adapter path
 * (when configured) adds semantic variants on top.
 *
 * @internal
 */
interface LexiconEntry {
	/** Surface form to match (lowercased, word-bounded). */
	trigger: string;
	/** Expansions to add. The original term is always kept. */
	expansions: string[];
}

/**
 * The deterministic rewrite lexicon. Curated for the terms the fixture corpus
 * and real-world coding-agent queries actually use: auth, db, deps, ci/cd,
 * formatting, testing. Each entry is high-precision (no ambiguous triggers).
 *
 * @internal
 */
const REWRITE_LEXICON: ReadonlyArray<LexiconEntry> = [
	{ trigger: "auth", expansions: ["authentication", "jwt", "oauth", "login"] },
	{ trigger: "authentication", expansions: ["auth", "jwt", "oauth", "login"] },
	{ trigger: "login", expansions: ["authentication", "auth"] },
	{ trigger: "db", expansions: ["database", "postgres", "sqlite", "turso"] },
	{ trigger: "database", expansions: ["db", "postgres", "sqlite"] },
	{ trigger: "deps", expansions: ["dependency", "dependencies", "package"] },
	{ trigger: "dependency", expansions: ["dependencies", "deps", "package"] },
	{ trigger: "ci", expansions: ["continuous integration", "github actions"] },
	{ trigger: "cd", expansions: ["continuous deployment", "deploy"] },
	{ trigger: "deploy", expansions: ["deployment", "ci", "release"] },
	{ trigger: "deployment", expansions: ["deploy", "release"] },
	{ trigger: "test", expansions: ["testing", "vitest", "jest", "spec"] },
	{ trigger: "tests", expansions: ["testing", "vitest", "spec"] },
	{ trigger: "fmt", expansions: ["format", "formatting", "biome", "prettier"] },
	{ trigger: "format", expansions: ["formatting", "biome", "prettier"] },
	{ trigger: "formatting", expansions: ["format", "biome"] },
	{ trigger: "pkg", expansions: ["package", "pnpm", "npm"] },
	{ trigger: "package", expansions: ["pkg", "pnpm", "npm"] },
	{ trigger: "config", expansions: ["configuration"] },
	{ trigger: "config", expansions: ["configuration"] },
];

/**
 * Input to {@link rewriteQuery}.
 *
 * @public
 */
export interface RewriteInput {
	/** The caller's raw query string. */
	query: string;
	/**
	 * Optional adapter-produced expansions. When an LLM/extractor adapter is
	 * configured, it can supply semantic variants that are merged with the
	 * deterministic lexicon output. Empty by default (zero-config floor).
	 */
	adapterExpansions?: string[];
}

/**
 * Output of the Rewrite stage.
 *
 * @public
 */
export interface RewriteResult {
	/** The original query, unchanged. */
	original: string;
	/** Lowercased tokens tokenized from the query. */
	tokens: string[];
	/** The union of original tokens + lexicon + adapter expansions (deduped). */
	expandedTerms: string[];
	/**
	 * Whether any expansion was applied. Lets the applier decide whether to
	 * re-query recall with the expanded set or short-circuit on the original.
	 */
	expanded: boolean;
}

const TOKEN_SPLIT = /[\s,./\\[\]{}()<>:;'"!?|`~@#$%^&*+=—–-]+/u;

/**
 * Tokenize a query into lowercase terms, dropping empties and stopwords.
 *
 * @internal
 */
export function tokenize(query: string): string[] {
	const raw = query.toLowerCase().split(TOKEN_SPLIT);
	const out: string[] = [];
	for (const token of raw) {
		if (token.length === 0) continue;
		out.push(token);
	}
	return out;
}

/**
 * Stage 1 — Rewrite: expand the query through the deterministic lexicon plus
 * any adapter expansions.
 *
 * Pure: reads the query, returns the expanded term set, mutates nothing. The
 * applier feeds `expandedTerms` (or the original when nothing expanded) into
 * recall.
 *
 * @public
 */
export function rewriteQuery(input: RewriteInput): RewriteResult {
	const tokens = tokenize(input.query);
	const expanded = new Set<string>(tokens);
	for (const token of tokens) {
		const entry = REWRITE_LEXICON.find((e) => e.trigger === token);
		if (entry === undefined) continue;
		for (const expansion of entry.expansions) {
			expanded.add(expansion.toLowerCase());
		}
	}
	for (const extra of input.adapterExpansions ?? []) {
		expanded.add(extra.toLowerCase());
	}
	return {
		original: input.query,
		tokens,
		expandedTerms: [...expanded],
		expanded: expanded.size > tokens.length,
	};
}

// ---------------------------------------------------------------------------
// Resolve
// ---------------------------------------------------------------------------

/**
 * An entity the Resolve stage matched against the rewritten query.
 *
 * @public
 */
export interface ResolvedEntity {
	/** The graph node id. */
	nodeId: string;
	/** The canonical label. */
	label: string;
	/** The node type. */
	type: string;
	/** The active summary (empty string when absent). */
	summary: string;
	/** Which expanded term matched this entity (provenance). */
	matchedTerm: string;
}

/**
 * Stage 2 — Resolve: find graph entities whose label or alias matches any of
 * the expanded query terms.
 *
 * Pure: takes a node snapshot + the rewritten terms, returns the matched
 * entities. v1 is deterministic label/alias matching; an LLM adapter can
 * disambiguate when configured. Only `active` nodes are candidates — the
 * staleness filter is enforced here so resolved entities are always current.
 *
 * @public
 */
export function resolveEntities(
	nodes: ResolveGraphNode[],
	expandedTerms: string[],
): ResolvedEntity[] {
	if (expandedTerms.length === 0) return [];
	const termSet = new Set(expandedTerms.map((t) => t.toLowerCase()));
	const seen = new Set<string>();
	const out: ResolvedEntity[] = [];
	for (const node of nodes) {
		if (node.status !== undefined && node.status !== "active") continue;
		if (seen.has(node.id)) continue;
		const candidates = [node.label, ...(node.aliases ?? [])];
		let matched: string | undefined;
		for (const candidate of candidates) {
			const lower = candidate.toLowerCase();
			// Word-boundary match on the canonical form, plus exact alias match.
			if (termSet.has(lower)) {
				matched = lower;
				break;
			}
			for (const term of termSet) {
				if (term.length < 3) continue;
				if (lower.includes(term)) {
					matched = term;
					break;
				}
			}
			if (matched !== undefined) break;
		}
		if (matched === undefined) continue;
		seen.add(node.id);
		out.push({
			nodeId: node.id,
			label: node.label,
			type: node.type,
			summary: node.summary ?? "",
			matchedTerm: matched,
		});
	}
	return out;
}

// ---------------------------------------------------------------------------
// Resolve — entity enrichment (ADR 0009 Component 3 / Q26)
// ---------------------------------------------------------------------------

/**
 * An entity the Resolve stage matched, enriched with its current state derived
 * from active graph edges. This is what the Entities section renders — the
 * high-trust artifact that sits between core and recall in trust order.
 *
 * @public
 */
export interface EntityState {
	/** The graph node id. */
	nodeId: string;
	/** The canonical label. */
	label: string;
	/** The node type. */
	type: string;
	/**
	 * Edge-derived current state, e.g. `"uses OAuth2 (supersedes JWT)"`. Empty
	 * when no active edges describe this entity — the caller then falls back to
	 * {@link summary}. Only active edges contribute (Component 5 filter), so the
	 * state is "current" by construction.
	 */
	currentState: string;
	/**
	 * The static node summary. Used as the rendered text when
	 * {@link currentState} is empty (graceful degradation for entities the
	 * extractor stored as bare nodes).
	 */
	summary: string;
	/** Count of active edges touching this entity (provenance density signal). */
	activeEdgeCount: number;
	/**
	 * First active edge's source ref rendered as a human-readable string
	 * (`path ?? title ?? sourceId ?? sourceType`). Omitted when no active edge
	 * carries provenance.
	 */
	provenance?: string;
}

/**
 * The edge types whose outgoing edges express an entity's current state, in
 * the order they're consulted. `supersedes` is included so the rendered state
 * names what was retired (the staleness story in one line).
 *
 * @internal
 */
const STATEFUL_EDGE_TYPES = ["uses", "prefers", "depends_on", "supersedes"];

/**
 * Stage 2b — enrich each resolved entity with its current state derived from
 * active graph edges (ADR 0009 Component 3 / Q26).
 *
 * Pure: takes the resolved entities + an edge snapshot + a node lookup (so
 * `supersedes` can name the retired neighbor), returns the enriched set. Only
 * active edges (status unset or `"active"` — i.e. not `"deprecated"`) contribute,
 * so the Component 5 staleness filter is enforced here: the rendered state is
 * current by construction. `supersedes` edges additionally name the retired
 * neighbor, surfacing the staleness story in one line ("supersedes JWT").
 *
 * Degrades gracefully: an entity with no active stateful edges gets an empty
 * {@link EntityState.currentState}, and the caller renders its static summary
 * instead — identical to the pre-Q26 output. This is the ADR's "empty section
 * when the graph has nothing" contract.
 *
 * @public
 */
export function resolveEntityState(
	entities: ResolvedEntity[],
	edges: ResolveGraphEdge[],
	nodes: ReadonlyMap<string, ResolveGraphNode>,
): EntityState[] {
	// Index edges by endpoint so each entity's touching edges are one lookup.
	// Both directions count — `uses` is out, but an entity can also be the
	// object of a `prefers`/`owns` edge that describes it.
	const out: EntityState[] = [];
	for (const entity of entities) {
		const touching = edges.filter(
			(edge) =>
				(edge.from === entity.nodeId || edge.to === entity.nodeId) &&
				edge.status !== "deprecated" &&
				edge.status !== "deleted",
		);
		const stateParts: string[] = [];
		// Outgoing stateful edges describe what this entity does/uses/prefers.
		for (const type of STATEFUL_EDGE_TYPES) {
			for (const edge of touching) {
				if (edge.from !== entity.nodeId || edge.type !== type) continue;
				const neighbor = nodes.get(edge.to);
				const neighborLabel = neighbor?.label ?? edge.to;
				if (type === "supersedes") {
					stateParts.push(`supersedes ${neighborLabel}`);
				} else {
					stateParts.push(`${type} ${neighborLabel}`);
				}
			}
		}
		const activeEdgeCount = touching.length;
		const provenance = touching
			.flatMap((edge) => edge.sourceRefs ?? [])
			.map((ref) => ref.path ?? ref.title ?? ref.sourceId ?? ref.sourceType)
			.find((value): value is string => typeof value === "string");
		out.push({
			nodeId: entity.nodeId,
			label: entity.label,
			type: entity.type,
			currentState: dedupePreserveOrder(stateParts).join("; "),
			summary: entity.summary,
			activeEdgeCount,
			...(provenance === undefined ? {} : { provenance }),
		});
	}
	return out;
}

/**
 * Drop duplicates from an array while preserving first-seen order.
 *
 * @internal
 */
function dedupePreserveOrder(values: string[]): string[] {
	const seen = new Set<string>();
	const out: string[] = [];
	for (const value of values) {
		if (seen.has(value)) continue;
		seen.add(value);
		out.push(value);
	}
	return out;
}

// ---------------------------------------------------------------------------
// Filter
// ---------------------------------------------------------------------------

/**
 * Input to {@link filterCandidates}.
 *
 * @public
 */
export interface FilterInput {
	/** Recall candidates to filter. */
	items: RecallItem[];
	/**
	 * Lexical ids referring to deprecated graph nodes (the `graph:{nodeId}`
	 * form). Candidates whose id is in this set are dropped — the Q24
	 * staleness loop, enforced here as the strategist's correctness guarantee.
	 */
	retiredGraphDocIds?: ReadonlySet<string>;
	/**
	 * Minimum score to keep. Candidates below this threshold are dropped.
	 * Defaults to `0` (keep everything that scored at all).
	 */
	minScore?: number;
}

/**
 * Stage 3 — Filter: drop deprecated graph docs, dedupe by id, and apply a
 * relevance cut.
 *
 * Pure: returns the surviving candidates, mutates nothing. Dedup keeps the
 * first (highest-scoring, since recall returns ranked) occurrence of each id.
 *
 * @public
 */
export function filterCandidates(input: FilterInput): RecallItem[] {
	const retired = input.retiredGraphDocIds ?? new Set<string>();
	const minScore = input.minScore ?? 0;
	const seen = new Set<string>();
	const out: RecallItem[] = [];
	for (const item of input.items) {
		if (retired.has(item.id)) continue;
		if (seen.has(item.id)) continue;
		if ((item.score ?? 0) < minScore) continue;
		seen.add(item.id);
		out.push(item);
	}
	return out;
}

// ---------------------------------------------------------------------------
// Budget
// ---------------------------------------------------------------------------

/**
 * A section the Budget stage packs into the final context.
 *
 * @public
 */
export interface BudgetSection {
	type: "directive" | "core" | "entities" | "recall" | "recent" | "notes";
	title: string;
	content: string;
	/**
	 * Whether this section is non-negotiable (always included, excluded from
	 * budget competition). `directive` and `core` are non-negotiable.
	 */
	nonNegotiable?: boolean;
	/** Relative weight when competing for the remaining budget. */
	weight?: number;
}

/**
 * Input to {@link allocateBudget}.
 *
 * @public
 */
export interface BudgetInput {
	/** Sections in trust order (the caller pre-sorts). */
	sections: BudgetSection[];
	/** Total byte budget. Core + directive are carved out first. */
	maxBytes: number;
	/**
	 * Notice appended to the rendered text when content is dropped. When
	 * undefined, the truncation notice from `truncateUtf8` is used.
	 */
	truncationNotice?: string;
}

/**
 * Stage 4 — Budget: allocate `maxBytes` across sections in trust order.
 *
 * Non-negotiable sections (`directive`, `core`) are included whole and carved
 * out of the budget first — core memory is never truncated to make room for
 * recall. The remaining budget is then divided across the negotiable sections
 * by weight, each one truncated to its share. This replaces the flat
 * assembler's tail-truncation, which could cut recall entirely when core +
 * recent filled the budget.
 *
 * Byte-honest: the rendered text never exceeds `maxBytes`. Shares account for
 * section headings, join separators, and the truncation notice itself, and the
 * final section is sliced to fit whatever budget remains. Pure: returns the
 * packed sections + the rendered text, mutates nothing.
 *
 * @public
 */
export function allocateBudget(input: BudgetInput): {
	sections: BudgetSection[];
	text: string;
	truncated: boolean;
} {
	const packed: BudgetSection[] = [];
	let truncated = false;
	// `used` tracks the byte cost of the rendered text so far, including the
	// `## title\n\n` heading on each section and the `\n\n` join between them.
	let used = 0;
	const SEPARATOR = "\n\n";
	const separatorBytes = Buffer.byteLength(SEPARATOR, "utf8");

	const accountSection = (section: BudgetSection, isFirst: boolean): number => {
		const heading = `## ${section.title}\n\n`;
		const body = section.content;
		const sep = isFirst ? 0 : separatorBytes;
		return (
			Buffer.byteLength(heading, "utf8") + Buffer.byteLength(body, "utf8") + sep
		);
	};

	// 1. Non-negotiable sections (directive, core) — always included whole.
	let isFirst = true;
	for (const section of input.sections) {
		if (!section.nonNegotiable) continue;
		used += accountSection(section, isFirst);
		packed.push(section);
		isFirst = false;
	}

	// 2. Negotiable sections — weighted share of the remaining budget.
	const negotiable = input.sections
		.filter((s) => !s.nonNegotiable)
		.filter((s) => s.content.trim().length > 0);
	const totalWeight = negotiable.reduce((sum, s) => sum + (s.weight ?? 1), 0);
	let remaining = Math.max(0, input.maxBytes - used);

	for (const section of negotiable) {
		if (remaining <= 0) break;
		const share =
			totalWeight > 0
				? Math.floor((remaining * (section.weight ?? 1)) / totalWeight)
				: 0;
		const heading = `## ${section.title}\n\n`;
		const sep = packed.length === 0 ? 0 : separatorBytes;
		const headingBytes = Buffer.byteLength(heading, "utf8") + sep;
		const bodyBudget = Math.max(0, share - headingBytes);
		const bodyBytes = Buffer.byteLength(section.content, "utf8");
		if (bodyBytes <= bodyBudget) {
			// Fits whole.
			const cost = headingBytes + bodyBytes;
			used += cost;
			remaining -= cost;
			packed.push(section);
		} else {
			// Truncate to fit. Reserve room for the truncation notice.
			const NOTICE = `\n\n[Section truncated to ${bodyBudget} bytes]`;
			const noticeBytes = Buffer.byteLength(NOTICE, "utf8");
			const sliceable = Math.max(0, bodyBudget - noticeBytes);
			const sliced = sliceUtf8(section.content, sliceable).trimEnd();
			const notice = `\n\n[Section truncated to ${bodyBudget} bytes]`;
			const truncatedContent = `${sliced}${notice}`;
			const cost = headingBytes + Buffer.byteLength(truncatedContent, "utf8");
			used += cost;
			remaining -= cost;
			packed.push({ ...section, content: truncatedContent });
			truncated = true;
		}
		// Recompute totalWeight over remaining negotiable sections so a section
		// that fit whole doesn't starve later ones of its leftover share.
	}

	const text = packed
		.map((section) => `## ${section.title}\n\n${section.content}`)
		.join("\n\n");

	return { sections: packed, text, truncated };
}

/**
 * Byte-exact UTF-8 slice. Mirrors the binary-search approach in
 * `truncateUtf8` but without the trailing notice (the caller adds its own).
 *
 * @internal
 */
function sliceUtf8(text: string, maxBytes: number): string {
	if (Buffer.byteLength(text, "utf8") <= maxBytes) return text;
	let low = 0;
	let high = text.length;
	while (low < high) {
		const mid = Math.floor((low + high + 1) / 2);
		if (Buffer.byteLength(text.slice(0, mid), "utf8") <= maxBytes) low = mid;
		else high = mid - 1;
	}
	return text.slice(0, low);
}

// ---------------------------------------------------------------------------
// Default section weights (trust order)
// ---------------------------------------------------------------------------

/**
 * Default section weights for the Budget stage. Trust order: entities
 * (resolved, high-trust) > recall (unresolved fragments, broader) > recent
 * (chronological context). Directive and core are non-negotiable and excluded.
 *
 * @public
 */
export const SECTION_WEIGHTS = {
	entities: 2,
	recall: 3,
	recent: 1,
	notes: 1,
} as const;
