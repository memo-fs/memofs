# Open Issues — Build Tracker

> **Tracker:** GitHub Issues on
> [`christophersesugh/memofs`](https://github.com/christophersesugh/memofs/issues)
> (locked K5, 2026-07-02). This file is a lightweight signpost to the open work
> items from the wayfinder map, reconciled to the keystone decisions (K1–K5).
> Each line frames the work in current terms; the full ticket body lives on
> GitHub Issues.
>
> **Why this exists:** the wayfinder map (`docs/wayfinder/`) was retired; its
> 13 local tickets migrated to GitHub Issues per K5. This file replaced it so a
> new reader can see the open work at a glance without reading 13 stale files.
> It is a signpost, not a second source of truth — decision-truth lives in
> [`decisions.md`](./architecture/decisions.md) + the ADRs; execution-truth lives
> on GitHub Issues.
>
> **Build order:** WF-2 → WF-5 → WF-1 → WF-3 → (WF-4, WF-6, WF-7, WF-8, WF-9,
> WF-10 in parallel) → WF-11 → WF-12 → WF-13. See the
> [reconciliation session record](./architecture/archive/reconciliation-2026-07-02.md#build-order-founder-confirmed-wf-2-first-strict-order)
> for the dependency graph.

## Closed

- **WF-1** — Blob/metadata-decoupled adapter contract (`@memofs/adapter-r2` blob + `@memofs/adapter-turso` metadata).
- **WF-2** — Workspace naming + scope overhaul (`@tekbreed` → `@memofs` + K4 core layering fix).
- **WF-5** — ADR + SSOT doc amendments (ADRs 0005/0011/0012/0013 amended for K1–K3; ADR 0016 records the scope flip + K4).

## Open

- **WF-3 — Cloud rebuild architecture.** Port `apps/cloud-2` logic into `apps/cloud` (RRv8 + Hono + CF skeleton); **K3: measure bundle with `wrangler deploy --dry-run` before committing the two-Worker split.**
- **WF-4 — Cloud Turso schema.** *(Renamed from "D1 schema".)* Migrate cloud-2's 4 Drizzle/Turso migrations; D1 migration cancelled (K1 — Turso is load-bearing for concurrency + self-host portability).
- **WF-6 — Core review + 500-LoC refactor.** `code-review` + `security-review` + split every file > 500 LoC in `@memofs/core` (`packages/core` after K4 rename).
- **WF-7 — Remaining packages review.** Same review pass on adapters + connectors + json-rpc + server + mcp-server + testing + benchmark-kit + the `tekmemo` CLI.
- **WF-8 — Documentation rebuild.** Rebuild `apps/docs` per ADR 0008/0015; VitePress `check:links` green; add `connectors.md` + `intelligence.md`; AI-SDK page repointed to `@memofs/adapter-ai-sdk`.
- **WF-9 — Changeset reset + version baseline.** Align all packages to `1.0.0-beta.1`; reset changeset history; organized publish flow.
- **WF-10 — Root cleanup.** Delete `apps/cloud-2/` after WF-3; flip `@tekbreed/*` refs → `@memofs/*` in root docs; clean stray dirs.
- **WF-11 — Cloud production deploy.** *(Gated on K3 + WF-3.)* Provision D1, R2, AI binding, secrets; CI/CD via GitHub Actions; smoke-test health/sync/auth.
- **WF-12 — OSS launch + newsletter.** Polish README/CONTRIBUTING/GOVERNANCE; newsletter signup on cloud app. **Launch = v1 file-replica per K2**, not the full managed runtime.
- **WF-13 — Reposition cloud memory host screen relock.** *(Rewritten by K2.)* v1 = "file replica + connector control-plane"; the hosted memory runtime pitch moves to v1.1. Re-lock `screens-locked.md` SC8/SC9/SC3.1 accordingly.

## Fog (open questions that graduate into specific tickets)

1. **`@memofs` npm org existence** — must confirm/create before WF-2 can publish.
2. **Bundle-measurement outcome (K3)** — ≤ 3 MB → collapse to one Worker; ≤ 10 MB → free-tier-only split; > 10 MB → split stands. Graduates into WF-3.
3. **`RemoteBlobMemoryStore.append` race closure** — is `73d2cef`'s metadata-DB `BEGIN IMMEDIATE` sufficient, or does the blob-store append need its own serialization? Graduates into the v1.1 concurrency ticket.
4. **`apps/cloud-2` deletion timing** — keep until WF-3 finishes porting; delete after.
5. **`examples/server`** — needs a once-over for old-name refs during WF-2.
