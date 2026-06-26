# ADR 0003: The cloud's long-term purpose is a managed-runtime tier; v1 ships the file-replica foundation first

- **Status:** Accepted
- **Date:** 2026-06-20
- **Deciders:** Christopher S. Aondona

> **Terminology note (post-Q15):** this ADR predates the Q15 glossary lock
> (2026-06-21). Uses of "engine" refer to what is now canonically the "memory
> runtime." See `docs/CONTEXT.md` → Canonical product nouns.

## Context

`README.md` and `ROADMAP.md` promise the cloud will host recall / vector / graph
/ evals. But the v1 cloud on the active refactor branch is a **file replica** —
it does not instantiate the `Tekmemo` runtime (verified in code: the trimmed
`TekMemoCloudClient` exposes only `health`/`readiness`/`sync`;
`packages/tekmemo/src/tekmemo/sync/file-replication.ts` only moves bytes). So v1
physically cannot run recall yet.

The question: is hosted recall/vector/graph killed, deferred, or redefined? And
if it returns, in what form — a separate cloud engine, or the *local* engine
re-hosted?

The founder's stated intent is explicit: *"the whole point of the cloud is to
run the local engine. If you can't/won't run it yourself, we host your memory
and you integrate via API."* This ADR records how that intent is realized
without contradicting the v1 file-replica refactor.

## Decision

**The cloud's long-term purpose is to run the local engine and host memory for
API integration. The v1 file-replica is the foundation for that — not an
alternative to it.** Sequenced foundation-first:

1. **v1 cloud (this refactor):** file-replica sync + dashboard + connector
   config + health/readiness. The `TekMemoCloudClient` contract stays at
   `health`/`readiness`/`sync` (+ the `connectors/:id/secret` endpoint from ADR
   0002).
2. **v1.x / v2 cloud (managed-runtime tier):** spin up the **identical**
   `Tekmemo` runtime + an embedder on Cloudflare Workers/Pages against the
   user's R2-resident files; expose recall/memory/graph by *additively*
   re-expanding `TekMemoCloudClient` with the engine namespaces.

**There is exactly one engine implementation.** It runs in two places — the
user's laptop and managed infra — against the same files. No second source of
truth, no drift. This is the Vercel/Supabase model: self-host the runtime free
(OSS, MIT), or pay us to run the same code on managed infra.

**Why foundation-first sequencing is required, not optional:** to run the engine
on hosted infra, the cloud first needs the user's `.tekmemo/` files resident in
R2. That is exactly what the v1 file-replica refactor builds. Sync is the
*prerequisite* for the managed engine, not a competitor to it. The files must
exist in the cloud before the cloud can run an engine over them.

## Consequences

**Positive:**

- Makes the README/ROADMAP "hosted recall" promise literally true (when the
  managed tier ships) without building a separate cloud engine.
- Preserves the single-engine principle — one implementation, two run sites.
- Gives the cloud a genuine long-term moat ("local-first by default;
  managed-engine-as-a-service when you don't want to run it") rather than the
  weak "sync + dashboard" moat a dumb-replica-only cloud would have.
- Ships value early: v1 sync lands now on work that is already ~80% done on the
  branch.

**Negative:**

- The v1 cloud has no hosted recall/graph/MCP endpoint until the managed tier
  ships. The `apps/tekmemo-mcp-worker` (currently built on the deleted cloud
  engine) is **shelved for v1** and reopens as the first managed-tier instance.
- Re-expanding `TekMemoCloudClient` with engine namespaces is additive (v1
  contracts are not broken), but the cloud gains real operational complexity:
  process lifecycle, concurrency, memory, cold starts, compute billing.

## Alternatives considered

1. **Kill hosted engine forever; cloud = sync only.** Rejected: cedes the entire
   managed-memory market segment; the cloud becomes a low-margin sync utility
   with a weak moat.
2. **Hold v1 until the managed engine is also ready.** Rejected: the managed
   engine *depends on* the file-replica existing first, so the two would be
   built serially regardless; labeling the combined result "v1" only delays
   shipping sync for no benefit.
3. **Build a separate cloud engine (not the local one).** Rejected: reintroduces
   the two-brains-drift problem the refactor was built to eliminate.

## Validation

- Code state on branch confirms v1 cloud is a file replica (no runtime
  instantiation); managed tier is unbuilt (as expected for this sequencing).
- Consistent with `cloud-sync-and-refactor.md` §13's hedge ("may return as
   additive premium features in a future managed-engine tier") — this ADR makes
   that hedge explicit.

## Doc fixes required (tracked, not yet applied)

- `README.md` lines 145–146, `ROADMAP.md` lines 35–37: reframe "hosted vector
  recall / graph / evals" as the managed-runtime tier (v1.x/v2), not v1 early
  access.
- README architecture / OSS-vs-Cloud table: state the thesis.

## References

- Decisions log: `docs/architecture/decisions.md` Q4
- Cloud refactor spec: `docs/architecture/cloud-sync-and-refactor.md` §12, §13
- v1 client surface: `packages/tekmemo/src/cloud-client/types.ts`
  (`TekMemoCloudClient` → health/readiness/sync)
- Shelved worker: `apps/tekmemo-mcp-worker` (reopens as managed-tier instance)

## Revision history

- **2026-06-20** — Accepted. Two-phase foundation-first sequencing (v1 file
  replica → v1.x/v2 managed runtime); "same engine, managed infra" thesis.
- **2026-06-24** — **Sequencing revised by [ADR 0011](./0011-managed-runtime-sequencing.md).**
  The two-phase hop (replica → managed runtime) is widened to **three phases:
  concurrency layer → Teams → full managed runtime.** The forcing insight: D6
  (last-writer-wins) makes Teams-on-replica a silent-data-loss bug, and the
  concurrency layer ([ADR 0010](./0010-cloud-concurrency-control-for-b3.md)) is
  strictly smaller than the full managed runtime — so it ships first and unblocks
  Teams revenue safely. **This ADR's thesis is unchanged** (same runtime, managed
  infra); only the *sequence* to get there is refined. The managed runtime is
  now phase 3, gated on the R2-backed `MemoryStore` ([ADR 0012](./0012-r2-memory-store-adapter.md))
  + a concrete extractor adapter. See decisions log Q32.
