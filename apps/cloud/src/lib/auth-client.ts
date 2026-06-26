/**
 * Better Auth browser client — the client-side auth entry point.
 *
 * The login/signup forms use server `action`s (calling `auth.api.signInMagicLink`
 * directly) rather than this client, so they never make an extra HTTP hop and
 * Better Auth's session cookie is set entirely server-side. This client is kept
 * for the future client-side needs that the server actions can't cover — e.g.
 * an in-page session refresh or a sign-out button that calls
 * `authClient.signOut()` without a full navigation. OAuth (A2) will also lean
 * on it for the social sign-in flow.
 *
 * `baseURL` is omitted intentionally: Better Auth defaults to same-origin
 * (`/api/auth`), which is exactly where the Worker mounts it — so no env var or
 * origin mismatch can break auth in dev vs prod.
 *
 * @see {@link ../server/auth} — the server-side factory (mirrors this config).
 */
import { createAuthClient } from "better-auth/client";
import { magicLinkClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
	plugins: [magicLinkClient()],
});

/**
 * Type-narrowed magic-link sign-in for any client-side caller. Not used by the
 * forms today (they go through server actions), but exported for completeness.
 */
export const magicLink = authClient.signIn.magicLink;
