/**
 * Better Auth factory — passwordless (magic-link) authentication.
 *
 * Constructed per-request from the Worker `env` + a drizzle client, mirroring
 * {@link createDb}. Better Auth owns four tables (`user`, `session`, `account`,
 * `verification`); the drizzle adapter reads them via the singular const names
 * in {@link ../db/schema} (the adapter resolves models by name, so these four
 * deliberately keep singular names — see ADR 0002 / Q12 naming).
 *
 * The `databaseHooks.user.create.after` hook is the provisioning seam: the
 * instant Better Auth inserts a new `user` row, we FK-link a billing `accounts`
 * row + a default project so the dashboard lands on a real workspace (the
 * signup analogue of the sync auto-provision path, Q13).
 *
 * A1: magic-link. A2: OAuth social providers (GitHub/Google). Providers are
 * registered ONLY when both their client id + secret are bound — an
 * unconfigured provider in `socialProviders` would 404 the sign-in endpoint, so
 * omitting it (rather than passing `enabled: false`) keeps the UI button
 * honest: present when wired, absent when not. This mirrors the rate-limiter's
 * null-when-unset graceful-degradation pattern (`rate-limit.server.ts`).
 *
 * @see docs/adr/0002-*.md — connector/auth discipline.
 * @see docs/architecture/decisions.md Q13 — auto-provision paths.
 */

import { env } from "cloudflare:workers";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { magicLink } from "better-auth/plugins/magic-link";
import { getDB } from "./db";
import * as schema from "./db/schema";
import { sendMagicLinkMail } from "./email/resend";
import {
	isProviderConfigured,
	OAUTH_PROVIDER_IDS,
	type OAuthProviderId,
} from "./oauth-providers";
import { provisionAccount } from "./provision-account";

/**
 * Build the `socialProviders` map from env, including only providers whose
 * client id + secret are both set. Returns `undefined` when none are wired so
 * Better Auth skips social auth entirely (no dangling `/sign-in/social` route
 * that 404s). Provider availability is decided by the SSOT predicate in
 * `oauth-providers.server` (the same one the UI uses to render buttons), so the
 * auth side and the UI side can never disagree.
 */
function resolveSocialProviders() {
	const map: Partial<
		Record<OAuthProviderId, { clientId: string; clientSecret: string }>
	> = {};
	for (const provider of OAUTH_PROVIDER_IDS) {
		const credentials = providerCredentials(provider);
		if (credentials) map[provider] = credentials;
	}
	return Object.keys(map).length > 0 ? map : undefined;
}

/** Reads a provider's client id + secret from env, or `null` if either is unset. */
function providerCredentials(
	provider: OAuthProviderId,
): { clientId: string; clientSecret: string } | null {
	if (!isProviderConfigured(provider)) return null;
	switch (provider) {
		case "github":
			return {
				clientId: env.GITHUB_CLIENT_ID,
				clientSecret: env.GITHUB_CLIENT_SECRET,
			};
		case "google":
			return {
				clientId: env.GOOGLE_CLIENT_ID,
				clientSecret: env.GOOGLE_CLIENT_SECRET,
			};
	}
}

/**
 * Builds a Better Auth instance bound to `env` + `db`.
 *
 * @param env     per-request Worker env (provides secret, base URL).
 * @param db      per-request drizzle client (Turso/libSQL metadata store).
 * @param mailer  outbound magic-link transport (Plunk in prod; injected, not
 *                hard-coded, so this module stays transport-agnostic).
 * @returns the Better Auth {@link Auth} — `.handler` for Worker dispatch,
 *          `.api` for server-side calls (`getSession`, `signInMagicLink`, …).
 */
export function createAuth(waitUntil?: (promise: Promise<unknown>) => void) {
	const db = getDB();
	return betterAuth({
		baseURL: env.BETTER_AUTH_URL,
		secret: env.BETTER_AUTH_SECRET,
		basePath: "/api/auth",
		database: drizzleAdapter(db, { provider: "sqlite", schema }),
		emailAndPassword: { enabled: false },
		socialProviders: resolveSocialProviders(),
		plugins: [
			magicLink({
				sendMagicLink: async ({ email, url, _token }) => {
					await sendMagicLinkMail({ email, url });
				},
			}),
		],
		databaseHooks: {
			user: {
				create: {
					// Provisioning is fire-and-forget-tolerant: provisionAccount is
					// idempotent, so a retried signup never double-creates. A failure
					// here is non-fatal to auth (the session is already issued) — the
					// user simply lands on an empty workspace until the next sync.
					after: async (created) => {
						const promise = provisionAccount(created.id);
						if (waitUntil) {
							waitUntil(promise);
						} else {
							await promise;
						}
					},
				},
			},
		},
	});
}

/** The Better Auth instance type, for consumers (`session.server.ts`, dispatch). */
export type Auth = ReturnType<typeof createAuth>;
