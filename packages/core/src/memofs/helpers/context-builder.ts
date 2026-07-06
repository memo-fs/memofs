import {
	buildExpansionAffordances,
	type CachedRecentEvent,
	COMPACT_BUDGET,
	type ContextCache,
	type ContextCacheEntry,
	decodeExpansionCursor,
	expandAffordanceLine,
} from "../progressive";
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
} from "../strategist";
import type {
	MemoryContextExpandableSection,
	MemoryContextExpansion,
	MemoryContextInput,
	MemoryContextResult,
	RecallItem,
} from "../types";
import { decodeCursor } from "./utils";

export const AGENT_CONTEXT_DIRECTIVE = `MemoFS is your long-term memory — treat it as the single source of truth for project identity, architecture, constraints, and decisions.

- Adhere to memory: follow the constraints, decisions, and preferences below. Stored facts override assumptions and guesses.
- Recall before answering: when a fact, convention, or prior decision might exist, call memofs.recall instead of re-deriving it.
- Persist discoveries: when you learn a durable decision, constraint, preference, or architectural fact, call memofs.remember (classify with kind, set confidence) without waiting to be asked.
- Never store secrets, credentials, or environment values. Respect read-only intent where indicated.`;

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
		listGraphNodes?: (signal?: AbortSignal) => Promise<ResolveGraphNode[]>;
		listGraphEdges?: (signal?: AbortSignal) => Promise<ResolveGraphEdge[]>;
		retiredGraphDocIds?: ReadonlySet<string>;
		cache?: ContextCache;
	},
	input: MemoryContextInput,
	signal?: AbortSignal,
): Promise<MemoryContextResult> {
	const warnings: string[] = [];

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

interface AssembleMode {
	mode: "compact" | "full";
	cache?: ContextCache;
}

async function assembleContext(
	operations: BuildContextOperations,
	input: MemoryContextInput,
	warnings: string[],
	signal: AbortSignal | undefined,
	mode: AssembleMode,
): Promise<MemoryContextResult> {
	const isCompact = mode.mode === "compact";
	const maxBytes = isCompact
		? Math.min(
				input.maxBytes ?? COMPACT_BUDGET.maxBytes,
				COMPACT_BUDGET.maxBytes,
			)
		: (input.maxBytes ?? 64_000);
	const compactRecallFetchLimit = Math.max(
		input.limit ?? 20,
		COMPACT_BUDGET.recallItems,
	);
	const nonNegotiable: BudgetSection[] = [];
	let recallItems: RecallItem[] = [];
	let recentItems: CachedRecentEvent[] = [];
	let hasNotes = false;

	nonNegotiable.push({
		type: "directive",
		title: "How to use MemoFS context",
		content: AGENT_CONTEXT_DIRECTIVE,
		nonNegotiable: true,
	});

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

	const rewrite = rewriteQuery({ query: input.query });

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

	const negotiable: BudgetSection[] = [];

	if (entitiesContent) {
		negotiable.push({
			type: "entities",
			title: "Entities",
			content: entitiesContent,
			weight: SECTION_WEIGHTS.entities,
		});
	}

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

	const budget = allocateBudget({
		sections: [...nonNegotiable, ...negotiable],
		maxBytes,
	});

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

	const nonNegotiable: BudgetSection[] = [
		{
			type: "directive",
			title: "How to use MemoFS context",
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

function renderEntities(enriched: EntityState[]): string {
	return enriched
		.map((entity, index) => {
			const head = `${index + 1}. ${entity.label} (${entity.type})`;
			const body = entity.currentState
				? `currently: ${entity.currentState}`
				: entity.summary;
			const tail = body ? ` — ${body}` : "";
			const provenance = entity.provenance
				? `\n ↳ source: ${entity.provenance}`
				: "";
			return `${head}${tail}${provenance}`;
		})
		.join("\n");
}

function renderRecall(items: RecallItem[]): string {
	return items
		.map(
			(item, index) =>
				`${index + 1}. ${item.text}${item.score === undefined ? "" : `\n score: ${item.score}`}`,
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

type BuildContextOperations = Parameters<typeof buildContext>[0];
