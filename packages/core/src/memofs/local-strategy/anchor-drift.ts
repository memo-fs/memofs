/**
 * Code-anchor drift detection — the file+hash compare seam.
 *
 * Three exported seams, each pure-or-near-pure so unit tests can drive them
 * directly:
 *
 * - {@link recomputeFileHash} — read a file from disk and hash its bytes
 *   with SHA-256. Returns `undefined` when the file is missing (file-deleted
 *   drift). Used both as the cold-start priming path and the TTL-expiry
 *   recomputation.
 * - {@link getCachedFileHash} — the in-process cache. Same input as
 *   `recomputeFileHash` plus a {@link AnchorHashCache} and a `now`
 *   epoch-millis. Returns `{ hash, fromCache }`. The cache is a plain
 *   `Map<string, AnchorHashCacheEntry>` so the strategist can persist it
 *   to `.memofs/manifest.json` (cross-session warm start).
 * - {@link applyAnchorDrift} — the recall-post-merge seam. Walks an array
 *   of {@link RecallItem}s, looks each `id` up in `anchorByMemoryId`, and
 *   when the file's current hash disagrees with the stored hash (or the
 *   file is deleted) sets `item.stale = true`, demotes `item.score *= 0.5`,
 *   copies `item.anchor` through, and transitions the bound graph node(s)
 *   to status `"stale"` via the supplied graph store.
 *
 * ## Cache invalidation strategy
 *
 * The 5-minute TTL is the backup safety net; the file-change invalidation
 * is the primary freshness gate. This implementation uses **mtime-based
 * invalidation** (`stat.mtimeMs <= cache.ts`) instead of `fs.watch`, and
 * persists the cache to manifest via the strategist's
 * `flushAnchorHashCache` (see `local-strategy.ts`) instead of a per-file
 * watcher. Two reasons for the substitution:
 *
 * 1. **Determinism** — `fs.watch` callbacks fire asynchronously on the
 *    event loop, so recall-this-then-mutate-then-recall-again tests are
 *    racy (the change event may not have fired before the second call
 *    starts). mtime is read synchronously inside `getCachedFileHash`, so
 *    the second call deterministically sees the new mtime. mtime also
 *    works across processes — a fresh process hydrating from manifest
 *    invalidates against the file's current mtime without needing a
 *    watcher established ahead of the edit.
 * 2. **Lifecycle simplicity** — `fs.watch` requires keeping an
 *    `FSWatcher` per cached file, closing it on cache eviction, and
 *    handling `error` events. mtime is a per-call stat, no state to
 *    clean up.
 *
 * mtime-based invalidation satisfies the contract semantically — the
 * cache is refreshed whenever the file changes (mtime advances). The
 * 5-minute TTL is preserved as a hard ceiling. A `fs.watch` layer may be
 * added on top later for sub-mtime granularity (e.g. mtime-preserving
 * edits via `touch -d`); it is not required for correctness because the
 * mtime check already fires on every read.
 *
 * @internal
 */

import { readFile, stat } from "node:fs/promises";
import { isAbsolute, join } from "node:path";
import { isNotFoundError } from "../../core/internal/is-not-found-error";
import type { Logger } from "../../core/types/logger";
import type { AnchorHashCacheEntry } from "../../core/types/memory-documents";
import type { GraphNode } from "../../graph/types";
import { sha256BytesHex } from "../sync/sha256";
import type { AnchorRef, GraphNodeInput, RecallItem } from "../types";
import type { LocalGraphStore } from "./types";

/**
 * Soft time-to-live for cached file hashes — 5 minutes. The cache is
 * process-scoped; entries older than this TTL are recomputed on the next
 * read.
 *
 * @internal
 */
export const ANCHOR_HASH_CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * The in-process anchor-hash cache. Plain `Map` so the strategist can
 * persist it to `.memofs/manifest.json` (cross-session warm start) by
 * converting entries to {@link AnchorHashCacheEntry}-shaped JSON.
 *
 * @internal
 */
export type AnchorHashCache = Map<string, AnchorHashCacheEntry>;

/**
 * Creates an empty {@link AnchorHashCache}.
 *
 * @internal
 */
export function createAnchorHashCache(): AnchorHashCache {
	return new Map();
}

/**
 * Reads a file and returns the SHA-256 hex digest of its raw bytes, or
 * `undefined` when the file is missing (file-deleted drift). Used by the
 * cold-start priming path, the TTL-expiry recomputation, and
 * {@link getCachedFileHash}.
 *
 * Errors other than "not found" (permission denied, I/O fault) are allowed
 * to bubble so the strategist can decide whether to suppress them.
 *
 * @param filePath - Absolute path to the file whose bytes should be hashed.
 * @internal
 */
