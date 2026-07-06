# Two-Worker split — the cloud deploys two Workers, not one

**Status:** accepted (2026-06-29). Revises [ADR 0005](./0005-cloud-tech-stack.md)'s
"one Cloudflare Worker" claim. **Amended 2026-07-04 (K1/K3) — see the amendment
section at the end.**

The cloud deploys as **two** Cloudflare Workers joined by a Service Binding:
the **commercial Worker** (`apps/cloud` → `workers/app.ts` — RRv8 SSR dashboard +
Better Auth + Polar billing + the sync API + connectors control-plane) and the
**runtime Worker** (the `@memofs/server` package deployed as a Worker,
holding per-project `Tekmemo` instances). Hosted-memory calls flow from the
commercial Worker to the runtime Worker over the binding.

## Why split

A hard constraint on the Cloudflare free plan: a deployed Worker is capped at
**3 MB** (compressed). The commercial stack alone approaches that, and the
hosted runtime's eager imports (`@memofs/core` core + the R2, Voyage, and
Workers AI adapter packages — see the former `apps/cloud/src/server/hosted-runtime.ts`)
push the bundle well past 3 MB. Splitting achieves 3 + 3.

## Why this split (not some other cut)

The two-Worker boundary **is** the runtime API (`recall` / `context` / `graph` /
`memory`) — which is also the boundary an OSS self-hoster gets over HTTP from
`tekmemo-server`. So the cloud's internal split is the same surface the OSS
product exposes externally. The cloud and the OSS self-hoster run **identical
`tekmemo-server` code**; only the deployment target (Worker vs Node process) and
the injected providers differ. This keeps the codebase DRY and makes the
"self-host the same engine free" thesis (ADR 0003) literally true at the
deployment level.

## Considered options

- **One Worker (status quo, ADR 0005).** Rejected — does not fit the 3 MB free
  plan cap once the runtime ships. Also keeps the runtime bundle
  cloud-coupled, undercutting the OSS self-host thesis.
- **Upgrade to Workers Paid ($5/mo, 10 MB cap) and keep one Worker.** Affordable
  once there is one Pro customer, but does **not** negate the split: isolating
  the runtime lets it scale independently (it is the CPU-heavy part —
  embeddings, extraction, consolidation) and keeps the cloud's bundle shape
  identical to the OSS server. The split stays correct after upgrade; the 3 MB
  cap merely forced it early. Paid is a future operational choice, not an
  alternative architecture.
- **In-process runtime, factory shared via package (the pre-split W2 idea).**
  Rejected — the bundle still does not fit in one Worker on the free plan.

## Consequences

- **One extra hop** on every hosted-memory call (commercial → runtime).
  Sub-ms within a colo; irrelevant at v1 (sync-only, no runtime calls), real
  only from Phase 3 onward.
- **Per-project runtime state** must survive Service-Binding calls. v1 ships the
  package + provider-neutral factory; per-project instance state (instance map
  or a Durable Object) is a Phase 3 implementation detail, not a v1 blocker.
- **OSS self-hosters are unaffected.** `tekmemo-server` deploys as a single
  Node process (Fly / Railway / VPS); Node has no 3 MB cap, so there is nothing
  to split. The two-Worker topology is a Cloudflare-deployment consequence of
  the free-plan limit.
- **`apps/cloud`'s `hosted-runtime.ts` is deleted** in favour of the shared
  provider-neutral factory in `tekmemo-server`. No parallel runtime assembly.

## Amendment — 2026-07-04 reconciliation (K1, K3)

> **Governing artifact:** [`docs/architecture/reconciliation-2026-07-02.md`](../architecture/reconciliation-2026-07-02.md)
> (LOCKED). Where this ADR's body conflicts with K1–K5, the reconciliation wins.

**K1 keeps the two-Worker split canonical**, but **K3 gates it on a bundle
measurement** that has not yet run. The "Why split" section's load-bearing claim
— *"the hosted runtime's eager imports push the bundle well past 3 MB"* — is
**asserted, never measured** against `wrangler deploy --dry-run`. Verified in the
reconciliation: `@memofs/server` (slice 0) is a thin factory over **injected
adapters**; `packages/server/src/` has **no eager adapter imports and no dynamic
`import()`**. The runtime carries no model weights (adapters call out to
providers), so a single Worker plausibly fits.

**Decision (K3):** run `wrangler deploy --dry-run` on a single-Worker config
with the runtime imports **before** baking the split into WF-3. Three outcomes:

1. **Single Worker ≤ 3 MB** → collapse to one Worker; delete the runtime Worker
   + merge the wrangler configs. Simpler topology.
2. **Single Worker > 3 MB free, ≤ 10 MB paid** → keep two Workers for the free
   tier, document the measurement, collapse to one on paid later.
3. **Single Worker > 10 MB** → two Workers is load-bearing; this ADR stands as-is.

The split's *thesis* (the two-Worker boundary is the runtime API; cloud and OSS
run identical `@memofs/server` code; OSS self-hosters are unaffected) is
unaffected by K3 — only the *commitment to the split* is gated on the
measurement. Until the measurement lands, the topology is
[fog](../architecture/reconciliation-2026-07-02.md#k3--measure-the-bundle-before-committing-the-two-worker-split);
WF-3 owns the dry-run. The K3 outcome is recorded back here when known.

Body references to `@tekbreed/tekmemo-server` were flipped to `@memofs/server`
in the same pass; the deleted `apps/cloud/src/server/hosted-runtime.ts` path is
noted as "former" since the file no longer exists.
