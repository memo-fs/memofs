import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createTestDb } from "../../../../tests/utils/db";
import { PLAN_ENTITLEMENTS } from "../../../lib/entitlements";
import type { Database } from "../../db";
import { accounts, user } from "../../db/schema";
import {
	applyPlanToAccount,
	getAccountById,
	getAccountByPolarCustomerId,
	isPlanMetadataValue,
	setPolarCustomerId,
} from "../billing";

/**
 * Billing (Polar) query-layer tests.
 *
 * The Polar webhook (`api/billing/index.ts`) resolves an incoming subscription
 * event to a Memo FS account, records the customer link, and re-applies the
 * account's entitlement caps for the carried plan tier. These are the pure
 * `(db, …)` helpers that do all three — the contract the webhook depends on, and
 * the single entitlement-mutation path (ADR 0006 §12.3). Exercising them here is
 * the honest integration coverage: the webhook's signature verification is
 * Polar's crypto, but the data path it drives lives entirely in this module.
 *
 * Covers:
 *   - `getAccountByPolarCustomerId` / `getAccountById` — resolution both ways.
 *   - `setPolarCustomerId` — the customer↔account link is idempotent (never
 *     clobbers a recorded id on re-delivery) and writes nothing when absent.
 *   - `applyPlanToAccount` — sets `plan` AND the matching caps from the SSOT, so
 *     the denormalised columns can never drift from the plan (the drift bug
 *     WS2 fixed). Free/Pro/Teams each round-trip to their SSOT caps.
 *   - `isPlanMetadataValue` — the webhook's guard against a silent downgrade on
 *     a malformed event (an unknown tier value is rejected, not coerced).
 */

const POLAR_CUST = "pol_customer_abc";
let db: Database;

beforeEach(async () => {
	db = await createTestDb();
	await seedAccount(db, "acct_a", "user_a", "free");
	await seedAccount(db, "acct_b", "user_b", "pro");
});

afterEach(async () => {
	// biome-ignore lint/suspicious/noExplicitAny: drizzle's client accessor is untyped
	(await (db as any).$client.close?.()) ?? undefined;
});

describe("getAccountByPolarCustomerId + getAccountById", () => {
	it("resolves an account by its Polar customer id once linked", async () => {
		await setPolarCustomerId(db, "acct_a", POLAR_CUST);
		const found = await getAccountByPolarCustomerId(db, POLAR_CUST);
		expect(found?.id).toBe("acct_a");
		expect(found?.plan).toBe("free");
	});

	it("returns null for an unlinked customer id", async () => {
		expect(await getAccountByPolarCustomerId(db, "nobody")).toBeNull();
	});

	it("getAccountById resolves by Memo FS account id", async () => {
		const found = await getAccountById(db, "acct_b");
		expect(found?.plan).toBe("pro");
		expect(await getAccountById(db, "ghost")).toBeNull();
	});
});

describe("setPolarCustomerId", () => {
	it("records the link when none exists", async () => {
		await setPolarCustomerId(db, "acct_a", POLAR_CUST);
		const row = await db
			.select({ polarCustomerId: accounts.polarCustomerId })
			.from(accounts)
			.where(eqId("acct_a"))
			.limit(1);
		expect(row[0].polarCustomerId).toBe(POLAR_CUST);
	});

	it("is idempotent — never clobbers an existing link", async () => {
		await setPolarCustomerId(db, "acct_a", "first");
		// A re-delivered customer.created with a different id must NOT overwrite.
		await setPolarCustomerId(db, "acct_a", "second");
		const row = await db
			.select({ polarCustomerId: accounts.polarCustomerId })
			.from(accounts)
			.where(eqId("acct_a"))
			.limit(1);
		expect(row[0].polarCustomerId).toBe("first");
	});
});

describe("applyPlanToAccount — the SSOT entitlement mutation", () => {
	it("writes the plan AND the matching caps (no drift)", async () => {
		// acct_a starts free; bump to pro and assert both columns moved together.
		const updated = await applyPlanToAccount(db, "acct_a", "pro");
		expect(updated?.plan).toBe("pro");
		expect(updated?.maxHostedStorageBytes).toBe(
			PLAN_ENTITLEMENTS.pro.maxHostedStorageBytes,
		);
		expect(updated?.maxConnectors).toBe(PLAN_ENTITLEMENTS.pro.maxConnectors);
	});

	it("applies teams caps (unlimited connectors, 50GB)", async () => {
		const updated = await applyPlanToAccount(db, "acct_a", "teams");
		expect(updated?.plan).toBe("teams");
		expect(updated?.maxConnectors).toBe(Infinity);
		expect(updated?.maxHostedStorageBytes).toBe(
			PLAN_ENTITLEMENTS.teams.maxHostedStorageBytes,
		);
	});

	it("downgrade to free re-applies the free caps (cancellation path)", async () => {
		// acct_b starts pro; a subscription.canceled webhook re-applies free.
		const downgraded = await applyPlanToAccount(db, "acct_b", "free");
		expect(downgraded?.plan).toBe("free");
		expect(downgraded?.maxHostedStorageBytes).toBe(
			PLAN_ENTITLEMENTS.free.maxHostedStorageBytes,
		);
		// The drift bug WS2 fixed: free is 500MB, NOT the old 1GB schema default.
		expect(downgraded?.maxHostedStorageBytes).toBe(500 * 1024 ** 2);
	});

	it("returns null for a nonexistent account", async () => {
		expect(await applyPlanToAccount(db, "ghost", "pro")).toBeNull();
	});
});

describe("isPlanMetadataValue", () => {
	it("accepts the valid tier values", () => {
		expect(isPlanMetadataValue("free")).toBe(true);
		expect(isPlanMetadataValue("pro")).toBe(true);
		expect(isPlanMetadataValue("teams")).toBe(true);
	});

	it("rejects an unknown tier (no silent downgrade)", () => {
		// A malformed event carrying "enterprise" must NOT be coerced to a plan —
		// the webhook ignores it rather than silently applying the wrong caps.
		expect(isPlanMetadataValue("enterprise")).toBe(false);
		expect(isPlanMetadataValue(undefined)).toBe(false);
		expect(isPlanMetadataValue(123)).toBe(false);
	});
});

// --- helpers --------------------------------------------------------------

/** Seeds a `user` + linked `accounts` row, in FK order. */
async function seedAccount(
	db: Database,
	accountId: string,
	userId: string,
	plan: "free" | "pro" | "teams",
): Promise<void> {
	await db.insert(user).values({
		id: userId,
		name: userId,
		email: `${userId}@x.test`,
		emailVerified: true,
		createdAt: new Date(),
		updatedAt: new Date(),
	});
	await db.insert(accounts).values({ id: accountId, userId, plan });
}

/** Drizzle `eq(accounts.id, …)` wrapped so the select helpers read locally. */
function eqId(id: string) {
	return eq(accounts.id, id);
}