export async function recomputeFileHash(
	filePath: string,
): Promise<string | undefined> {
	try {
		const bytes = await readFile(filePath);
		return await sha256BytesHex(bytes);
	} catch (error) {
		if (isNotFoundError(error)) return undefined;
		throw error;
	}
}

/**
 * Returns the current SHA-256 of `file`, consulting the supplied cache
 * first and recomputing only when the entry is missing, older than
 * {@link ANCHOR_HASH_CACHE_TTL_MS}, OR the file's mtime advanced past
 * the cache entry's timestamp (file changed since the cache was
 * populated).
 *
 * Returns `{ hash: undefined, fromCache: false }` when the file is
 * missing (file-deleted drift); the cache is not poisoned with
 * `undefined` entries — a subsequent read after the file reappears will
 * recompute fresh.
 *
 * @internal
 */
export async function getCachedFileHash(args: {
	file: string;
	cache: AnchorHashCache;
	now: number;
	/** Override the TTL for tests. Defaults to {@link ANCHOR_HASH_CACHE_TTL_MS}. */
	ttlMs?: number;
}): Promise<{ hash: string | undefined; fromCache: boolean }> {
	const ttl = args.ttlMs ?? ANCHOR_HASH_CACHE_TTL_MS;
	const cached = args.cache.get(args.file);

	// Stat the file — this catches file-deletion AND mtime change in one syscall.
	let mtimeMs: number | undefined;
	try {
		const stats = await stat(args.file);
		mtimeMs = stats.mtimeMs;
	} catch (error) {
		if (isNotFoundError(error)) {
			// File-deleted drift.
			args.cache.delete(args.file);
			return { hash: undefined, fromCache: false };
		}
		throw error;
	}

	// Cache hits only when ALL of:
	//   - cached entry exists
	//   - cache.ts is at least as new as the file's mtime (file unchanged)
	//   - now - cache.ts < ttl (safety ceiling)
	if (
		cached !== undefined &&
		mtimeMs !== undefined &&
		cached.ts >= mtimeMs &&
		args.now - cached.ts < ttl
	) {
		return { hash: cached.hash, fromCache: true };
	}

	// Cache miss (or invalidated by mtime/TTL) — recompute.
	const hash = await recomputeFileHash(args.file);
	if (hash === undefined) {
		// File was deleted between our stat and read — drop and propagate.
		args.cache.delete(args.file);
		return { hash: undefined, fromCache: false };
	}
	// Stamp the cache entry at `max(now, mtimeMs)` so the `cache.ts >=
	// mtimeMs` invariant holds even when `Date.now()` (integer ms) truncates
	// below the file's sub-millisecond `mtimeMs` for a freshly-written file.
	args.cache.set(args.file, {
		hash,
		ts: Math.max(args.now, mtimeMs ?? args.now),
	});
	return { hash, fromCache: false };
}

/**
 * Returns `true` when the anchor's stored hash disagrees with the file's
 * current hash, OR the file is missing (file-deleted drift). Cheap
 * single-shot helper used both internally and by tests. The recall path
 * uses {@link applyAnchorDrift} (which adds caching + graph transitions)
 * rather than calling this directly.
 *
 * @internal
 */
export async function isAnchorStale(
	anchor: AnchorRef,
	args: { now: number; cache?: AnchorHashCache; rootDir?: string },
): Promise<boolean> {
	const file = resolveAnchorFilePath(anchor.file, args.rootDir ?? ".");
	const current = args.cache
		? (await getCachedFileHash({ file, cache: args.cache, now: args.now })).hash
		: await recomputeFileHash(file);
	return current !== anchor.hash;
}

/**
 * Walks an array of {@link RecallItem}s and applies code-anchor drift
 * detection. For each item whose `id` appears in
 * `anchorByMemoryId`:
 *
 * 1. Compute the anchored file's current SHA-256 (with cache). The
 *    anchor's `file` is repo-relative and is resolved against
 *    `rootDir` (or treated as absolute when `isAbsolute(file)`).
 * 2. If it disagrees with `anchor.hash` (or the file is deleted):
 *    - `item.stale = true`
 *    - `item.score = (item.score ?? 1) * 0.5`
 *    - `item.anchor = anchor` (copied through so callers see the
 *      binding site)
 *    - For each graph-node id in `graphNodesByMemoryId.get(item.id)`:
 *      - Skip the upsert when the node is already `status: "stale"`
 *        (idempotent — avoids a write on every recall).
 *      - Otherwise upsert the node with `status: "stale"` and update
 *        the in-memory `graphNodes` index.
 *
 * Items without an anchor (backward-compat) and anchored items whose
 * file still matches are left untouched. Anchored items whose file
 * matches still get `item.anchor` copied through so callers see the
 * binding site (the typed `anchor` field on RecallItem contract).
 *
 * @internal
 */
