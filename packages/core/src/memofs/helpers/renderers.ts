/**
 * Section renderers for the memory context builder.
 *
 * @remarks
 * Extracted from `context-builder.ts` to keep it under the 500-LoC cap.
 * Contains the pure text-rendering functions for each context section
 * (entities, recall, recent) plus the expandable-affordance appender and the
 * canonical agent context directive.
 *
 * @internal
 */

import { expandAffordanceLine } from "../progressive";
import type { EntityState } from "../strategist";
import type {
	MemoryContextExpansion,
	MemoryContextResult,
	RecallItem,
} from "../types";

/**
 * The canonical agent-context directive — the system-prompt text that tells the
 * LLM how to use MemoFS memory (recall before answering, persist discoveries,
 * never store secrets).
 */
export const AGENT_CONTEXT_DIRECTIVE = `MemoFS is your long-term memory — treat it as the single source of truth for project identity, architecture, constraints, and decisions.

- Adhere to memory: follow the constraints, decisions, and preferences below. Stored facts override assumptions and guesses.
- Recall before answering: when a fact, convention, or prior decision might exist, call memofs.recall instead of re-deriving it.
- Persist discoveries: when you learn a durable decision, constraint, preference, or architectural fact, call memofs.remember (classify with kind, set confidence) without waiting to be asked.
- Never store secrets, credentials, or environment values. Respect read-only intent where indicated.`;

/**
 * Renders enriched entity states as a numbered text list.
 *
 * @param enriched - The resolved entity states to render.
 * @returns Newline-separated text suitable for a context section.
 */
export function renderEntities(enriched: EntityState[]): string {
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

/**
 * Renders recall items as a numbered text list with optional scores.
 *
 * @param items - The recall items to render.
 * @returns Newline-separated text suitable for a context section.
 */
export function renderRecall(items: RecallItem[]): string {
	return items
		.map(
			(item, index) =>
				`${index + 1}. ${item.text}${item.score === undefined ? "" : `\n score: ${item.score}`}`,
		)
		.join("\n\n");
}

/**
 * Renders recent memory events as a bulleted timestamp list.
 *
 * @param items - The recent memory items to render.
 * @returns Newline-separated text suitable for a context section.
 */
export function renderRecent(
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
 * Appends expandable-affordance lines to a context result's text.
 *
 * @param result - The base context result.
 * @param affordances - The expansion entries to render as affordance lines.
 * @returns A new result with affordance text appended and `expandable` set.
 */
export function addAffordances(
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
