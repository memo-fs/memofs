# WF-4 — D1 schema for apps/cloud (migrate the 4 Turso migrations) + dev/test data

> **Premises superseded (2026-07-04).** This ticket's body was charted
> before the [reconciliation](../../architecture/reconciliation-2026-07-02.md)
> locked K1–K5. Where the body conflicts with K1–K5, the reconciliation wins.
> Tracker migration to GitHub Issues (K5) and local-file deletion are deferred.



`wayfinder:grilling` · status: open · claimed: no · blocked-by: WF-3 (cloud arch), WF-1 (D1 metadata contract)

## Question

Design the **D1 schema for the rebuilt `apps/cloud`**, migrated from cloud-2's 4
drizzle/Turso migrations (`apps/cloud-2/drizzle/0000…0003_*.sql`), and decide how
**dev + test data is set in Miniflare** (AGENTS.md: all mock/dev values in Miniflare).

Decide:
1. The **cloud app's own tables** on D1: `projects`, `project_files`,
   `sync_cursors`, users/auth, billing/entitlements — as modeled in
   `apps/cloud-2/src/db/schema.ts`. Port to D1 (no backward compat means the
   schema can be cleaned, not copied blindly).
2. **Drizzle + D1 adapter** (`drizzle-orm/d1`) as the cloud's query layer — or
   raw D1. Must be consistent with WF-1's choice for the adapter metadata layer
   (DRY: same tooling if possible).
3. **Migration authoring for D1** — `wrangler d1 migrations` vs drizzle-kit
   generate; how migrations live in `apps/cloud` and run in dev/CI.
4. **Miniflare bindings** in `wrangler.jsonc` (test/dev env): a local D1, R2,
   and seed data — per AGENTS.md testing rules.
5. **Schema SSOT:** ensure the cloud schema and the adapter-cloudflare metadata
   table don't diverge (ADR 0012's "reuse, don't reinvent" — one manifest).

## Context pointers
- `apps/cloud-2/drizzle/*.sql`, `apps/cloud-2/src/db/{schema.ts,index.server.ts}`
- WF-3's chosen cloud architecture
- WF-1's D1 MetadataStore contract
- `docs/adr/0010-cloud-concurrency-control-for-b3.md` (concurrency tables), 0006 (entitlements)

## Blocks
WF-5 (ADR 0005 amendment records the D1 schema decision).
