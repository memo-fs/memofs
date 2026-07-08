import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { canRunConsolidation } from "../../../lib/entitlements";
import { createTestDb } from "../../../../tests/utils/db";
import type { Database } from "../../db";
import { accounts, memoryEvents, projects } from "../../db/schema";
import { getAccountUsage } from "../account";

/**
 * Consolidation cap integration test.
 *
 * Proves the v1 enforcement path: `getAccountUsage` counts `memory_events`
 * rows of `kind: 'consolidation'` since UTC midnight, and `canRunConsolidation`
 * gates the run on that count vs the plan cap. Together these are the exact
 * predicate + data the `memory-query` action consults before invoking
 * `runtime.consolidate()` (Q19, ADR 0006 §12.3).
 */

const ACCT = "acct_pro";
const PROJ = "proj_main";

let db: Database;

beforeEach(async () => {
	db = await createTestDb();
	await db.insert(accounts).values({ id: ACCT, plan: "pro" });
	await db.insert(projects).values({
		id: PROJ,
		accountId: ACCT,
		name: "main",
		isDefault: true,
	});
});

afterEach(async () => {
	// biome-ignore lint/suspicious/noExplicitAny: drizzle's client accessor is untyped
	(await (db as any).$client.close?.()) ?? undefined;
});

/** Inserts `count` consolidation events for the seeded project (today, UTC). */
async function seedConsolidationRuns(count: number): Promise<void> {
	if (count === 0) return;
	const rows = Array.from({ length: count }, (_, i) => ({
		projectId: PROJ,
		kind: "consolidation" as const,
		summary: `run ${i + 1}`,
		actor: "hosted",
	}));
	await db.insert(memoryEvents).values(rows);
}

describe("consolidation cap enforcement (getAccountUsage + canRunConsolidation)", () => {
	it("counts zero consolidation runs when none are logged", async () => {
		const usage = await getAccountUsage(db, ACCT);
		expect(usage.consolidationUsedToday).toBe(0);
		expect(canRunConsolidation("pro", usage.consolidationUsedToday)).toBe(true);
	});

	it("allows a Pro run below the 24/day cap", async () => {
		await seedConsolidationRuns(23);
		const usage = await getAccountUsage(db, ACCT);
		expect(usage.consolidationUsedToday).toBe(23);
		expect(canRunConsolidation("pro", usage.consolidationUsedToday)).toBe(true);
	});

	it("blocks a Pro run at exactly the 24/day cap (boundary)", async () => {
		await seedConsolidationRuns(24);
		const usage = await getAccountUsage(db, ACCT);
		expect(usage.consolidationUsedToday).toBe(24);
		expect(canRunConsolidation("pro", usage.consolidationUsedToday)).toBe(false);
	});

	it("blocks a Pro run above the cap", async () => {
		await seedConsolidationRuns(30);
		const usage = await getAccountUsage(db, ACCT);
		expect(usage.consolidationUsedToday).toBe(30);
		expect(canRunConsolidation("pro", usage.consolidationUsedToday)).toBe(false);
	});

	it("ignores non-consolidation events (writes, core_updates, pre_warm)", async () => {
		await db.insert(memoryEvents).values([
			{ projectId: PROJ, kind: "write", summary: "agent write", actor: "api-key" },
			{ projectId: PROJ, kind: "core_update", summary: "core rewrite", actor: "hosted" },
			{ projectId: PROJ, kind: "pre_warm", summary: "pre-warm", actor: "hosted" },
		]);
		const usage = await getAccountUsage(db, ACCT);
		expect(usage.consolidationUsedToday).toBe(0);
		expect(canRunConsolidation("pro", usage.consolidationUsedToday)).toBe(true);
	});

	it("free tier: blocks after a single run (cap = 1)", async () => {
		await seedConsolidationRuns(1);
		const usage = await getAccountUsage(db, ACCT);
		// The seeded account is Pro; re-test the predicate with a free plan.
		expect(canRunConsolidation("free", usage.consolidationUsedToday)).toBe(false);
	});

	it("teams tier: never blocks (Infinity cap)", async () => {
		await seedConsolidationRuns(1000);
		const usage = await getAccountUsage(db, ACCT);
		expect(canRunConsolidation("teams", usage.consolidationUsedToday)).toBe(true);
	});
});
