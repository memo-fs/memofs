/**
 * @file Cosine similarity scoring utilities for semantic recall.
 *
 * @remarks
 * Provides functions for computing cosine similarity between embedding vectors
 * and sorting recall results by score.
 *
 * @public
 */

import { RecallDimensionError, RecallValidationError } from "../errors/errors";
import { validateEmbedding } from "../validation/assertions";

/**
 * Computes the cosine similarity between two embedding vectors.
 *
 * @remarks
 * Cosine similarity measures the cosine of the angle between two vectors.
 * Returns a value between -1 and 1, where 1 means identical direction,
 * 0 means orthogonal, and -1 means opposite direction.
 * Returns 0 if either vector has zero magnitude.
 *
 * @param a - First embedding vector
 * @param b - Second embedding vector
 * @returns Cosine similarity score between -1 and 1
 * @throws {RecallValidationError} If embeddings contain undefined values
 * @throws {RecallDimensionError} If embeddings have different dimensions
 *
 * @public
 */
export function cosineSimilarity(a: number[], b: number[]): number {
	validateEmbedding(a, "a");
	validateEmbedding(b, "b");
	if (a.length !== b.length) {
		throw new RecallDimensionError(
			"Cannot compare embeddings with different dimensions.",
			{
				aDimension: a.length,
				bDimension: b.length,
			},
		);
	}

	let dot = 0;
	let normA = 0;
	let normB = 0;

	for (let index = 0; index < a.length; index += 1) {
		const left = a[index];
		const right = b[index];
		if (left === undefined || right === undefined) {
			throw new RecallValidationError("Embedding contains undefined values.", {
				index,
			});
		}
		dot += left * right;
		normA += left * left;
		normB += right * right;
	}

	if (normA === 0 || normB === 0) return 0;
	return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Sorts recall results by score in descending order, with tie-breaking by ID.
 *
 * @remarks
 * Results with higher scores appear first. When scores are equal,
 * results are sorted alphabetically by ID in ascending order.
 *
 * @param results - Array of results to sort (each must have id and score properties)
 * @returns A new sorted array (does not mutate the input)
 *
 * @public
 */
export function sortRecallScores<T extends { id: string; score: number }>(
	results: T[],
): T[] {
	return [...results].sort((a, b) => {
		if (b.score !== a.score) return b.score - a.score;
		return a.id.localeCompare(b.id);
	});
}
