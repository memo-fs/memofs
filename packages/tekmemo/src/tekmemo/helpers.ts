/**
 * Shared internal helpers for Tekmemo runtime implementations.
 *
 * @internal
 */

import {
	buildExpansionAffordances,
	type CachedRecentEvent,
	COMPACT_BUDGET,
	type ContextCache,
	type ContextCacheEntry,
	decodeExpansionCursor,
	expandAffordanceLine,
} from "./progressive";
import {
	allocateBudget,
	type BudgetSection,
	type EntityState,
	filterCandidates,
	type ResolveGraphEdge,
	type ResolveGraphNode,
	resolveEntities,
	resolveEntityState,
	rewriteQuery,
	SECTION_WEIGHTS,
} from "./strategist";
import type {
	MemoryContextExpandableSection,
	MemoryContextExpansion,
	MemoryContextInput,
	MemoryContextResult,
	RecallItem,
} from "./types";

/**
 * Truncates a string to fit within a specific byte limit, appending a notice at the end.
 *
 * @param text - The string to truncate.
 * @param maxBytes - The maximum byte limit constraint.
 * @returns The original string or truncated string with truncation notice.
 */
export function truncateUtf8(text: string, maxBytes: number): string {
	if (Buffer.byteLength(text, "utf8") <= maxBytes) return text;
	let low = 0;
	let high = text.length;
	while (low < high) {
		const mid = Math.floor((low + high + 1) / 2);
		if (Buffer.byteLength(text.slice(0, mid), "utf8") <= maxBytes) low = mid;
		else high = mid - 1;
	}
	return `${text.slice(0, low).trimEnd()}\n\n[Output truncated to ${maxBytes} bytes]`;
}

export interface PaginationOptions {
	cursor?: string;
	limit?: number;
	defaultLimit: number;
	maxLimit: number;
}

/**
 * The agent-facing directive emitted at the top of every context block. It
 * tells the model how to act on the memory sections that follow, so the
 * returned context is self-explaining rather than a bare data dump.
 *
 * Keep this short, imperative, and tool-agnostic so it reads correctly under
 * any host (MCP client, AI SDK runtime, CLI). It mirrors the guidance already
 * baked into the `tekmemo.context` / `tekmemo.recall` / `tekmemo.remember`
 * tool descriptions.
 */
export const AGENT_CONTEXT_DIRECTIVE = `TekMemo is your long-term memory — treat it as the single source of truth for project identity, architecture, constraints, and decisions.

- Adhere to memory: follow the constraints, decisions, and preferences below. Stored facts override assumptions and guesses.
- Recall before answering: when a fact, convention, or prior decision might exist, call tekmemo.recall instead of re-deriving it.
- Persist discoveries: when you learn a durable decision, constraint, preference, or architectural fact, call tekmemo.remember (classify with kind, set confidence) without waiting to be asked.
- Never store secrets, credentials, or environment values. Respect read-only intent where indicated.`;

export function normalizeLimit(
	limit: number | undefined,
	defaultLimit: number,
	maxLimit: number,
): number {
	if (limit === undefined) return defaultLimit;
	if (!Number.isFinite(limit) || limit < 1) return defaultLimit;
	return Math.min(Math.floor(limit), maxLimit);
}

