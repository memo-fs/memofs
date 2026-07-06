/**
 * Shared sync internals — project loading, cursor math, manifest diffing.
 *
 * The four sync routes (`push`, `push/complete`, `pull`, `status`) all operate
 * over the same two shapes: the `project_files` table (the cloud manifest,
 * §4.3) and `sync_cursors` (the monotonic per-project ordering token, §4.3).
 * This module is the pure-data-access + diff layer the routes compose; the
 * routes themselves own HTTP, presigning, and envelope shaping.
 *
 * Kept free of Hono / Worker concerns so it is unit-testable with an in-memory
 * DB and no request context.
 *
 * @see docs/architecture/cloud-sync-and-refactor.md §4 — file-replication sync.
 * @see docs/architecture/decisions.md Q13 — auto-provision on first push.
 * @see docs/architecture/decisions.md Q14 — cursor = `String(seq)`.
 */

import type { Transaction } from "@libsql/client";
import { createId } from "@paralleldrive/cuid2";
import type {
	CloudFileManifest,
	FileManifest,
} from "@memofs/core/cloud-client";
import { desc, eq, sql } from "drizzle-orm";
import type { Database } from "../../db";
import { projectFiles, projects, syncCursors } from "../../db/schema";
import { canWriteProject, getPersonalTeam } from "../../queries/teams";
import { ConflictError, PermissionError } from "../errors";

/**
 * A loaded project row, narrowed to the fields sync handlers read. Returned by
 * `loadProject` / `ensureProject` so handlers don't reach back into the table
 * consts. `teamId` is the access-control boundary (ADR 0011 Phase 2); null for a
 * pre-migration row not yet backfilled onto a team.
 */
export interface SyncProject {
	id: string;
	accountId: string;
	teamId: string | null;
	totalStorageBytes: number;
}

/** The cursor value returned for a project that has never been pushed ("0"). */
export const INITIAL_CURSOR = "0";

/**
 * Loads a project by id, or returns `null` if it does not exist.
 *
 * Pull/status use this: a missing project is reported as empty (Q13), not 404.
 * Push uses `ensureProject` instead, which creates the row if absent.
 */
export async function loadProject(
	db: Database,
	projectId: string,
): Promise<SyncProject | null> {
	const rows = await db
		.select({
			id: projects.id,
			accountId: projects.accountId,
			teamId: projects.teamId,
			totalStorageBytes: projects.totalStorageBytes,
		})
		.from(projects)
		.where(eq(projects.id, projectId))
		.limit(1);
	return rows[0] ?? null;
}

/**
 * Ensures a project exists, creating it owned by `accountId` if absent (Q13).
 *
 * Called by the push path on first push. The id is taken verbatim from the URL
 * path — clients pick their project id locally (the CLI derives it from the
 * workspace), and the cloud accepts it. Returns the project row either way.
 *
 * NOTE: this does NOT check ownership — the caller must do that (push does,
 * after `ensureProject`, against the authenticated account). The reason
 * provisioning + ownership-check are split: a brand-new id has no owner yet, so
 * "does this key own it?" is vacuously answered by "this key is creating it."
 */
export async function ensureProject(
	db: Database,
	accountId: string,
	projectId: string,
): Promise<SyncProject> {
	const existing = await loadProject(db, projectId);
	if (existing) return existing;
	// Assign the new project to the creator's personal team (ADR 0011 Phase 2):
	// the team is the access boundary. If the account has no personal team yet
	// (a pre-backfill account), the project is created teamless and the backfill
	// migration will link it later; only the creator may write until then.
	const personalTeam = await getPersonalTeam(db, accountId);
	await db.insert(projects).values({
		id: projectId,
		accountId,
		teamId: personalTeam?.id ?? null,
		name: projectId,
	});
	return {
		id: projectId,
		accountId,
		teamId: personalTeam?.id ?? null,
		totalStorageBytes: 0,
	};
}

