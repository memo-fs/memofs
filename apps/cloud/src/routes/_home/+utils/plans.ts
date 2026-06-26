/**
 * Pricing plans — the single source of truth for TekMemo Cloud pricing.
 *
 * Both the landing page (`_home/index.tsx` → `+components/pricing-section.tsx`)
 * and the dedicated pricing page (`_home/pricing.tsx`) derive their views from
 * `PLANS` below. Do not duplicate plan names, prices, storage caps, connector
 * caps, or feature copy anywhere else — edit them here.
 *
 * Reference: docs/architecture/decisions.md (pricing tiers).
 */

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
			{ text: "500 MB storage", included: true },
			{ text: "1 project", included: true },
			{ text: "1 connector", included: true },
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
			{ text: "10 GB storage", included: true },
			{ text: "Unlimited projects", included: true },
			{ text: "3 connectors", included: true },
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
			{ text: "50 GB storage", included: true },
			{ text: "Unlimited projects", included: true },
			{ text: "Unlimited connectors", included: true },
			{ text: "API key auth", included: true },
			{ text: "Pre-sync snapshots", included: true },
			{ text: "90-day rollback history", included: true },
			{ text: "Priority support", included: true },
			{ text: "Team sharing", included: true },
		],
	},
];
