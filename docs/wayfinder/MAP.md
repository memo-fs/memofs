# Wayfinder Map — TekMemo Overhaul (no backward compatibility)

`wayfinder:map` · **Tracker: GitHub Issues on `tekbreed/tekmemo`** (decided
2026-07-02, K5). The 13 local tickets in `docs/wayfinder/tickets/` migrate to
child issues of the map issue; the local files are deleted in WF-5.

**Goal:** a general overhaul that sets naming, structure, the cloud app, and the
core/cli layering right — so execution needs zero corrections. No backward
compatibility. Thorough research before every choice. **v1 ships the file-replica
foundation; the managed runtime is a v1.1 fast-follow** (K2).

> **Reconciliation (2026-07-02):** this map was charted against premises that
> contradicted the S3 grilling (single-Worker, Turso→D1, bundled adapter,
> "`server` fate = fog"). The 2026-07-02 session resolved the contradictions and
> locked five keystone decisions (K1–K5). Full evidence + the reconciled ticket
> table live in [`docs/architecture/reconciliation-2026-07-02.md`](../architecture/reconciliation-2026-07-02.md);
> this map reflects the reconciled state. The contradicting charting positions
> below are **superseded** by K1–K5 wherever they conflict.

## Notes

### Skills every session should consult
`cloudflare`, `workers-best-practices`, `wrangler`, `react-router-framework-mode`,
`turborepo-monorepo`, `code-reviewer`, `security-review` (after impl),
`copywriting` (for any public-facing copy). Consult the reconciliation doc for
the current canonical architecture before any build work.

### Standing preferences
- **DRY & SSOT everywhere** (AGENTS.md) — no duplicated names/paths; one source.
- Miniflare + Vitest for unit; Miniflare + Playwright for e2e; all mock/dev
  values set in Miniflare.
- Biome only (no prettier); kebab-case source files; 100-LoC component cap,
  500-LoC file cap; Conform + Zod v4 for forms.
- Do not add deps without checking for an existing one; no `console.log`.

## Decisions so far

### Keystone decisions — 2026-07-02 reconciliation session