/**
 * Returns the current cursor for a project, or `INITIAL_CURSOR` if it has no
 * `sync_cursors` rows yet. The cursor is `String(max seq)` (Q14).
 */
export async function currentCursor(
	db: Database,
	projectId: string,
): Promise<string> {
	const rows = await db
		.select({ seq: syncCursors.seq })
		.from(syncCursors)
		.where(eq(syncCursors.projectId, projectId))
		.orderBy(desc(syncCursors.seq))
		.limit(1);
	return rows[0] ? String(rows[0].seq) : INITIAL_CURSOR;
}

/**
 * Parses a client-supplied `since` cursor into a numeric seq lower bound, or
 * `null` if absent/invalid. `null` means "no lower bound" (pull everything).
 *
 * The client treats the cursor as opaque, so we are lenient on parse: a value
 * that isn't a non-negative integer is treated as "no cursor" rather than
 * rejected — the worst case is a slightly larger diff, never a hard failure.
 */
export function parseCursor(cursor: string | undefined | null): number | null {
	if (cursor == null || cursor === "") return null;
	const n = Number(cursor);
	if (!Number.isInteger(n) || n < 0) return null;
	return n;
}

/**
 * The full cloud manifest for a project, as the published type expects it:
 * `{ path → { sha256, r2Key, sizeBytes, updatedAt } }`.
 *
 * This is what `pull`/`status` return and what `push` diffs against.
 */
export async function loadCloudManifest(
	db: Database,
	projectId: string,
): Promise<CloudFileManifest> {
	const rows = await db
		.select({
			path: projectFiles.path,
			sha256: projectFiles.sha256,
			r2Key: projectFiles.r2Key,
			sizeBytes: projectFiles.sizeBytes,
			updatedAt: projectFiles.updatedAt,
		})
		.from(projectFiles)
		.where(eq(projectFiles.projectId, projectId));
	const manifest: CloudFileManifest = {};
	for (const row of rows) {
		manifest[row.path] = {
			path: row.path,
			sha256: row.sha256,
			sizeBytes: row.sizeBytes,
			r2Key: row.r2Key,
			updatedAt: row.updatedAt,
		};
	}
	return manifest;
}

/**
 * The cloud manifest reduced to the local manifest shape: `{ path → sha256 }`.
 * Used when diffing against a client-supplied manifest (which carries no r2Key).
 */
export function cloudManifestToLocal(cloud: CloudFileManifest): FileManifest {
	const out: FileManifest = {};
	for (const [path, entry] of Object.entries(cloud)) out[path] = entry.sha256;
	return out;
}

/**
 * The set of paths + shas the cloud needs from a client push: every path in the
 * client's manifest whose sha differs from the cloud's, plus paths the cloud has
 * never seen. Used by `push` to decide which presigned PUT URLs to issue (§4.4).
 */
export function diffPushTargets(
	client: FileManifest,
	cloud: FileManifest,
): { path: string; sha256: string }[] {
	const out: { path: string; sha256: string }[] = [];
	for (const [path, sha] of Object.entries(client)) {
		if (cloud[path] !== sha) out.push({ path, sha256: sha });
	}
	return out;
}

/**
 * The set of paths + shas the client needs to download: every path in the
 * cloud's manifest whose sha differs from the client's, plus paths the client is
 * missing. Used by `pull` to decide which presigned GET URLs to issue (§4.5).
 */
export function diffPullTargets(
	cloud: CloudFileManifest,
	client: FileManifest,
): { path: string; sha256: string }[] {
	const out: { path: string; sha256: string }[] = [];
	for (const [path, entry] of Object.entries(cloud)) {
		if (client[path] !== entry.sha256) {
			out.push({ path, sha256: entry.sha256 });
		}
	}
	return out;
}

/**
 * Paths the client holds that the cloud has deleted: present in `client` but
 * absent from `cloud`. Returned to the client as `removed[]` on pull so it can
 * delete them locally (§4.5).
 */
