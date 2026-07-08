import { getSessionUser, safeRedirect } from "~/.server/session";
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
export async function loader({ request }: Route.LoaderArgs) {
	throw safeRedirect((await getSessionUser(request)) ? "/dashboard" : "/login");
}
