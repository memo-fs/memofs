/**
 * Pricing plans — the single source of truth for TekMemo Cloud pricing.
 *
 * Both the landing page (`_home/index.tsx` → `+components/pricing-section.tsx`)
 * and the dedicated pricing page (`_home/pricing.tsx`) derive their views from
 * `PLANS` below. Do not duplicate plan names, prices, storage caps, connector
 * caps, or feature copy anywhere else — edit them here.
 *
 * The numeric storage/connector caps are NOT re-typed here: they come from
 * `PLAN_ENTITLEMENTS` (`server/entitlements.ts`), the one source the data path
 * (provisioning, Polar webhook) and this catalog both read — so marketing copy
 * and the enforced limits can never drift (AGENTS.md DRY/SSOT).
 *
 * Reference: docs/architecture/decisions.md (pricing tiers).
 */

import type { PlanTier } from "~/db/schema";
import { type EntitlementCaps, PLAN_ENTITLEMENTS } from "~/server/entitlements";

export type PlanFeature = { text: string; included: boolean };

export type Plan = {
	name: string;
	price: string;
	/** Billing period label rendered next to the price, e.g. "/mo" or "forever". */
	period: string;
	desc: string;
	cta: { label: string; href: string };
	/** Visually emphasized as the recommended plan. */
	highlight: boolean;
	/** Not yet available — renders as a disabled / waitlist CTA. */
	soon: boolean;
	features: PlanFeature[];
};

/** Human-readable byte size for the storage feature line (512MB+ → MB/GB). */
function formatStorage(bytes: number): string {
	if (bytes >= 1024 ** 3) return `${Math.round(bytes / 1024 ** 3)} GB`;
	return `${Math.round(bytes / 1024 ** 2)} MB`;
}

/** The connector feature line: "N connectors" or "Unlimited connectors". */
function formatConnectors(caps: EntitlementCaps): string {
	return Number.isFinite(caps.maxConnectors)
		? `${caps.maxConnectors} connector${caps.maxConnectors === 1 ? "" : "s"}`
		: "Unlimited connectors";
}

/** The tier key for each catalog entry — links the marketing plan to the caps. */
const FREE_TIER: PlanTier = "free";
const PRO_TIER: PlanTier = "pro";
const TEAMS_TIER: PlanTier = "teams";

export const PLANS: Plan[] = [
	{
		name: "Free",
		price: "$0",
		period: "forever",
		desc: "For individual developers getting started.",
		cta: { label: "Get started", href: "/signup" },
		highlight: false,
		soon: false,
		features: [
			{
				text: `${formatStorage(PLAN_ENTITLEMENTS[FREE_TIER].maxHostedStorageBytes)} storage`,
				included: true,
			},
			{ text: "1 project", included: true },
			{ text: formatConnectors(PLAN_ENTITLEMENTS[FREE_TIER]), included: true },
			{ text: "API key auth", included: true },
			{ text: "Pre-sync snapshots", included: false },
			{ text: "Rollback history", included: false },
			{ text: "Priority support", included: false },
			{ text: "Team sharing", included: false },
		],
	},
	{
		name: "Pro",
		price: "$9",
		period: "/mo",
		desc: "For developers who live in the terminal and push often.",
		cta: { label: "Upgrade to Pro", href: "/signup" },
		highlight: true,
		soon: false,
		features: [
			{
				text: `${formatStorage(PLAN_ENTITLEMENTS[PRO_TIER].maxHostedStorageBytes)} storage`,
				included: true,
			},
			{ text: "Unlimited projects", included: true },
			{ text: formatConnectors(PLAN_ENTITLEMENTS[PRO_TIER]), included: true },
			{ text: "API key auth", included: true },
			{ text: "Pre-sync snapshots", included: true },
			{ text: "30-day rollback history", included: true },
			{ text: "Priority support", included: true },
			{ text: "Team sharing", included: false },
		],
	},
	{
		name: "Teams",
		price: "$24",
		// Per-seat billing is locked in ADR 0006 (Q9): "$24/seat/mo".
		// Implementation (seats, shared workspace, SCIM) is deferred until Teams
		// ships; the public copy must still state the per-seat model honestly.
		period: "/seat/mo",
		desc: "For teams sharing a canonical .tekmemo/ across all members.",
		cta: { label: "Coming soon", href: "#teams-notify" },
		highlight: false,
		soon: true,
		features: [
			{
				text: `${formatStorage(PLAN_ENTITLEMENTS[TEAMS_TIER].maxHostedStorageBytes)} storage`,
				included: true,
			},
			{ text: "Unlimited projects", included: true },
			{ text: formatConnectors(PLAN_ENTITLEMENTS[TEAMS_TIER]), included: true },
			{ text: "API key auth", included: true },
			{ text: "Pre-sync snapshots", included: true },
			{ text: "90-day rollback history", included: true },
			{ text: "Priority support", included: true },
			{ text: "Team sharing", included: true },
		],
	},
];
