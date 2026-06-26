import { redirect } from "react-router";
import { getEnv } from "~/server/context.server";
import { getSessionUser } from "~/server/session.server";
import type { Route } from "./+types/verify";

/**
 * Magic-link landing (SC4.1).
 *
 * Better Auth owns the actual token exchange at `/api/auth/magic-link/verify`
 * (the email link points there directly, server-side). This route is a thin
 * guard for the rare case a user lands at `/verify` without going through that
 * endpoint: authenticated users are bounced to the dashboard, everyone else to
 * login. It renders nothing of its own.
 */
export async function loader({ request, context }: Route.LoaderArgs) {
	const user = await getSessionUser(request, getEnv(context));
	throw redirect(user ? "/dashboard" : "/login");
}
