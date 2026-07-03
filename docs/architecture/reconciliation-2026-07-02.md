# Reconciliation — 2026-07-02 (S3 canonical, v1/v1.1 split, core layering fix)

> **Status:** LOCKED. This document records the keystone decisions from the
> 2026-07-02 reconciliation session and how each of the 13 wayfinder tickets is
> reconciled to them. It supersedes the contradicting positions inside
> [`docs/wayfinder/MAP.md`](../wayfinder/MAP.md)'s charting grilling (single-Worker,
> Turso→D1, bundled adapter) wherever they conflict with the decisions below.
>
> **Provenance:** reached by auditing the live code + git history + all four
> decision artifacts (MAP, `decisions.md`, `s3-execution-plan.md`, CONTEXT) and
> grilling the founder on five keystone forks. Each keystone cites the evidence
> that forced it.

---

## Why a reconciliation was needed

Two separate grilling sessions produced **mutually contradictory architecture**,
both committed on 2026-06-30 without reconciliation:

| Decision | Wayfinder charting (`MAP.md`) | S3 grilling (`s3-execution-plan.md` + ADRs 0013–0015) |
|---|---|---|
| Worker count | **Single Worker** | **Two Workers** (ADR 0013, *accepted*) |
| Database | **Turso → D1** | **Turso/libSQL stays** (load-bearing for concurrency layer) |
| Storage adapter shape | One bundled `adapter-cloudflare` (R2 + D1) | **Decoupled** `adapter-r2` (blob) + `adapter-turso` (metadata) |
| `packages/server` fate | Fog ("survive / restructure / fold?") | **Load-bearing** — slice 0 already landed (`c443ea2`) |

The 13 wayfinder tickets were charted against the charting-grilling premises, so
~half had wrong premises before line one was written. Working any ticket before
resolving the contradiction guaranteed rework.

---

## The five keystone decisions (K1–K5)

### K1 — The S3 grilling is canonical

**Replaces:** the MAP charting grilling's single-Worker / Turso→D1 / bundled-adapter
positions and the "`packages/server` fate = fog" entry.

**Evidence that forced it:**
- ADR 0013 (two-Worker split) is **accepted** (2026-06-29); the MAP's single-Worker
  decision never addresses the real Cloudflare free-tier 3 MB compressed cap that
  forces the split.
- `s3-execution-plan.md` + `CONTEXT.md` are internally consistent and project into
  a 12-slice plan; the MAP contradicts itself in places.
- `packages/server` slice 0 (`createHostedRuntime` + `LlmClient` contract) is
  **already implemented and committed** (`c443ea2`) — 1238 lines across 4 files
  referencing `createHostedRuntime`. The MAP still treats its fate as unresolved.

**Consequence for the database:** D1 is **rejected**; Turso/libSQL stays. The
concurrency layer (ADR 0010, implemented in `73d2cef` as libSQL `BEGIN IMMEDIATE`)
is designed against Turso, and — more importantly — D1 would shatter the
self-hosting thesis: OSS self-hosters running `tekmemo-server` on Node/Fly/Railway
cannot bind a Cloudflare D1. Turso/libSQL is the portable choice that keeps cloud
and OSS on identical `tekmemo-server` code.

### K2 — v1 ships the file-replica foundation; the managed runtime is a v1.1 fast-follow

**Replaces:** both the older D2 ("cloud v1 = sync-only, never runs the engine",
contradicted by S3-Q9) **and** S3-Q9's "compress the full managed runtime into the
v1 launch."

**Evidence that forced it:**
- D2 (`cloud-sync-and-refactor.md`, marked Locked) and S3-Q9 (`CONTEXT.md`,
  locked, more recent) are mutually exclusive on whether the cloud runs the
  runtime at v1. Both cannot be true.
- S3-Q9's "ship the full vision at launch" is the single most expensive, least-
  ASAP item in the entire plan — it reverses the founding "broke + launch-ASAP"
  constraint (Q8). It bundles the runtime Worker + concurrency layer + two-Worker
  split + LLM intelligence tier + Teams writes + SC8/SC9 into one launch.
- The original D2/ADR-0003 sequencing (cheap file-replica first, monetize, *then*
  build the runtime) was the prudent founder move.

**The split:**
- **v1 launch** = file-replica sync + dashboard + Better Auth + Polar billing +
  connector control-plane. Cheap, fast, revenue-generating. This is the D2 thesis,
  sequenced honestly.
