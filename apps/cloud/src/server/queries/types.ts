/**
 * Shared read-model types for the dashboard query layer (SSOT).
 *
 * These are the shapes the dashboard routes consume — NOT the raw Drizzle row
 * shapes. A query function reads from the DB (possibly across joins/aggregations)
 * and returns one of these plain structs so the UI is insulated from the table
 * layout. Import these here — they are the SSOT for the dashboard read models.
 *
 * Conventions:
 * - Timestamps are ISO strings (`text` columns already store ISO; `integer`
 *   timestamp columns are serialized to ISO at the query boundary).
 * - Nullable-but-commonly-present fields use `string | null`, not `undefined`,
 *   so they survive JSON over the wire (loader data → client) losslessly.
 */

/**
 * A project row shaped for the dashboard list/detail views.
 *
 * `fileCount` is the number of live `project_files` rows; `lastSyncAt` is the
 * most recent `sync_cursors.createdAt` (undefined when the project has never
 * been pushed); `cursor` is the current `sync_cursors.seq` as a string.
 */
export interface ProjectSummary {
	id: string;
	name: string;
	/** Sum of `project_files.size_bytes` — mirrors `projects.total_storage_bytes`. */
	storageBytes: number;
	/** Live count of `project_files` rows for this project. */
	fileCount: number;
	/** ISO timestamp of the most recent push, or `null` if never pushed. */
	lastSyncAt: string | null;
	/** The current cursor (`String(max seq)`), or `"0"` if never pushed. */
	cursor: string;
	/** Whether this is the account's single auto-provisioned default project. */
	isDefault: boolean;
}

/**
 * An API key row shaped for the dashboard list view.
 *
 * The raw key is NEVER returned here — it is shown once at creation and then
 * only the `lastFour` fingerprint is available. `revokedAt` is `null` for an
 * active key. There is no `lastSeen` field yet (tracking is deferred).
 */
export interface ApiKeyView {
	id: string;
	label: string | null;
	/** Last 4 chars of the raw key, for recognition without the key itself. */
	lastFour: string | null;
	/** ISO timestamp of provisioning. */
	createdAt: string;
	/** ISO timestamp of soft-delete, or `null` for an active key. */
	revokedAt: string | null;
}

/**
 * A `sync_cursors` row surfaced as "recent activity" on the overview.
 */
export interface SyncActivity {
	id: string;
	/** The cursor value at this commit point. */
	cursor: string;
	/** Number of files in the manifest at commit time — see `recentSyncActivity`. */
	fileCount: number;
	/** ISO timestamp of the commit. */
	at: string;
}

/**
 * One live `project_files` row, shaped for the project-detail manifest table.
 *
 * This is the read-only replica view (D1): the cloud holds the index mapping a
 * canonical `.tekmemo/` path to its content-addressed blob. `r2Key` is NOT
 * surfaced to the dashboard — it's an internal storage detail; callers that
 * need it (sync) read from the sync layer directly.
 */
export interface ProjectFileView {
	id: string;
	/** Canonical `.tekmemo/` path, e.g. `.tekmemo/memory/core.md`. */
	path: string;
	/** sha256 hex digest — the identity/version primitive. */
	sha256: string;
	/** Content size in bytes. */
	sizeBytes: number;
	/** ISO timestamp of the last commit to this path. */
	updatedAt: string;
}

/**
 * One `sync_cursors` history row, shaped for the project-detail cursor list.
 * Each committed push appends a row; the detail view shows the history.
 */
export interface CursorHistoryView {
	id: string;
	/** The cursor value (`String(seq)`) at this commit point. */
	cursor: string;
	/** What produced the cursor — observability only, not read by sync logic. */
	kind: "push" | "pull" | "init";
	/** ISO timestamp of the commit. */
	createdAt: string;
}
