# WF-3 — Cloud app (apps/cloud) rebuild architecture

> **Premises superseded (2026-07-04).** This ticket's body was charted
> before the [reconciliation](../../architecture/reconciliation-2026-07-02.md)
> locked K1–K5. Where the body conflicts with K1–K5, the reconciliation wins.
> Tracker migration to GitHub Issues (K5) and local-file deletion are deferred.



`wayfinder:grilling` · status: open · claimed: no · blocked-by: none

## Question

Decide the **target architecture of the rebuilt `apps/cloud`** as a **single
Worker** (Hono + `@cloudflare/vite-plugin` + React Router v7, the new scaffold),
drawing logic from the old `apps/cloud-2` but with **no backward compatibility**.

The old `apps/cloud-2` holds the real logic: API spine (`/v1/health`,
`/readiness`, `/projects/:id/sync/*`, `r2-presign`), auth middleware, billing,
drizzle DB layer, concurrency-control for B3, entitlements. The new `apps/cloud`
is a bare scaffold (one `home.tsx` route, template `wrangler.jsonc`).

Decide — one session, grilling + reference to cloud-2's code:
1. **What ports verbatim** from cloud-2 (sync/presign, auth, billing, API spine).
2. **What gets rebuilt** differently to fit single-Worker + vite-plugin (the
   worker entry `workers/app.ts`, env/ctx shape, how RR's `createRequestHandler`
   hands `cloudflare: { env, ctx }` to loaders/actions).
3. **What gets dropped** under "no backward compat" (legacy sync shapes, the
   two-Worker assumption from ADR 0013, the npm-style config).
4. **wrangler.jsonc:** fix the name (currently `react-router-hono-fullstack-template`),
   add D1 + R2 bindings, observability, smart-placement decision.
5. **How `@memofs/core` + `@memofs/adapter-cloudflare` wire in** — the phase-3
   `createLocalStrategy({ store: new RemoteBlobMemoryStore(...) })` path (ADR 0012).
6. **`apps/cloud-2` removal** — confirm full port, then delete (this is the
   deletion gate).
7. Risks to flag for WF-4 (D1 schema) and the fog'd vite-plugin integration.

## Context pointers
- `apps/cloud/{workers/app.ts,wrangler.jsonc,vite.config.ts,react-router.config.ts,src/routes.ts}`
- `apps/cloud-2/src/{api,db,components,server,test-utils,...}` (logic source)
- `docs/adr/0013-two-worker-split.md` (amended → single Worker)

## Blocks
WF-4 (cloud D1 schema needs the arch), WF-5 (ADR 0013 amendment).
