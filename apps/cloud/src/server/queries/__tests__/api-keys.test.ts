import { and, eq, isNull } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { Database } from "../../../db/index.server";
import { accounts, apiKeys } from "../../../db/schema";
import { createTestDb } from "../../../test-utils/db";
import { hashApiKey } from "../../sha256";
import {
	createApiKey,
	generateRawKey,
	listApiKeysForAccount,
	revokeApiKey,
} from "../api-keys";

/**
 * API-key query-layer tests.
 *
 * Covers the three dashboard operations against the real in-memory DB:
 *   - `listApiKeysForAccount` — ordering (newest first), account isolation, and
 *     that revoked keys are still returned (the dashboard shows history).
 *   - `createApiKey` — the raw key is `tm_`-prefixed, the hash is what's stored
 *     (never the raw key), the returned `lastFour` matches the key tail, and the
 *     returned `rawKey` actually authenticates against the stored hash.
 *   - `revokeApiKey` — ownership guard (a foreign account revoking is a no-op),
 *     idempotency (revoking an already-revoked key is a no-op), and it sets
 *     `revoked_at` on the owned key.
 */

const SALT = "test-salt";
const ACCT_A = "acct_a";
const ACCT_B = "acct_b";

let db: Database;

beforeEach(async () => {
	db = await createTestDb();
	// `accounts.id` now auto-generates, but tests assert against stable ids, so we
	// pass them explicitly (explicit ids still win over `$defaultFn`).
	await db.insert(accounts).values([{ id: ACCT_A }, { id: ACCT_B }]);
});

afterEach(async () => {
	// biome-ignore lint/suspicious/noExplicitAny: drizzle's client accessor is untyped
	(await (db as any).$client.close?.()) ?? undefined;
});

describe("listApiKeysForAccount", () => {
	it("returns keys for the account, newest first", async () => {
		const older = await createApiKey(db, {
			accountId: ACCT_A,
			label: "ci",
			salt: SALT,
		});
		// libSQL `created_at` defaults to `current_timestamp` at second resolution;
		// bump the wall clock for the second key so ordering is deterministic.
		await new Promise((r) => setTimeout(r, 1100));
		const newer = await createApiKey(db, {
			accountId: ACCT_A,
			label: "laptop",
			salt: SALT,
		});

		const rows = await listApiKeysForAccount(db, ACCT_A);
		expect(rows).toHaveLength(2);
		expect(rows[0].id).toBe(newer.row.id);
		expect(rows[1].id).toBe(older.row.id);
	});

	it("includes revoked keys (dashboard shows history)", async () => {
		const { row } = await createApiKey(db, {
			accountId: ACCT_A,
			label: "to-revoke",
			salt: SALT,
		});
		await revokeApiKey(db, ACCT_A, row.id);

		const rows = await listApiKeysForAccount(db, ACCT_A);
		expect(rows).toHaveLength(1);
		expect(rows[0].revokedAt).not.toBeNull();
	});

	it("isolates keys by account — one account never sees another's", async () => {
		await createApiKey(db, { accountId: ACCT_A, label: "a", salt: SALT });
		await createApiKey(db, { accountId: ACCT_B, label: "b", salt: SALT });

		expect(await listApiKeysForAccount(db, ACCT_A)).toHaveLength(1);
		expect(await listApiKeysForAccount(db, ACCT_B)).toHaveLength(1);
	});

	it("returns an empty array for an account with no keys", async () => {
		expect(await listApiKeysForAccount(db, ACCT_A)).toEqual([]);
	});
});

describe("createApiKey", () => {
	it("generates a tm_-prefixed raw key", async () => {
		const { rawKey } = await createApiKey(db, {
			accountId: ACCT_A,
			label: "laptop",
			salt: SALT,
		});
		expect(rawKey).toMatch(/^tm_[A-Za-z0-9._-]+$/);
	});

	it("stores only the salted hash — the raw key is never persisted", async () => {
		const { rawKey, row } = await createApiKey(db, {
			accountId: ACCT_A,
			label: "laptop",
			salt: SALT,
		});
		const stored = await db
			.select({ keyHash: apiKeys.keyHash, lastFour: apiKeys.lastFour })
			.from(apiKeys)
			.where(eq(apiKeys.id, row.id))
			.limit(1);
		expect(stored[0].keyHash).toBe(await hashApiKey(rawKey, SALT));
		// The raw key must not appear anywhere in the table.
		expect(stored[0].keyHash).not.toContain(rawKey);
		expect(stored[0].lastFour).not.toContain(rawKey);
	});

	it("returns a lastFour that matches the last 4 chars of the raw key", async () => {
		const { rawKey, row } = await createApiKey(db, {
			accountId: ACCT_A,
			label: "laptop",
			salt: SALT,
		});
		expect(row.lastFour).toBe(rawKey.slice(-4));
	});

	it("the raw key authenticates against the stored hash (round-trip)", async () => {
		const { rawKey } = await createApiKey(db, {
			accountId: ACCT_A,
			label: "laptop",
			salt: SALT,
		});
		const keyHash = await hashApiKey(rawKey, SALT);
		const hit = await db
			.select({ id: apiKeys.id })
			.from(apiKeys)
			.where(and(eq(apiKeys.keyHash, keyHash), isNull(apiKeys.revokedAt)))
			.limit(1);
		expect(hit).toHaveLength(1);
	});

	it("persists the label and nulls out a whitespace-only label", async () => {
		const labeled = await createApiKey(db, {
			accountId: ACCT_A,
			label: "ci",
			salt: SALT,
		});
		const blank = await createApiKey(db, {
			accountId: ACCT_A,
			label: "   ",
			salt: SALT,
		});
		expect(labeled.row.label).toBe("ci");
		expect(blank.row.label).toBeNull();
	});
});

describe("revokeApiKey", () => {
	it("soft-revokes an owned key and returns rowsAffected = 1", async () => {
		const { row } = await createApiKey(db, {
			accountId: ACCT_A,
			label: "laptop",
			salt: SALT,
		});
		const affected = await revokeApiKey(db, ACCT_A, row.id);
		expect(affected).toBe(1);
		const stored = await db
			.select({ revokedAt: apiKeys.revokedAt })
			.from(apiKeys)
			.where(eq(apiKeys.id, row.id))
			.limit(1);
		expect(stored[0].revokedAt).not.toBeNull();
	});

	it("is a no-op for a key owned by another account (returns 0)", async () => {
		const { row } = await createApiKey(db, {
			accountId: ACCT_A,
			label: "laptop",
			salt: SALT,
		});
		// ACCT_B tries to revoke ACCT_A's key — must not touch it.
		const affected = await revokeApiKey(db, ACCT_B, row.id);
		expect(affected).toBe(0);
		const stored = await db
			.select({ revokedAt: apiKeys.revokedAt })
			.from(apiKeys)
			.where(eq(apiKeys.id, row.id))
			.limit(1);
		expect(stored[0].revokedAt).toBeNull();
	});

	it("is idempotent — revoking an already-revoked key returns 0", async () => {
		const { row } = await createApiKey(db, {
			accountId: ACCT_A,
			label: "laptop",
			salt: SALT,
		});
		expect(await revokeApiKey(db, ACCT_A, row.id)).toBe(1);
		expect(await revokeApiKey(db, ACCT_A, row.id)).toBe(0);
	});
});

describe("generateRawKey", () => {
	it("is tm_-prefixed and unique across calls", () => {
		const a = generateRawKey();
		const b = generateRawKey();
		expect(a).toMatch(/^tm_/);
		expect(b).toMatch(/^tm_/);
		expect(a).not.toBe(b);
	});
});
