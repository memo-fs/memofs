/**
 * Progressive recall — per-section expansion cursors ( /
 * Q27).
 *
 * @remarks
 * This is the headline delivery of the Q16 cold-start token-reduction north
 * star. A compact first `memofs.context` call returns a small briefing
 * (~6kb) with expandable sections; the agent calls back with `section` +
 * `expand` to pull only the section it needs and stops. Compact ≈ 6kb; full ≈
 * 80kb; the agent pulls the 2kb it needs — vs ~64kb truncated before Q27.
 *
 * The strategist intelligence (Rewrite → Resolve → Filter → Budget
 * Component 2) already exists. Q27 is a *delivery* change plus one genuinely
 * new piece of machinery: the strategist must be **stateful across two calls**
 * so the second call re-resolves fast. Today's `buildContext()` is stateless.
 *
 * The state lives in a per-{@link ContextCache} instance held by each runtime
 * strategy (one per `MemoFS` instance). It is a fast-re-resolve optimization,
 * not durable state: entries expire after 10 minutes and the cache holds at
 * most 8 (LRU). A cache miss on expand degrades gracefully — a fresh compact
 * briefing is returned with a warning, never an error.
 *
 * The cursor is opaque by contract: base64url-encoded, versioned. Callers must
 * not inspect it. This mirrors the `encodeCursor` / `decodeCursor` pattern in
 * `helpers.ts` (the recall/list pagination cursors) — consistent cursor
 * hygiene across the runtime.
 *
 * @see — Component 4 (progressive recall).
 *
 * @public
 */

import type {
	MemoryContextExpandableSection,
	MemoryContextExpansion,
	MemoryContextInput,
	RecallItem,
} from "./types";

// ---------------------------------------------------------------------------
// Compact budget — the caps that make the first call small
// ---------------------------------------------------------------------------

/**
 * Per-section caps for compact mode. These are what make the first call ~6kb
 * instead of ~64kb: each negotiable section is capped, and the surplus is
 * advertised as an expansion affordance (the agent pulls it only if it needs
 * it). Entities are already compact one-liners ( / Q26),
 * so they're never capped in compact mode — capping them would lose the
 * high-trust artifact, which defeats the trust-order purpose.
 *
 * @public
 */
export const COMPACT_BUDGET = {
	/** Max recall fragments rendered in compact mode. */
	recallItems: 3,
	/** Max recent-memory events rendered in compact mode. */
	recentItems: 3,
	/** Whether the notes section appears in compact mode. Notes are the expand target. */
	includeNotes: false,
	/**
	 * Max bytes for the compact briefing. Generous headroom over the ~6kb
	 * target so a dense core + a few entities + 3 recall fragments fit
	 * comfortably. The Budget stage still packs byte-honestly under this.
	 */
	maxBytes: 8192,
} as const;

// ---------------------------------------------------------------------------
// Cursor
// ---------------------------------------------------------------------------

/**
 * Decoded shape of an expansion cursor. The wire form is opaque base64url; this
 * is the internal payload. Versioned so the encoding can evolve without
 * breaking cached cursors in flight (a `v` mismatch decodes to `undefined` →
 * graceful fallback).
 *
 * @internal
 */
interface ExpansionCursorPayload {
	v: 1;
	/** Cache key — which `ContextCache` entry holds this call's resolved pointers. */
	key: string;
	/** Which section this cursor expands. */
	section: MemoryContextExpandableSection;
}

/**
 * Encode an expansion cursor payload to an opaque base64url string.
 *
 * @internal
 */