export async function applyAnchorDrift(args: {
	items: RecallItem[];
	anchorByMemoryId: Map<string, AnchorRef>;
	cache: AnchorHashCache;
	now: number;
	/** Override the TTL for tests. Defaults to {@link ANCHOR_HASH_CACHE_TTL_MS}. */
	ttlMs?: number;
	/**
	 * The anchor's `file` is resolved against this root dir. When
	 * `anchor.file` is already absolute, it is used as-is. Defaults to
	 * `"."` (CWD) — callers should pass the project's resolved root dir.
	 */
	rootDir: string;
	graphStore: LocalGraphStore;
	graphNodes: Map<string, GraphNodeInput>;
	graphNodesByMemoryId: Map<string, string[]>;
	/** Optional structured logger — best-effort warning on graph-upsert failure. */
	logger?: Logger;
}): Promise<void> {
	const staleNodeIds: string[] = [];
	const staleNodesToUpsert: GraphNodeInput[] = [];

	for (const item of args.items) {
		const anchor = args.anchorByMemoryId.get(item.id);
		if (anchor === undefined) continue;

		const absoluteFile = resolveAnchorFilePath(anchor.file, args.rootDir);
		const current = (
			await getCachedFileHash({
				file: absoluteFile,
				cache: args.cache,
				now: args.now,
				...(args.ttlMs === undefined ? {} : { ttlMs: args.ttlMs }),
			})
		).hash;

		// Copy the anchor through regardless so callers see the binding site.
		item.anchor = anchor;

		if (current === anchor.hash) continue;

		// Drift detected (hash mismatch OR file deleted).
		item.stale = true;
		item.score = (item.score ?? 1) * 0.5;

		const nodeIds = args.graphNodesByMemoryId.get(item.id) ?? [];
		for (const nodeId of nodeIds) {
			const node = args.graphNodes.get(nodeId);
			if (node === undefined) continue;
			if (node.status === "stale") continue; // idempotent — skip the write
			const updated: GraphNodeInput = { ...node, status: "stale" };
			args.graphNodes.set(nodeId, updated);
			staleNodesToUpsert.push(updated);
			staleNodeIds.push(nodeId);
		}
	}

	if (staleNodesToUpsert.length === 0) return;

	try {
		// Cast GraphNodeInput[] → GraphNode[] matches the pattern at
		// `local-strategy/graph.ts:38`. The input/looser-typed fields
		// (string-typed `type`/`status`, `JsonObject` `metadata`) were
		// originally produced by `toGraphNodeInput` from a valid GraphNode,
		// so the narrowing is sound.
		await args.graphStore.upsertNodes(staleNodesToUpsert as GraphNode[]);
	} catch (error) {
		args.logger?.warn("anchor-drift graph upsert failed", {
			error: error instanceof Error ? error.message : String(error),
			nodeIds: staleNodeIds,
		});
	}
}

/**
 * Resolves an anchored `file` (repo-relative or absolute) against the
 * project rootDir. Used by the strategist to translate `AnchorRef.file`
 * into an absolute OS path before reading from disk.
 *
 * - Absolute paths are returned as-is.
 * - Relative paths are joined to `rootDir`.
 *
 * @internal
 */
export function resolveAnchorFilePath(file: string, rootDir: string): string {
	if (isAbsolute(file)) return file;
	return join(rootDir, file);
}

/**
 * Validates that an unknown value (typically read from the JSON envelope
 * of a memory-event record) is a well-formed {@link AnchorRef}. Used by
 * the cold-start hydration path so a malformed event doesn't crash the
 * strategist — the event is simply skipped (best-effort recovery).
 *
 * @internal
 */
export function isValidAnchorRef(value: unknown): value is AnchorRef {
	if (typeof value !== "object" || value === null || Array.isArray(value)) {
		return false;
	}
	const v = value as { file?: unknown; hash?: unknown; symbol?: unknown };
	if (typeof v.file !== "string" || v.file.length === 0) return false;
	if (typeof v.hash !== "string" || v.hash.length === 0) return false;
	if (v.symbol !== undefined && typeof v.symbol !== "string") return false;
	return true;
}
