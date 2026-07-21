/**
 * Context-expansion logic for progressive memory context rendering.
 *
 * @remarks
 * Extracted from `context-builder.ts` to keep it under the 500-LoC cap.
 * Handles the "expand" path: decoding the expansion cursor, reading cached
 * pointers, and assembling the full-budget section requested by the caller.
 * Falls back to a fresh compact briefing when the cursor is invalid or expired.
 *
 * @internal
 */

import { decodeExpansionCursor } from "../progressive";
import {
	allocateBudget,
	type BudgetSection,
	type EntityState,
	type ResolveGraphNode,
	resolveEntities,
	resolveEntityState,
	SECTION_WEIGHTS,
} from "../strategist";
import type {
	MemoryContextExpandableSection,
	MemoryContextInput,
	MemoryContextResult,
	RecallItem,
} from "../types";
import {
	assembleContext,
	type BuildContextOperations,
} from "./context-builder";
import {
	AGENT_CONTEXT_DIRECTIVE,
	renderEntities,
	renderRecall,
	renderRecent,
} from "./renderers";

/**
 * Expands a single section of the memory context from a cached cursor.
 *
 * @param operations - The memory read operations available to the builder.
 * @param input - The expansion request (cursor + target section).
 * @param warnings - Accumulated warnings array (mutated in place).
 * @param signal - Optional abort signal.
 * @returns The expanded context result, or a fresh compact briefing on
 *   cursor/cache miss.
 */
export async function expandContext(
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
		return assembleFresh(operations, input, warnings, signal);
	}

	const entry = cache.get(decoded.key);
	if (entry === undefined) {
		warnings.push(
			"Expansion cursor was invalid or expired; returning a fresh briefing.",
		);
		return assembleFresh(operations, input, warnings, signal);
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

function assembleFresh(
	operations: BuildContextOperations,
	input: MemoryContextInput,
	warnings: string[],
	signal: AbortSignal | undefined,
): Promise<MemoryContextResult> {
	return assembleContext(operations, input, warnings, signal, {
		mode: "compact",
		cache: operations.cache,
	});
}