- **v1.1 fast-follow** = `tekmemo-server` runtime Worker + hosted runtime +
  concurrency-layer completion + Teams writes + SC8 hosted-memory + SC9
  entitlement rows + LLM-enhanced intelligence tier. This is S3-Q9's ambition,
  sequenced honestly — weeks after v1 revenue, not all-at-once.
- **Slice 0 stays landed.** `createHostedRuntime` + `LlmClient` (commits `c443ea2`,
  `83253b1`) are **v1.1 prep already done**, not wasted work.

**Effect:** launch-critical scope shrinks roughly in half from S3-Q9. Restores the
"broke + launch-ASAP" discipline. Effectively reinstates ADR 0011's phased
sequencing, which S3-Q9 had compressed.

### K3 — Measure the bundle before committing the two-Worker split

**Replaces:** ADR 0013's unconditional two-Worker commitment.

**Evidence that forced it:**
- ADR 0013 justifies the entire split on a 3 MB compressed free-tier cap. But
  `createHostedRuntime` is a **thin factory over injected adapters** —
  `packages/server/src/` has **no eager adapter imports and no dynamic `import()`**
  (verified). The "hosted runtime's eager imports push the bundle past 3 MB"
  claim in the ADR is **asserted, never measured** against `wrangler deploy --dry-run`.
- Cloudflare's **paid cap is 10 MB compressed**, and ADR 0013 itself concedes the
  split "remains correct after a future Workers Paid upgrade."
- The runtime carries no model weights (adapters call out to providers); a single
  Worker plausibly fits.

**Decision:** run `wrangler deploy --dry-run` on a single-Worker config with the
runtime imports **before** baking the split into WF-3. Three outcomes:
1. Single Worker **> 3 MB free, ≤ 10 MB paid** → keep two Workers for the free
   tier, document the measurement, collapse to one on paid later.
2. Single Worker **≤ 3 MB** → collapse to one Worker; delete `workers/runtime.ts`
   + merge the wrangler configs. Simpler topology.
3. Single Worker **> 10 MB** → two Workers is load-bearing; ADR 0013 stands as-is.

`apps/cloud-2` already built the split (it has `workers/runtime.ts` +
`wrangler.runtime.jsonc` explicitly citing ADR 0013), so outcome 1 costs nothing;
outcome 2 is a deletion, not a rewrite.

### K4 — Core layering fix: kill the inverted core/cli dependency

**Replaces:** the MAP's original `client → core` rename direction (which, in the
charting, left the circular dependency unaddressed).

**Evidence that forced it:**
- `packages/client` (`@tekmemo/client`) **is the core runtime** — 13 subsystems
  (agentfs, ai-runtime, cloud-client, core, fs, graph, recall, rerank, security,
  testing…). Its own `index.ts` says *"TekMemo core."*
- `packages/tekmemo` (named like the product) **is the CLI** — `bin: { tekmemo }`,
  deps `@tekmemo/client` + `commander` + connectors. It is `packages/tekmemo-cli`
  by content.
- **The dependency is circular:** `client` imports foundational primitives
  (`MemoryPath`, `MemoryStore`, `assertMemoryPath`) from the CLI package
  (`@tekbreed/tekmemo`) in **18 files**; the CLI imports core in 1 file
  (`runner.ts`). Core reaches *up* into a consumer for core primitives — an
  inverted layering that survives today only by pnpm hoisting + build-order
  tolerance.

**The fix (three-part move):**
1. `packages/client` (`@tekmemo/client`) → `packages/core` (`@tekmemo/core`).
   The core runtime gets the conventional scoped name and **holds** the primitives.
2. `packages/tekmemo` **stays** `packages/tekmemo` (`tekmemo`, unscoped) — it is
   the CLI, and `npm install -g tekmemo` is the install command users expect.
   The CLI depends on `@tekmemo/core`.
3. Move the primitive *definitions* (`MemoryPath`, `MemoryStore`,
   `MemoryStoreError`, `assertMemoryPath`, canonical paths) out of the CLI into
   `@tekmemo/core`; the CLI re-imports them from `@tekmemo/core`. The 18-file
   cycle inverts to a clean `@tekmemo/core` ← `tekmemo` (CLI) arrow.

**Why `@tekmemo/core` over `tekmemo` (unscoped) for the core runtime:** the
unscoped `tekmemo` name stays on the CLI so `npm install -g tekmemo` and
`npx tekmemo` keep working as the primary install surface. `@tekmemo/core` is the
conventional, unambiguous name for the core library and avoids consumers
ambiguous-installng the engine when they meant the tool. (The CONTEXT Q15
glossary reservation of "core" governs *prose* usage — don't say "core" when you
mean the product or the memory runtime; a *package name* `@tekmemo/core` does
not collide with that.)

