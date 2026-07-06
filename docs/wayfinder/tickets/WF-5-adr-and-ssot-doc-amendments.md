# WF-5 — Amend ADRs + SSOT docs to match the overhaul

> **Premises superseded (2026-07-04).** This ticket's body was charted
> before the [reconciliation](../../architecture/reconciliation-2026-07-02.md)
> locked K1–K5. Where the body conflicts with K1–K5, the reconciliation wins.
> Tracker migration to GitHub Issues (K5) and local-file deletion are deferred.



`wayfinder:task` · status: open · claimed: no · blocked-by: WF-1, WF-2, WF-3 (WF-4 optional)

## Question

Bring the decision records and SSOT docs in line with the overhaul once the
technical tickets resolve. Task work, but it must reflect the *actual* decisions
landed in WF-1…WF-4 — run it after those close.

Amend / write:
1. **ADR 0005 (cloud tech stack):** Turso/libSQL → **D1**. Record rationale +
   the drizzle/D1 choice from WF-1/WF-4.
2. **ADR 0012 (R2 MemoryStore adapter):** the Turso `MetadataStore` → **D1**;
   the adapter package is now `@memofs/adapter-cloudflare` (R2 + D1); reaffirm
   `BlobClient` / `MetadataStore` stay provider-neutral + portable (WF-1).
3. **ADR 0013 (two-Worker split):** superseded → **single Worker** via
   `@cloudflare/vite-plugin` (WF-3). Mark Superseded or amend in place.
4. **`package-naming.md` + `monorepo-structure.md`:** already updated in WF-2;
   verify they exactly match reality, including the `packages/core` rename and
   the removed `tekmemo-cli` row.
5. **`docs/CONTEXT.md`** canonical product nouns / package list if it enumerates
   the old `@tekbreed/*` names.
6. Add a **new ADR** for the **scope flip (`@tekbreed → @tekmemo`)** + the
   dir-equals-name SSOT rule, so the rationale is recorded, not just applied.

## Definition of done
Every ADR and SSOT doc reflects the post-overhaul reality; no stale
`@tekbreed/*`, `Turso`, or two-Worker references remain in `docs/`.