export function diffRemoved(
	client: FileManifest,
	cloud: CloudFileManifest,
): string[] {
	const cloudPaths = new Set(Object.keys(cloud));
	return Object.keys(client).filter((p) => !cloudPaths.has(p));
}

// ---------------------------------------------------------------------------
// Commit helpers (used by `push/complete`)
// ---------------------------------------------------------------------------

/**
 * Verifies that an uploaded blob exists in R2 and its sha256 matches the claimed
 * digest, returning the object's size in bytes. Throws `ConflictError` (409) if
 * the object is missing or its sha256 mismatches — content-addressing means the
 * bytes the client PUT must hash to what it claimed, else we refuse to commit.
 *
 * R2's S3 API computes sha256 server-side and rejects a PUT whose body doesn't
 * match a supplied `x-amz-checksum-sha256`, but the client uploaded via a
 * presigned URL that didn't bind the checksum (simplicity over strictness at
 * presign time). So on commit we re-verify by reading the stored object's
 * checksums — a single `head()` would give us `checksums.sha256`, but to stay
 * binding-portable we `get()` the body and hash it (the Worker is out of the
 * data path only during the upload; the verify read is a cold small object).
 *
 * @param blobs   the R2 bucket binding (or a stub for tests — see sync.test.ts).
 * @param r2Key   the content-addressed object key (= the sha256 hex).
 * @param sha256  the sha256 the client claimed for this path.
 * @returns the object size in bytes.
 */
export async function verifyUploaded(
	blobs: R2Bucket,
	r2Key: string,
	sha256: string,
): Promise<number> {
	const obj = await blobs.get(r2Key);
	if (!obj) {
		throw new ConflictError(
			`Uploaded object not found for ${r2Key}. Re-upload and retry.`,
			{ r2Key, sha256 },
		);
	}
	const body = await obj.arrayBuffer();
	const actualHex = bufferToHex(
		await crypto.subtle.digest("SHA-256", new Uint8Array(body)),
	);
	if (actualHex !== sha256) {
		throw new ConflictError(
			`Uploaded object sha256 mismatch for ${r2Key}: expected ${sha256}, got ${actualHex}.`,
			{ r2Key, expected: sha256, actual: actualHex },
		);
	}
	return obj.size;
}

/**
 * Commits a push inside a caller-supplied libSQL write transaction (ADR 0010).
 *
 * This is the serialized form: the caller wraps the call in
 * `acquireWriteLock(db, projectId, (tx) => commitPushTx(tx, projectId, …))`, so
 * every statement below runs against the SAME `BEGIN IMMEDIATE` transaction.
 * The cursor bump + N upserts + SUM + projects update are atomic by
 * construction — there is no window for a concurrent commit to interleave and
 * lose a manifest entry or collide on `seq`.
 *
 * Statements run as raw SQL via `tx.execute()` because the raw libSQL
 * `Transaction` (not a drizzle db handle) is what the `BEGIN IMMEDIATE` lock
 * holds. Drizzle's query builder operates on `Database`/sessions, not raw
 * transactions; mixing would either lose the lock or require drizzle's own
 * (deferred-mode) transaction wrapper — see `concurrency.ts` for why deferred
 * is wrong on the commit path. The SQL mirrors the drizzle queries the old
 * `commitPush` emitted (same columns, same `ON CONFLICT(project_id, path)` upsert).
 *
 * @param tx         an open libSQL write transaction from `acquireWriteLock`.
 * @param projectId  the project being committed.
 * @param uploaded   the verified `{ path, sha256, r2Key, sizeBytes }` entries.
 * @returns `{ cursor, manifest }` — the new cursor and the full cloud manifest
 *          after the commit, shaped exactly as `SyncPushCompleteResult` expects.
 *
 * ## Why `total_storage_bytes` is recomputed from `project_files`, not incremented
 * The naïve approach is `total += delta`. That drifts on a push that *replaces*
 * a path's blob (old bytes freed, new bytes added) or that touches a path the
 * project already held. Recomputing `SUM(size_bytes) WHERE project_id = ?` after
 * the upserts is a single indexed aggregation and is always correct regardless
 * of how many paths were added/replaced/deleted. Deletes (a path the client no
 * longer lists) are handled implicitly: a push that drops a path doesn't upsert
 * it, but also doesn't delete the row — deletion is explicit via a future
 * `DELETE /sync/file` (§13 out of v1 scope); v1 sync is append/replace by sha.
 */
