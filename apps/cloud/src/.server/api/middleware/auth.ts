/**
 * Bearer-token authentication middleware.
 *
 * Authenticates `/v1/projects/:projectId/sync/*` requests (§12.4) against the
 * `api_keys` table: the raw `tm_…` key is salted-hashed to
 * `sha256(salt + ":" + rawKey)` and looked up. The cloud NEVER stores raw keys —
 * only the hash (`api_keys.key_hash`, ADR 0006). On a hit, the middleware loads
 * the owning account and stamps it on `c.var.account` so downstream handlers
 * resolve ownership + entitlements without re-querying.
 *
 * Validation chain (§12.4 "Validated for hash, revocation, ownership, scopes,
 * entitlements, rate limits"):
 *   1. **Present + well-formed** — `Authorization: Bearer tm_…`, else 401.
 *   2. **Hash lookup** — a row exists in `api_keys` with matching `key_hash`,
 *      else 401 (same error code as missing — never reveal key-vs-format).
 *   3. **Not revoked** — `revoked_at IS NULL`, else 401.
 *   4. **Ownership** — the key's account owns the `:projectId` in the path; this
 *      is enforced per-route in the sync handlers (P2.3) where the project is
 *      loaded, not here — the middleware authenticates the *account*, routes
 *      authorize the *project*. (Split keeps the middleware reusable across
 *      project-scoped and account-scoped routes.)
 *   5. **Scope** — v1 ships a single scope (`memory:sync`); every live key has
 *      it implicitly. No `scopes` column yet — the scope gate is a no-op until a
 *      second capability is added, at which point a `scopes` column lands. This
 *      is intentional pre-launch minimalism, not a missing feature.
 *   6. **Entitlements + rate limits** — entitlements (402) are enforced on the
 *      mutating push path (P2.4); rate limiting is a separate cross-cutting
 *      layer (Upstash Redis, deferred). Neither is an auth concern.
 *
 * The middleware is factory-built (`createAuthMiddleware(db, salt)`) so tests
 * can inject an in-memory DB + literal salt without Worker bindings; the route
 * layer constructs it once per request from `createDb(env)` + `env` salt.
 *
 * @see docs/architecture/cloud-sync-and-refactor.md §12.4 — auth contract.
 * @see apps/cloud/src/server/sha256.ts — `hashApiKey` (salted sha256, Web Crypto).
 */
import { and, eq, isNull } from "drizzle-orm";
import type { MiddlewareHandler } from "hono";
import { normalizeCaps } from "../../../lib/entitlements";
import type { Database } from "../../db";
import { accounts, apiKeys, type PlanTier } from "../../db/schema";
import { hashApiKey } from "../../utils";
import { AuthError } from "../errors";
import type { ApiEnv } from "../index";

/**
 * The authenticated account context stamped onto `c.var.account`. Handlers read
 * entitlements straight off this (`account.maxHostedStorageBytes`) for the 402
 * gate without a second DB round-trip. Mirrors the `accounts` row the key rolled
 * back to at auth time.
 */
export interface AuthAccount {
	id: string;
	plan: PlanTier;
	maxHostedStorageBytes: number;
	maxConnectors: number;
}

/**
 * Builds the bearer-auth middleware bound to a DB client + salt.
 *
 * Why a factory and not a plain `MiddlewareHandler` export: the DB client is
 * per-request (`createDb(env)`) and the salt comes from a Worker secret binding.
 * Factory injection keeps the middleware pure-function-of-its-deps — trivially
 * testable with a stub DB — and lets the sync router construct it with the
 * request's own `c.env` rather than a module-level singleton.
 *
 * The handler throws `AuthError` (→ 401 envelope) on every failure path, so the
 * global `onError` serializes it uniformly. It never throws a generic Error.
 */
export function createAuthMiddleware(
	db: Database,
	salt: string,
): MiddlewareHandler<ApiEnv> {
	return async (c, next) => {
		const account = await resolveAccount(
			db,
			salt,
			c.req.header("authorization"),
		);
		c.set("account", account);
		await next();
	};
}

/**
 * Resolves an authenticated account from a Bearer header, or throws `AuthError`.
 *
 * The pure core of authentication, pulled out of the middleware so the sync
 * router (which also needs `db` + `salt` from `c.env`) can call it directly
 * without re-creating a middleware closure per request. The middleware above is
 * now a thin wrapper that threads the Hono context into this function.
 *
 * Throws the SAME 401 on every failure path (missing / malformed / unknown /
 * revoked) so a caller cannot tell which check failed — reducing probing surface.
 */
export async function resolveAccount(
	db: Database,
	salt: string,
	authorization: string | undefined,
): Promise<AuthAccount> {
	const rawKey = extractBearer(authorization);
	if (!rawKey) {
		throw new AuthError("Missing or malformed Authorization header.");
	}

	const keyHash = await hashApiKey(rawKey, salt);
	// One indexed lookup: the hash is unique. Join to accounts so the owning
	// account's entitlements are loaded in the same round-trip — the hot path.
	const rows = await db
		.select({
			id: accounts.id,
			plan: accounts.plan,
			maxHostedStorageBytes: accounts.maxHostedStorageBytes,
			maxConnectors: accounts.maxConnectors,
		})
		.from(apiKeys)
		.innerJoin(accounts, eq(apiKeys.accountId, accounts.id))
		.where(and(eq(apiKeys.keyHash, keyHash), isNull(apiKeys.revokedAt)))
		.limit(1);

	const account = rows[0];
	if (!account) {
		// Same code + generic message as "missing header": never leak whether a
		// key is well-formed-but-unknown vs revoked vs absent. Reduces probing.
		throw new AuthError("Invalid or revoked API key.");
	}
	// Rehydrate the stored unlimited sentinel (Teams — a large finite integer)
	// back to Infinity so the 402 entitlement check
	// (`connectorsUsed < maxConnectors`) works.
	const caps = normalizeCaps(account);
	return {
		id: account.id,
		plan: account.plan,
		maxHostedStorageBytes: caps.maxHostedStorageBytes,
		maxConnectors: caps.maxConnectors,
	} satisfies AuthAccount;
}

/**
 * The live `tm_…` token from an `Authorization: Bearer …` header, or
 * `null` if the header is absent, not a Bearer scheme, or the token doesn't
 * match the published format. Does NOT verify the token against the DB — that's
 * the middleware's job after hashing; this is pure shape validation.
 *
 * Format (frozen in the client transport, `cloud-client/errors.ts` SECRET_PATTERNS):
 *   tm_[A-Za-z0-9._-]+
 */
const TOKEN_PATTERN = /^tm_[A-Za-z0-9._-]+$/;

export function extractBearer(header: string | undefined): string | null {
	if (!header) return null;
	// Case-insensitive scheme match, single space separator (RFC 7235). We don't
	// tolerate arbitrary whitespace variations — clients send a canonical header.
	const match = /^Bearer\s+(.+)$/i.exec(header);
	if (!match) return null;
	const token = match[1].trim();
	if (!TOKEN_PATTERN.test(token)) return null;
	return token;
}
