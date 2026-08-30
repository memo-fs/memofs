/**
 * @file Hybrid recall merging — combines vector and lexical results, reranks,
 * and applies intelligence weighting (recency, confidence, decay).
 *
 * @remarks
 * This is the brain of local-first recall. It takes candidate sets from the
 * vector path and the BM25 lexical path, first consolidates them to ONE
 * candidate per memory (best-chunk evidence — a memory split into N chunks
 * gets one list entry, not N), then merges the two retrieval signals and
 * produces a final score by:
 *
 * finalScore = relevanceWeight * rerankScore
 * + recencyWeight * recencyBoost
 * + confidenceWeight * confidence
 *
 * Candidates surfaced by BOTH retrieval paths (a double hit) additionally
 * receive a fusion bonus gated by the weaker path's score:
 *
 * baseScore = vectorWeight * vectorScore + lexicalWeight * lexicalScore
 * + doubleHitBonusWeight * min(vectorScore, lexicalScore)   [double hits only]
 *
 * The gated bonus rewards genuine agreement between the paths without letting
 * weak second-path evidence outrank a clear single-path winner. Every tuning
 * knob is a named field on {@link HYBRID_SCORING_DEFAULTS}; the scoring path
 * contains no bare numeric literals.
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
import { parseRecallDocId } from "../identity";

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

/**
 * Named, frozen defaults for the hybrid scoring pipeline.
 *
 * @remarks
 * Single source of truth for every tuning knob the merge applies. Locked
 * 2026-08-19 after evaluating a gated-bonus blend against reciprocal-rank
 * fusion: the blend keeps magnitude sensitivity (a weak double hit must not
 * outrank a strong single hit) while the bonus makes moderate double hits
 * overtake extreme single-path scores. Consumers must import these names
 * instead of inlining literals.
 *
 * @public
 */
export const HYBRID_SCORING_DEFAULTS = Object.freeze({
	/** Weight of the blended relevance signal in the final score. */
	relevanceWeight: 0.7,
	/** Weight of the recency boost in the final score. */
	recencyWeight: 0.2,
	/** Weight of note confidence in the final score. */
	confidenceWeight: 0.1,
	/**
	 * Weight of the vector score within the blended relevance signal; the
	 * lexical score gets `1 - vectorWeight`.
	 */
	vectorWeight: 0.6,
	/**
	 * Recency half-life in days: a memory this old contributes half of the
	 * maximum recency boost.
	 */
	halfLifeDays: 30,
	/**
	 * How much of the reranker's opinion replaces the blended score (0.5 =
	 * even fold between the two).
	 */
	rerankerFoldWeight: 0.5,
	/**
	 * Fusion bonus applied when BOTH retrieval paths surface a candidate,
	 * gated by the weaker path's score so weak agreement cannot flip a
	 * clear winner.
	 */
	doubleHitBonusWeight: 0.25,
	/**
	 * Neutral fallback used when metadata carries no parseable recency or
	 * confidence signal.
	 */
	neutralSignal: 0.5,
	/** Decimal places a final score is rounded to. */
	scorePrecision: 4,
} as const);

/**
 * Named targets for the dynamic weight collapse when exactly one retrieval
 * path is empty.
 *
 * @remarks
 * When only one path produced candidates, its weight collapses to 1.0 so
 * scores are not deflated by the static split. `lexicalOnly` is the
 * `vectorWeight` to pass when only lexical hits exist; `vectorOnly` when
 * only vector hits exist.
 *
 * @public
 */
export const HYBRID_SINGLE_PATH_WEIGHTS = Object.freeze({
	lexicalOnly: 0,
	vectorOnly: 1,
} as const);

