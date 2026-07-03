/**
 * File-replication sync layer.
 *
 * The cloud is a file replica, never an engine (see
 * `docs/architecture/cloud-sync-and-refactor.md` §0, §4, §8). This module is
 * the local half of that contract. Its four sync methods (`push`, `complete`,
 * `pull`, `status`) mirror the frozen cloud-client surface 1:1 (§7), so the
 * runtime stays honest with the wire protocol:
 *
 * - `push`     — phase 1: send the local manifest, receive presigned upload
 *                targets. Does NOT upload bytes (§4.4).
 * - `complete` — phase 2: commit a preceding push. Does NOT upload bytes; the
 *                caller uploads between `push` and `complete` via `upload()`.
 * - `pull`     — single round trip: receive presigned download URLs, fetch +
 *                verify + write each file, delete server-removed paths, then
 *                re-derive local indexes (§4.5, §10).
 * - `status`   — read the cloud manifest, cursor, and storage usage.
 *
 * `computeLocalManifest()` and `upload()` are local helpers (not part of the
 * §7 contract) that the orchestration uses to compute the manifest and to
 * perform the byte uploads that sit between phase 1 and phase 2 of a push.
 *
 * The local engine always runs against the same `.tekmemo/` files this layer
 * mirrors; sync never embeds, recalls, or runs graph traversal.
 *
 * @internal
 */

import type {
	FileManifest,
	SyncPullInput,
	SyncPullResult,
	SyncPushCompleteInput,
	SyncPushCompleteResult,
	SyncPushInput,
	SyncPushResult,
	SyncStatusInput,
	SyncStatusResult,
	SyncUploadTarget,
	TekMemoCloudClient,
} from "../../cloud-client/types";
import {
	CANONICAL_TEKMEMO_FILES,
	createSnapshotPath,
	type MemoryPath,
} from "../../core/constants/memory-paths";
import { readSnapshotRecords } from "../../core/snapshots/snapshot-records";
import type { MemoryStore } from "../../core/types/memory-store";
import type { SnapshotMemoryInput, SnapshotMemoryResult } from "../types";
import { sha256Hex } from "./sha256";

/**
 * A file-replication sync layer bound to one project. Every sync method maps
 * 1:1 to the cloud-client `sync` namespace (§7); `computeLocalManifest`,
 * `upload`, and `pushFull` are local orchestration helpers.
 */
export interface FileSyncLayer {
	/** Walks present canonical + snapshot files, returning `{ path → sha256 }`. */
	computeLocalManifest(): Promise<FileManifest>;
	/** Phase 1: send the local manifest, get presigned upload targets. */
	push(input?: SyncPushInput, signal?: AbortSignal): Promise<SyncPushResult>;
	/** Uploads bytes for the given targets to their presigned PUT URLs. */
	upload(targets: SyncUploadTarget[], signal?: AbortSignal): Promise<void>;
	/** Phase 2: commit a preceding push (caller uploads between the two). */
	complete(
		input: SyncPushCompleteInput,
		signal?: AbortSignal,
	): Promise<SyncPushCompleteResult>;
	/**
	 * Convenience: runs the full two-phase push — `push` → `upload` → `complete`
	 * — with a mandatory pre-sync snapshot first (§8, D6). This is what the
	 * agentfs `sync.push()` zero-arg hook drives in hybrid mode; callers that
	 * want manual control over each phase call them individually.
	 */
	pushFull(signal?: AbortSignal): Promise<SyncPushCompleteResult>;
	/** Download changed files, remove deleted ones, re-derive local indexes. */
	pull(input?: SyncPullInput, signal?: AbortSignal): Promise<SyncPullResult>;
	/** Reads the cloud manifest, cursor, and storage usage. */
	status(
		input?: SyncStatusInput,
		signal?: AbortSignal,
	): Promise<SyncStatusResult>;
}

export interface CreateFileSyncLayerOptions {
	/** The frozen cloud-client surface (health/readiness/sync only). */
	client: TekMemoCloudClient;
	/** The local store holding the canonical `.tekmemo/` files. */
	store: MemoryStore;
	/** Project scope for sync calls. */
	projectId: string;
	/**
	 * Creates a `pre-sync` snapshot before any sync that mutates local files
	 * (D6). Wired by the hybrid strategy to `local.createSnapshot`. Mandatory:
	 * if it throws, the sync aborts (fail closed).
	 */
	snapshot?(input: SnapshotMemoryInput): Promise<SnapshotMemoryResult>;
	/**
	 * Re-derives local indexes (graph + lexical) from source files after a
	 * pull (§10). Wired by the hybrid strategy to `bootstrapMemoryStore`.
	 * Defaults to a no-op.
	 */
	reindex?(): Promise<unknown>;
}

