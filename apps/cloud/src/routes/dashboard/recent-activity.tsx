import { getEnv } from "~/server/context.server";
import { listProjectsForAccount, recentSyncActivity } from "~/server/queries";
import { requireUserWithAccount } from "~/server/session.server";
import type { Route } from "./+types/recent-activity";

/**
 * Recent-activity resource route — the "last N sync cursors" feed for the
 * overview, project-scoped.
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

export async function loader({
	request,
	context,
}: Route.LoaderArgs): Promise<Response> {
	const { db, account } = await requireUserWithAccount(
		request,
		getEnv(context),
	);

	const url = new URL(request.url);
	const projectId = url.searchParams.get("projectId");
	if (!projectId) {
		return Response.json({ activity: [] });
	}

	// Ownership gate: only return activity for a project the signed-in account
	// owns. If there's no account or it doesn't own the project, return an empty
	// feed (no cross-account leak).
	if (!account) return Response.json({ activity: [] });

	const owned = await listProjectsForAccount(db, account.id);
	if (!owned.some((p) => p.id === projectId)) {
		return Response.json({ activity: [] });
	}

	const activity = await recentSyncActivity(db, projectId, 3);
	return Response.json({ activity });
}
