/**
 * Server-side session resolution for the dashboard.
 *
 * Thin seam over Better Auth's `api.getSession`: given the React Router loader
 * context, construct the per-request auth instance and read the session cookie.
 * Returns the authenticated user (plus their billing account) or `null`, and a
 * `requireUser` variant that redirects to `/login` when unauthenticated — the
 * two ergonomics dashboard loaders need.
 *
 * Per-request construction mirrors {@link createDb}: the auth instance is built
 * from `context.cloudflare.env` + a fresh drizzle client each request, then the
 * mailer is injected. Nothing here is module-level state.
 *
 * @see {@link ./auth} — the factory this calls.
 * @see {@link ./email} — the mailer injected into the factory.
 */

import { env } from "cloudflare:workers";
import { redirect } from "react-router";
import { createAuth } from "./auth";
import type { Database } from "./db";
import { getDB } from "./db";
import type { PlanTier } from "./db/schema";
import { type AccountView, getAccountForUser } from "./queries/account";

// Re-export the open-redirect guard for legacy `~/server/session.server` imports.
// The SSOT now lives in `./redirect` so client code (which cannot import a
// `.server` module) can use it too. New code should import from `./redirect`
// directly.
export {
	SAFE_REDIRECT_DEFAULT,
	safeRedirect,
	safeRelativeRedirect,
} from "./redirect";

/** Dashboard-facing user identity: the Better Auth user + their billing account. */
export interface SessionUser {
	id: string;
	email: string;
	name: string;
	image: string | null;
	emailVerified: boolean;
	/** Billing account (FK-linked per Q decision); null only if provisioning failed. */
	accountId: string | null;
	plan: PlanTier | null;
}

/**
 * Builds a Better Auth instance bound to `env` + `db` with the mailer wired in.
 *
 * The single source of truth for auth-instance construction: the same
 * `createAuth(env, db, createMagicLinkMailer(env))` sequence every dashboard
 * route + the magic-link/OAuth actions need. Routing it through here means the
 * mailer seam is wired in one place, and callers (loaders, actions, session
 * resolution) all share an identical instance — no per-route hand-wiring that
 * can drift (e.g. forget the mailer, or wire a dev transport in prod).
 *
 * @param env per-request Worker env (secret, base URL, mailer creds).
 * @param db  per-request drizzle client.
 * @returns the Better Auth {@link Auth} — `.handler` for dispatch, `.api` for
 *          server-side calls (`getSession`, `signInMagicLink`, …).
 */
export function createAuthFromEnv(
	waitUntil?: (promise: Promise<unknown>) => void,
) {
	return createAuth(waitUntil);
}

/**
 * Resolves the signed-in user (plus billing account) from the request, or
 * `null` when unauthenticated. Safe to call on any loader/action — it never
 * throws on a missing/expired session, only on genuine DB errors.
 *
 * @param request the incoming request (carries the session cookie).
 * @param env     per-request Worker env.
 */
export async function getSessionUser(
	request: Request,
): Promise<SessionUser | null> {
	const auth = createAuthFromEnv();

	// Better Auth validates the session cookie from the request headers and
	// returns `{ session, user }`, or `null` when there is no valid session.
	const result = await auth.api.getSession({ headers: request.headers });
	if (!result) return null;
	const { user } = result;

	// One join to attach the billing identity (Q decision: separate, FK-linked).
	// Left join semantics — an account may be missing if provisioning raced, so
	// we degrade gracefully rather than blocking the user out of their dashboard.
	const account = await resolveAccount(user.id);

	return {
		id: user.id,
		email: user.email,
		name: user.name,
		image: user.image ?? null,
		emailVerified: user.emailVerified,
		accountId: account?.id ?? null,
		plan: account?.plan ?? null,
	};
}

/**
 * Resolves the signed-in user or throws a redirect to `/login`. Use in loaders
 * that require authentication; `getSessionUser` is the non-throwing variant.
 *
 * The redirect carries the current path as `?redirect=` so login can bounce
 * back. React Router loaders signal redirects by throwing `redirect(...)`.
 *
 * @param request the incoming request.
 * @param env     per-request Worker env.
 */
export async function requireUser(request: Request): Promise<SessionUser> {
	const user = await getSessionUser(request);
	if (user) {
		return user;
	}
	const { pathname, search } = new URL(request.url);
	const params = new URLSearchParams({
		redirect: `${pathname}${search}`,
	});
	throw redirect(`/login?${params.toString()}`);
}

/**
 * The bundle a dashboard loader/action needs in one call: the authenticated
 * user, the per-request drizzle client, and their billing account (or null).
 *
 * This is the DRY seam for every dashboard route, which previously hand-repeated
 * `requireUser` → `createDb` → `getAccountForUser` (≈16 sites) AND built a second
 * `createDb` inside `requireUser`'s `getSessionUser`. Routing through here means
 * a single `createDb` per request and one ownership-resolution path. `requireUser`
 * is still the right call when only the identity (not the account) is needed.
 *
 * Throws a redirect to `/login` when unauthenticated (via {@link requireUser}).
 *
 * @param request the incoming request.
 * @param env     per-request Worker env.
 */
export async function requireUserWithAccount(request: Request): Promise<{
	user: SessionUser;
	account: AccountView | null;
}> {
	const auth = createAuthFromEnv();
	const result = await auth.api.getSession({ headers: request.headers });
	if (!result) {
		const { pathname, search } = new URL(request.url);

		const params = new URLSearchParams({
			redirect: `${pathname}${search}`,
		});
		throw redirect(`/login?${params.toString()}`);
	}

	const { user } = result;
	const account = await getAccountForUser(getDB(), user.id);

	return {
		user: {
			id: user.id,
			email: user.email,
			name: user.name,
			image: user.image ?? null,
			emailVerified: user.emailVerified,
			accountId: account?.id ?? null,
			plan: account?.plan ?? null,
		},
		account,
	};
}

/**
 * Looks up the billing account for `userId`, or `null` if none exists yet.
 *
 * Delegates to the SSOT query (`getAccountForUser`) — the same lookup the
 * dashboard layout + 8 routes use — so the `accounts.userId` join lives in one
 * place. Returns only the session-relevant slice (`id`, `plan`).
 */
async function resolveAccount(
	userId: string,
): Promise<{ id: string; plan: PlanTier } | null> {
	const account = await getAccountForUser(getDB(), userId);
	if (!account) return null;
	return { id: account.id, plan: account.plan };
}
