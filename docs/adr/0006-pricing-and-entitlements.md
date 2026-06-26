# ADR 0006: Pricing tiers + entitlement-based enforcement + Polar billing

- **Status:** Accepted
- **Date:** 2026-06-20
- **Deciders:** Christopher S. Aondona

## Context

TekMemo Cloud needs a pricing model. Two constraints shape it: (1) the founder
is **broke** and wants revenue, but (2) TekMemo is a **pre-launch OSS dev tool
with zero users** whose only path to revenue at scale is *adoption first*.

Critically, the engineering enforcement model was already locked:
`cloud-sync-and-refactor.md` §12.3 mandates **capability checks**
(`entitlements.maxHostedStorageBytes`), **never `plan === "Pro"` checks**. This
ADR extends that model with a second entitlement (`maxConnectors`) and defines
the commercial tiers + billing provider on top of it.

Per-user cost at v1 ≈ $0 (all infra on free tiers — see ADR 0005). Pricing is
therefore a positioning + growth exercise, not cost-recovery.

## Decision

**Three tiers: Free (generous) + Pro ($9/mo) + Teams ($24/seat/mo, Coming Soon /
disabled). Enforced via numeric entitlement caps. Billed through Polar (Merchant
of Record).**

> **Revised 2026-06-23:** storage ladder tightened from ~1GB/~25GB/~100GB to
> 500MB/10GB/50GB. A conservative base keeps ~97–98% gross margin while reserving
> headroom for paid storage add-ons later. Teams billing model clarified as
> **per-seat** ($24/seat/mo) throughout. Annual billing deferred to post-launch
> (same "avoid premature billing complexity" principle).
>
> **Cross-ref (Q33, 2026-06-24):** the managed-runtime intelligence entitlements
> (`maxConsolidationRuns` / `maxPreWarmPerDay`) follow this same numeric-cap
> model and **do not change the prices below.** One margin guardrail locked at
> Q33: **Free's 1 consolidation/day runs on the deterministic floor only (zero
> LLM spend); Pro+ gets frontier extraction** — so the Free tier's hosted
> compute is cost-safe. See decisions log Q33 + [ADR 0011](./0011-managed-runtime-sequencing.md).

| Tier | Price | Storage | Connectors | Status |
|---|---|---|---|---|
| **Free** | $0 | 500 MB hosted | 1 (GitHub *or* Notion) | Ships v1 |
| **Pro** | $9/mo | 10 GB hosted | up to 3 (GitHub, Notion, + whatever ships) | Ships v1 |
| **Teams** | $24/seat/mo (list, shown disabled) | 50 GB + shared workspace | unlimited | "Coming Soon" button, disabled — no billing built |

### Entitlement model (numeric caps, not named-feature allowlists)

Following §12.3 ("no `plan === 'Pro'`" checks), entitlements are checked as
numeric caps:

- `entitlements.maxHostedStorageBytes` — Free 500MB, Pro 10GB, Teams 50GB.
  Enforced on push: `if bytesUsed + incoming > limit → 402 with upgrade payload`.
- `entitlements.maxConnectors` *(new)* — Free=1, Pro=3, Teams=∞. Enforced as
  `connectors.length < maxConnectors`. **Not** a per-connector allowlist.