const SYNC_TIMEOUT_MS = 30_000;

export function createFileSyncLayer(
	options: CreateFileSyncLayerOptions,
): FileSyncLayer {
	const { client, store, projectId } = options;

	/** Canonical + snapshot paths that currently exist in the store. */
	async function listPresentPaths(): Promise<MemoryPath[]> {
		const paths: MemoryPath[] = [];
		for (const path of CANONICAL_TEKMEMO_FILES) {
			if (await store.exists(path)) paths.push(path);
		}
		// Snapshot files are dynamic — derive their paths from the index.
		try {
			const records = await readSnapshotRecords(store, {
				malformedLineMode: "skip",
			});
			for (const record of records) {
				const path = safeSnapshotPath(record.id);
				if (path && (await store.exists(path))) paths.push(path);
			}
		} catch {
			// No snapshots index yet (fresh project) — nothing to add.
		}
		return paths;
	}

	return {
		async computeLocalManifest(): Promise<FileManifest> {
			const manifest: FileManifest = {};
			for (const path of await listPresentPaths()) {
				const content = await store.read(path);
				manifest[path] = sha256Hex(content);
			}
			return manifest;
		},

		async push(
			input?: SyncPushInput,
			signal?: AbortSignal,
		): Promise<SyncPushResult> {
			if (signal?.aborted) throw new Error("Operation aborted.");
			const manifest = input?.manifest ?? (await this.computeLocalManifest());
			return client.sync.push(
				{
					projectId,
					manifest,
					...(input?.baseCursor ? { baseCursor: input.baseCursor } : {}),
				},
				signal,
			);
		},

		async upload(
			targets: SyncUploadTarget[],
			signal?: AbortSignal,
		): Promise<void> {
			if (signal?.aborted) throw new Error("Operation aborted.");
			for (const target of targets) {
				const path = safeMemoryPath(target.path);
				if (!path) {
					throw new Error(
						`sync.upload: refusing to read non-canonical path ${target.path}.`,
					);
				}
				const content = await store.read(path);
				const actualHash = sha256Hex(content);
				if (actualHash !== target.sha256) {
					throw new Error(
						`sync.upload: sha256 mismatch for ${target.path} (expected ${target.sha256}, got ${actualHash}).`,
					);
				}
				await putText(target.presignedPutUrl, content, signal);
			}
		},

		async complete(
			input: SyncPushCompleteInput,
			signal?: AbortSignal,
		): Promise<SyncPushCompleteResult> {
			if (signal?.aborted) throw new Error("Operation aborted.");
			// The caller is responsible for uploading bytes (via `upload`)
			// before committing. The cloud verifies each object's sha256 on
			// commit; nothing local is mutated by the commit itself, so no
			// pre-sync snapshot is needed here (`pushFull` and `pull` snapshot
			// before any mutation).
			return client.sync.complete(
				{ projectId, uploaded: input.uploaded, cursor: input.cursor },
				signal,
			);
		},

		async pushFull(signal?: AbortSignal): Promise<SyncPushCompleteResult> {
			if (signal?.aborted) throw new Error("Operation aborted.");
			// D6: mandatory pre-sync snapshot before the mutating push flow.
			await createPreSyncSnapshot(options.snapshot, "push");
			const pushResult = await this.push(undefined, signal);
			await this.upload(pushResult.upload, signal);
			return this.complete(
				{
					projectId,
					uploaded: pushResult.upload.map(({ path, sha256 }) => ({
						path,
						sha256,
					})),
					cursor: pushResult.cursor,
				},
				signal,
			);
		},

		async pull(
			input?: SyncPullInput,
			signal?: AbortSignal,
		): Promise<SyncPullResult> {
			if (signal?.aborted) throw new Error("Operation aborted.");
			// D6: mandatory pre-sync snapshot before mutating local files.
			await createPreSyncSnapshot(options.snapshot, "pull");

			const manifest = input?.manifest ?? (await this.computeLocalManifest());
			const result = await client.sync.pull(
				{
					projectId,
					manifest,
					...(input?.since ? { since: input.since } : {}),
				},
				signal,
			);

			// Download + verify + write each changed file.
			for (const target of result.files) {
				const content = await fetchText(target.presignedGetUrl, signal);
				const actualHash = sha256Hex(content);
				if (actualHash !== target.sha256) {
					throw new Error(
						`sync.pull: sha256 mismatch for ${target.path} (expected ${target.sha256}, got ${actualHash}).`,
					);
				}
				const path = safeMemoryPath(target.path);
				if (!path) {
					throw new Error(
						`sync.pull: refusing to write non-canonical path ${target.path}.`,
					);
				}
				await store.write(path, content);
			}

			// Remove files deleted server-side.
			for (const removed of result.removed) {
				const path = safeMemoryPath(removed);
				if (path) await store.delete(path);
			}

			// Re-derive local indexes (graph + lexical) from source files (§10).
			if (options.reindex) {
				try {
					await options.reindex();
				} catch {
					// Best-effort: stale indexes do not invalidate the pull.
				}
			}

			return result;
		},

		async status(
			input?: SyncStatusInput,
			signal?: AbortSignal,
		): Promise<SyncStatusResult> {
			if (signal?.aborted) throw new Error("Operation aborted.");
			return client.sync.status({ projectId, ...(input ?? {}) }, signal);
		},
	};
}

