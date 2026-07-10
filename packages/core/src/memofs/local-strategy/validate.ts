/**
 * Store validation logic for the local memory strategy.
 *
 * @remarks
 * Extracted from `local-strategy.ts` to keep it under the 500-LoC cap.
 * Reads every memory subsystem (manifest, core, notes, events, snapshots)
 * and collects errors and warnings without throwing on individual failures.
 *
 * @internal
 */

import { readCoreMemory } from "../../core/documents/core-memory";
import { readNotesMemory } from "../../core/documents/notes-memory";
import { readMemoryEventsWithIssues } from "../../core/events/memory-events";
import { readManifest } from "../../core/manifest/manifest";
import { readSnapshotRecordsWithIssues } from "../../core/snapshots/snapshot-records";
import type { MemoryStore } from "../../core/types/memory-store";
import { message } from "./helpers";

/**
 * Validates a memory store by probing every subsystem for readability.
 *
 * @param store - The memory store to validate.
 * @param ensureReady - Callback that ensures the store is initialized.
 * @param signal - Optional abort signal.
 * @param input - Optional flags (e.g. `strict` to treat warnings as errors).
 * @returns `{ ok, warnings, errors }` — never throws on subsystem failures.
 */
export async function validateStore(
	store: MemoryStore,
	ensureReady: () => Promise<void>,
	signal: AbortSignal | undefined,
	input?: { strict?: boolean },
): Promise<{ ok: boolean; warnings: string[]; errors: string[] }> {
	if (signal?.aborted) throw new Error("Operation aborted.");
	await ensureReady();
	const warnings: string[] = [];
	const errors: string[] = [];
	try {
		await readManifest(store);
	} catch (error) {
		errors.push(`manifest: ${message(error)}`);
	}
	try {
		await readCoreMemory(store);
	} catch (error) {
		errors.push(`core memory: ${message(error)}`);
	}
	try {
		await readNotesMemory(store);
	} catch (error) {
		errors.push(`notes memory: ${message(error)}`);
	}
	try {
		const events = await readMemoryEventsWithIssues(store, {
			malformedLineMode: "skip",
		});
		warnings.push(
			...events.issues.map(
				(issue) => `memory-events line ${issue.lineNumber}: ${issue.message}`,
			),
		);
	} catch (error) {
		errors.push(`memory events: ${message(error)}`);
	}
	try {
		const snapshots = await readSnapshotRecordsWithIssues(store, {
			malformedLineMode: "skip",
		});
		warnings.push(
			...snapshots.issues.map(
				(issue) => `snapshots line ${issue.lineNumber}: ${issue.message}`,
			),
		);
	} catch (error) {
		warnings.push(`snapshot index: ${message(error)}`);
	}
	return {
		ok: errors.length === 0 && (!input?.strict || warnings.length === 0),
		warnings,
		errors,
	};
}