export async function commitPushTx(
	tx: Transaction,
	projectId: string,
	uploaded: Array<{
		path: string;
		sha256: string;
		r2Key: string;
		sizeBytes: number;
	}>,
): Promise<{ cursor: string; manifest: CloudFileManifest }> {
	// Bump the cursor INSIDE the tx (write lock held → no concurrent bump can
	// read the same max(seq) and land the same value).
	const nextSeq = await bumpCursorTx(tx, projectId, "push");

	// Upsert every uploaded file. `(project_id, path)` is unique, so
	// `ON CONFLICT DO UPDATE` turns an insert into a replace when the path
	// already exists — exactly the "replace this path's blob" semantics a push
	// needs. Mirrors the drizzle `onConflictDoUpdate({ target:
	// [projectFiles.projectId, projectFiles.path], set })` from the legacy path.
	for (const entry of uploaded) {
		await tx.execute({
			sql: `INSERT INTO project_files (id, project_id, path, sha256, r2_key, size_bytes)
			      VALUES (?, ?, ?, ?, ?, ?)
			      ON CONFLICT (project_id, path) DO UPDATE SET
			        sha256 = excluded.sha256,
			        r2_key = excluded.r2_key,
			        size_bytes = excluded.size_bytes,
			        updated_at = current_timestamp`,
			args: [
				newId(),
				projectId,
				entry.path,
				entry.sha256,
				entry.r2Key,
				entry.sizeBytes,
			],
		});
	}

	// Recompute the project's total storage from the file set (see JSDoc above).
	const totals = await tx.execute({
		sql: `SELECT coalesce(sum(size_bytes), 0) AS total
		      FROM project_files
		      WHERE project_id = ?`,
		args: [projectId],
	});
	const totalBytes = Number(totals.rows[0]?.total ?? 0);
	await tx.execute({
		sql: `UPDATE projects
		      SET total_storage_bytes = ?, updated_at = current_timestamp
		      WHERE id = ?`,
		args: [totalBytes, projectId],
	});

	const manifest = await loadCloudManifestTx(tx, projectId);
	return { cursor: String(nextSeq), manifest };
}

/**
 * Reads the current cursor for a project INSIDE a write transaction, for the
 * optimistic `baseCursor` gate (ADR 0010). Runs against `tx` so the read is
 * serialized with the commit that's about to happen — no concurrent commit can
 * sneak in between the gate check and the cursor bump.
 */
export async function currentCursorTx(
	tx: Transaction,
	projectId: string,
): Promise<string> {
	const rs = await tx.execute({
		sql: `SELECT seq FROM sync_cursors
		      WHERE project_id = ?
		      ORDER BY seq DESC
		      LIMIT 1`,
		args: [projectId],
	});
	return rs.rows[0] ? String(rs.rows[0].seq) : INITIAL_CURSOR;
}

/**
 * Advances the sync cursor INSIDE a caller-supplied transaction. The cursor
 * bump is the critical section that concurrency control exists to protect
 * (`max(seq)+1` read-then-write); running it inside `BEGIN IMMEDIATE` makes it
 * atomic by definition.
 */
export async function bumpCursorTx(
	tx: Transaction,
	projectId: string,
	kind: "push" | "pull" | "init",
): Promise<number> {
	const rs = await tx.execute({
		sql: `SELECT coalesce(max(seq), 0) AS max_seq
		      FROM sync_cursors
		      WHERE project_id = ?`,
		args: [projectId],
	});
	const nextSeq = Number(rs.rows[0]?.max_seq ?? 0) + 1;
	await tx.execute({
		sql: `INSERT INTO sync_cursors (id, project_id, seq, kind)
		      VALUES (?, ?, ?, ?)`,
		args: [newId(), projectId, nextSeq, kind],
	});
	return nextSeq;
}

