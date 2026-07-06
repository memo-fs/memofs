/**
 * Entitlements SSOT tests — locks the plan → caps map (ADR 0006) and the
 * Free-tier default fix (500 MB, not the old 1 GB schema default).
 */
import { describe, expect, it } from "vitest";
import { PLAN_ENTITLEMENTS, resolveCaps } from "../../lib/entitlements";
import type { PlanTier } from "../db/schema";

describe("PLAN_ENTITLEMENTS (SSOT)", () => {
	it("covers every plan tier (a new tier is a compile error via satisfies)", () => {
		const tiers: PlanTier[] = ["free", "pro", "teams"];
		for (const tier of tiers) {
			expect(PLAN_ENTITLEMENTS[tier]).toBeDefined();
		}
	});

	it("free = 500 MB / 1 connector / 1 seat (NOT the old 1 GB default)", () => {
		expect(PLAN_ENTITLEMENTS.free.maxHostedStorageBytes).toBe(500 * 1024 ** 2);
		expect(PLAN_ENTITLEMENTS.free.maxConnectors).toBe(1);
		// Collaboration is Teams-only: free is solo (owner only).
		expect(PLAN_ENTITLEMENTS.free.maxSeats).toBe(1);
	});

	it("pro = 10 GB / 3 connectors / 1 seat", () => {
		expect(PLAN_ENTITLEMENTS.pro.maxHostedStorageBytes).toBe(10 * 1024 ** 3);
		expect(PLAN_ENTITLEMENTS.pro.maxConnectors).toBe(3);
		// Pro is still an individual tier — team sharing is excluded (catalog).
		expect(PLAN_ENTITLEMENTS.pro.maxSeats).toBe(1);
	});

	it("teams = 50 GB / unlimited connectors / 10 seats", () => {
		expect(PLAN_ENTITLEMENTS.teams.maxHostedStorageBytes).toBe(50 * 1024 ** 3);
		expect(PLAN_ENTITLEMENTS.teams.maxConnectors).toBe(Infinity);
		// Teams is the first tier that unlocks collaboration (multi-seat).
		expect(PLAN_ENTITLEMENTS.teams.maxSeats).toBe(10);
	});

	it("storage caps are strictly ordered free < pro < teams", () => {
		expect(PLAN_ENTITLEMENTS.free.maxHostedStorageBytes).toBeLessThan(
			PLAN_ENTITLEMENTS.pro.maxHostedStorageBytes,
		);
		expect(PLAN_ENTITLEMENTS.pro.maxHostedStorageBytes).toBeLessThan(
			PLAN_ENTITLEMENTS.teams.maxHostedStorageBytes,
		);
	});
});

describe("resolveCaps", () => {
	it("returns the same caps object as the map for each tier", () => {
		expect(resolveCaps("free")).toEqual(PLAN_ENTITLEMENTS.free);
		expect(resolveCaps("pro")).toEqual(PLAN_ENTITLEMENTS.pro);
		expect(resolveCaps("teams")).toEqual(PLAN_ENTITLEMENTS.teams);
	});
});
