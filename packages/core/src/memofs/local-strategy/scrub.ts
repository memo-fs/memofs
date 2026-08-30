/**
 * @file One-time hydration scrub of legacy ghost embedding rows.
 *
 * @remarks
 * Before recall-document identity was unified, the vector write path stamped
 * chunks with `sourceId` = the wall-clock timestamp of the write instead of
 * the memory id. Those rows are unreachable by `deleteBySource` (they can
 * never be archived or purged) and surface in vector recall forever. On the
 * first hydration after upgrade, this pass drops `note`-source rows whose
 * `sourceId` resolves to no known memory id — exactly the legacy ghost rows —
 * and records a manifest maintenance flag so the scrub never runs twice.
 * Other source types (`document`, `core`, connectors) are never touched.
 */

import { readManifest, writeManifest } from "../../core/manifest/manifest";
import type { Logger } from "../../core/types/logger";
import type { MemoryStore } from "../../core/types/memory-store";
import type { RecallDocument, RecallStore } from "../../recall/types";
import { message } from "./helpers";

/** Options for {@link scrubLegacyEmbeddingRows}. */
export interface ScrubLegacyEmbeddingsInput {
	/** Memory store used to read and write the manifest. */
	store: MemoryStore;
	/** Recall store holding the embedding rows. */
	recallStore: RecallStore | undefined;
	/** Every memory id this runtime knows about (from events + notes). */
	knownMemoryIds: ReadonlySet<string>;
	/** Optional logger. */
	logger?: Logger;
}

/**
 * Returns true when an embedding row is a legacy ghost: a `note`-source row
 * whose `sourceId` resolves to no known memory id. The unified identity
 * always stamps the memory id; older runs stamped a write timestamp.
 */
function isLegacyGhostEmbeddingRow(
	document: RecallDocument,
	knownMemoryIds: ReadonlySet<string>,
): boolean {
	return (
		document.metadata.sourceType === "note" &&
		!knownMemoryIds.has(document.metadata.sourceId)
	);
}

/**
 * Drops legacy ghost embedding rows once and sets the manifest flag that
 * prevents re-scrubbing.
 *
 * @remarks
 * Runs during hydration, after the known-memory-id set is populated. Stores
 * without the `listDocuments` capability are skipped. Best-effort: any
 * failure logs a warning and leaves the flag unset so the next hydration
 * retries.
 */
export async function scrubLegacyEmbeddingRows(
	input: ScrubLegacyEmbeddingsInput,
): Promise<void> {
	const { store, recallStore, knownMemoryIds, logger } = input;
	if (recallStore === undefined) return;
	if (typeof recallStore.listDocuments !== "function") return;
	try {
		const manifest = await readManifest(store);
		if (manifest.maintenance?.legacyEmbeddingsScrubbedAt !== undefined) {
			return;
		}
		// Fail-closed: both id sources (events, notes sections) hydrate
		// best-effort, so an empty set means hydration produced nothing —
		// a broken read or foreign data, never a valid upgrade state. Every
		// real memory has a notes.md section, so a genuine post-upgrade
		// hydration always sees at least one id. Leave the flag unset so the
		// next hydration retries.
		if (knownMemoryIds.size === 0) {
			logger?.warn(
				"legacy embedding scrub skipped: no known memory ids hydrated",
			);
			return;
		}
		const documents = await recallStore.listDocuments();
		const ghostIds = documents
			.filter((document) => isLegacyGhostEmbeddingRow(document, knownMemoryIds))
			.map((document) => document.id);
		if (ghostIds.length > 0) {
			await recallStore.delete(ghostIds);
		}
		manifest.maintenance = {
			...(manifest.maintenance ?? {}),
			legacyEmbeddingsScrubbedAt: new Date().toISOString(),
		};
		await writeManifest(store, manifest);
		if (ghostIds.length > 0) {
			logger?.info?.("scrubbed legacy embedding rows", {
				count: ghostIds.length,
			});
		}
	} catch (error) {
		logger?.warn("legacy embedding scrub failed (best-effort)", {
			error: message(error),
		});
	}
}
