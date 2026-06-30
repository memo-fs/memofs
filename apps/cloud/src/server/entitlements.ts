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
 *
 * The two intelligence caps (Q19, ADR 0011 Phase 3) meter the managed-runtime
 * compute that has real per-user cost (Workers CPU + LLM tokens), unlike the
 * cheap/smooth storage dimension. Both are checked as `count < cap`, identical
 * to the storage/connector pattern (ADR 0006 §12.3):
 *   - `maxConsolidationRuns` — consolidation runs per UTC day (the
 *     always-on-consolidation differentiator A1). Free's single run is the
 *     deterministic floor only (zero LLM spend, Q33 margin guardrail); Pro+ runs
 *     frontier extraction. Teams is `Infinity` (true always-on).
 *   - `maxPreWarmPerDay` — session pre-warms per UTC day (the cold-start
 *     differentiator C5). Free is 0 (pre-warming is Pro+); Teams is `Infinity`.
 *     `Infinity` is stored as {@link UNLIMITED_INT_SENTINEL} like `maxConnectors`.
 */
export interface EntitlementCaps {
	/** Maximum hosted storage across the account/team's projects, in bytes. */
	maxHostedStorageBytes: number;
	/** Maximum configured connectors. */
	maxConnectors: number;
	/** Maximum team members (seats) — collaboration cap. */
	maxSeats: number;
	/**
	 * Maximum consolidation runs per UTC day (managed-runtime intelligence cap,
	 * Q19). `Infinity` for unlimited (Teams). `Infinity`-for-unlimited is stored
	 * as {@link UNLIMITED_INT_SENTINEL} (same encoding as `maxConnectors`).
	 */
	maxConsolidationRuns: number;
	/**
	 * Maximum session pre-warms per UTC day (Q19/C5). `Infinity` for unlimited
	 * (Teams); `Infinity`-for-unlimited is stored as
	 * {@link UNLIMITED_INT_SENTINEL}.
	 */
	maxPreWarmPerDay: number;
}

/**
 * The single source of truth for plan → caps. `satisfies Record<PlanTier, …>`
 * guarantees every plan tier is covered (a new tier added to the schema enum
 * becomes a compile error here until it gets caps).
 *
 * Intelligence caps (Q19, locked 2026-06-21):
 *   - `maxConsolidationRuns`: Free 1/day (deterministic floor only — Q33), Pro
 *     24/day (hourly frontier extraction), Teams ∞ (true always-on).
 *   - `maxPreWarmPerDay`: Free 0 (pre-warming is Pro+), Pro 48/day, Teams ∞.
 *     (Q19 locks Free 0 / Pro >0 / Teams ∞; the precise Pro figure is an
 *     implementation default pending a locked number — hourly cadence, the same
 *     rhythm as Pro consolidation, doubled to cover morning + evening sessions.)
 */
export const PLAN_ENTITLEMENTS = {
	free: {
		maxHostedStorageBytes: 500 * MB,
		maxConnectors: 1,
		maxSeats: 1,
		maxConsolidationRuns: 1,
		maxPreWarmPerDay: 0,
	},
	pro: {
		maxHostedStorageBytes: 10 * GB,
		maxConnectors: 3,
		maxSeats: 1,
		maxConsolidationRuns: 24,
		maxPreWarmPerDay: 48,
	},
	teams: {
		maxHostedStorageBytes: 50 * GB,
		maxConnectors: Infinity,
		maxSeats: 10,
		maxConsolidationRuns: Infinity,
		maxPreWarmPerDay: Infinity,
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
 * The integer sentinel stored in a `NOT NULL integer` entitlement column to mean
 * "unlimited" (Teams tier). The column can't hold `Infinity`, and SQLite doesn't
 * support cheap column-nullability changes. This sentinel is finite (so libSQL
 * accepts it) yet large enough that the `count < cap` check is always satisfied
 * in practice. Used by `maxConnectors`, `maxConsolidationRuns`, and
 * `maxPreWarmPerDay` — every `Infinity`-for-unlimited integer cap.
 * {@link normalizeCaps} rehydrates it to `Infinity` on read so consumers never
 * see the raw sentinel.
 */
export const UNLIMITED_INT_SENTINEL = Number.MAX_SAFE_INTEGER;

/**
 * Legacy alias for {@link UNLIMITED_INT_SENTINEL}. Kept because early call sites
 * name it after the connectors column; new call sites should use the generic
 * {@link UNLIMITED_INT_SENTINEL} (the sentinel now backs several integer caps).
 */
export const UNLIMITED_CONNECTORS_SENTINEL = UNLIMITED_INT_SENTINEL;

/**
 * The caps as they are STORED in the `accounts` columns. Every `Infinity`-capable
 * field is `number` (never `Infinity`): "unlimited" (Teams) is stored as
 * {@link UNLIMITED_INT_SENTINEL} and rehydrated to `Infinity` by
 * {@link normalizeCaps} on read. Everything else is identical to
 * {@link EntitlementCaps}.
 */
export interface StoredEntitlementCaps {
	maxHostedStorageBytes: number;
	maxConnectors: number;
	maxSeats: number;
	maxConsolidationRuns: number;
	maxPreWarmPerDay: number;
}

/**
 * The caps prepared for PERSISTENCE: every `Infinity` cap (Teams) → the finite
 * sentinel, the single write-side translation. Called by the entitlement-mutation
 * paths (`applyPlanToAccount`, `provisionAccount`) so a plan change never tries
 * to bind `Infinity` to an integer column (which libSQL rejects with a
 * RangeError).
 */
export function capsForStorage(plan: PlanTier): StoredEntitlementCaps {
	const caps = resolveCaps(plan);
	return {
		maxHostedStorageBytes: caps.maxHostedStorageBytes,
		maxConnectors: toStored(caps.maxConnectors),
		maxSeats: caps.maxSeats,
		maxConsolidationRuns: toStored(caps.maxConsolidationRuns),
		maxPreWarmPerDay: toStored(caps.maxPreWarmPerDay),
	};
}

/**
 * `Infinity` → {@link UNLIMITED_INT_SENTINEL}; finite passes through. The
 * single translation both `Infinity`-capable integer caps use, so the
 * write-side can't drift between them.
 */
function toStored(cap: number): number {
	return Number.isFinite(cap) ? cap : UNLIMITED_INT_SENTINEL;
}

/**
 * The caps REHYDRATED from the stored columns: the unlimited sentinel →
 * `Infinity`, the single read-side translation. Called wherever the `accounts`
 * caps are read for enforcement (sync push, dashboard), so the in-memory value
 * is always the conceptual `Infinity`-for-unlimited the `count < cap` check
 * expects.
 *
 * Accepts the stored shape (one or more of the `Infinity`-capable integer
 * caps); fields it isn't handed pass through untouched. This keeps the
 * per-partial-shape call sites (auth reads only connectors; the dashboard reads
 * all four) sharing one rehydrator.
 */
export function normalizeCaps<T extends object>(caps: T): T {
	const rehydrate = (v: number): number =>
		v >= UNLIMITED_INT_SENTINEL ? Infinity : v;
	const out = { ...caps } as Record<string, unknown>;
	if (typeof out.maxConnectors === "number")
		out.maxConnectors = rehydrate(out.maxConnectors);
	if (typeof out.maxConsolidationRuns === "number")
		out.maxConsolidationRuns = rehydrate(out.maxConsolidationRuns);
	if (typeof out.maxPreWarmPerDay === "number")
		out.maxPreWarmPerDay = rehydrate(out.maxPreWarmPerDay);
	return out as T;
}
