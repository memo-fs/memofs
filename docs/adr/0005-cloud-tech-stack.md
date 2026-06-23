# ADR 0005: TekMemo Cloud tech stack (Workers + RRv8 + Hono + R2 + Turso)

- **Status:** Accepted (revised 2026-06-20 — React Router version; see
  "Revision history" below)
- **Date:** 2026-06-20
- **Deciders:** Christopher S. Aondona

## Revision history

- **2026-06-20 (rev 2):** React Router **v7 → v8**. The original draft corrected
  the proposal "v8 → v7" on the premise that *v8 didn't exist yet (June 2026)*.
  That premise is false: `react-router@8.0.1` is the `latest` dist-tag and
  **`@react-router/cloudflare@8.0.1`** is the official GA Cloudflare Workers
  adapter (verified via `npm view react-router dist-tags` / `npm view
  @react-router/cloudflare dist-tags`). v8 is therefore the target version, and
  the repo's `apps/cloud` scaffold already pins `react-router@8.0.0`. This
  revision reverses correction #1 and updates every "v7" reference to "v8." The
  rest of the stack (Workers + Static Assets, R2, Turso/Drizzle, Better Auth,
  Upstash, Plunk, Sentry, k6, Polar, MIT) is unchanged.

## Context

TekMemo Cloud needs a stack. The founder proposed Better Auth, Railway,
Turso/Drizzle, R2, React Router v8, Tailwind, Voyage — under two hard
constraints: **completely broke** (favor free tiers) and **launch ASAP** (favor
what's already started + official docs + minimal ops).

Two pieces were already locked by prior decisions: `cloud-sync-and-refactor.md`
§12.2 committed to **R2 (blobs) + Turso/libSQL (metadata)**, and a Cloudflare
Worker already exists in the repo. So R2 + Turso aren't open choices — they're
prior commitments.

## Decision

**One Cloudflare Worker (Hono API + React Router v8 SSR dashboard, served via
Static Assets), on R2 + Turso/Drizzle, with Upstash for scheduling/queues,
managed Plunk for email, Sentry for errors, k6 for load testing. Whole repo
stays MIT. Railway deferred to the managed-runtime tier (ADR 0003).**

| Layer | Choice |
|---|---|
| Compute (API + dashboard) | Cloudflare Workers — **one Worker**: Hono API + React Router **v8** framework-mode SSR, via Static Assets |
| Blob storage | Cloudflare R2 (locked §12.2; free egress) |
| Metadata DB | Turso (libSQL) + Drizzle ORM (locked §12.2) |
| Auth | Better Auth *(pending capability check: API keys + OAuth + scoped tokens)* |
| Static assets/hosting | Workers + Static Assets (NOT Pages — Pages is converging into Workers) |
| CSS | Tailwind |
| Scheduling/queues/idempotency | Upstash QStash + Redis + Workflow |
| Email | Managed Plunk (not self-hosted) |
| Errors | Sentry free tier |
| Load testing | Grafana k6 |
| Billing | Polar (Merchant of Record; see ADR 0006) |
| License | MIT (whole repo) |

### Key corrections to the original proposal

1. **React Router: confirmed v8 (not downgraded to v7).** The original draft of
   this ADR *downgraded* the proposal from v8 to v7 on the assumption that v8
   didn't exist yet. That assumption was wrong: `react-router@8.0.1` is the
   `latest` dist-tag and **`@react-router/cloudflare@8.0.1`** ships a GA
   Cloudflare Workers adapter (verified via `npm view`). v8 is the target; the
   repo's `apps/cloud` scaffold already pins `react-router@8.0.0`. v8 framework
   mode is the officially-supported SSR-on-Workers path via the Cloudflare Vite
   plugin. *(See "Revision history" above.)*
2. **Railway removed from v1.** No meaningful free tier for production. v1
   (file-replica) fits entirely in Cloudflare/Upstash free tiers. Railway
   deferred to ADR 0003's managed-runtime tier — the one workload that can't be
   serverless (engine + ONNX models blow past the 10MB Worker bundle cap).
3. **Pages → Workers + Static Assets.** Cloudflare has announced Pages ↔ Workers
   are converging; Workers + Static Assets is the recommended path for new
   projects. One Worker serves SSR HTML + JS/CSS — not "Pages for UI + Worker
   for API."
4. **Voyage is not a cloud-stack piece.** It's an OSS runtime embedder; v1 cloud
   does no embedding (D2). Relevant again only at the managed-runtime tier.
5. **Stripe → Polar.** Polar is Merchant of Record (handles global tax), has a
   Benefits API mapping to the §12.3 entitlement model, and metered billing for
   storage overage. See ADR 0006.

### Deployment topology

```
apps/tekmemo-cloud/          ← NEW. ONE Cloudflare Worker, MIT.
  ├── api/                   ← Hono (/v1/sync/*, health, connectors/:id/secret)
  ├── dashboard/             ← React Router v8 framework mode (SSR)
  └── assets binding         ← serves JS/CSS from the same deploy
# apps/tekmemo-mcp-worker/   ← SHELVED (Q6/triage). Reopens as Worker 2
#                              (managed runtime) or a service-bound companion.
```

Two Workers communicate via **service bindings** (same CF account, same repo).
The cloud Worker `import`s from `@tekbreed/tekmemo` (workspace types, no npm
publish pre-launch). It must implement 31 exported types from
`cloud-client/types.ts`.

## Consequences

**Positive:**

- v1 cost ≈ $0/mo (all free tiers). Matches broke+ASAP.
- Free R2 egress — critical for a sync product (downloads are the main traffic).
- One deploy target, one auth model, one observability stack. You've already
  started on Cloudflare.
- Splittable to two Workers via service bindings when the bundle cap bites or
  the managed tier lands — no rewrite.

**Negative:**

- **3MB bundle cap (free) / 10MB (paid).** The v1 file-replica Worker fits
  easily; the managed-runtime engine (ADR 0003) will not — that's why it's the
  designated "Worker 2" / Railway candidate.
- Polar Starter fee is **5% + 50¢/txn** (higher than Stripe on small txns) —
  accepted for the MoR + tax-handling trade.
- Better Auth must handle (a) `tk_live_…` API keys, (b) OAuth for connectors,
  (c) scoped tokens (`memory:sync`). **Verify before final commit.**

## Alternatives considered

1. **Railway-hosted (original proposal).** Rejected for v1: no free tier, duplicates
   the Cloudflare infra already started, gives nothing the file-replica v1 needs.
2. **SPA dashboard on Pages + separate API Worker.** Rejected: throws away the SSR
   experience the founder values, and builds on a converging product.
3. **AGPL / closed-source license on the cloud.** Rejected: AGPL's distribution
   trigger barely protects a hosted service (the "ASP loophole") yet bites OSS
   adopters (enterprises block AGPL on sight); the cloud's value is operational,
   not source. MIT + trademark is the proven open-core model (Supabase, Plunk,
   Cal.com, PostHog).

## Validation

- Stack fit: consistent with `cloud-sync-and-refactor.md` §12.2 (R2 + Turso).
- React Router v8 on Workers: first-class official support via
  `@react-router/cloudflare` (GA, `@react-router/cloudflare@8.0.1`, verified via
  `npm view`) + the Cloudflare Vite plugin.
- Polar: Benefits API + metered billing + MoR verified (polar.sh/docs).

## Open items

- **Better Auth capability check** (API keys + OAuth + scoped tokens) before
  final auth commit.
- **`apps/cloud` Node→Workers migration (code, not a decision).** The current
  `apps/cloud` scaffold is a vendored React Router starter pinned to
  `@react-router/node@8.0.0` + `@react-router/serve@8.0.0` — i.e. a **Node SSR
  server**, not a Worker — and it is not yet in `pnpm-workspace.yaml`. The
  *decision* (RR v8 on Workers + Static Assets) is locked here; migrating the
  scaffold to `@react-router/cloudflare` is an implementation task tracked under
  S2-Q3.

## References

- Decisions log: `docs/architecture/decisions.md` Q8 (stack + license)
- Cloud refactor spec: `docs/architecture/cloud-sync-and-refactor.md` §12.2
- Pricing: [ADR 0006](./0006-pricing-and-entitlements.md)
- Managed tier: [ADR 0003](./0003-managed-runtime-tier.md)
- Connectors: [ADR 0002](./0002-connectors-run-locally.md)
