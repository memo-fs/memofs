/**
 * Billing (Polar) account-lookup + entitlement-sync queries.
 *
 * The Polar webhook (`src/api/billing/`) resolves an incoming subscription
 * event to a Memo FS account, then re-applies that account's entitlement caps.
 * These are the pure `(db, …)` helpers that do both — no Hono/Worker coupling,
 * so they unit-test with the in-memory `createTestDb()` harness like every
 * other query module.
 *
 * ## How a Polar subscription maps to a Memo FS account
 * The plan tier is carried in **subscription `metadata`** (set at checkout by
 * the billing route), not inferred from Polar product ids (which differ per
 * environment). The checkout stamps `metadata.memofs_plan` (`free|pro|teams`)
 * and `metadata.memofs_account_id`; the webhook reads them here. The Polar
 * `customerId` is also persisted on the account so we can resolve by either
 * key (the subscription carries `customerId`; the metadata carries our id).
 *
 * @see docs/adr/0006-pricing-and-entitlements.md — tiers, the numeric-cap model.
 * @see {@link ../entitlements} — `resolveCaps`, the SSOT the webhook writes from.
 */

import { and, eq, isNull } from "drizzle-orm";
import { capsForStorage, resolveCaps } from "../../lib/entitlements";
import type { Database } from "../db";
import { accounts, type PlanTier } from "../db/schema";

/**
 * Memo FS plan tier as carried in Polar subscription metadata. Mirror of
 * {@link PlanTier} so the webhook validates the metadata value before writing.
 */
export const PLAN_METADATA_VALUES = ["free", "pro", "teams"] as const;
export type PlanMetadataValue = (typeof PLAN_METADATA_VALUES)[number];

/** True if `value` is a valid plan tier carried in Polar metadata. */
export function isPlanMetadataValue(
	value: unknown,
): value is PlanMetadataValue {
	return (
		typeof value === "string" &&
		PLAN_METADATA_VALUES.includes(value as PlanMetadataValue)
	);
}

/**
 * Looks up the Memo FS account linked to a Polar customer id, or null.
 *
 * Set once when the customer first subscribes (or, for pre-existing accounts,
 * backfilled). The webhook resolves the account for a subscription event via
 * this; if the checkout also stamped `memofs_account_id` in metadata, prefer
 * {@link getAccountById} for the direct lookup.
 */
export async function getAccountByPolarCustomerId(
	db: Database,
	polarCustomerId: string,
): Promise<{ id: string; plan: PlanTier } | null> {
	const rows = await db
		.select({ id: accounts.id, plan: accounts.plan })
		.from(accounts)
		.where(eq(accounts.polarCustomerId, polarCustomerId))
		.limit(1);
	return rows[0] ?? null;
}

/** Looks up a Memo FS account by its own id (the `memofs_account_id` metadata). */
export async function getAccountById(
	db: Database,
	accountId: string,
): Promise<{ id: string; plan: PlanTier } | null> {
	const rows = await db
		.select({ id: accounts.id, plan: accounts.plan })
		.from(accounts)
		.where(eq(accounts.id, accountId))
		.limit(1);
	return rows[0] ?? null;
}

/**
 * Record the Polar customer id on an account (the customer↔account link).
 * Idempotent: only sets it if absent, so a re-delivered `customer.created` or
 * `subscription.created` never clobbers a recorded id.
 */
export async function setPolarCustomerId(
	db: Database,
	accountId: string,
	polarCustomerId: string,
): Promise<void> {
	await db
		.update(accounts)
		.set({ polarCustomerId, updatedAt: new Date().toISOString() })
		.where(and(eq(accounts.id, accountId), isNull(accounts.polarCustomerId)));
}

/**
 * Apply a plan change to an account: set `plan` AND the matching entitlement
 * caps from {@link resolveCaps}. This is the **single** entitlement-mutation
 * path — provisioning (Free default) and the Polar webhook both call it, so the
 * denormalised cap columns can never drift from the plan (ADR 0006 §12.3:
 * numeric caps, never `plan ===` checks at enforcement time).
 *
 * @returns the updated account with its caps, or null if no such account. The
 *          caps are the ones just written (from {@link resolveCaps}), returned
 *          directly rather than via a second DB read.
 */
export async function applyPlanToAccount(
	db: Database,
	accountId: string,
	plan: PlanTier,
): Promise<AppliedAccount | null> {
	const caps = resolveCaps(plan);
	const stored = capsForStorage(plan);
	const result = await db
		.update(accounts)
		.set({
			plan,
			maxHostedStorageBytes: stored.maxHostedStorageBytes,
			// `Infinity` (Teams) is stored as the finite `UNLIMITED_CONNECTORS_SENTINEL`
			// — the integer column can't hold `Infinity`. `capsForStorage` owns this
			// translation; `normalizeCaps` rehydrates it to `Infinity` on read.
			maxConnectors: stored.maxConnectors,
			updatedAt: new Date().toISOString(),
		})
		.where(eq(accounts.id, accountId))
		.returning({ id: accounts.id });
	// `.returning()` is empty when no row matched (unknown account) — no need for
	// a second lookup; the caps are the ones we just wrote.
	if (result.length === 0) return null;
	return {
		id: result[0].id,
		plan,
		maxHostedStorageBytes: caps.maxHostedStorageBytes,
		maxConnectors: caps.maxConnectors,
	};
}

/**
 * The account shape {@link applyPlanToAccount} returns — the {@link AccountView}
 * fields (id, plan, caps). Declared here so the webhook + tests import it from
 * the billing module that owns it, without a circular dep on `./account`.
 */
export interface AppliedAccount {
	id: string;
	plan: PlanTier;
	maxHostedStorageBytes: number;
	maxConnectors: number;
}
