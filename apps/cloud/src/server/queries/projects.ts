/**
 * Project-scoped dashboard queries.
 *
 * Lists/loads the projects an account owns, with per-project aggregates (file
 * count, storage, last sync, cursor) and recent sync activity. These compose
 * the same `projects` / `project_files` / `sync_cursors` tables the sync path
 * writes to (`api/sync/shared.ts`), so the dashboard always reflects committed
 * state.
 *
 * Pure `(db, …)` functions — no Hono/Worker coupling — so they unit-test with
 * the in-memory `createTestDb()` harness.
 *
 * @see {@link ../../api/sync/shared} — `currentCursor` / `lastSyncAt` reused here.
 * @see docs/architecture/cloud-sync-and-refactor.md §4 — the sync tables.
 */
import { and, count, desc, eq, inArray } from "drizzle-orm";
import { currentCursor, lastSyncAt } from "../../api/sync/shared";
import type { Database } from "../../db/index.server";
import { projectFiles, projects, syncCursors } from "../../db/schema";
import type {
	CursorHistoryView,
	ProjectFileView,
	ProjectSummary,
	SyncActivity,
} from "./types";

/**
 * Lists every project owned by `accountId`, newest-updated first, each enriched
 * with its live file count, storage total, current cursor, and last-sync time.
 *
 * Done in two passes:
 *  1. One query for the projects + their denormalised `total_storage_bytes`
 *     (kept current by `commitPush`) — avoids a per-project storage join.
 *  2. One grouped query for file counts across all the account's projects at
 *     once, then merged in memory by id.
 * The cursor + last-sync are cheap per-project lookups; for an account with a
 * small project set (the common case) this is a handful of indexed queries.
 *
 * `lastSyncAt` is `null` when the project has never been pushed (no cursor rows).
 */
export async function listProjectsForAccount(
	db: Database,
	accountId: string,
): Promise<ProjectSummary[]> {
	const projectRows = await db
		.select({
			id: projects.id,
			name: projects.name,
			storageBytes: projects.totalStorageBytes,
			isDefault: projects.isDefault,
			updatedAt: projects.updatedAt,
		})
		.from(projects)
		.where(eq(projects.accountId, accountId))
		.orderBy(desc(projects.updatedAt));

	if (projectRows.length === 0) return [];

	// One grouped query for every project's file count, then index by id.
	const counts = await db
		.select({
			projectId: projectFiles.projectId,
			n: count(),
		})
		.from(projectFiles)
		.where(
			inArray(
				projectFiles.projectId,
				projectRows.map((p) => p.id),
			),
		)
		.groupBy(projectFiles.projectId);
	const countById = new Map(counts.map((c) => [c.projectId, c.n]));

	const summaries: ProjectSummary[] = [];
	for (const row of projectRows) {
		const cursor = await currentCursor(db, row.id);
		const lastAt = await lastSyncAt(db, row.id);
		summaries.push({
			id: row.id,
			name: row.name,
			storageBytes: row.storageBytes,
			fileCount: countById.get(row.id) ?? 0,
			lastSyncAt: lastAt ?? null,
			cursor,
			isDefault: row.isDefault,
		});
	}
	return summaries;
}

/**
 * Loads a single project owned by `accountId`, or `null` if it does not exist
 * or belongs to another account. The ownership filter is the guard: a project
 * id from the URL that isn't owned by the signed-in account resolves to `null`,
 * which the route renders as a 404 — never a cross-account leak.
 *
 * Aggregates file count + cursor + last-sync the same way `listProjectsForAccount`
 * does, just for one project.
 */
export async function getProjectForAccount(
	db: Database,
	accountId: string,
	projectId: string,
): Promise<ProjectSummary | null> {
	const rows = await db
		.select({
			id: projects.id,
			name: projects.name,
			storageBytes: projects.totalStorageBytes,
			isDefault: projects.isDefault,
		})
		.from(projects)
		.where(and(eq(projects.id, projectId), eq(projects.accountId, accountId)))
		.limit(1);
	const row = rows[0];
	if (!row) return null;

	const countRows = await db
		.select({ n: count() })
		.from(projectFiles)
		.where(eq(projectFiles.projectId, projectId));
	return {
		id: row.id,
		name: row.name,
		storageBytes: row.storageBytes,
		fileCount: countRows[0]?.n ?? 0,
		lastSyncAt: (await lastSyncAt(db, projectId)) ?? null,
		cursor: await currentCursor(db, projectId),
		isDefault: row.isDefault,
	};
}

