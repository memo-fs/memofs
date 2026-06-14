import type { RerankResult } from "../types";

/**
 * Stably sorts rerank results by score (descending), then by id, then by original position.
 * Updates the rank property to reflect the new sorted order (1-indexed).
 *
 * @param results - The rerank results to sort.
 * @returns A new array of sorted results with updated rank properties.
 *
 * @public
 */
export function stableSortRerankResults(
	results: readonly RerankResult[],
): RerankResult[] {
	return results
		.map((result, originalIndex) => ({ result, originalIndex }))
		.sort((a, b) => {
			if (b.result.score !== a.result.score) {
				return b.result.score - a.result.score;
			}

			if (a.result.id !== b.result.id) {
				return a.result.id.localeCompare(b.result.id);
			}

			return a.originalIndex - b.originalIndex;
		})
		.map((item, index) => ({
			...item.result,
			metadata: item.result.metadata
				? structuredCloneSafe(item.result.metadata)
				: undefined,
			rank: index + 1,
		}));
}

/**
 * Applies top-k filtering to rerank results after sorting by relevance.
 * Results are first sorted using {@link stableSortRerankResults}, then truncated to topK items.
 *
 * @param results - The rerank results to filter.
 * @param topK - The maximum number of results to return.
 * @returns A new array containing at most topK sorted results with updated rank properties.
 *
 * @public
 */
export function applyTopK(
	results: readonly RerankResult[],
	topK: number,
): RerankResult[] {
	return stableSortRerankResults(results)
		.slice(0, topK)
		.map((result, index) => ({
			...result,
			rank: index + 1,
		}));
}

/**
 * Creates a deep clone of a value using JSON serialization.
 *
 * @param value - The value to clone.
 * @returns A deep clone of the value.
 *
 * @internal
 */
function structuredCloneSafe<T>(value: T): T {
	return JSON.parse(JSON.stringify(value)) as T;
}
