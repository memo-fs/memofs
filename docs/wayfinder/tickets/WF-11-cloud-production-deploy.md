# WF-11 — Cloud app production deploy to Cloudflare

`wayfinder:grilling` · status: open · claimed: no · blocked-by: WF-3 (cloud arch), WF-4 (D1 schema)

## Question

Take the rebuilt **single-Worker `apps/cloud`** to production on Cloudflare.
This is infrastructure/provisioning work with real decisions — use the
`cloudflare` + `wrangler` skills (AGENTS.md mandates them for Cloudflare work).

Decide + execute:
1. **Resource provisioning** — D1 database (production + preview), R2 bucket,
   AI binding (Workers AI), secrets (auth, billing/Polar from ADR 0006).
2. **`wrangler.jsonc`** — finalize name (drop the template default), D1 + R2
   bindings, compatibility_date, observability, smart-placement decision,
   custom domain / routes.
3. **Migrations in prod** — run the WF-4 D1 migrations against the production D1.
4. **CI/CD** — GitHub Actions: `pnpm ci` → build → `wrangler deploy`. Secret
   management via `wrangler secret` / GitHub secrets (never committed).
5. **Smoke verification** — health/readiness endpoints, sync flow, auth, against
   the live Worker before declaring "deployed".

Risks to flag back to the map: vite-plugin + D1 + R2 binding integration in
prod (see MAP Fog); custom-domain/DNS if applicable.

## Definition of done
Cloud app live on Cloudflare; CI deploys on merge; health endpoints green; D1
migrated; secrets in place (not in git).

## Blocks
WF-12 (newsletter capture lives on the deployed cloud app).
