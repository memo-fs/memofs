/**
 * @file Durability tier — write intelligence layer 2.
 *
 * @remarks
 * Where the {@link ./secret-blocklist} gate *rejects* writes outright, the
 * durability tier decides *how long a written memory should influence
 * retrieval*. Two levels:
 *
 * - **`durable`** — indexed into the recall store + graph. Surfaced by
 * `memofs.recall` / `memofs.context`. The memory that shapes future
 * sessions.
 * - **`transient`** — written to `notes.md` (the audit trail) and visible in
 * `list_recent_memories`, but **never indexed**. It does not pollute
 * retrieval. Scratch, working state, low-confidence guesses.
 *
 * This is the **memweave thesis** — files as source of truth, derived index
 * disposable — applied to writes. The file keeps everything that passes the
 * blocklist; the disposable recall index + graph prune by tier. A transient
 * memory is recoverable: a human editing `notes.md`, or a future promotion op,
 * can make it durable; the index rebuilds.
 *
 * ### Distinct from `kind`
 *
 * `kind` answers "what *is* this fact?" (`decision`, `constraint`, `note`).
 * `tier` answers "how long should it steer retrieval?" A `decision` is almost
 * always durable; a `note` is almost always transient — but a high-confidence
 * `note` capturing a real fact should be durable, and a low-confidence
 * `decision` drafted mid-session should be transient. Both dimensions carry
 * signal; the classifier reads both.
 *
 * ### Deterministic floor + adapter hook (the invariant)
 *
 * The zero-config classifier ({@link classifyDurability}) is deterministic — it
 * runs with no API key and makes defensible calls from `kind` + `confidence` +
 * content shape. It is wrong sometimes (a terse `decision` that's actually
 * transient, a `note` that's actually a durable fact). The LLM/`Extractor`
 * adapter, when configured, re-scores — but the deterministic floor is the
 * honest price of zero-config: file-first + rebuildable index means the failure
 * mode is "slightly noisier retrieval," never "lost memory."
 *
 * @see — write intelligence (blocklist + durability tier).
 *
 * @public
 */

import type { MemoryKind } from "../memofs/types";

/**
 * How long a written memory should influence retrieval.
 *
 * @public
 */
export type DurabilityTier = "durable" | "transient";

/**
 * Input to the deterministic durability classifier.
 *
 * @public
 */
export interface DurabilityInput {
	/** The memory's `kind` (what the fact *is*). Durable kinds bias durable. */
	kind?: MemoryKind;
	/** Caller-supplied confidence in `[0, 1]`. Low confidence biases transient. */
	confidence?: number;
	/** The memory content. Very short content biases transient. */
	content: string;
	/**
	 * Optional explicit tier override. When set, the classifier returns it
	 * verbatim — the caller knows better than the heuristic. This is the escape
	 * hatch the spec names ("the tier is assigned by a deterministic
	 * classifier ... re-scored by a configured LLM adapter when present").
	 */
	tier?: DurabilityTier;
}

/**
 * The classifier's decision plus the signals that drove it, so callers (and the
 * benchmark kit) can inspect/evaluate the reasoning rather than treat it as a
 * black box.
 *
 * @public
 */
export interface DurabilityDecision {
	/** The chosen tier. */
	tier: DurabilityTier;
	/** Human-readable reason keyed off the decisive signal (auditable). */
	reason: DurabilityReason;
}

/**
 * Why the classifier chose its tier.
 *
 * @public
 */
export type DurabilityReason =
	| "explicit-override"
	| "durable-kind"
	| "transient-kind"
	| "low-confidence"
	| "low-signal-content"
	| "default-durable";

/**
 * Kinds that represent durable facts (decisions, constraints, goals,
 * preferences, references). `note` and `summary` are working state.
 *
 * Kept as a `Set` for O(1) membership; the kind taxonomy is fixed in
 * {@link MemoryKind}.
 */
const DURABLE_KINDS: ReadonlySet<MemoryKind> = new Set([
	"decision",
	"constraint",
	"goal",
	"preference",
	"reference",
]);

/**
 * Confidence below which a memory is transient regardless of kind. A
 * low-confidence `decision` is a draft or a guess — it shouldn't steer
 * retrieval until it firms up. @defaultValue `0.4`
 */
export const TRANSIENT_CONFIDENCE_THRESHOLD = 0.4;

/**
 * Content shorter than this (chars) is treated as low-signal scratch ("ok",
 * "done", "see above") and classified transient regardless of kind. Real facts
 * are almost always longer. @defaultValue `20`
 */
export const TRANSIENT_CONTENT_MIN_LENGTH = 20;

/**
 * Classify a memory's durability, deterministically.
 *
 * Decision order (first match wins):
 * 1. **Explicit override** — if `input.tier` is set, return it verbatim. The
 * caller (or a configured LLM adapter) knows better than the heuristic.
 * 2. **Low confidence** — confidence below {@link TRANSIENT_CONFIDENCE_THRESHOLD}
 * → transient. An uncertain fact shouldn't pollute retrieval.
 * 3. **Low-signal content** — content shorter than {@link
 * TRANSIENT_CONTENT_MIN_LENGTH} → transient. Scratch, one-word acks.
 * 4. **Kind** — durable kinds (`decision`/`constraint`/`goal`/`preference`/
 * `reference`) → durable; transient kinds (`note`/`summary`) → transient.
 * 5. **Default** — when kind is absent, default to durable (preserve today's
 * behavior: everything indexed). Safer to over-index than to silently drop
 * from retrieval.
 *
 * Pure, synchronous, side-effect free.
 *
 * @param input - The memory signals to classify.
 * @returns The tier decision plus the decisive reason.
 *
 * @public
 */
export function classifyDurability(input: DurabilityInput): DurabilityDecision {
	// 1. Explicit override always wins.
	if (input.tier === "durable" || input.tier === "transient") {
		return { tier: input.tier, reason: "explicit-override" };
	}

	// 2. Low confidence → transient (an uncertain fact shouldn't steer recall).
	if (
		typeof input.confidence === "number" &&
		Number.isFinite(input.confidence) &&
		input.confidence < TRANSIENT_CONFIDENCE_THRESHOLD
	) {
		return { tier: "transient", reason: "low-confidence" };
	}

	// 3. Very short content → transient scratch.
	const length = input.content?.trim().length ?? 0;
	if (length < TRANSIENT_CONTENT_MIN_LENGTH) {
		return { tier: "transient", reason: "low-signal-content" };
	}

	// 4. Kind-driven default.
	if (input.kind !== undefined) {
		return DURABLE_KINDS.has(input.kind)
			? { tier: "durable", reason: "durable-kind" }
			: { tier: "transient", reason: "transient-kind" };
	}

	// 5. No signal at all — default to durable (preserve existing behavior).
	return { tier: "durable", reason: "default-durable" };
}
