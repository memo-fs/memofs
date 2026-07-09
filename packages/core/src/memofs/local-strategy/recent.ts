/**
 * Recent-memory listing logic for the local memory strategy.
 *
 * @remarks
 * Extracted from `local-strategy.ts` to keep it under the 500-LoC cap.
 * Reads memory events and returns the most recent entries as a summary list.
 *
 * @internal
 */

import { readMemoryEventsWithIssues } from "../../core/events/memory-events";
import type { MemoryStore } from "../../core/types/memory-store";
import type { JsonObject } from "../../core/types/json";

/**
 * Lists recent memory events as a summary list.
 *
 * @param store - The memory store to read from.
 * @param ensureReady - Callback that ensures the store is initialized.
 * @param limit - Maximum number of entries to return (default 20).
 * @param signal - Optional abort signal.
 * @returns `{ items, warnings? }` with the most recent events first.
 */
export async function listRecentMemories(
	store: MemoryStore,
	ensureReady: () => Promise<void>,
	limit?: number,
	signal?: AbortSignal,
): Promise<{
	items: Array<{
		id: string;
		type: string;
		timestamp: string;
		summary: string;
		metadata?: JsonObject;
	}>;
	warnings?: string[];
}> {
	if (signal?.aborted) throw new Error("Operation aborted.");
	await ensureReady();
	const result = await readMemoryEventsWithIssues(store, {
		malformedLineMode: "skip",
	});
	const max = limit ?? 20;
	const items = result.entries
		.slice(-max)
		.reverse()
		.map((entry) => ({
			id: entry.id,
			type: entry.type,
			timestamp: entry.timestamp,
			summary: entry.summary ?? "",
			metadata: entry.metadata as JsonObject | undefined,
		}));
	return {
		items,
		...(result.issues.length === 0
			? {}
			: {
					warnings: result.issues.map(
						(issue) =>
							`Invalid memory event line ${issue.lineNumber}: ${issue.message}`,
					),
				}),
	};
}
