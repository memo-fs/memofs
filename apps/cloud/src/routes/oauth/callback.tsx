import { redirect } from "react-router";
import { getEnv } from "~/server/context.server";
import { getSessionUser } from "~/server/session.server";
import type { Route } from "./+types/callback";

export function meta() {
	return [{ title: "Completing Sign-in — TekMemo Cloud" }];
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
	context,
}: Route.LoaderArgs): Promise<Response> {
	const user = await getSessionUser(request, getEnv(context));
	throw redirect(user ? "/dashboard" : "/login");
}