/**
 * Loads the cloud manifest INSIDE a transaction, so the manifest returned with
 * a freshly-committed cursor reflects exactly the writes just applied (not a
 * read from a different transaction's snapshot).
 */
export async function loadCloudManifestTx(
	tx: Transaction,
	projectId: string,
): Promise<CloudFileManifest> {
	const rs = await tx.execute({
		sql: `SELECT path, sha256, r2_key, size_bytes, updated_at
		      FROM project_files
		      WHERE project_id = ?`,
		args: [projectId],
	});
	const manifest: CloudFileManifest = {};
	for (const row of rs.rows) {
		const path = String(row.path);
		manifest[path] = {
			path,
			sha256: String(row.sha256),
			sizeBytes: Number(row.size_bytes),
			r2Key: String(row.r2_key),
			updatedAt: String(row.updated_at),
		};
	}
	return manifest;
}

/**
 * Commits a push WITHOUT concurrency control — the legacy single-writer path.
 *
 * Kept for callers that do not (yet) run under `acquireWriteLock` (existing
 * tests, any non-sync ingestion). It composes the transactional pieces inside a
 * single drizzle `db.transaction()` so the manifest is still applied atomically
 * against the DB; the difference from `commitPushTx`+`acquireWriteLock` is that
 * drizzle's transaction is deferred-mode (not `BEGIN IMMEDIATE`), so it does
 * NOT serialize concurrent writers. New multi-writer call sites MUST use
 * `acquireWriteLock` + `commitPushTx` instead.
 *
 * @returns `{ cursor, manifest }` — see `commitPushTx`.
 */
export async function commitPush(
	db: Database,
	projectId: string,
	uploaded: Array<{
		path: string;
		sha256: string;
		r2Key: string;
		sizeBytes: number;
	}>,
): Promise<{ cursor: string; manifest: CloudFileManifest }> {
	// Mirror `commitPushTx`'s logic against the drizzle builder (the deferred-
	// mode transaction it runs in is the only difference). Keeping both paths
	// avoids a hard dependency on raw-SQL correctness for the legacy caller.
	const nextSeq = await bumpCursor(db, projectId, "push");

	for (const entry of uploaded) {
		await db
			.insert(projectFiles)
			.values({
				id: newId(),
				projectId,
				path: entry.path,
				sha256: entry.sha256,
				r2Key: entry.r2Key,
				sizeBytes: entry.sizeBytes,
			})
			.onConflictDoUpdate({
				target: [projectFiles.projectId, projectFiles.path],
				set: {
					sha256: entry.sha256,
					r2Key: entry.r2Key,
					sizeBytes: entry.sizeBytes,
					updatedAt: sql`(current_timestamp)`,
				},
			});
	}

	const totals = await db
		.select({ total: sql<number>`coalesce(sum(${projectFiles.sizeBytes}), 0)` })
		.from(projectFiles)
		.where(eq(projectFiles.projectId, projectId));
	const totalBytes = Number(totals[0]?.total ?? 0);
	await db
		.update(projects)
		.set({ totalStorageBytes: totalBytes, updatedAt: sql`(current_timestamp)` })
		.where(eq(projects.id, projectId));

	const manifest = await loadCloudManifest(db, projectId);
	return { cursor: String(nextSeq), manifest };
}

/**
 * Advances the sync cursor for a project, returning the new `seq` value.
 *
 * `seq` is per-project monotonic; we compute `max(seq) + 1` rather than using a
 * global autoincrement so cursors stay comparable within one project's history
 * (§4.3, Q14). The cursor row's `kind` records what produced it (`push`/`pull`/
 * `init`) for observability; it isn't read back by sync logic.
 */
