import { useSearchParams } from "react-router";
import { safeRelativeRedirect } from "~/.server/redirect";

/**
 * Get the `redirect` or `next` query param as a validated same-origin path.
 *
 * The raw param is attacker-controlled via the URL and flows into the
 * `callbackURL` Better Auth redirects to after sign-in, so it MUST be coerced to
 * a same-origin path here (and again server-side) — otherwise an absolute URL
 * like `?redirect=https://evil.com` phishes the user off-site post-login
 * (VULN-001). `safeRelativeRedirect` rejects anything not starting with a single
 * `/`, falling back to `/dashboard`.
 *
 * @returns A safe same-origin redirect route (always defined; defaults to
 *   `/dashboard` when the param is missing or unsafe).
 */
export function useAuthRedirect(): string {
	const [params] = useSearchParams();
	return safeRelativeRedirect(
		params.get("redirect") ?? params.get("next") ?? undefined,
	);
}