export interface HybridMergeOptions {
	/**
	 * Weight of the (vector + lexical) blended relevance signal in the final
	 * score. @defaultValue {@link HYBRID_SCORING_DEFAULTS.relevanceWeight}
	 */
	relevanceWeight?: number;
	/**
	 * Weight of the recency boost in the final score.
	 * @defaultValue {@link HYBRID_SCORING_DEFAULTS.recencyWeight}
	 */
	recencyWeight?: number;
	/**
	 * Weight of note confidence in the final score.
	 * @defaultValue {@link HYBRID_SCORING_DEFAULTS.confidenceWeight}
	 */
	confidenceWeight?: number;
	/**
	 * Weight of the vector score within the blended relevance signal.
	 * The lexical score gets `1 - vectorWeight`.
	 * @defaultValue {@link HYBRID_SCORING_DEFAULTS.vectorWeight}
	 */
	vectorWeight?: number;
	/**
	 * Fusion bonus for candidates surfaced by both retrieval paths, gated by
	 * the weaker path's score.
	 * @defaultValue {@link HYBRID_SCORING_DEFAULTS.doubleHitBonusWeight}
	 */
	doubleHitBonusWeight?: number;
	/**
	 * Recency half-life in days. A memory `halfLifeDays` old contributes half
	 * of the maximum recency boost.
	 * @defaultValue {@link HYBRID_SCORING_DEFAULTS.halfLifeDays}
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
 * Consolidates candidates that belong to the same memory into ONE
 * best-evidence candidate per memory.
 *
 * @remarks
 * Canonical recall-doc ids (`{memoryId}#{ordinal}`) expose their parent
 * memory; all of a memory's chunks group under that memory id. The group's
 * surfaced entry takes the id and text of its highest-evidence chunk
 * (ties break toward the lower ordinal, then the smaller id, so the result
 * is deterministic), per-path scores merge as the group max, and metadata
 * merges with the best chunk's values winning conflicts. Ids that are not
 * canonical (graph docs, fallback sections, foreign indexes) pass through
 * untouched as their own group.
 *
 * @public
 * @param candidates - Candidates keyed by document id.
 * @returns One candidate per memory (or per non-canonical document).
 */
export function consolidateByMemory(
	candidates: Map<string, HybridCandidate>,
): Map<string, HybridCandidate> {
	const groups = new Map<string, HybridCandidate[]>();
	for (const candidate of candidates.values()) {
		const key = parseRecallDocId(candidate.id)?.memoryId ?? candidate.id;
		const group = groups.get(key);
		if (group === undefined) {
			groups.set(key, [candidate]);
		} else {
			group.push(candidate);
		}
	}

	const consolidated = new Map<string, HybridCandidate>();
	for (const group of groups.values()) {
		const only = group[0];
		if (group.length === 1) {
			if (only !== undefined) consolidated.set(only.id, only);
			continue;
		}
		const ordered = [...group].sort(compareByEvidence);
		const best = ordered[0];
		if (best === undefined) continue;
		let vectorScore = best.vectorScore;
		let lexicalScore = best.lexicalScore;
		const metadata: JsonObject = {};
		// Assign worst-first so the best chunk's metadata wins conflicts.
		for (const candidate of [...ordered].reverse()) {
			if (candidate.metadata !== undefined) {
				Object.assign(metadata, candidate.metadata);
			}
			vectorScore = Math.max(vectorScore, candidate.vectorScore);
			lexicalScore = Math.max(lexicalScore, candidate.lexicalScore);
		}
		consolidated.set(best.id, {
			id: best.id,
			text: best.text,
			vectorScore,
			lexicalScore,
			...(Object.keys(metadata).length === 0 ? {} : { metadata }),
		});
	}
	return consolidated;
}

/**
 * Orders candidates best-evidence-first: higher combined path scores first,
 * ties toward the lower chunk ordinal (document order), then the smaller id.
 */
function compareByEvidence(a: HybridCandidate, b: HybridCandidate): number {
	const byEvidence =
		b.vectorScore + b.lexicalScore - (a.vectorScore + a.lexicalScore);
	if (byEvidence !== 0) return byEvidence;
	const aOrdinal = parseRecallDocId(a.id)?.ordinal ?? Number.MAX_SAFE_INTEGER;
	const bOrdinal = parseRecallDocId(b.id)?.ordinal ?? Number.MAX_SAFE_INTEGER;
	if (aOrdinal !== bOrdinal) return aOrdinal - bOrdinal;
	return a.id.localeCompare(b.id);
}

/**
 * Merge vector and lexical candidates, rerank, and apply intelligence weighting.
 *
 * @remarks
 * Candidates are consolidated per memory first (see {@link
 * consolidateByMemory}), so the reranker input — and the returned list — is
 * one entry per memory, not one per chunk.
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
	const defaults = HYBRID_SCORING_DEFAULTS;
	const relevanceWeight = options.relevanceWeight ?? defaults.relevanceWeight;
	const recencyWeight = options.recencyWeight ?? defaults.recencyWeight;
	const confidenceWeight =
		options.confidenceWeight ?? defaults.confidenceWeight;
	let vectorWeight = options.vectorWeight ?? defaults.vectorWeight;
	const halfLifeDays = options.halfLifeDays ?? defaults.halfLifeDays;
	const doubleHitBonusWeight =
		options.doubleHitBonusWeight ?? defaults.doubleHitBonusWeight;
	const now = (options.now ?? (() => new Date()))();

	const all = [...consolidateByMemory(candidates).values()];
	if (all.length === 0) return [];

	// Dynamic weighting: if one retrieval path produced no signal, give full
	// weight to the other so scores are not deflated (e.g. lexical-only when
	// vector path is empty should not be capped at 0.4).
	if (options.vectorWeight === undefined) {
		const hasVectorSignal = all.some((c) => c.vectorScore > 0);
		const hasLexicalSignal = all.some((c) => c.lexicalScore > 0);
		if (!hasVectorSignal && hasLexicalSignal) {
			vectorWeight = 0;
		} else if (hasVectorSignal && !hasLexicalSignal) {
			vectorWeight = 1;
		}
	}
	const lexicalWeight = 1 - vectorWeight;

	// Blend the two retrieval signals into a base relevance score per
	// candidate, with a gated bonus when both paths agree (double hit).
	const blended = new Map<string, { text: string; baseScore: number }>();
	for (const candidate of all) {
		const vectorScore = clamp01(candidate.vectorScore);
		const lexicalScore = clamp01(candidate.lexicalScore);
		const blendedScore =
			vectorWeight * vectorScore + lexicalWeight * lexicalScore;
		const baseScore =
			vectorScore > 0 && lexicalScore > 0
				? Math.min(
						1,
						blendedScore +
							doubleHitBonusWeight * Math.min(vectorScore, lexicalScore),
					)
				: blendedScore;
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
			const fold = defaults.rerankerFoldWeight;
			for (const result of rerankResults) {
				const entry = blended.get(result.id);
				if (entry) {
					entry.baseScore =
						(1 - fold) * entry.baseScore + fold * clamp01(result.score);
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
			score: round(finalScore, defaults.scorePrecision),
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
 * receive a neutral boost.
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
	if (typeof raw !== "string") return HYBRID_SCORING_DEFAULTS.neutralSignal;
	const created = Date.parse(raw);
	if (Number.isNaN(created)) return HYBRID_SCORING_DEFAULTS.neutralSignal;
	const ageDays = Math.max(
		0,
		(now.getTime() - created) / (1000 * 60 * 60 * 24),
	);
	if (halfLifeDays <= 0) return 1;
	return 0.5 ** (ageDays / halfLifeDays);
}

/**
 * Read a confidence value from metadata, defaulting to the neutral signal.
 *
 * @internal
 */
export function readConfidence(metadata: JsonObject | undefined): number {
	const raw = metadata?.confidence;
	if (typeof raw === "number" && Number.isFinite(raw)) {
		return clamp01(raw);
	}
	return HYBRID_SCORING_DEFAULTS.neutralSignal;
}

function clamp01(value: number): number {
	if (!Number.isFinite(value)) return 0;
	return Math.max(0, Math.min(1, value));
}

function round(value: number, digits: number): number {
	const factor = 10 ** digits;
	return Math.round(value * factor) / factor;
}
