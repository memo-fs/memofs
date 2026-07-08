import { StatusCodes } from "http-status-codes";
import { redirect } from "react-router";
import {
	enabledOAuthProviders,
	OAUTH_PROVIDER_IDS,
	type OAuthProviderId,
} from "~/.server/oauth-providers";
import { createAuthFromEnv, safeRelativeRedirect } from "~/.server/session";
import { invariantResponse } from "~/utils/misc";
import type { Route } from "./+types/start.$provider";

/**
 * Kick off an OAuth sign-in (SC4.1, A2).
 *
 * Better Auth's `/sign-in/social` is POST and returns `{ url, redirect }` — the
 * provider authorize URL. Rather than a client POST + JS redirect, this loader
 * calls it server-side and issues a real 302, so the button is a plain `<a>`
 * (no fetcher, no JS dependency, works without the client bundle). The OAuth
 * handshake then lands at `/api/auth/callback/<provider>` (Better Auth-owned,
 * dispatched in A1.7), which sets the session and redirects to `callbackURL`.
 *
 * Mirrors the loader-only guard style of {@link ../oauth/callback}.
 */
export async function loader({
	request,
	params,
}: Route.LoaderArgs): Promise<Response> {
	const provider = String(params.provider);

	// 404-shaped guard against an unknown provider id. The canonical id list
	// (`OAUTH_PROVIDER_IDS`) is the SSOT — no hand-maintained local set.
	invariantResponse(
		OAUTH_PROVIDER_IDS.includes(provider as OAuthProviderId),
		"Unknown OAuth provider",
		{ status: StatusCodes.NOT_FOUND },
	);
	// A known-but-unconfigured provider also 404s — `enabledOAuthProviders` is
	// the same predicate `createAuth` uses, so the two never disagree.
	invariantResponse(
		enabledOAuthProviders().includes(provider as OAuthProviderId),
		"OAuth provider not configured",
		{ status: StatusCodes.NOT_FOUND },
	);

	// Where to land after the Better Auth callback completes the session.
	const url = new URL(request.url);
	const callbackURL = safeRelativeRedirect(url.searchParams.get("callbackURL"));

	const auth = createAuthFromEnv();

	const result = await auth.api.signInSocial({
		body: { provider, callbackURL },
		// `disableRedirect: false` → Better Auth returns the authorize URL; we
		// perform the redirect ourselves so it's a top-level navigation.
		headers: request.headers,
	});

	if (result.url !== undefined) {
		throw redirect(result.url);
	}
	// No URL means something unexpected (the idToken branch, which we never
	// send). Fall back to login rather than rendering a blank route.
	throw redirect("/login");
}

export default function OAuthStart() {
	// Loader always throws (redirect/404); this never renders. Kept so React
	// Router treats it as a routable component-bearing file.
	return null;
}
