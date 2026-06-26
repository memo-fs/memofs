import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { Database } from "../../../db/index.server";
import { accounts, projects, user } from "../../../db/schema";
import { createTestDb } from "../../../test-utils/db";
import { getAccountForUser, getAccountUsage } from "../account";

/**
 * Account query-layer tests.
 *
 * Verifies the user→account lookup + the account-wide storage rollup that the
 * billing card and sidebar derive from. `getAccountUsage` sums each project's
 * denormalised `total_storage_bytes` (kept current by `commitPush`), not the
 * raw `project_files` — so this seeds project totals directly.
 *
 * FK note: `accounts.userId` references `user.id`, so every seeded account needs
 * its owning `user` row inserted first or SQLite rejects the insert.
 */

const USER = "user_1";
const ACCT = "acct_1";

let db: Database;

beforeEach(async () => {
	db = await createTestDb();
	await db.insert(user).values({
		id: USER,
		name: "Test User",
		email: "test@example.com",
		createdAt: new Date(),
		updatedAt: new Date(),
	});
	await db.insert(accounts).values({
		id: ACCT,
		userId: USER,
		plan: "pro",
		maxHostedStorageBytes: 5e9,
		maxConnectors: 3,
	});
});

/** Seeds a `user` + linked `accounts` row, in FK order. */
async function seedUserWithAccount(
	userId: string,
	accountId: string,
): Promise<void> {
	await db.insert(user).values({
		id: userId,
		name: userId,
		email: `${userId}@example.com`,
		createdAt: new Date(),
		updatedAt: new Date(),
	});
	await db.insert(accounts).values({ id: accountId, userId });
}

afterEach(async () => {
	// biome-ignore lint/suspicious/noExplicitAny: drizzle's client accessor is untyped
	(await (db as any).$client.close?.()) ?? undefined;
});

describe("getAccountForUser", () => {
	it("returns the entitlement snapshot for the user", async () => {
		const result = await getAccountForUser(db, USER);
		expect(result).toEqual({
			id: ACCT,
			plan: "pro",
			maxHostedStorageBytes: 5e9,
			maxConnectors: 3,
		});
	});

	it("returns null for a user with no account", async () => {
		const result = await getAccountForUser(db, "user_nobody");
		expect(result).toBeNull();
	});

	it("returns defaults for an account with no plan/caps set", async () => {
		const bareAcct = "acct_bare";
		const bareUser = "user_bare";
		await seedUserWithAccount(bareUser, bareAcct);

		const result = await getAccountForUser(db, bareUser);
		expect(result?.plan).toBe("free");
		expect(result?.maxHostedStorageBytes).toBe(1e9);
		expect(result?.maxConnectors).toBe(1);
	});
});

describe("getAccountUsage", () => {
	it("sums total_storage_bytes across the account's projects", async () => {
		await db.insert(projects).values([
			{ id: "p1", accountId: ACCT, name: "one", totalStorageBytes: 2048 },
			{ id: "p2", accountId: ACCT, name: "two", totalStorageBytes: 3072 },
			{ id: "p3", accountId: ACCT, name: "three", totalStorageBytes: 0 },
		]);

		const usage = await getAccountUsage(db, ACCT);
		expect(usage.storageBytes).toBe(5120);
		expect(usage.connectorsUsed).toBe(0);
	});

	it("returns 0 storage for an account with no projects", async () => {
		const usage = await getAccountUsage(db, ACCT);
		expect(usage.storageBytes).toBe(0);
	});

	it("excludes projects owned by another account", async () => {
		const otherAcct = "acct_other";
		await seedUserWithAccount("user_other", otherAcct);
		await db.insert(projects).values([
			{ id: "p1", accountId: ACCT, name: "mine", totalStorageBytes: 1024 },
			{
				id: "p2",
				accountId: otherAcct,
				name: "theirs",
				totalStorageBytes: 9999,
			},
		]);

		const usage = await getAccountUsage(db, ACCT);
		expect(usage.storageBytes).toBe(1024);
	});
});
