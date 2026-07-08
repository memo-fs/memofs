/**
 * API-key dashboard queries + the two safe mutations (create / revoke).
 *
 * The cloud never stores a raw key — only a salted sha256 lookup hash (ADR 0006).
 * `createApiKey` generates a `tm_…` token, hashes it, persists the hash +
 * a `lastFour` fingerprint, and returns the raw key ONCE to the caller (the route
 * action surfaces it in a one-time reveal dialog). `revokeApiKey` soft-deletes
 * by setting `revoked_at`.
 *
 * Both mutations are ownership-guarded (`accountId` scopes every write) so a
 * key id from the URL cannot touch another account's key.
 *
 * Pure `(db, …)` functions — no Hono/Worker coupling — unit-tested with the
 * in-memory `createTestDb()` harness. `salt` is threaded in (not read from env)
 * so tests inject a literal.
 *
 * @see {@link ../sha256} — `hashApiKey` (salted sha256, Web Crypto).
 * @see docs/adr/0006-pricing-and-entitlements.md — hashed-key entitlement model.
 */
import { and, desc, eq, isNull } from "drizzle-orm";

import { getDB } from "../db";
import { apiKeys } from "../db/schema";
import { hashApiKey } from "../utils";
import type { ApiKeyView } from "./types";

/** The live token prefix, matching the published format (see `middleware/auth`). */
const KEY_PREFIX = "mf_";

/** The number of random bytes (base64url-encoded) after the prefix. */
const KEY_RANDOM_BYTES = 32;

/**
 * Lists the API keys for an account, newest first. Includes both active and
 * revoked keys so the dashboard shows history; the UI greys out revoked rows.
 */
export async function listApiKeysForAccount(
	accountId: string,
): Promise<ApiKeyView[]> {
	const db = getDB();
	const rows = await db
		.select({
			id: apiKeys.id,
			label: apiKeys.label,
			lastFour: apiKeys.lastFour,
			createdAt: apiKeys.createdAt,
			revokedAt: apiKeys.revokedAt,
		})
		.from(apiKeys)
		.where(eq(apiKeys.accountId, accountId))
		.orderBy(desc(apiKeys.createdAt));
	return rows;
}

/** The shape returned by `createApiKey`: the one-time raw key + the stored row. */
export interface CreatedApiKey {
	/** The full `tm_…` token — shown once, never retrievable again. */
	rawKey: string;
	/** The persisted row (sans hash) for immediate list display. */
	row: ApiKeyView;
}

/**
 * Provisions a new API key for `accountId`.
 *
 * Generates a cryptographically random token (`tm_` + 32 base64url bytes),
 * stores ONLY its salted hash + the last-4 fingerprint, and returns the raw key
 * so the caller can surface it exactly once. The raw key is never persisted and
 * never recoverable — losing it means revoking and re-creating.
 *
 * @param salt  `MEMOFS_API_KEY_SALT` (injected, not read from env, for testing).
 */
export async function createApiKey({
	accountId,
	label,
	salt,
}: {
	accountId: string;
	label: string;
	salt: string;
}): Promise<CreatedApiKey> {
	const db = getDB();
	const rawKey = generateRawKey();
	const keyHash = await hashApiKey(rawKey, salt);
	const lastFour = rawKey.slice(-4);

	const [row] = await db
		.insert(apiKeys)
		.values({
			accountId,
			keyHash,
			label: label.trim() || null,
			lastFour,
			revokedAt: null,
		})
		.returning({ id: apiKeys.id, createdAt: apiKeys.createdAt });

	return {
		rawKey,
		row: {
			id: row.id,
			label: label.trim() || null,
			lastFour,
			createdAt: row.createdAt,
			revokedAt: null,
		},
	};
}

/**
 * Soft-revokes an API key (sets `revoked_at`). Ownership-guarded: a `keyId`
 * not owned by `accountId` is a no-op (returns 0) rather than an error, so the
 * UI can't distinguish "not yours" from "already gone" — reducing probing.
 * Revoking an already-revoked key is also a no-op.
 *
 * @returns the number of rows updated (0 = nothing matched/changed).
 */
export async function revokeApiKey(
	accountId: string,
	keyId: string,
): Promise<number> {
	const db = getDB();
	const now = new Date().toISOString();
	const result = await db
		.update(apiKeys)
		.set({ revokedAt: now })
		.where(
			and(
				eq(apiKeys.id, keyId),
				eq(apiKeys.accountId, accountId),
				isNull(apiKeys.revokedAt),
			),
		);
	return result.rowsAffected ?? 0;
}

/**
 * Generates a fresh `tm_<32 random base64url bytes>` token via Web Crypto.
 * Exported for tests that need to assert format without persisting.
 */
export function generateRawKey(): string {
	const bytes = new Uint8Array(KEY_RANDOM_BYTES);
	crypto.getRandomValues(bytes);
	return KEY_PREFIX + toBase64Url(bytes);
}

/** Base64url-encodes a byte array (URL-safe, no padding). */
function toBase64Url(bytes: Uint8Array): string {
	let binary = "";
	for (const b of bytes) binary += String.fromCharCode(b);
	return btoa(binary)
		.replace(/\+/g, "-")
		.replace(/\//g, "_")
		.replace(/=+$/, "");
}
