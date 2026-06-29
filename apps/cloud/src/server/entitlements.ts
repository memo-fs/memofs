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
 * webhook re-applier, the team seat gate) import from here, so a cap change is
 * one edit — never a schema-default-vs-marketing drift again. AGENTS.md DRY/SSOT.
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
 *
 * `maxSeats` is the team-member cap (ADR 0011 Phase 2): how many accounts may
 * be members of a team on this plan. It is always a finite number (collaboration
 * is a paid feature), gated by `seatsUsed >= maxSeats`. Free/Pro allow only the
 * solo owner (1 seat) — matching the pricing catalog where "Team sharing" is
 * excluded on individual tiers — so inviting is upgrade-gated for those plans.
 */
export interface EntitlementCaps {
	/** Maximum hosted storage across the account/team's projects, in bytes. */
	maxHostedStorageBytes: number;
	/** Maximum configured connectors. */
	maxConnectors: number;
	/** Maximum team members (seats) — collaboration cap. */
	maxSeats: number;
}

/**
 * The single source of truth for plan → caps. `satisfies Record<PlanTier, …>`
 * guarantees every plan tier is covered (a new tier added to the schema enum
 * becomes a compile error here until it gets caps).
 */
export const PLAN_ENTITLEMENTS = {
	free: { maxHostedStorageBytes: 500 * MB, maxConnectors: 1, maxSeats: 1 },
	pro: { maxHostedStorageBytes: 10 * GB, maxConnectors: 3, maxSeats: 1 },
	teams: {
		maxHostedStorageBytes: 50 * GB,
		maxConnectors: Infinity,
		maxSeats: 10,
	},
} as const satisfies Record<PlanTier, EntitlementCaps>;

/**
 * Resolve the capability caps for a plan tier. The only function that should be
 * called when a plan changes (provisioning, Polar webhook) — it returns the caps
 * to write alongside the plan so the denormalised columns never drift.
 */
export function resolveCaps(plan: PlanTier): EntitlementCaps {
	return PLAN_ENTITLEMENTS[plan];
}

/**
 * The integer sentinel stored in `accounts.max_connectors` to mean "unlimited"
 * (Teams tier). The column is `integer NOT NULL` — it can't hold `Infinity`,
 * and SQLite doesn't support cheap column-nullability changes. This sentinel is
 * finite (so libSQL accepts it) yet large enough that the
 * `connectorsUsed < maxConnectors` check is always satisfied in practice.
 * {@link normalizeCaps} rehydrates it to `Infinity` on read so consumers never
 * see the raw sentinel.
 */
export const UNLIMITED_CONNECTORS_SENTINEL = Number.MAX_SAFE_INTEGER;

/**
 * The caps as they are STORED in the `accounts` columns. `maxConnectors` is
 * `number` (never `Infinity`): the "unlimited" sentinel (Teams) is stored as
 * {@link UNLIMITED_CONNECTORS_SENTINEL} and rehydrated to `Infinity` by
 * {@link normalizeCaps} on read. Everything else is identical to
 * {@link EntitlementCaps}.
 */
export interface StoredEntitlementCaps {
	maxHostedStorageBytes: number;
	maxConnectors: number;
	maxSeats: number;
}

/**
 * The caps prepared for PERSISTENCE: `Infinity` connectors (Teams) → the finite
 * sentinel, the single write-side translation. Called by the entitlement-mutation
 * paths (`applyPlanToAccount`, `provisionAccount`) so a plan change never tries
 * to bind `Infinity` to the integer column (which libSQL rejects with a
 * RangeError).
 */
export function capsForStorage(plan: PlanTier): StoredEntitlementCaps {
	const caps = resolveCaps(plan);
	return {
		maxHostedStorageBytes: caps.maxHostedStorageBytes,
		maxConnectors: Number.isFinite(caps.maxConnectors)
			? caps.maxConnectors
			: UNLIMITED_CONNECTORS_SENTINEL,
		maxSeats: caps.maxSeats,
	};
}

/**
 * The caps REHYDRATED from the stored columns: the unlimited sentinel →
 * `Infinity`, the single read-side translation. Called wherever the `accounts`
 * caps are read for enforcement (sync push, dashboard), so the in-memory value
 * is always the conceptual `Infinity`-for-unlimited the
 * `connectorsUsed < maxConnectors` check expects.
 */
export function normalizeCaps(caps: {
	maxHostedStorageBytes: number;
	maxConnectors: number;
}): { maxHostedStorageBytes: number; maxConnectors: number } {
	return {
		maxHostedStorageBytes: caps.maxHostedStorageBytes,
		maxConnectors:
			caps.maxConnectors >= UNLIMITED_CONNECTORS_SENTINEL
				? Infinity
				: caps.maxConnectors,
	};
}
