/**
 * Account-scoped dashboard queries.
 *
 * Reads the billing identity + aggregated usage for the signed-in user. These
 * are the SSOT reads the overview, billing, and sidebar cards derive from —
 * pure `(db, …)` functions, no Hono/Worker coupling, so they unit-test with the
 * in-memory `createTestDb()` harness.
 *
 * `getAccountForUser` is the extracted DRY counterpart of the inline join that
 * lived in `session.server.ts` (now both call here): one `accounts.userId`
 * lookup returning the entitlement snapshot. `getAccountUsage` aggregates the
 * storage total across the account's projects — the same number the sync push
 * path recomputes per-project, rolled up account-wide.
 *
 * @see docs/adr/0006-pricing-and-entitlements.md — entitlement caps.
 * @see {@link ./projects} — per-project reads compose the same tables.
 */
import { and, eq, inArray, sql, sum } from "drizzle-orm";
import { normalizeCaps } from "../../lib/entitlements";
import { getDB } from "../db";
import { accounts, connectors, memoryEvents, projects } from "../db/schema";
import type { EntitlementSnapshot } from "./types";

/**
 * The entitlement snapshot for a billing account, as the dashboard reads it.
 * Derived from the shared `EntitlementSnapshot` type.
 */
export type AccountView = EntitlementSnapshot;

/**
 * Looks up the billing account for `userId`, or `null` if none exists yet.
 *
 * An account can be absent only if provisioning raced or failed — normal
 * signups create one via the `user.create.after` hook. Callers degrade
 * gracefully (the layout falls back to a zeroed usage card) rather than
 * blocking the user out of their dashboard.
 */
export async function getAccountForUser(
	userId: string,
): Promise<AccountView | null> {
	const db = getDB();
	const rows = await db
		.select({
			id: accounts.id,
			plan: accounts.plan,
			maxHostedStorageBytes: accounts.maxHostedStorageBytes,
			maxConnectors: accounts.maxConnectors,
		})
		.from(accounts)
		.where(eq(accounts.userId, userId))
		.limit(1);
	const row = rows[0];
	if (!row) return null;
	// Rehydrate the stored unlimited sentinel (Teams — a large finite integer)
	// back to Infinity so the `connectorsUsed < maxConnectors` check works.
	const caps = normalizeCaps(row);
	return {
		id: row.id,
		plan: row.plan,
		maxHostedStorageBytes: caps.maxHostedStorageBytes,
		maxConnectors: caps.maxConnectors,
	};
}

/**
 * Aggregated usage for an account: total storage across all its projects + the
 * count of configured connectors across all projects.
 *
 * Storage is `SUM(projects.total_storage_bytes)` — each project already carries
 * a denormalised running total recomputed on every push (see `commitPush`), so
 * this is a single indexed aggregation, not a scan of `project_files`.
 *
 * Connectors is `COUNT(connectors)` across all the account's projects — the
 * account-wide count checked against `maxConnectors` (ADR 0006).
 */
export async function getAccountUsage(accountId: string): Promise<{
	storageBytes: number;
	connectorsUsed: number;
	consolidationUsedToday: number;
	preWarmUsedToday: number;
}> {
	const db = getDB();
	const accountProjectIds = db
		.select({ id: projects.id })
		.from(projects)
		.where(eq(projects.accountId, accountId));

	const [storageRows, connectorRows, consolidationRows, preWarmRows] =
		await Promise.all([
			db
				.select({
					total: sql<number>`coalesce(${sum(projects.totalStorageBytes)}, 0)`,
				})
				.from(projects)
				.where(eq(projects.accountId, accountId)),
			db
				.select({ n: sql<number>`count(*)` })
				.from(connectors)
				.where(inArray(connectors.projectId, accountProjectIds)),
			db
				.select({ n: sql<number>`count(*)` })
				.from(memoryEvents)
				.where(
					and(
						inArray(memoryEvents.projectId, accountProjectIds),
						eq(memoryEvents.kind, "consolidation"),
						sql`datetime(${memoryEvents.createdAt}) >= datetime('now', 'start of day')`,
					),
				),
			db
				.select({ n: sql<number>`count(*)` })
				.from(memoryEvents)
				.where(
					and(
						inArray(memoryEvents.projectId, accountProjectIds),
						eq(memoryEvents.kind, "pre_warm"),
						sql`datetime(${memoryEvents.createdAt}) >= datetime('now', 'start of day')`,
					),
				),
		]);

	return {
		storageBytes: Number(storageRows[0]?.total ?? 0),
		connectorsUsed: Number(connectorRows[0]?.n ?? 0),
		consolidationUsedToday: Number(consolidationRows[0]?.n ?? 0),
		preWarmUsedToday: Number(preWarmRows[0]?.n ?? 0),
	};
}