export function encodeExpansionCursor(payload: ExpansionCursorPayload): string {
	return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

/**
 * Decode an opaque expansion cursor. Returns `undefined` on any malformation
 * (bad base64, bad JSON, wrong version, missing fields) — the caller then
 * falls back to a fresh compact briefing. Never throws.
 *
 * @internal
 */
export function decodeExpansionCursor(
	cursor: string,
): ExpansionCursorPayload | undefined {
	try {
		const decoded = JSON.parse(
			Buffer.from(cursor, "base64url").toString("utf8"),
		) as Partial<ExpansionCursorPayload>;
		if (decoded.v !== 1) return undefined;
		if (typeof decoded.key !== "string") return undefined;
		if (
			decoded.section !== "entities" &&
			decoded.section !== "recall" &&
			decoded.section !== "recent" &&
			decoded.section !== "notes"
		) {
			return undefined;
		}
		return {
			v: 1,
			key: decoded.key,
			section: decoded.section,
		};
	} catch {
		return undefined;
	}
}

// ---------------------------------------------------------------------------
// Cache entry — the resolved pointers from the first call
// ---------------------------------------------------------------------------

/**
 * A recent-memory event in the shape the applier renders (mirrors the
 * `listRecentMemories` item).
 *
 * @internal
 */
export interface CachedRecentEvent {
	id: string;
	type?: string;
	timestamp?: string;
	summary?: string;
}

/**
 * The resolved pointers a compact call captured, so an expand call can
 * re-resolve one section without re-running Rewrite/Resolve/Filter. Each field
 * is the *full* untruncated result the first call computed before capping to
 * the compact budget; expand re-renders from these directly.
 *
 * @internal
 */
export interface ContextCacheEntry {
	/** When the entry was created (epoch ms). Used for TTL expiry. */
	createdAt: number;
	/** When the entry was last accessed (epoch ms). Used for LRU eviction. */
	accessedAt: number;
	/** The expanded query terms from Rewrite (so recall-expand re-queries identically). */
	expandedTerms: string[];
	/** The full ranked recall list the first call filtered (before the compact cap). */
	recallItems: RecallItem[];
	/** The full recent-events list the first call fetched (before the compact cap). */
	recentItems: CachedRecentEvent[];
	/** Whether notes memory was available to expand. */
	hasNotes: boolean;
	/** Whether entity resolution produced anything to expand. */
	hasEntities: boolean;
}

// ---------------------------------------------------------------------------
// ContextCache — LRU + TTL, per MemoFS instance
// ---------------------------------------------------------------------------

/** 10-minute TTL. The cache is a fast-re-resolve optimization, not state. */
const CACHE_TTL_MS = 10 * 60 * 1000;
/** Max 8 entries. A coding-agent session rarely touches more than a few queries. */
const CACHE_MAX_ENTRIES = 8;

/**
 * A session-scoped cache of resolved context pointers ( /
 * Q27). Held as a closure variable by each runtime strategy (one per
 * `MemoFS` instance), so the cache is never global and never crosses
 * instances. LRU + TTL bounded: the cache is a performance optimization for
 * the second call, not durable state.
 *
 * The key is derived from the inputs that determine resolution (query + scope +
 * expanded terms). A different query → cache miss → fresh compact briefing.
 *
 * @public
 */
export class ContextCache {
	private readonly entries = new Map<string, ContextCacheEntry>();
	private readonly ttlMs: number;
	private readonly maxEntries: number;

	constructor(options?: { ttlMs?: number; maxEntries?: number }) {
		this.ttlMs = options?.ttlMs ?? CACHE_TTL_MS;
		this.maxEntries = options?.maxEntries ?? CACHE_MAX_ENTRIES;
	}

	/**
	 * Derive the cache key from the inputs that determine resolution. Two calls
	 * with the same query + scope resolve identically, so they share an entry.
	 * The expanded terms are part of the key (not the raw query alone) because
	 * the strategist's Rewrite output is what actually drives recall/entity
	 * resolution — the same surface query with a different lexicon state must
	 * not share a cache entry.
	 */
	generateKey(
		input: Pick<MemoryContextInput, "query" | "workspaceId" | "projectId">,
		expandedTerms: string[],
	): string {
		const payload = JSON.stringify({
			q: input.query,
			w: input.workspaceId ?? null,
			p: input.projectId ?? null,
			t: expandedTerms,
		});
		return payload;
	}

	/** Look up an entry. Returns `undefined` on miss or TTL expiry (and evicts expired). */
	get(key: string): ContextCacheEntry | undefined {
		const entry = this.entries.get(key);
		if (entry === undefined) return undefined;
		if (Date.now() - entry.createdAt > this.ttlMs) {
			this.entries.delete(key);
			return undefined;
		}
		// LRU: re-insert at the end (Map preserves insertion order).
		this.entries.delete(key);
		entry.accessedAt = Date.now();
		this.entries.set(key, entry);
		return entry;
	}

	/** Insert/replace an entry, evicting LRU when over capacity. */
	put(key: string, entry: ContextCacheEntry): void {
		// Delete first so re-putting an existing key reorders it to the end.
		this.entries.delete(key);
		this.entries.set(key, entry);
		while (this.entries.size > this.maxEntries) {
			// Map iteration is insertion order; the first entry is LRU.
			const lruKey = this.entries.keys().next().value;
			if (lruKey === undefined) break;
			this.entries.delete(lruKey);
		}
	}

	/** Number of entries currently held (test/diagnostic affordance). */
	get size(): number {
		return this.entries.size;
	}

	/** Clear all entries (test affordance). */
	clear(): void {
		this.entries.clear();
	}
}

// ---------------------------------------------------------------------------
// Expansion affordance builders
// ---------------------------------------------------------------------------

/**
 * Build the `expandable` array for a compact briefing, one entry per section
 * that has expandable content behind the compact cap. The cursor embeds the
 * cache key, so the second call re-resolves from the right entry.
 *
 * Pure: reads the entry + the compact counts, returns the affordance list.
 *
 * @internal
 */
export function buildExpansionAffordances(
	key: string,
	entry: ContextCacheEntry,
	compactCounts: {
		renderedRecall: number;
		renderedRecent: number;
	},
): MemoryContextExpansion[] {
	const out: MemoryContextExpansion[] = [];
	if (entry.hasEntities) {
		out.push({
			section: "entities",
			cursor: encodeExpansionCursor({ v: 1, key, section: "entities" }),
			hint: "entity neighbor detail",
		});
	}
	const remainingRecall =
		entry.recallItems.length - compactCounts.renderedRecall;
	if (remainingRecall > 0) {
		out.push({
			section: "recall",
			cursor: encodeExpansionCursor({ v: 1, key, section: "recall" }),
			available: remainingRecall,
			hint: `${remainingRecall} more recall fragment${remainingRecall === 1 ? "" : "s"}`,
		});
	}
	const remainingRecent =
		entry.recentItems.length - compactCounts.renderedRecent;
	if (remainingRecent > 0) {
		out.push({
			section: "recent",
			cursor: encodeExpansionCursor({ v: 1, key, section: "recent" }),
			available: remainingRecent,
			hint: `${remainingRecent} more recent event${remainingRecent === 1 ? "" : "s"}`,
		});
	}
	if (entry.hasNotes) {
		out.push({
			section: "notes",
			cursor: encodeExpansionCursor({ v: 1, key, section: "notes" }),
			hint: "full notes memory",
		});
	}
	return out;
}

/**
 * A one-line expand affordance appended to a compact section's rendered
 * content, telling the model exactly how to pull more. This is the
 * load-bearing copy the ADR flags as a quality risk — keep it imperative,
 * short, and copy-pasteable.
 *
 * @internal
 */
export function expandAffordanceLine(
	expansion: MemoryContextExpansion,
): string {
	const count =
		expansion.available === undefined ? "" : ` (${expansion.available} more)`;
	return `↳ expand${count}: memofs.context(section="${expansion.section}", expand="<cursor>")`;
}
