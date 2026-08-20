/**
 * @file Canonical recall-document identity.
 *
 * @remarks
 * The single source of truth for how a memory's indexed units are
 * addressed across BOTH retrieval paths:
 *
 * - the lexical (BM25) index registers each memory under
 *   `{memoryId}#0` (one document per memory — the full note text);
 * - the vector store registers each chunk under `{memoryId}#{ordinal}`
 *   (ordinal = the chunk's sequential index, stable for identical
 *   content) with `metadata.sourceId` = the memory id.
 *
 * Because both paths speak the same id language, the hybrid merge can
 * join a memory's lexical and vector candidates by document id and fuse
 * their scores — and `deleteBySource(memoryId)` reaches every indexed
 * trace of a memory (archive/supersede/restore cascades).
 *
 * The `#` separator is safe by construction: it survives the recall
 * store's id sanitization, it does not occur in the legacy id schemes
 * (`graph:<nodeId>`, `core:document`, `<sourceKey>:<index>:<hash>`
 * chunk ids, `<source>_<index>_<fingerprint>` substring-fallback ids),
 * and {@link parseRecallDocId} anchors on the LAST `#` so memory ids
 * that themselves contain `#` round-trip correctly.
 *
 * @public
 */

import { assertNonEmptyString } from "@repo/utils";
import { assertNonNegativeInteger } from "../core/validation/assertions";

/**
 * The parsed identity of a canonical recall document.
 *
 * @public
 */
export interface RecallDocumentIdentity {
	/** The parent memory id (e.g. `mem_0123456789abcdef`). */
	memoryId: string;
	/** The document's ordinal within the memory (0 = the lexical whole-note doc). */
	ordinal: number;
}

/**
 * Constructs the canonical recall-document id for one indexed unit of a
 * memory. Both the lexical and the vector indexing paths MUST construct
 * their ids through this function — never inline.
 *
 * @param memoryId - The parent memory id (non-empty).
 * @param ordinal - The unit's ordinal within the memory (0-based, stable for
 * identical content; the lexical whole-note document is always ordinal 0).
 * @returns The canonical id `{memoryId}#{ordinal}`.
 * @throws When `memoryId` is empty or `ordinal` is not a non-negative integer.
 *
 * @public
 */
export function memoryRecallDocId(memoryId: string, ordinal: number): string {
	assertNonEmptyString(memoryId, "memoryId");
	assertNonNegativeInteger(ordinal, "ordinal");
	return `${memoryId}#${ordinal}`;
}

/**
 * Constructs the canonical id under which a memory's full note text is
 * indexed into the lexical (BM25) store: `{memoryId}#0`.
 *
 * @param memoryId - The parent memory id (non-empty).
 * @returns The canonical lexical-document id.
 * @throws When `memoryId` is empty.
 *
 * @public
 */
export function memoryLexicalDocId(memoryId: string): string {
	return memoryRecallDocId(memoryId, 0);
}

/** Matches canonical ids — captures the memory id and the trailing ordinal. */
const CANONICAL_RECALL_DOC_ID = /^(.+)#(\d+)$/;

/**
 * Parses a canonical recall-document id back into its identity. Returns
 * `undefined` for any non-canonical id (graph docs, `core:document`,
 * legacy chunk ids, substring-fallback ids) — callers fall back to
 * treating the raw id as the lookup key.
 *
 * Anchors on the LAST `#` followed by digits, so a memory id that itself
 * ends in `#<digits>` still round-trips: `mem#a#1#0` →
 * `{ memoryId: "mem#a#1", ordinal: 0 }`.
 *
 * @param id - The document id to parse.
 * @returns The parsed identity, or `undefined` when the id is not canonical.
 *
 * @public
 */
export function parseRecallDocId(
	id: string,
): RecallDocumentIdentity | undefined {
	if (typeof id !== "string" || id.length === 0) return undefined;
	const match = CANONICAL_RECALL_DOC_ID.exec(id);
	if (match === null) return undefined;
	const [, memoryId, ordinal] = match;
	if (memoryId === undefined || memoryId.length === 0) return undefined;
	if (ordinal === undefined) return undefined;
	return { memoryId, ordinal: Number.parseInt(ordinal, 10) };
}

/**
 * Resolves the memory id a lookup key refers to, preferring the exact raw
 * key (yesterday's item ids WERE memory ids) and falling back to the
 * canonical-document parse. Used by the drift/decay seams whose maps are
 * keyed by memory id while recall items now carry `{memoryId}#{ordinal}`
 * ids.
 *
 * @param id - The lookup key (a recall item id).
 * @param exists - Membership test against the memory-id-keyed map being
 * consulted (e.g. `has` bound to the map).
 * @returns The resolved memory id — the raw key when it exists in the map,
 * the parsed parent id when that exists, otherwise the raw key unchanged.
 *
 * @public
 */
export function resolveMemoryId(
	id: string,
	exists: (memoryId: string) => boolean,
): string {
	if (exists(id)) return id;
	const parsed = parseRecallDocId(id);
	if (parsed !== undefined && exists(parsed.memoryId)) {
		return parsed.memoryId;
	}
	return id;
}
