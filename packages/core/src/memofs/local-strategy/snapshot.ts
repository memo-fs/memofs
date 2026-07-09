/**
 * Snapshot creation logic for the local memory strategy.
 *
 * @remarks
 * Extracted from `local-strategy.ts` to keep it under the 500-LoC cap.
 * Reads the current core/notes/events state, writes a snapshot file, and
 * appends a snapshot index record.
 *
 * @internal
 */

import {
	appendSnapshotRecord,
	createSnapshotRecord,
} from "../../core/snapshots/snapshot-records";
import { createSnapshotPath } from "../../core/constants/memory-paths";
import { readCoreMemory } from "../../core/documents/core-memory";
import { readMemoryEventsWithIssues } from "../../core/events/memory-events";
import { readNotesMemory } from "../../core/documents/notes-memory";
import type { MemoryStore } from "../../core/types/memory-store";
import { snapshotId } from "./helpers";

/**
 * Creates a memory snapshot: reads current state, writes a snapshot file, and
 * appends a snapshot index record.
 *
 * @param store - The memory store to snapshot.
 * @param ensureReady - Callback that ensures the store is initialized.
 * @param input - Optional label, type, and metadata for the snapshot.
 * @param signal - Optional abort signal.
 * @returns `{ id, path, created }` for the new snapshot.
 */
export async function createSnapshot(
	store: MemoryStore,
	ensureReady: () => Promise<void>,
	input?: {
		label?: string;
		type?: string;
		metadata?: Record<string, unknown>;
	},
	signal?: AbortSignal,
): Promise<{ id: string; path: string; created: boolean }> {
	if (signal?.aborted) throw new Error("Operation aborted.");
	await ensureReady();
	const id = snapshotId(input?.label);
	const snapshotPath = createSnapshotPath(id);
	const now = new Date().toISOString();
	const files = {
		core: await readCoreMemory(store),
		notes: await readNotesMemory(store),
		events: (
			await readMemoryEventsWithIssues(store, { malformedLineMode: "skip" })
		).entries,
	};
	await store.write(
		snapshotPath,
		`${JSON.stringify({ version: 1, id, createdAt: now, files }, null, 2)}\n`,
	);
	await appendSnapshotRecord(
		store,
		createSnapshotRecord({
			id,
			type: (input?.type ?? "manual") as
				| "manual"
				| "automatic"
				| "pre-sync"
				| "pre-restore",
			createdAt: now,
			metadata: {
				label: input?.label ?? null,
				createdBy: "memofs",
				...(input?.metadata ?? {}),
			},
		}),
	);
	return { id, path: snapshotPath, created: true };
}