- [K1 — S3 grilling is canonical](../architecture/reconciliation-2026-07-02.md#k1--the-s3-grilling-is-canonical) — two-Worker split (ADR 0013), Turso/libSQL stays, blob/metadata-decoupled adapters, `tekmemo-server` load-bearing. Replaces the charting grilling's single-Worker / Turso→D1 / bundled-adapter positions.
- [K2 — v1 = file-replica; runtime = v1.1 fast-follow](../architecture/reconciliation-2026-07-02.md#k2--v1-ships-the-file-replica-foundation-the-managed-runtime-is-a-v11-fast-follow) — supersedes both D2 ("sync-only forever") and S3-Q9 ("full runtime at launch"). Slice 0 stays landed as v1.1 prep.
- [K3 — Measure the bundle before committing the two-Worker split](../architecture/reconciliation-2026-07-02.md#k3--measure-the-bundle-before-committing-the-two-worker-split) — ADR 0013's 3 MB claim is unverified; `wrangler deploy --dry-run` decides (collapse / free-tier-only / stands).
- [K4 — Core layering fix](../architecture/reconciliation-2026-07-02.md#k4--core-layering-fix-kill-the-inverted-corecli-dependency) — `client → @tekmemo/core` (holds the primitives), `tekmemo` stays the unscoped CLI (`npm install -g tekmemo`), primitives move down. Kills the 18-file circular core→CLI dependency. Registry cost: zero (`@tekmemo/client` is 404/unpublished).
- [K5 — Tracker = GitHub Issues](../architecture/reconciliation-2026-07-02.md#k5--tracker-github-issues-on-tekbreedtekmemo) — local-markdown tickets migrate to child issues of the map issue.

### Earlier charting decisions still standing (unchanged by the reconciliation)

1. **Naming rule (SSOT):** directory name = package name (minus the scope).
   - npm scope **flips `@tekbreed` → `@tekmemo`** across every package.
   - Internal tooling stays `@repo/*`. GitHub org / repo URLs / homepage /
     funding are unchanged — only the npm package scope changes.
   - The CLI bin stays `tekmemo` (owned by the unscoped `tekmemo` package).

2. **Naming map (reconciled with K4 — the core/cli cycle fix, with `tekmemo`
   staying the unscoped CLI so `npm install -g tekmemo` keeps working):**

   | Directory | Package name | Change |
   |---|---|---|
   | `packages/client` | `@tekmemo/core` | **RENAMED** — it *is* the core runtime. Holds the primitives (K4). |
   | `packages/tekmemo` | `tekmemo` (unscoped) | **STAYS** — it is the CLI; `npm install -g tekmemo` is the expected install. Depends on `@tekmemo/core`. |
   | `packages/adapter-r2` | `@tekmemo/adapter-r2` | scope flip; **blob-only** (S3-Q3 decoupling) |
   | `packages/adapter-turso` *(new)* | `@tekmemo/adapter-turso` | **NEW** — Turso metadata extracted from the bundled R2 package (S3-Q3) |
   | `packages/adapter-openai` | `@tekmemo/adapter-openai` | scope flip |
   | `packages/adapter-voyage` | `@tekmemo/adapter-voyage` | scope flip |
   | `packages/adapter-transformers` | `@tekmemo/adapter-transformers` | scope flip |
   | `packages/adapter-workers-ai` | `@tekmemo/adapter-workers-ai` | scope flip |
   | `packages/adapter-ai-sdk` | `@tekmemo/adapter-ai-sdk` | scope flip |
   | `packages/connectors` | `@tekmemo/connectors` | scope flip |
   | `packages/json-rpc` | `@tekmemo/json-rpc` | scope flip |
   | `packages/server` | `@tekmemo/server` | scope flip — **load-bearing** (K1; slice 0 landed) |
   | `packages/mcp-server` | `@tekmemo/mcp-server` | scope flip |
   | `packages/benchmark-kit` | `@tekmemo/benchmark-kit` | scope flip |
   | `packages/testing` | `@tekmemo/testing` | scope flip |
   | `apps/cloud` | `@tekmemo/cloud` | private app — the rebuilt cloud (RRv8 + Hono + CF skeleton) |
   | `apps/docs` | `@tekmemo/docs` | private app |
   | `tooling/*` | `@repo/*` | unchanged |

   Stale refs to delete: `@tekbreed/tekmemo-cli` (root `devDependencies` +
   `package-naming.md` row) — no such package exists. `apps/cloud-2` is the
   untracked logic source for the cloud rebuild; **mined into `apps/cloud`
   during WF-3, then deleted**. The CLI package keeps both its name (`tekmemo`,
   unscoped) and its directory (`packages/tekmemo`) for path stability and so
   `npm install -g tekmemo` keeps working; only the core moves
   (`packages/client` → `packages/core`, renamed to `@tekmemo/core`).

3. **Depth:** restructure + rebuild the cloud app from its skeleton + ported
   logic, but **keep already-working package internals** (core runtime, adapter
   logic, recall/graph/AgentFS, connectors, tekmemo-server slice 0) unless they
   conflict. Not a from-scratch rewrite of working engine code.

4. **Cloud architecture (K1 + K3):** the S3 two-Worker split (ADR 0013) is
   canonical, **but the bundle is measured before the split is committed** (K3).
   Single Worker under 3 MB → collapse; under 10 MB → free-tier-only split;
   over 10 MB → split stands.

5. **Database (K1):** **Turso/libSQL stays.** D1 is rejected — it is load-bearing
   for the concurrency layer (ADR 0010) and would shatter self-host portability
   (OSS self-hosters on Node cannot bind D1).

6. **Storage adapters (K1 + S3-Q3):** **decoupled** — `@tekmemo/adapter-r2`
   (blob-only) + `@tekmemo/adapter-turso` (metadata-only), N+M packages not N×M.
   `BlobClient` and `MetadataStore` stay separate provider-neutral interfaces in
   core (`RemoteBlobMemoryStore`, ADR 0012 as amended by S3-Q3).

7. **Cloud positioning (K2):** v1 = **file replica + connector control-plane**
   (the D2 thesis, sequenced honestly). The hosted **memory runtime**
   (recall/extraction/consolidation) is a **v1.1 fast-follow**, not v1. SC8
   hosted-memory + SC9 entitlement rows + the LLM intelligence tier move to v1.1.
   Slice 0 (`createHostedRuntime` + `LlmClient`) stays landed as v1.1 prep.

### Closed local tickets

- [WF-2 — Execute workspace naming + scope overhaul (@tekbreed → @tekmemo)](tickets/WF-2-naming-and-scope-overhaul.md) — local package names, directories, versions, repository metadata, lockfile references, and SSOT rule docs now follow the reconciled package map.
- [WF-1 — Blob/metadata-decoupled adapter contract](tickets/WF-1-adapter-cloudflare-contract.md) — `@tekmemo/adapter-r2` (blob-only) + `@tekmemo/adapter-turso` (metadata-only) ship as decoupled packages over the provider-neutral `BlobClient`/`MetadataStore` interfaces in core (S3-Q3, carried under K1).
- [WF-5 — Amend ADRs + SSOT docs to match the overhaul](tickets/WF-5-adr-and-ssot-doc-amendments.md) — ADRs 0005/0011/0012/0013 amended for K1–K3; new [ADR 0016](../adr/0016-scope-flip-and-dir-equals-name.md) records the scope flip + K4 + dir-equals-name SSOT; decisions.md / CONTEXT.md / D2 doc + root docs flipped to `@tekmemo/*` and `packages/core`. K5 (GitHub Issues migration) + local-ticket deletion deferred.

## Fog

- **Bundle-measurement outcome (K3).** Decides whether the two-Worker split
  collapses, stays free-tier-only, or stands. Graduates into WF-3.
- **`RemoteBlobMemoryStore.append` race closure.** Is `73d2cef`'s metadata-DB
  `BEGIN IMMEDIATE` sufficient, or does the blob-store append need its own
  serialization? Sizes the v1.1 concurrency "verify" work. Graduates into the
  v1.1 concurrency ticket.
- **ADR 0011 phase sequencing vs K2.** K2 reinstates phased sequencing (concurrency
  → Teams → runtime) which S3-Q9 had compressed into one launch. The phases
  themselves are unchanged; only the release cadence relaxes (v1 = replica,
  v1.1 = runtime). WF-5 records the ADR amendment.