/**
 * Creates the mandatory pre-sync snapshot before mutating local files. Fails
 * closed: if snapshot creation is configured and throws, the sync aborts so
 * the user keeps a rollback point.
 */
async function createPreSyncSnapshot(
	snapshot: CreateFileSyncLayerOptions["snapshot"],
	operation: "push" | "pull",
): Promise<void> {
	if (!snapshot) return;
	const label = `pre-sync-${operation}-${new Date().toISOString()}`;
	await snapshot({ type: "pre-sync", label });
}

/** Uploads UTF-8 text to a presigned PUT URL. */
async function putText(
	url: string,
	body: string,
	signal?: AbortSignal,
): Promise<void> {
	const timeout = AbortSignal.timeout(SYNC_TIMEOUT_MS);
	const combined = signal ? mergeSignals(signal, timeout) : timeout;
	const response = await fetch(url, {
		method: "PUT",
		body,
		signal: combined,
	});
	if (!response.ok) {
		throw new Error(
			`Presigned PUT failed: ${response.status} ${response.statusText}.`,
		);
	}
}

/** Fetches a presigned-URL response body as UTF-8 text. */
async function fetchText(url: string, signal?: AbortSignal): Promise<string> {
	const timeout = AbortSignal.timeout(SYNC_TIMEOUT_MS);
	const combined = signal ? mergeSignals(signal, timeout) : timeout;
	const response = await fetch(url, { signal: combined });
	if (!response.ok) {
		throw new Error(
			`Presigned GET failed: ${response.status} ${response.statusText}.`,
		);
	}
	return response.text();
}

/** Coerces an arbitrary string into a canonical/snapshot MemoryPath, or undefined. */
function safeMemoryPath(path: string): MemoryPath | undefined {
	for (const canonical of CANONICAL_TEKMEMO_FILES) {
		if (canonical === path) return canonical;
	}
	return safeSnapshotPathFromPath(path);
}

/** Builds a snapshot MemoryPath from a record id, or undefined if invalid. */
function safeSnapshotPath(id: string): MemoryPath | undefined {
	try {
		return createSnapshotPath(id);
	} catch {
		return undefined;
	}
}

/** Recognizes an existing snapshot file path string. */
function safeSnapshotPathFromPath(path: string): MemoryPath | undefined {
	if (!path.startsWith(".tekmemo/snapshots/")) return undefined;
	if (!path.endsWith(".json")) return undefined;
	const id = path.slice(".tekmemo/snapshots/".length, -".json".length);
	return safeSnapshotPath(id);
}

/**
 * Combines an abort signal with a timeout signal. Mirrors the cloud-client
 * transport's pattern without depending on its private helper.
 */
function mergeSignals(signal: AbortSignal, timeout: AbortSignal): AbortSignal {
	if (signal.aborted) return signal;
	if (timeout.aborted) return timeout;
	const controller = new AbortController();
	const onAbort = (reason: unknown) => controller.abort(reason);
	signal.addEventListener("abort", () => onAbort(signal.reason), {
		once: true,
	});
	timeout.addEventListener("abort", () => onAbort(timeout.reason), {
		once: true,
	});
	return controller.signal;
}