This means Pro's 3-slot allowance is **honest at 2 connectors**: with only
GitHub + Notion shipped at launch, Pro users have one unfilled slot that fills
when Linear (connector #3, per the connector-set decision) lands. No phantom
promise.

### Cost / margin (honest)

R2 ≈ $0.015/GB → 10GB ≈ $0.15/mo cost at Pro (~98% margin at $9); 50GB ≈
$0.75/mo at Teams (~97% margin at $24/seat); Free at 500MB ≈ $0.008/mo
(negligible).

### Billing provider: Polar (not Stripe)

Verified fit for the §12.3 model:

- **Merchant of Record** → handles global sales tax/VAT (Stripe Tax would be
  extra cost/complexity). Offloads tax compliance — significant for a solo
  founder.
- **Benefits API** (`/v1/benefits/`) → maps directly to entitlement gating
  (`maxHostedStorageBytes` / `maxConnectors`).
- **Metered/usage-based billing** → storage overage billed per byte-event.
- **Fee reality:** Polar Starter = **5% + 50¢/txn** (2026). On a $9 Pro sub:
  ~$0.95 fee → net ~$8.05. Higher than Stripe's ~2.9% + 30¢ on small txns, but
  the MoR + tax-handling + billing-UI + OSS-native trade is worth it at
  broke+ASAP. Move to a lower-rate Polar tier if volume grows.

### Teams tier (Coming Soon)

- **List price locked now: $24/seat/mo** (3× Pro, deliberately not a round
  multiple). Locked while it's cheap to change; implementation deferred.
- **Billing model: per-seat** ($24/seat/mo — the SaaS norm; Supabase, Linear,
  Vercel all bill per-seat). Implementation (seats, shared workspace, SCIM)
  deferred to when Teams ships, gated on Pro revenue or sponsorships (ADR 0003).
- The "Coming Soon" button is **disabled** but **shows the price** — captures
  demand signal + anchors the value ladder without building billing prematurely.
- **Add-ons (deferred):** the conservative base storage ladder (500MB/10GB/50GB)
  is sized to leave a clean upsell ladder — paid storage packs (+10GB/+50GB) and
  a future higher tier — to add once billing is live and demand is observable.
  Do not build add-on SKUs at v1.
- **Annual billing (deferred):** not at v1. The pricing FAQ already states "Not
  yet, but we're planning to introduce one." Cheap fast-follower post-launch;
  Polar supports annual natively.

## Consequences

**Positive:**

- Generous Free tier drives OSS adoption (the only path to revenue at scale for
  a pre-launch dev tool). Matches the Supabase/Plunk/PostHog/Turso playbook.
- Entitlement-based enforcement (numeric caps) is consistent with §12.3 and
  scales cleanly — adding entitlements (e.g. `maxProjects`) doesn't require
  re-architecting checks.
- Polar as MoR removes tax-compliance work entirely.
- Teams "Coming Soon" captures intent + anchors pricing without premature
  Stripe-style tier-ladder complexity.

**Negative:**

- Free tier generates $0 revenue despite non-zero (tiny) cost. Accepted: it's
  the funnel.
- Polar's 5% + 50¢ fee is higher than Stripe on small transactions — the MoR
  trade is judged worth it at broke+ASAP.
- Teams price is locked before anyone pays for it — cheap to change now, but
  must be revisited (with migration handling) once the first Teams customer
  exists.

## Alternatives considered

1. **Free only at launch; add paid later.** Rejected: signals the cloud isn't a
   real product; power users can't give money even if they want to.
2. **Charge everyone from day one (Free trial → paid).** Rejected: kills adoption
   for a pre-launch OSS tool with zero users — the broke-founder instinct that's
   backwards for OSS monetization.
3. **Stripe instead of Polar.** Rejected for v1: Stripe Tax is extra cost +
   complexity; Polar's MoR + Benefits API + OSS-native fit the entitlement model
   and the broke+ASAP constraints better.
4. **Per-connector allowlist** (e.g. "Pro can use GitHub + Notion + Linear only").
   Rejected: violates §12.3's "no `plan === 'Pro'`" principle and doesn't scale.
   Numeric `maxConnectors` cap is the honest, scalable rule.

## Validation

- Entitlement model consistent with `cloud-sync-and-refactor.md` §12.3.
- Cost/margin math grounded in R2's $0.015/GB.
- Polar fit verified (Benefits API, metered billing, MoR) via polar.sh/docs.

## References

- Decisions log: `docs/architecture/decisions.md` Q9 (pricing), Q10 (connector set)
- Entitlement enforcement: `cloud-sync-and-refactor.md` §12.3
- Stack: [ADR 0005](./0005-cloud-tech-stack.md)
- Connector limits derive from the connector set: [ADR 0002](./0002-connectors-run-locally.md)
