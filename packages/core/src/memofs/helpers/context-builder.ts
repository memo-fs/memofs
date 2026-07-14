import {
	buildExpansionAffordances,
	type CachedRecentEvent,
	COMPACT_BUDGET,
	type ContextCache,
	type ContextCacheEntry,
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
	MemoryContextInput,
	MemoryContextResult,
	RecallItem,
} from "../types";
import { expandContext } from "./expand-context";
import {
	AGENT_CONTEXT_DIRECTIVE,
	addAffordances,
	renderEntities,
	renderRecall,
	renderRecent,
} from "./renderers";

export { AGENT_CONTEXT_DIRECTIVE };

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

export async function assembleContext(
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

	const rewrite = rewriteQuery({
		query: input.query,
		taskType: input.taskType,
	});

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

export type BuildContextOperations = Parameters<typeof buildContext>[0];
