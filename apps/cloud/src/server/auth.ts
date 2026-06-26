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

import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { magicLink } from "better-auth/plugins/magic-link";

import type { Database } from "../db/index.server";
import * as schema from "../db/schema";
import type { CloudWorkerEnv } from "./env";
import {
	isProviderConfigured,
	OAUTH_PROVIDER_IDS,
	type OAuthProviderId,
} from "./oauth-providers.server";
import { provisionAccount } from "./provision-account";

/**
 * Build the `socialProviders` map from env, including only providers whose
 * client id + secret are both set. Returns `undefined` when none are wired so
 * Better Auth skips social auth entirely (no dangling `/sign-in/social` route
 * that 404s). Provider availability is decided by the SSOT predicate in
 * `oauth-providers.server` (the same one the UI uses to render buttons), so the
 * auth side and the UI side can never disagree.
 */
function resolveSocialProviders(env: CloudWorkerEnv) {
	const map: Partial<
		Record<OAuthProviderId, { clientId: string; clientSecret: string }>
	> = {};
	for (const provider of OAUTH_PROVIDER_IDS) {
		const credentials = providerCredentials(env, provider);
		if (credentials) map[provider] = credentials;
	}
	return Object.keys(map).length > 0 ? map : undefined;
}

/** Reads a provider's client id + secret from env, or `null` if either is unset. */
function providerCredentials(
	env: CloudWorkerEnv,
	provider: OAuthProviderId,
): { clientId: string; clientSecret: string } | null {
	if (!isProviderConfigured(env, provider)) return null;
	// `isProviderConfigured` guarantees both are truthy; the `?? ""` only appeases TS.
	switch (provider) {
		case "github":
			return {
				clientId: env.GITHUB_CLIENT_ID ?? "",
				clientSecret: env.GITHUB_CLIENT_SECRET ?? "",
			};
		case "google":
			return {
				clientId: env.GOOGLE_CLIENT_ID ?? "",
				clientSecret: env.GOOGLE_CLIENT_SECRET ?? "",
			};
	}
}

/**
 * Outbound email transport — a single seam so the auth factory has no direct
 * dependency on Plunk. `sendMagicLinkEmail` is injected by the caller (A1.5
 * wires the real Plunk transport; tests inject a no-op). Keeping this an
 * interface means `auth.ts` typechecks before the transport exists and stays
 * swappable (e.g. a local SMTP dev transport) without touching this file.
 */
export interface MagicLinkMailer {
	/** Delivers the magic-link sign-in URL to `email`. MUST NOT throw on the hot path. */
	sendMagicLink(data: {
		email: string;
		url: string;
		token: string;
	}): Promise<void>;
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
export function createAuth(
	env: CloudWorkerEnv,
	db: Database,
	mailer: MagicLinkMailer,
) {
	return betterAuth({
		baseURL: env.BETTER_AUTH_URL,
		secret: env.BETTER_AUTH_SECRET,
		// Better Auth default; explicit so the Worker dispatch branch in A1.7
		// has a single source of truth for the mount path.
		basePath: "/api/auth",
		database: drizzleAdapter(db, { provider: "sqlite", schema }),
		// Passwordless only (SC4.1). Email/password stays disabled even though
		// Better Auth supports it — we never want a credential column populated.
		emailAndPassword: { enabled: false },
		// OAuth (A2): only providers with both creds bound are registered, so the
		// absent ones don't expose a sign-in route that 404s. `undefined` when none
		// are configured → social auth disabled entirely (local dev).
		socialProviders: resolveSocialProviders(env),
		plugins: [
			magicLink({
				// Better Auth calls this after minting the token; we hand off to the
				// injected transport. Errors here surface to the caller as a 500,
				// which is correct — a silently undelivered link is worse than a
				// retryable failure.
				sendMagicLink: async ({ email, url, token }) => {
					await mailer.sendMagicLink({ email, url, token });
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
						await provisionAccount(db, created.id);
					},
				},
			},
		},
	});
}

/** The Better Auth instance type, for consumers (`session.server.ts`, dispatch). */
export type Auth = ReturnType<typeof createAuth>;