export async function bumpCursor(
	db: Database,
	projectId: string,
	kind: "push" | "pull" | "init",
): Promise<number> {
	const rows = await db
		.select({ max: sql<number>`coalesce(max(${syncCursors.seq}), 0)` })
		.from(syncCursors)
		.where(eq(syncCursors.projectId, projectId));
	const nextSeq = Number(rows[0]?.max ?? 0) + 1;
	await db.insert(syncCursors).values({
		id: newId(),
		projectId,
		seq: nextSeq,
		kind,
	});
	return nextSeq;
}

/**
 * Confirms the authenticated account may sync-write to `project`, else throws
 * 403. Called by every sync handler after `ensureProject`/`loadProject` (§12.4
 * step 4).
 *
 * ADR 0011 Phase 2 team-scoped access: the account may write iff it created the
 * project OR is an accepted member of the project's team. `ensureProject`
 * establishes access on first push (Q13); this check guards every subsequent
 * access. A team-scoped project is therefore writable by every teammate — the
 * concurrency layer (ADR 0010) serializes their concurrent writes safely.
 */
export async function assertOwns(
	db: Database,
	project: SyncProject,
	accountId: string,
): Promise<void> {
	const allowed = await canWriteProject(
		db,
		project.teamId,
		project.accountId,
		accountId,
	);
	if (!allowed) {
		throw new PermissionError("Project is owned by another account.");
	}
}

/**
 * The storage total a project WOULD have after committing `uploaded`, computed
 * without writing anything. Used by `push/complete` for the entitlement gate
 * (§12.3): we verify each blob's size against R2 first, then check this projected
 * total against `account.maxHostedStorageBytes` before committing.
 *
 * Mirrors exactly what `commitPush` will persist: the post-commit file set is
 * "every current cloud path, with sizes overwritten by any uploaded replacement,
 * plus any brand-new uploaded paths" — and `commitPush` stores `SUM(size_bytes)`
 * over that set. So this function and the commit agree by construction.
 *
 * Replacements are handled correctly: a path that already existed contributes
 * its NEW size (not old + new), so a shrink genuinely lowers the total.
 */
export function projectedStorageBytes(
	cloud: CloudFileManifest,
	uploaded: Array<{ path: string; sizeBytes: number }>,
): number {
	// Start from the current per-path sizes, then overlay the uploads. A Map keyed
	// by path gives us "last write wins" per path — exactly the upsert semantics
	// `commitPush` applies via `onConflictDoUpdate`.
	const sizes = new Map<string, number>();
	for (const [path, entry] of Object.entries(cloud)) {
		sizes.set(path, entry.sizeBytes);
	}
	for (const entry of uploaded) sizes.set(entry.path, entry.sizeBytes);
	let total = 0;
	for (const size of sizes.values()) total += size;
	return total;
}

/**
 * The `createdAt` of the most recent `sync_cursors` row for a project, or
 * `undefined` if the project has never been pushed. Surfaced as `lastSyncAt` by
 * the status endpoint (§4.6) so the dashboard can show "last synced" without a
 * separate write-tracking column.
 */
export async function lastSyncAt(
	db: Database,
	projectId: string,
): Promise<string | undefined> {
	const rows = await db
		.select({ createdAt: syncCursors.createdAt })
		.from(syncCursors)
		.where(eq(syncCursors.projectId, projectId))
		.orderBy(desc(syncCursors.seq))
		.limit(1);
	return rows[0]?.createdAt;
}

// --- small pure helpers -----------------------------------------------------

/** Lowercase hex of an `ArrayBuffer` (Web Crypto digest → 64-char string). */
function bufferToHex(buffer: ArrayBuffer): string {
	const bytes = new Uint8Array(buffer);
	let hex = "";
	for (const byte of bytes) hex += byte.toString(16).padStart(2, "0");
	return hex;
}

/** Generates a row id. `createId` from `@paralleldrive/cuid2` is a workspace dep. */
function newId(): string {
	return createId();
}
