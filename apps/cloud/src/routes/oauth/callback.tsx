import { redirect } from "react-router";
import { getSessionUser } from "~/.server/session";
import type { Route } from "./+types/callback";
import { buildNoindexMeta } from "~/lib/seo";

export function meta() {
	return buildNoindexMeta("Completing Sign-in — Memo FS Cloud");
}

/**
 * OAuth callback route guard.
 *
 * Better Auth owns the actual OAuth token exchange at `/api/auth/callback/*`
 * (the provider redirects there directly, server-side). This route is a thin
 * guard for the rare case a user lands at `/oauth/callback` outside that flow:
 * authenticated users are bounced to the dashboard, everyone else to login. It
 * renders nothing of its own. The provider buttons land in A2.
 */
export async function loader({
	request,
}: Route.LoaderArgs): Promise<Response> {
	const user = await getSessionUser(request);
	throw redirect(user ? "/dashboard" : "/login");
}
