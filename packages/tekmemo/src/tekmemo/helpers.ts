/**
 * Shared internal helpers for Tekmemo runtime implementations.
 *
 * @internal
 */

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
	},
	input: MemoryContextInput,
	signal?: AbortSignal,
): Promise<MemoryContextResult> {
	const maxBytes = input.maxBytes ?? 64_000;
	const warnings: string[] = [];
	const nonNegotiable: BudgetSection[] = [];
	let recallItems: RecallItem[] = [];

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
	// Expand the query through the deterministic lexicon. The expanded terms
	// feed both recall (as a union query) and entity resolution.
	const rewrite = rewriteQuery({ query: input.query });

	// --- Stage 2: Resolve ---
	// Find graph entities whose label/alias matches the expanded terms. Empty
	// when no graph snapshot is available (graceful degradation).
	let entitiesContent = "";
	if (operations.listGraphNodes) {
		try {
			const nodes = await operations.listGraphNodes(signal);
			const resolved = resolveEntities(nodes, rewrite.expandedTerms);
			if (resolved.length > 0) {
				// --- Stage 2b: enrich each entity with current state from active
				// edges (ADR 0009 Component 3 / Q26). Falls back to the static
				// summary when no edges are supplied or none are active.
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
				entitiesContent = enriched
					.map((entity, index) => {
						const head = `${index + 1}. ${entity.label} (${entity.type})`;
						// Prefer the edge-derived current state; fall back to the
						// static summary when no active edges describe the entity.
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
		} catch (error) {
			warnings.push(
				`Could not resolve entities: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	// --- Stage 3: Filter ---
	// Recall (with the expanded query) then drop retired graph docs, dedupe,
	// and apply a relevance cut. The lexical path already skips deprecated
	// graph docs at search time; this filter covers vector candidates too.
	try {
		const recallInput: MemoryContextInput = rewrite.expanded
			? { ...input, query: rewrite.expandedTerms.join(" ") }
			: input;
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

	if (recallItems.length > 0) {
		negotiable.push({
			type: "recall",
			title: "Relevant Recall",
			content: recallItems
				.map(
					(item, index) =>
						`${index + 1}. ${item.text}${item.score === undefined ? "" : `\n   score: ${item.score}`}`,
				)
				.join("\n\n"),
			weight: SECTION_WEIGHTS.recall,
		});
	}

	if (input.includeRecent !== false && operations.listRecentMemories) {
		try {
			const recent = await operations.listRecentMemories(
				{ limit: Math.min(input.limit ?? 5, 20) },
				signal,
			);
			if (recent.items.length > 0) {
				negotiable.push({
					type: "recent",
					title: "Recent Memory Events",
					content: recent.items
						.map(
							(item) =>
								`- ${item.timestamp ?? "unknown"} ${item.type ?? "memory"}: ${item.summary ?? item.id}`,
						)
						.join("\n"),
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

	if (input.includeNotes === true && operations.readNotesMemory) {
		try {
			const notes = await operations.readNotesMemory(signal);
			if (notes.content.trim()) {
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
	// Allocate maxBytes across the sections in trust order. Non-negotiable
	// sections (directive, core) are carved out first; the rest share the
	// remaining budget by weight.
	const budget = allocateBudget({
		sections: [...nonNegotiable, ...negotiable],
		maxBytes,
	});

	return {
		text: budget.text,
		sections: budget.sections,
		items: recallItems,
		...(warnings.length === 0 ? {} : { warnings }),
	};
}
