/**
 * Plan entitlements — the single source of truth for plan → capability caps.
 *
 * Two places need the caps and previously disagreed:
 *   - the marketing catalog (`routes/_home/+utils/plans.ts` `PLANS`) hard-codes
 *     "500 MB" / "10 GB" / "50 GB" copy;
 *   - the `accounts` table denormalises `max_hosted_storage_bytes` /
 *     `max_connectors` per row (ADR 0006 §entitlement model), with a default of
 *     `1e9` (1 GB) that already contradicts the catalog's Free tier (500 MB).
 *
 * This module is the one place the numeric caps live. Both the catalog (renders
 * them as copy) and the data path (`provision-account` defaults, the Polar
 * webhook re-applier) import from here, so a cap change is one edit — never a
 * schema-default-vs-marketing drift again. AGENTS.md DRY/SSOT.
 *
 * Entitlement enforcement itself stays numeric (ADR 0006 §12.3: "no
 * `plan === 'Pro'` checks"). The sync push path compares
 * `projectedStorageBytes > account.maxHostedStorageBytes`; the webhook keeps
 * that column in sync with the plan via {@link resolveCaps}.
 *
 * @see docs/adr/0006-pricing-and-entitlements.md — tiers, caps, the numeric model.
 */

import type { PlanTier } from "../db/schema";

/** The megabyte constant — keeps the map below readable and free of magic numbers. */
const MB = 1024 ** 2;
/** The gigabyte constant. */
const GB = 1024 ** 3;

/**
 * Capability caps for a plan tier.
 *
 * `maxConnectors` is `Infinity` for unlimited (Teams). The entitlement check is
 * `connectorsUsed < maxConnectors`; `Infinity` is always satisfied.
 */
export interface EntitlementCaps {
	/** Maximum hosted storage across the account/team's projects, in bytes. */
	maxHostedStorageBytes: number;
	/** Maximum configured connectors. */
	maxConnectors: number;
}

/**
 * The single source of truth for plan → caps. `satisfies Record<PlanTier, …>`
 * guarantees every plan tier is covered (a new tier added to the schema enum
 * becomes a compile error here until it gets caps).
 */
export const PLAN_ENTITLEMENTS = {
	free: { maxHostedStorageBytes: 500 * MB, maxConnectors: 1 },
	pro: { maxHostedStorageBytes: 10 * GB, maxConnectors: 3 },
	teams: { maxHostedStorageBytes: 50 * GB, maxConnectors: Infinity },
} as const satisfies Record<PlanTier, EntitlementCaps>;

/**
 * Resolve the capability caps for a plan tier. The only function that should be
 * called when a plan changes (provisioning, Polar webhook) — it returns the caps
 * to write alongside the plan so the denormalised columns never drift.
 */
export function resolveCaps(plan: PlanTier): EntitlementCaps {
	return PLAN_ENTITLEMENTS[plan];
}
