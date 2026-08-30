/**
 * @file Dedup-on-write guard — write intelligence layer 3.
 *
 * @remarks
 * Where the {@link ../../security/durability-tier} decides *how long* a
 * written memory steers retrieval, this guard decides whether it should be
 * written *at all*: a near-duplicate of an indexed memory is a no-op.
 * Agents restate known facts constantly (verbatim re-writes across
 * sessions, restated conventions, "tests pass" narration); without a guard
 * every restatement appends another note and `notes.md` grows without bound.
 *
 * The check is fully deterministic and zero-config — no LLM, no API key:
 *
 * 1. The incoming note queries the lexical BM25 store for top candidates
 *    (cheap corpus narrowing).
 * 2. Each candidate is verified with normalized token-set similarity
 *    (Jaccard) over the *note content bodies* — `memoryContentById`, fed
 *    with the exact content at both the live-write and cold-hydration
 *    seams — so the verdict is identical whether the existing memory was
 *    written in this process or hydrated from `notes.md` at boot. Section
 *    boilerplate (headings, metadata lines) never dilutes the score.
 * 3. Only canonical memory documents (ordinal 0) participate — graph docs,
 *    `core:document`, and legacy ids never trigger a no-op.
 *
 * This is the ADD/UPDATE/NOOP diff other memory systems run with an LLM,
 * collapsed to its deterministic NOOP half. Symmetric similarity means a
 * note that *extends* an existing one scores low and still writes (the
 * extension is new information); only near-verbatim restatements no-op.
 * The failure mode matches the durability tier's philosophy: a missed
 * duplicate is "slightly noisier retrieval," and a no-op never loses a
 * fact — the memory already exists under the returned id.
 *
 * Set {@link LocalStrategyOptions.dedupeOnWrite} to `false` to disable the
 * guard (e.g. audit-mode capture-everything pipelines).
 *
 * @module dedupe
 */

import { parseRecallDocId } from "../../recall/identity";
import { tokenize } from "../../recall/lexical/tokenize";
import type { LocalStrategyContext } from "./types";

/**
 * Token-set (Jaccard) similarity at or above which an incoming note counts
 * as a near-duplicate of an indexed memory. `0.85` keeps verbatim
 * re-writes and light rewordings in while letting two facts that merely
 * share a topic (or a note that genuinely extends an existing one)
 * through. @defaultValue `0.85`
 */
export const MEMORY_DEDUPE_SIMILARITY_THRESHOLD = 0.85;

/**
 * How many BM25 candidates to verify per write. BM25 narrows the corpus to
 * the plausibly-similar docs; the Jaccard check makes the final call, so a
 * small `topK` bounds the per-write cost without changing the verdict for
 * real duplicates (they rank first). @defaultValue `5`
 */
export const MEMORY_DEDUPE_CANDIDATES = 5;

/** A near-duplicate match against an already-indexed memory. */
export interface DuplicateMemoryMatch {
	/** The existing memory's id (the write becomes a no-op naming this id). */
	memoryId: string;
	/** Token-set similarity in `[0, 1]` (auditable; surfaced in the warning). */
	similarity: number;
}

/**
 * Find an already-indexed memory that near-duplicates the incoming note.
 * Pure and synchronous — reads only the in-memory lexical index and
 * content map the strategy already maintains.
 *
 * @param ctx - The local strategy context (lexical store + content map).
 * @param input - The incoming write: `searchText` queries BM25 (title +
 * content, what the note is indexed under) and `content` is the note body
 * compared token-for-token against the candidate's content body.
 * @param options - Optional exclusions (the caller's own memory id, so a
 * self-write can never dedupe against itself).
 * @returns The best match at or above
 * {@link MEMORY_DEDUPE_SIMILARITY_THRESHOLD}, or `undefined` when the write
 * is genuinely new (or the guard is disabled).
 */
export function findDuplicateMemory(
	ctx: LocalStrategyContext,
	input: { searchText: string; content: string },
	options: { excludeMemoryIds?: ReadonlySet<string> } = {},
): DuplicateMemoryMatch | undefined {
	if (ctx.options.dedupeOnWrite === false) return undefined;

	const contentTokens = tokenize(input.content);
	if (contentTokens.length === 0) return undefined;
	const contentSet = new Set(contentTokens);

	let best: DuplicateMemoryMatch | undefined;
	const candidates = ctx.lexicalStore.search(input.searchText, {
		topK: MEMORY_DEDUPE_CANDIDATES,
	});
	for (const candidate of candidates) {
		const identity = parseRecallDocId(candidate.id);
		// Only whole-memory documents (ordinal 0) represent a memory; chunk
		// docs, graph docs, and `core:document` are not dedup targets.
		if (identity === undefined || identity.ordinal !== 0) continue;
		if (options.excludeMemoryIds?.has(identity.memoryId)) continue;
		const indexedContent = ctx.memoryContentById.get(identity.memoryId);
		if (indexedContent === undefined) continue;

		const similarity = jaccardSimilarity(contentSet, indexedContent);
		if (similarity < MEMORY_DEDUPE_SIMILARITY_THRESHOLD) continue;
		if (best === undefined || similarity > best.similarity) {
			best = { memoryId: identity.memoryId, similarity };
		}
	}
	return best;
}

/**
 * Jaccard similarity between a token set and raw text: |A ∩ B| / |A ∪ B|
 * over the indexed tokenizer's terms. `0` when either side has no tokens.
 */
function jaccardSimilarity(
	contentSet: ReadonlySet<string>,
	indexedContent: string,
): number {
	const indexedTokens = tokenize(indexedContent);
	if (indexedTokens.length === 0) return 0;
	const indexedSet = new Set(indexedTokens);

	let intersection = 0;
	for (const token of contentSet) {
		if (indexedSet.has(token)) intersection++;
	}
	const union = contentSet.size + indexedSet.size - intersection;
	return union === 0 ? 0 : intersection / union;
}
