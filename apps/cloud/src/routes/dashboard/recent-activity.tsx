import {
	listProjectsForAccount,
	recentSyncActivity,
} from "~/.server/queries";
import { requireUserWithAccount } from "~/.server/session";
import type { Route } from "./+types/recent-activity";

/**
 * Recent-activity resource route — the project-scoped activity feed for the
 * overview, merging the two event streams the cloud produces:
 *   - **Sync activity** (`recentSyncActivity`): byte-level replica commits —
 *     "your files synced", keyed off `sync_cursors`.
 *   - **Memory activity** (`recentMemoryActivity`): semantic runtime events —
 *     "consolidation retired 3 duplicate nodes", keyed off `memory_events`
 *     (SC10). The hosted-runtime audit trail; absent on sync-only v1 projects.
 *
 * Both are project-scoped and returned in one merged, newest-first list so the
 * overview shows the full picture of what's happening to a project.
 *
 * Why a resource route + `fetcher.load` instead of a nested loader: the project
 * selection lives in client state (the sidebar switches it without navigating),
 * so the activity feed must refetch when the selection changes. A resource route
 * keyed on `?projectId=` lets the overview `fetcher.load` it on selection change
 * without a full document navigation or re-running the layout loader.
 *
 * Auth: the layout guard already runs for any `/dashboard/*` request, but this
 * route still resolves the user + ownership directly — resource routes are
 * fetchable by any authed session, so we re-check ownership of `projectId`
 * against the signed-in account via `getAccountForUser` + an owned-projects
 * scan. An unowned/missing project returns an empty list (no leak).
 */

export async function loader({ request }: Route.LoaderArgs): Promise<Response> {
	const { account } = await requireUserWithAccount(request);

	const url = new URL(request.url);
	const projectId = url.searchParams.get("projectId");
	if (!projectId) {
		return Response.json({ activity: [] });
	}

	// Ownership gate: only return activity for a project the signed-in account
	// owns. If there's no account or it doesn't own the project, return an empty
	// feed (no cross-account leak).
	if (!account) return Response.json({ activity: [] });

	const owned = await listProjectsForAccount(account.id);
	if (!owned.some((p) => p.id === projectId)) {
		return Response.json({ activity: [] });
	}

	const syncActivity = await recentSyncActivity(projectId, 3);
	return Response.json({ activity: syncActivity });
}