**Registry cost: zero.** `@tekmemo/client` is 404 on the public registry
(verified — pre-launch, unpublished), so the rename + scope flip has no
downstream-consumer blast radius.

### K5 — Tracker: GitHub Issues on tekbreed/tekmemo

**Replaces:** the local-markdown wayfinder tickets (`docs/wayfinder/tickets/*.md`).

**Why:** the repo has a GitHub remote (`tekbreed/tekmemo`); GitHub Issues give
native blocking semantics, frontier queries, parallel-session safety, and OSS
visibility ahead of the OSS launch. The 13 local tickets migrate to child issues
of a `wayfinder:map` issue. The local files are cleaned up as part of WF-5.

---

## Package state — verified real (not stubs)

Audited this session. All adapters are real implementations, not scaffolds:

| Package | Scope (current) | Status | LoC |
|---|---|---|---|
| `client` (→ `core`) | `@tekmemo/client` | **Core runtime** — 13 subsystems | large |
| `tekmemo` (→ `cli`) | `tekmemo` (unscoped) | **CLI** — depends on core | — |
| `adapter-openai` | `@tekbreed/tekmemo-adapter-openai` | real | 1349 |
| `adapter-voyage` | `@tekbreed/tekmemo-adapter-voyage` | real | 2117 |
| `adapter-transformers` | `@tekbreed/tekmemo-adapter-transformers` | real | 571 |
| `adapter-workers-ai` | `@tekbreed/tekmemo-adapter-workers-ai` | real | 310 |
| `adapter-r2` | `@tekbreed/tekmemo-adapter-r2` | real (blob-only per S3-Q3) | 209 |
| `adapter-ai-sdk` | `@tekbreed/tekmemo-adapter-ai-sdk` | real (extracted S2-Q1) | 1482 |
| `connectors` | `@tekbreed/tekmemo-connectors` | real — GitHub + Notion built | 2212 |
| `json-rpc` | `@tekbreed/tekmemo-json-rpc` | real | 364 |
| `server` | `@tekbreed/tekmemo-server` | real — slice 0 landed | 1238 |
| `mcp-server` | `@tekbreed/tekmemo-mcp-server` | real | — |
| `benchmark-kit` | `@tekbreed/tekmemo-benchmark-kit` | real | — |
| `testing` | `@tekbreed/tekmemo-testing` | real — contract suites + fakes | — |

Zero TODO/stub markers found in any adapter. `connectors.json` is already wired
as the 11th canonical file (`packages/client/src/core/constants/memory-paths.ts:46`).

**Scope flip pending:** all 12 scoped packages are `@tekbreed/tekmemo-*`; K1 +
WF-2 flip them to `@tekmemo/*`. `@repo/*` internal tooling is unchanged.

---

## apps/cloud state — two apps in limbo (resolved by K2 + WF-3)

- **`apps/cloud` (tracked, HEAD):** the full rich single-worker app — 204 files
  under `src/` (server/api/db, 58 routes, Better Auth, Polar, Drizzle, sync). Its
  **working tree** is a broken uncommitted template paste (68 files; `home.tsx`
  imports a non-existent `../welcome/welcome`; every `ui/*` imports deleted
  `~/lib/utils` + `~/hooks/*`; two conflicting wrangler files). HEAD is healthy;
  the working tree is not.
- **`apps/cloud-2` (untracked, never committed):** a diverged, **ahead-of-HEAD**
  fork that already implements the S3 two-Worker split — `workers/runtime.ts`,
  `wrangler.runtime.jsonc` (explicitly cites ADR 0013), full server/api/db stack
  (48 deps vs 39), and a `db:push/migrate/generate` toolchain. The "logic source"
  the MAP referenced.

**Resolution (founder-confirmed):** `apps/cloud`'s RRv8 + Hono + CF skeleton (the
correct config) is the ship target. `cloud-2` is **mined, not promoted** — its
major logic (runtime worker, wrangler.runtime, db toolchain, server/api/db stack)
is **ported into `cloud`** during WF-3. The uncommitted template paste in `cloud`'s
working tree is discarded (its fate was tied to this decision; now resolved).
`cloud-2` is deleted after WF-3 completes the port.

---

## The 13 wayfinder tickets — reconciled

