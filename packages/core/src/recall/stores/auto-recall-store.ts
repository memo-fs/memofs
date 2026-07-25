/**
 * Auto-resolution helpers for file-backed recall store wiring.
 *
 * @remarks
 * Hydrates the vector path when an embedder is present but no explicit
 * `recallStore` was configured. Keeps both `new MemoFS({ store, embedder })`
 * and `createNodeMemoFs({ recall: { localEmbeddings: true } })` working
 * without manual wiring. SSOT for the "embedder ⇒ FsRecallStore" rule.
 */

import type { MemoryStore } from "../../core/types/memory-store";
import type { RecallStore } from "../types";
import { createFsRecallStore } from "./fs-recall-store";

/**
 * Returns a file-backed recall store when an embedder is present and no store exists.
 *
 * @param options.store - Memory store backing the embeddings JSONL index.
 * @param options.existing - Already configured recall store, if any.
 * @param options.embedderPresent - Whether an embedder will be used.
 * @returns A new `FsRecallStore` when auto-wiring applies, otherwise undefined.
 */
export function resolveAutoRecallStore(options: {
	store: MemoryStore;
	existing?: RecallStore | undefined;
	embedderPresent: boolean;
}): RecallStore | undefined {
	if (options.existing) return options.existing;
	if (!options.embedderPresent) return undefined;
	try {
		return createFsRecallStore({ store: options.store });
	} catch {
		return undefined;
	}
}
