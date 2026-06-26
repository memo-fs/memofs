/**
 * Dashboard query-layer barrel.
 *
 * Single import surface for dashboard loaders/actions:
 *   `import { listProjectsForAccount, createApiKey } from "~/server/queries";`
 *
 * Re-exports the pure `(db, …)` query + mutation functions and their read-model
 * types. Everything here is Hono/Worker-agnostic and unit-tested with the
 * in-memory `createTestDb()` harness.
 */

export type { AccountView } from "./account";
export {
	getAccountForUser,
	getAccountUsage,
} from "./account";
export type { CreatedApiKey } from "./api-keys";
export {
	createApiKey,
	generateRawKey,
	listApiKeysForAccount,
	revokeApiKey,
} from "./api-keys";
export {
	deleteProject,
	getProjectForAccount,
	listProjectCursorHistory,
	listProjectFiles,
	listProjectsForAccount,
	recentSyncActivity,
} from "./projects";
export type {
	ApiKeyView,
	CursorHistoryView,
	ProjectFileView,
	ProjectSummary,
	SyncActivity,
} from "./types";