| Ticket | Action | Reason |
|---|---|---|
| WF-1 adapter-cloudflare-contract | **REWRITE** → blob/metadata-decoupled contract (S3-Q3): `adapter-r2` (blob) + `adapter-turso` (metadata), N+M not bundled | MAP's bundled `adapter-cloudflare` (R2+D1) is dead under K1 |
| WF-2 naming-and-scope-overhaul | **EXPAND** → scope flip **+ K4 layering fix** (client→tekmemo, tekmemo→cli, move primitives down) | The core/cli cycle must die in the same pass as the rename |
| WF-3 cloud-rebuild-architecture | **REWRITE** → port `cloud-2` → `cloud` (not rebuild-from-scratch); RRv8+Hono+CF skeleton; **K3: measure bundle first** | `cloud` has the right config; `cloud-2` is the logic source |
| WF-4 cloud-d1-schema | **RENAME/REWRITE** → cloud-turso-schema (keep Turso); D1 migration cancelled | K1 → Turso is load-bearing for concurrency + self-host portability |
| WF-5 adr-and-ssot-doc-amendments | **EXPAND** → supersede ADR 0005/0012, mark D2 superseded by K2, fix `decisions.md` Q8 table, reconcile MAP↔S3, delete local WF tickets post-migration | The doc-decay cleanup this session surfaced |
| WF-6 core-review-and-500loc-refactor | KEEP (core = `packages/client` after the K4 rename) | Real engine code; 500-LoC audit valid |
| WF-7 remaining-packages-review | KEEP (adapters/connectors/json-rpc/server verified real) | Confirmed non-stub this session |
| WF-8 documentation-rebuild | KEEP + VitePress `check:links` green, AI-SDK page repoint, add `connectors.md`/`intelligence.md` | ADR 0008/0015 still govern |
| WF-9 changeset-reset | KEEP (pre-launch alpha reset across all packages) | Valid |
| WF-10 root-cleanup | KEEP (README/ROADMAP/Governance drift) | Valid |
| WF-11 cloud-production-deploy | **GATE** on K3 (bundle measurement) + WF-3 | Cannot deploy until worker topology is confirmed |
| WF-12 oss-launch-and-newsletter | KEEP, but launch = v1 file-replica (not full runtime) | Repositioned by K2 |
| WF-13 reposition-cloud-memory-host | **REWRITE** → v1 = "file replica + connector control-plane"; runtime pitch moves to v1.1 | K2 retires "runtime from v1" |

---

## Fog (open; graduates as the frontier reaches each)

1. **`@tekmemo` npm org existence.** Registry probe from this environment was
   auth-gated/inconclusive; `@tekmemo/client` is 404 (unpublished, pre-launch
   safe). **Must confirm the org exists or create it** before WF-2 can publish.
   Graduates into WF-2.
2. **Bundle-measurement outcome (K3).** Single-Worker ≤ 3 MB / ≤ 10 MB / > 10 MB
   decides whether the two-Worker split collapses, stays-free-tier-only, or stands.
   Graduates into WF-3.
3. **`RemoteBlobMemoryStore.append` race closure.** Is `73d2cef`'s metadata-DB
   `BEGIN IMMEDIATE` sufficient, or does the blob-store append need its own
   serialization? A v1.1 question, but the answer sizes the v1.1 concurrency
   "verify" work. Graduates into the v1.1 concurrency ticket.
4. **`cloud-2` deletion timing.** Keep until WF-3 finishes porting its logic into
   `cloud`; delete after. Sequencing note, not a decision.
5. **`examples/server`.** Exists in `examples/` (the `tekmemo-server` runnable
   self-host example per slice 1). Needs a once-over for old-name refs during WF-2.

---

## Build order (founder-confirmed: WF-2 first, strict order)

```
WF-2 (naming + K4 layering)  ← foundational: every ticket imports package names;
        │                       the core/cli cycle affects every build
        ▼
WF-5 (doc reconciliation / SSOT)
        │
        ▼
WF-1 (blob/metadata-decoupled adapter contract)
        │
        ▼
WF-3 (port cloud-2 → cloud, measure bundle K3)
        │
        ▼
WF-4, WF-6, WF-7, WF-8, WF-9, WF-10  ← parallelizable once foundation is clean
        │
        ▼
WF-11 (deploy, gated on K3 + WF-3) → WF-12 (launch) → WF-13 (repositioning)
```

WF-2 is first because it is foundational: the core/cli cycle and the scope flip
touch every package and every downstream import. No parallelism at the start;
the parallelizable band opens after WF-3.
