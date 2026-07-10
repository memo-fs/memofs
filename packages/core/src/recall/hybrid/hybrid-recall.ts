/**
 * @file Hybrid recall merging — combines vector and lexical results, reranks,
 * and applies intelligence weighting (recency, confidence, decay).
 *
 * @remarks
 * This is the brain of local-first recall. It takes candidate sets from the
 * vector path and the BM25 lexical path, merges them by document id, then
 * produces a final score by:
 *
 * finalScore = relevanceWeight * rerankScore
 * + recencyWeight * recencyBoost
 * + confidenceWeight * confidence
 *
 * where `rerankScore` comes from the deterministic fallback reranker (lexical
 * overlap, which catches synonym/paraphrase the vector path can miss at the
 * tail) folded together with the normalized vector+BM25 candidate scores.
 *
 * Older memories gently decay via a half-life applied to the recency boost,
 * so the index self-tunes toward what is currently relevant without ever
 * hard-deleting anything.
 *
 * @public
 */

import type { JsonObject } from "../../core/types/json";
import type { RecallItem } from "../../memofs/types";
import type { Reranker } from "../../rerank/types";

/** A candidate surfaced by one of the retrieval paths. */
export interface HybridCandidate {
	/** Document id. */
	id: string;
	/** Document text. */
	text: string;
	/** Cosine similarity score from the vector path, or 0 when absent. */
	vectorScore: number;
	/** Normalized BM25 score, or 0 when absent. */
	lexicalScore: number;
	/** Optional metadata (may carry createdAt, confidence, etc.). */
	metadata?: JsonObject;
}

export interface HybridMergeOptions {
	/**
	 * Weight of the (vector + lexical) blended relevance signal in the final
	 * score. @defaultValue `0.7`
	 */
	relevanceWeight?: number;
	/**
	 * Weight of the recency boost in the final score. @defaultValue `0.2`
	 */
	recencyWeight?: number;
	/**
	 * Weight of note confidence in the final score. @defaultValue `0.1`
	 */
	confidenceWeight?: number;
	/**
	 * Weight of the vector score within the blended relevance signal.
	 * The lexical score gets `1 - vectorWeight`.
	 * @defaultValue `0.6`
	 */
	vectorWeight?: number;
	/**
	 * Recency half-life in days. A memory `halfLifeDays` old contributes half
	 * of the maximum recency boost. @defaultValue `30`
	 */
	halfLifeDays?: number;
	/** Clock function for deterministic tests. */
	now?: () => Date;
	/**
	 * Optional reranker. When provided, the merged candidates are reranked by
	 * lexical overlap and that score is folded into relevance. When omitted,
	 * only the blended vector+lexical score is used.
	 */
	reranker?: Reranker;
	/** Maximum results to return. */
	topK: number;
	/** The original query (used for reranking). */
	query: string;
}

/**
 * Merge vector and lexical candidates, rerank, and apply intelligence weighting.
 *
 * @public
 * @param candidates - Candidates keyed by document id.
 * @param options - Merge options.
 * @returns Ranked {@link RecallItem}s, highest score first.
 */
export async function mergeHybridCandidates(
	candidates: Map<string, HybridCandidate>,
	options: HybridMergeOptions,
): Promise<RecallItem[]> {
	const relevanceWeight = options.relevanceWeight ?? 0.7;
	const recencyWeight = options.recencyWeight ?? 0.2;
	const confidenceWeight = options.confidenceWeight ?? 0.1;
	const vectorWeight = options.vectorWeight ?? 0.6;
	const lexicalWeight = 1 - vectorWeight;
	const halfLifeDays = options.halfLifeDays ?? 30;
	const now = (options.now ?? (() => new Date()))();

	const all = [...candidates.values()];
	if (all.length === 0) return [];

	// Blend the two retrieval signals into a base relevance score per candidate.
	const blended = new Map<string, { text: string; baseScore: number }>();
	for (const candidate of all) {
		const baseScore =
			vectorWeight * clamp01(candidate.vectorScore) +
			lexicalWeight * clamp01(candidate.lexicalScore);
		blended.set(candidate.id, { text: candidate.text, baseScore });
	}

	// Optionally rerank. The deterministic fallback reranker re-scores by
	// lexical overlap, which is a useful second opinion on the blended score.
	if (options.reranker) {
		try {
			const rerankResults = await options.reranker.rerank({
				query: options.query,
				documents: all.map((c) => ({
					id: c.id,
					text: c.text,
					...(c.metadata === undefined ? {} : { metadata: c.metadata }),
				})),
				topK: all.length,
			});
			for (const result of rerankResults) {
				const entry = blended.get(result.id);
				if (entry) {
					// Fold the reranker's opinion in (0.5/0.5 blend with base score).
					entry.baseScore = 0.5 * entry.baseScore + 0.5 * clamp01(result.score);
				}
			}
		} catch {
			// Reranker is an enhancement; never let it break recall.
		}
	}

	const scored: RecallItem[] = [];
	for (const candidate of all) {
		const entry = blended.get(candidate.id);
		if (!entry) continue;
		const relevance = relevanceWeight * entry.baseScore;
		const recency =
			recencyWeight * recencyBoost(candidate.metadata, now, halfLifeDays);
		const confidence = confidenceWeight * readConfidence(candidate.metadata);
		const finalScore = relevance + recency + confidence;
		scored.push({
			id: candidate.id,
			text: candidate.text,
			score: round(finalScore, 4),
			...(candidate.metadata === undefined
				? {}
				: { metadata: candidate.metadata }),
		});
	}

	scored.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
	return scored.slice(0, options.topK);
}

/**
 * Compute a recency boost in `[0, 1]` using an exponential half-life.
 *
 * A memory created "now" scores 1; one `halfLifeDays` old scores ~0.5; one
 * two half-lives old scores ~0.25. Memories without a parseable timestamp
 * receive a neutral 0.5.
 *
 * @internal
 */
export function recencyBoost(
	metadata: JsonObject | undefined,
	now: Date,
	halfLifeDays: number,
): number {
	const raw =
		metadata?.createdAt ??
		metadata?.updatedAt ??
		metadata?.insertedAt ??
		metadata?.timestamp;
	if (typeof raw !== "string") return 0.5;
	const created = Date.parse(raw);
	if (Number.isNaN(created)) return 0.5;
	const ageDays = Math.max(
		0,
		(now.getTime() - created) / (1000 * 60 * 60 * 24),
	);
	if (halfLifeDays <= 0) return 1;
	return 0.5 ** (ageDays / halfLifeDays);
}

/**
 * Read a confidence value from metadata, defaulting to a neutral 0.5.
 *
 * @internal
 */
export function readConfidence(metadata: JsonObject | undefined): number {
	const raw = metadata?.confidence;
	if (typeof raw === "number" && Number.isFinite(raw)) {
		return clamp01(raw);
	}
	return 0.5;
}

function clamp01(value: number): number {
	if (!Number.isFinite(value)) return 0;
	return Math.max(0, Math.min(1, value));
}

function round(value: number, digits: number): number {
	const factor = 10 ** digits;
	return Math.round(value * factor) / factor;
}