/**
 * The most recent sync commits for a project, newest first — the "recent
 * activity" feed on the overview. Each row carries a `fileCount` snapshot: the
 * number of `project_files` rows at that commit's `seq` is not historically
 * tracked per cursor, so we report the *current* file count for each entry (a
 * stable, truthful approximation; exact per-commit counts are a later feature).
 *
 * @param limit  how many recent commits to return (default 3 — overview size).
 */
export async function recentSyncActivity(
	db: Database,
	projectId: string,
	limit = 3,
): Promise<SyncActivity[]> {
	const cursorRows = await db
		.select({
			id: syncCursors.id,
			seq: syncCursors.seq,
			createdAt: syncCursors.createdAt,
		})
		.from(syncCursors)
		.where(eq(syncCursors.projectId, projectId))
		.orderBy(desc(syncCursors.seq))
		.limit(limit);

	if (cursorRows.length === 0) return [];

	const countRows = await db
		.select({ n: count() })
		.from(projectFiles)
		.where(eq(projectFiles.projectId, projectId));
	const fileCount = countRows[0]?.n ?? 0;

	return cursorRows.map((c) => ({
		id: c.id,
		cursor: String(c.seq),
		fileCount,
		at: c.createdAt,
	}));
}

/**
 * The live file manifest for a project (the project-detail "File manifest" card).
 *
 * Returns every `project_files` row owned by `projectId`, path-sorted for a
 * stable read order. This is the read-only replica view (D1): the cloud holds
 * the path → sha256 index, not editable content. The `r2Key` is intentionally
 * dropped from the read model — it's an internal storage detail the dashboard
 * never needs.
 *
 * Ownership is the caller's responsibility: resolve the account first (the
 * project-detail loader does, via `getProjectForAccount`), then call this with
 * the now-known-owned project id.
 */
export async function listProjectFiles(
	db: Database,
	projectId: string,
): Promise<ProjectFileView[]> {
	const rows = await db
		.select({
			id: projectFiles.id,
			path: projectFiles.path,
			sha256: projectFiles.sha256,
			sizeBytes: projectFiles.sizeBytes,
			updatedAt: projectFiles.updatedAt,
		})
		.from(projectFiles)
		.where(eq(projectFiles.projectId, projectId))
		.orderBy(projectFiles.path);
	return rows;
}

/**
 * The full cursor history for a project (the project-detail "Cursor history"
 * card), newest first. Each committed push appends a `sync_cursors` row; unlike
 * `recentSyncActivity` (overview's last-3), this returns the whole history and
 * carries `kind` for observability. An empty result means the project has never
 * been pushed.
 */
export async function listProjectCursorHistory(
	db: Database,
	projectId: string,
): Promise<CursorHistoryView[]> {
	const rows = await db
		.select({
			id: syncCursors.id,
			seq: syncCursors.seq,
			kind: syncCursors.kind,
			createdAt: syncCursors.createdAt,
		})
		.from(syncCursors)
		.where(eq(syncCursors.projectId, projectId))
		.orderBy(desc(syncCursors.seq));
	return rows.map((r) => ({
		id: r.id,
		cursor: String(r.seq),
		kind: r.kind,
		createdAt: r.createdAt,
	}));
}

/**
 * Permanently deletes a project owned by `accountId` — its `project_files`
 * rows, `sync_cursors` history, and the `projects` row itself.
 *
 * Returns `true` if a project was deleted, `false` if it did not exist or
 * belonged to another account (the ownership filter is the guard, identical to
 * `getProjectForAccount`: a foreign project id resolves to "nothing deleted",
 * never a cross-account leak). The cascade is declarative — `project_files` and
 * `sync_cursors` both `ON DELETE CASCADE` from `projects` — so a single delete
 * of the `projects` row purges the dependents.
 *
 * Replica blob deletion (R2) is out of v1 scope: the content-addressed blobs
 * may be shared across projects (same sha256), so a safe GC pass — not a
 * per-delete sweep — reclaims them. This matches the sync layer's append/replace
 * model (see `commitPush` JSDoc).
 */
export async function deleteProject(
	db: Database,
	accountId: string,
	projectId: string,
): Promise<boolean> {
	const deleted = await db
		.delete(projects)
		.where(and(eq(projects.id, projectId), eq(projects.accountId, accountId)))
		.returning({ id: projects.id });
	return deleted.length > 0;
}
