/**
 * Content-derived id helper — the connector-write discipline.
 *
 * @public
 */

import { sha256Hex } from "@memofs/core";
import type { ConnectorRecord } from "./types";

/**
 * Deterministic note id for a connector record.
 *
 * The id is derived from `externalId` + `content` with **no wall-clock** in
 * the hashed bytes. Re-ingesting identical external content reproduces the
 * same id → identical bytes in `notes.md` → the sync manifest reports "no
 * change" → no phantom conflict, no needless upload.
 *
 * The `conn_` prefix distinguishes connector notes from agent `mem_` notes
 * (cosmetic — greppable, but carries no semantic meaning to the engine).
 *
 * @public
 * @param record the normalized external item
 * @returns a stable id of the form `conn_<16 hex chars>`
 */
export async function connectorNoteId(
	record: ConnectorRecord,
): Promise<string> {
	const hash = await sha256Hex(`${record.externalId}:${record.content}`);
	return `conn_${hash.slice(0, 16)}`;
}