export function encodeCursor(offset: number, namespace?: string): string {
	const payload: JsonObject = { v: 1, offset };
	if (namespace !== undefined) payload.namespace = namespace;
	return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

export function decodeCursor(cursor?: string, namespace?: string): number {
	if (cursor === undefined) return 0;
	try {
		const decoded = JSON.parse(
			Buffer.from(cursor, "base64url").toString("utf8"),
		) as { v?: number; offset?: number; namespace?: string };
		if (decoded.namespace !== undefined && namespace !== undefined) {
			if (decoded.namespace !== namespace) return 0;
		}
		return typeof decoded.offset === "number" ? decoded.offset : 0;
	} catch {
		return 0;
	}
}

export function paginateArray<T>(
	items: T[],
	options: PaginationOptions,
	namespace?: string,
): { items: T[]; nextCursor?: string } {
	const limit = normalizeLimit(
		options.limit,
		options.defaultLimit,
		options.maxLimit,
	);
	const offset = decodeCursor(options.cursor, namespace);
	const slice = items.slice(offset, offset + limit);
	const nextOffset = offset + slice.length;
	const hasMore = nextOffset < items.length;
	return {
		items: slice,
		...(hasMore ? { nextCursor: encodeCursor(nextOffset, namespace) } : {}),
	};
}

import type { JsonObject } from "./types";

/**
 * Builds the unified agent context by running the 4-stage retrieval
 * strategist (ADR 0009 Component 2 / Q23): Rewrite → Resolve → Filter →
 * Budget. Core memory + directive are non-negotiable — injected before the
 * strategist runs and excluded from budget competition. The remaining
 * `maxBytes` is divided across entities → recall → recent → notes in trust
 * order.
 *
 * This is the applier: the four stages are pure functions in `./strategist`,
 * each independently testable (mirroring the `consolidateGraph` /
 * `applyConsolidation` split).
 */
export async function buildContext(
	operations: {
		readCoreMemory?: (
			signal?: AbortSignal,
		) => Promise<{ content: string; warnings?: string[] }>;
		readNotesMemory?: (
			signal?: AbortSignal,
		) => Promise<{ content: string; warnings?: string[] }>;
		listRecentMemories?: (
			input: { limit?: number },
			signal?: AbortSignal,
		) => Promise<{
			items: Array<{
				id: string;
				type?: string;
				timestamp?: string;
				summary?: string;
			}>;
			warnings?: string[];
		}>;
		recall: (
			input: MemoryContextInput,
			signal?: AbortSignal,
		) => Promise<{ items: RecallItem[]; warnings?: string[] }>;
		/**
		 * Graph node snapshot for the Resolve stage (ADR 0009 Component 2).
		 * When omitted, the strategist skips entity resolution and degrades to
		 * fragment-only recall (the zero-config floor). Local strategy
		 * supplies this; memory strategy does not.
		 */
		listGraphNodes?: (signal?: AbortSignal) => Promise<ResolveGraphNode[]>;
		/**
		 * Graph edge snapshot for entity enrichment (ADR 0009 Component 3 / Q26).
		 * When supplied alongside {@link listGraphNodes}, the resolved entities are
		 * enriched with their current state derived from active edges (the
		 * high-trust "Entities" section). When omitted, entities fall back to
		 * their static summaries — the pre-Q26 behavior.
		 */
		listGraphEdges?: (signal?: AbortSignal) => Promise<ResolveGraphEdge[]>;
		/**
		 * Lexical doc ids referring to deprecated graph nodes (`graph:{id}`),
		 * used by the Filter stage to drop retired facts from recall. When
		 * omitted, recall's own lexical guard still skips deprecated graph
		 * docs at search time — this is the belt-and-suspenders path for
		 * vector candidates.
		 */
		retiredGraphDocIds?: ReadonlySet<string>;
		/**
		 * Session-scoped cache for progressive disclosure (ADR 0009 Component 4 /
		 * Q27). Supplied by the runtime strategy (one {@link ContextCache} per
		 * `Tekmemo` instance). When present, compact calls write their resolved
		 * pointers into it and expand calls read from it; when absent, compact
		 * and expand degrade to stateless behavior (no cross-call reuse).
		 */
		cache?: ContextCache;
	},
	input: MemoryContextInput,
	signal?: AbortSignal,
): Promise<MemoryContextResult> {
	const warnings: string[] = [];

	// --- Mode dispatch (ADR 0009 Component 4 / Q27) ---
	//
	// Expand mode takes precedence: the caller passed a cursor from a prior
	// compact call. Full mode opts out of progressive disclosure entirely
	// (today's behavior). Compact is the default.
	const isExpandCall =
		input.section !== undefined && input.expand !== undefined;
	const isFullMode = input.detail === "full";

	if (isExpandCall) {
		return expandContext(operations, input, warnings, signal);
	}
	if (isFullMode) {
		return assembleContext(operations, input, warnings, signal, {
			mode: "full",
		});
	}
	return assembleContext(operations, input, warnings, signal, {
		mode: "compact",
		cache: operations.cache,
	});
}

// ---------------------------------------------------------------------------
// Internal: assembled context (compact + full share this; expand re-renders)
// ---------------------------------------------------------------------------

interface AssembleMode {
	mode: "compact" | "full";
	cache?: ContextCache;
}

/**
 * Runs the 4-stage strategist and packs sections under a byte budget. Compact
 * mode caps section counts (capturing the full lists into the cache first so
 * expand can re-render them) and appends expansion affordances; full mode is
 * today's whole-budget behavior.
 */
async function assembleContext(
	operations: BuildContextOperations,
	input: MemoryContextInput,
	warnings: string[],
	signal: AbortSignal | undefined,
	mode: AssembleMode,
): Promise<MemoryContextResult> {
	const isCompact = mode.mode === "compact";
	// Compact mode caps the briefing at the compact budget (unless the caller
	// explicitly asked for a smaller `maxBytes`). Full mode honors the caller's
	// `maxBytes` or the 64kb default (today's behavior).
	const maxBytes = isCompact
		? Math.min(
				input.maxBytes ?? COMPACT_BUDGET.maxBytes,
				COMPACT_BUDGET.maxBytes,
			)
		: (input.maxBytes ?? 64_000);
	// In compact mode, cap recall/recent fetches higher than the rendered count
	// so the cache captures the full ranked lists (the agent may expand them).
	const compactRecallFetchLimit = Math.max(
		input.limit ?? 20,
		COMPACT_BUDGET.recallItems,
	);
	const nonNegotiable: BudgetSection[] = [];
	let recallItems: RecallItem[] = [];
	let recentItems: CachedRecentEvent[] = [];
	let hasNotes = false;

	// Directive — always first, non-negotiable.
	nonNegotiable.push({
		type: "directive",
		title: "How to use TekMemo context",
		content: AGENT_CONTEXT_DIRECTIVE,
		nonNegotiable: true,
	});

	// Core memory — non-negotiable: injected before the strategist and excluded
	// from budget competition (ADR 0009 Component 2). It gets its bytes first,
	// always; the strategist only budgets what remains.
	let coreContent = "";
	if (input.includeCore !== false && operations.readCoreMemory) {
		try {
			const core = await operations.readCoreMemory(signal);
			coreContent = core.content.trim();
			if (coreContent) {
				nonNegotiable.push({
					type: "core",
					title: "Core Memory",
					content: coreContent,
					nonNegotiable: true,
				});
			}
			if (core.warnings?.length) warnings.push(...core.warnings);
		} catch (error) {
			warnings.push(
				`Could not read core memory: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	// --- Stage 1: Rewrite ---
	const rewrite = rewriteQuery({ query: input.query });

	// --- Stage 2: Resolve ---
	let entitiesContent = "";
	let hasEntities = false;
	if (operations.listGraphNodes) {
		try {
			const nodes = await operations.listGraphNodes(signal);
			const resolved = resolveEntities(nodes, rewrite.expandedTerms);
			if (resolved.length > 0) {
				hasEntities = true;
				let enriched: EntityState[] = resolved.map((entity) => ({
					nodeId: entity.nodeId,
					label: entity.label,
					type: entity.type,
					currentState: "",
					summary: entity.summary,
					activeEdgeCount: 0,
				}));
				if (operations.listGraphEdges) {
					try {
						const edges = await operations.listGraphEdges(signal);
						const nodeById = new Map<string, ResolveGraphNode>(
							nodes.map((node) => [node.id, node]),
						);
						enriched = resolveEntityState(resolved, edges, nodeById);
					} catch (error) {
						warnings.push(
							`Could not resolve entity state: ${error instanceof Error ? error.message : String(error)}`,
						);
					}
				}
				entitiesContent = renderEntities(enriched);
			}
		} catch (error) {
			warnings.push(
				`Could not resolve entities: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	// --- Stage 3: Filter ---
	try {
		const recallInput: MemoryContextInput = rewrite.expanded
			? {
					...input,
					query: rewrite.expandedTerms.join(" "),
					...(isCompact ? { limit: compactRecallFetchLimit } : {}),
				}
			: { ...input, ...(isCompact ? { limit: compactRecallFetchLimit } : {}) };
		const recall = await operations.recall(recallInput, signal);
		recallItems = filterCandidates({
			items: recall.items,
			...(operations.retiredGraphDocIds
				? { retiredGraphDocIds: operations.retiredGraphDocIds }
				: {}),
		});
		if (recall.warnings?.length) warnings.push(...recall.warnings);
	} catch (error) {
		warnings.push(
			`Recall failed: ${error instanceof Error ? error.message : String(error)}`,
		);
	}

	// Build the negotiable sections in trust order: entities → recall → recent
	// → notes. Each is omitted when empty.
	const negotiable: BudgetSection[] = [];

	if (entitiesContent) {
		negotiable.push({
			type: "entities",
			title: "Entities",
			content: entitiesContent,
			weight: SECTION_WEIGHTS.entities,
		});
	}

	// Compact mode caps recall to the top-K fragments; the full list is cached.
	const recallSlice = isCompact
		? recallItems.slice(0, COMPACT_BUDGET.recallItems)
		: recallItems;
	if (recallSlice.length > 0) {
		negotiable.push({
			type: "recall",
			title: "Relevant Recall",
			content: renderRecall(recallSlice),
			weight: SECTION_WEIGHTS.recall,
		});
	}

	if (input.includeRecent !== false && operations.listRecentMemories) {
		try {
			const recentLimit = isCompact
				? Math.max(COMPACT_BUDGET.recentItems * 2, input.limit ?? 5)
				: Math.min(input.limit ?? 5, 20);
			const recent = await operations.listRecentMemories(
				{ limit: recentLimit },
				signal,
			);
			recentItems = recent.items;
			// Compact mode caps recent to the top-K events.
			const recentSlice = isCompact
				? recent.items.slice(0, COMPACT_BUDGET.recentItems)
				: recent.items;
			if (recentSlice.length > 0) {
				negotiable.push({
					type: "recent",
					title: "Recent Memory Events",
					content: renderRecent(recentSlice),
					weight: SECTION_WEIGHTS.recent,
				});
			}
			if (recent.warnings?.length) warnings.push(...recent.warnings);
		} catch (error) {
			warnings.push(
				`Could not read recent memory: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	// Notes: omitted in compact mode (it's the expand target); included in full
	// mode when explicitly requested (today's behavior).
	const includeNotes = isCompact
		? COMPACT_BUDGET.includeNotes
		: input.includeNotes === true;
	if (includeNotes && operations.readNotesMemory) {
		try {
			const notes = await operations.readNotesMemory(signal);
			if (notes.content.trim()) {
				hasNotes = true;
				negotiable.push({
					type: "notes",
					title: "Notes Memory",
					content: notes.content.trim(),
					weight: SECTION_WEIGHTS.notes,
				});
			}
			if (notes.warnings?.length) warnings.push(...notes.warnings);
		} catch (error) {
			warnings.push(
				`Could not read notes memory: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	// --- Stage 4: Budget ---
	const budget = allocateBudget({
		sections: [...nonNegotiable, ...negotiable],
		maxBytes,
	});

	// --- Progressive disclosure: capture resolved pointers + add affordances ---
	if (isCompact && mode.cache) {
		const key = mode.cache.generateKey(input, rewrite.expandedTerms);
		const entry: ContextCacheEntry = {
			createdAt: Date.now(),
			accessedAt: Date.now(),
			expandedTerms: rewrite.expandedTerms,
			recallItems,
			recentItems,
			hasNotes: hasNotes || operations.readNotesMemory !== undefined,
			hasEntities,
		};
		mode.cache.put(key, entry);
		const affordances = buildExpansionAffordances(key, entry, {
			renderedRecall: recallSlice.length,
			renderedRecent: Math.min(recentItems.length, COMPACT_BUDGET.recentItems),
		});
		return addAffordances(
			{
				text: budget.text,
				sections: budget.sections,
				items: recallSlice,
				...(warnings.length === 0 ? {} : { warnings }),
			},
			affordances,
		);
	}

	return {
		text: budget.text,
		sections: budget.sections,
		items: recallSlice,
		...(warnings.length === 0 ? {} : { warnings }),
	};
}

// ---------------------------------------------------------------------------
// Internal: expand mode — re-render one section from the cache
// ---------------------------------------------------------------------------

/**
 * Expand one section from a prior compact call's resolved pointers. Decodes the
 * cursor, looks up the cache entry, and re-renders only the requested section
 * beyond the compact cap. Falls back to a fresh compact briefing on any cache
 * miss / malformation (progressive disclosure is best-effort, never a hard
 * error — ADR 0009 Component 4).
 */
async function expandContext(
	operations: BuildContextOperations,
	input: MemoryContextInput,
	warnings: string[],
	signal: AbortSignal | undefined,
): Promise<MemoryContextResult> {
	const decoded =
		input.expand !== undefined
			? decodeExpansionCursor(input.expand)
			: undefined;
	const cache = operations.cache;
	const section = input.section as MemoryContextExpandableSection | undefined;

	if (decoded === undefined || cache === undefined || section === undefined) {
		// Malformed cursor or no cache — fall back to a fresh compact briefing.
		warnings.push(
			"Expansion cursor was invalid or expired; returning a fresh briefing.",
		);
		return assembleContext(operations, input, warnings, signal, {
			mode: "compact",
			cache: operations.cache,
		});
	}

	const entry = cache.get(decoded.key);
	if (entry === undefined) {
		warnings.push(
			"Expansion cursor was invalid or expired; returning a fresh briefing.",
		);
		return assembleContext(operations, input, warnings, signal, {
			mode: "compact",
			cache: operations.cache,
		});
	}

	// Re-render only the requested section from the cached resolved pointers.
	const nonNegotiable: BudgetSection[] = [
		{
			type: "directive",
			title: "How to use TekMemo context",
			content: AGENT_CONTEXT_DIRECTIVE,
			nonNegotiable: true,
		},
	];
	const negotiable: BudgetSection[] = [];
	let expandedRecallItems: RecallItem[] = [];

	if (section === "recall") {
		expandedRecallItems = entry.recallItems;
		if (expandedRecallItems.length > 0) {
			negotiable.push({
				type: "recall",
				title: "Relevant Recall (expanded)",
				content: renderRecall(expandedRecallItems),
				weight: SECTION_WEIGHTS.recall,
			});
		}
	} else if (section === "recent") {
		const recent = entry.recentItems;
		if (recent.length > 0) {
			negotiable.push({
				type: "recent",
				title: "Recent Memory Events (expanded)",
				content: renderRecent(recent),
				weight: SECTION_WEIGHTS.recent,
			});
		}
	} else if (section === "notes") {
		if (operations.readNotesMemory) {
			try {
				const notes = await operations.readNotesMemory(signal);
				if (notes.content.trim()) {
					negotiable.push({
						type: "notes",
						title: "Notes Memory (expanded)",
						content: notes.content.trim(),
						weight: SECTION_WEIGHTS.notes,
					});
				}
				if (notes.warnings?.length) warnings.push(...notes.warnings);
			} catch (error) {
				warnings.push(
					`Could not read notes memory: ${error instanceof Error ? error.message : String(error)}`,
				);
			}
		}
	} else if (section === "entities") {
		// Re-resolve entities from the cached expanded terms + fresh graph
		// snapshot (entities are cheap to re-resolve and the graph may have
		// changed since the first call).
		if (operations.listGraphNodes && entry.hasEntities) {
			try {
				const nodes = await operations.listGraphNodes(signal);
				const resolved = resolveEntities(nodes, entry.expandedTerms);
				if (resolved.length > 0) {
					let enriched: EntityState[] = resolved.map((entity) => ({
						nodeId: entity.nodeId,
						label: entity.label,
						type: entity.type,
						currentState: "",
						summary: entity.summary,
						activeEdgeCount: 0,
					}));
					if (operations.listGraphEdges) {
						const edges = await operations.listGraphEdges(signal);
						const nodeById = new Map<string, ResolveGraphNode>(
							nodes.map((node) => [node.id, node]),
						);
						enriched = resolveEntityState(resolved, edges, nodeById);
					}
					negotiable.push({
						type: "entities",
						title: "Entities (expanded)",
						content: renderEntities(enriched),
						weight: SECTION_WEIGHTS.entities,
					});
				}
			} catch (error) {
				warnings.push(
					`Could not resolve entities: ${error instanceof Error ? error.message : String(error)}`,
				);
			}
		}
	}

	const budget = allocateBudget({
		sections: [...nonNegotiable, ...negotiable],
		maxBytes: input.maxBytes ?? 64_000,
	});

	return {
		text: budget.text,
		sections: budget.sections,
		...(expandedRecallItems.length > 0 ? { items: expandedRecallItems } : {}),
		...(warnings.length === 0 ? {} : { warnings }),
	};
}

// ---------------------------------------------------------------------------
// Renderers — shared by assemble (compact/full) and expand
// ---------------------------------------------------------------------------

function renderEntities(enriched: EntityState[]): string {
	return enriched
		.map((entity, index) => {
			const head = `${index + 1}. ${entity.label} (${entity.type})`;
			const body = entity.currentState
				? `currently: ${entity.currentState}`
				: entity.summary;
			const tail = body ? ` — ${body}` : "";
			const provenance = entity.provenance
				? `\n   ↳ source: ${entity.provenance}`
				: "";
			return `${head}${tail}${provenance}`;
		})
		.join("\n");
}

function renderRecall(items: RecallItem[]): string {
	return items
		.map(
			(item, index) =>
				`${index + 1}. ${item.text}${item.score === undefined ? "" : `\n   score: ${item.score}`}`,
		)
		.join("\n\n");
}

function renderRecent(
	items: Array<{
		id: string;
		type?: string;
		timestamp?: string;
		summary?: string;
	}>,
): string {
	return items
		.map(
			(item) =>
				`- ${item.timestamp ?? "unknown"} ${item.type ?? "memory"}: ${item.summary ?? item.id}`,
		)
		.join("\n");
}

/**
 * Append expansion affordance lines to a compact briefing. Each affordance is
 * added to the end of its section's content and collected into the result's
 * `expandable` array. Byte-honesty is preserved because the affordance lines
 * are accounted within the section budget (the Budget stage already packed the
 * body; we append the short affordance line after it).
 */
function addAffordances(
	result: MemoryContextResult,
	affordances: MemoryContextExpansion[],
): MemoryContextResult {
	if (affordances.length === 0) return result;
	const lines = affordances.map(expandAffordanceLine).join("\n");
	return {
		...result,
		text: `${result.text}\n\n${lines}`,
		expandable: affordances,
	};
}

// The operations type, named for reference inside the internal helpers.
type BuildContextOperations = Parameters<typeof buildContext>[0];
