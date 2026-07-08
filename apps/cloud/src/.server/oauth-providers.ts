/**
 * OAuth provider availability — single source of truth for which social
 * providers are configured (SC4.1, A2).
 *
 * The provider id list lives in ONE place ({@link OAUTH_PROVIDER_IDS}); from it
 * we derive the `OAuthProviderId` type AND the "is this provider configured for
 * `env`?" predicate. `auth.ts` and the UI both read from here, so a provider
 * shows its button iff `createAuth` will accept it — no dead buttons, and adding
 * a provider touches one file.
 *
 * @see {@link ./auth} `resolveSocialProviders` — consumes this same list.
 */

import { env } from "cloudflare:workers";
/**
 * The set of OAuth provider ids Better Auth accepts in `/sign-in/social`.
 * Canonical list — every other reference to the provider ids derives from here.
 */
export const OAUTH_PROVIDER_IDS = ["github", "google"] as const;

/** The provider ids Better Auth expects in `/sign-in/social` body. */
export type OAuthProviderId = (typeof OAUTH_PROVIDER_IDS)[number];

/** True when `env` has both the client id + secret bound for `provider`. */
export function isProviderConfigured(provider: OAuthProviderId): boolean {
	switch (provider) {
		case "github":
			return Boolean(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET);
		case "google":
			return Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);
	}
}

/** Which providers are wired (creds both present) for this env, in UI order. */
export function enabledOAuthProviders(): OAuthProviderId[] {
	return OAUTH_PROVIDER_IDS.filter((p) => isProviderConfigured(p));
}
