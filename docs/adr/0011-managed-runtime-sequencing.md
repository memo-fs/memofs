# ADR 0011: Managed-runtime sequencing — concurrency layer → Teams → full managed runtime

- **Status:** Accepted
- **Date:** 2026-06-24
- **Deciders:** Christopher S. Aondona
- **Revises:** [ADR 0003](./0003-managed-runtime-tier.md)

> **Terminology note (post-Q15):** uses "memory runtime" as the canonical
> term (the function layer — recall/extraction/consolidation). "Engine" survives
> only where code literally names something. See `docs/CONTEXT.md` → Canonical
> product nouns.

## Context

ADR 0003 locked the cloud's long-term purpose as a **managed-runtime tier** and
sequenced it **foundation-first** in two phases:

1. **v1 (file replica):** sync + dashboard + connector config + health.
2. **v1.x / v2 (managed runtime):** run the *same* local `Tekmemo` runtime + an
   embedder on hosted infra against the user's R2-resident files; expose
   recall/memory/graph by API.

That two-phase framing answered "is hosted recall killed, deferred, or
redefined?" but left **two questions un-sequenced** that a broke founder shipping
to revenue cannot leave open:

- **Teams.** ADR 0006 locks a **Teams tier at $24/seat/mo ("Coming Soon")** —
  the per-seat revenue milestone gated on Pro revenue or sponsorships. Teams is
  the single biggest revenue lever after Pro. *When* does it ship relative to
  the managed runtime?
- **The concurrency prerequisite.** [ADR 0010](./0010-cloud-concurrency-control-for-b3.md)
  locked a Turso/libSQL concurrency-control layer for **B3 ("one memory, many
  agents")**, and was explicit that **D6 (last-writer-wins + pre-sync snapshot)
  is insufficient for concurrent multi-writer access** — the loser of two
  simultaneous pushes *silently vanishes*. The ADR even noted the live sync
  handler admits `baseCursor` is "not gated at v1."

Grilling both surfaced a sharp, decision-forcing contradiction:

> **Teams-on-the-file-replica is a trust bug.** A team is, by definition,
> multiple humans (and their agents) writing to shared memory. Under D6, two
> teammates editing `core.md` concurrently means **one write silently loses.**
> The pre-sync snapshot lets you *roll back*, but rolling back does not *merge*
> — it picks one teammate's change. This is exactly the "silent corruption"
> ADR 0010 names, on the exact audience (multi-human teams) that feels it
> hardest, and it breaks the **file-first trust thesis** the entire positioning
> rests on ("a human can hand-edit `core.md` and trust it").

So the cloud has a locked revenue milestone (Teams) that its locked concurrency
model (D6) cannot safely support — the same gap ADR 0010 closed for B3, but for
*humans* instead of agents. And ADR 0010's fix (the concurrency layer) is
**independent of the full managed runtime**: it is a Turso serialization layer
in front of the existing file replica. It needs no hosted recall, no embedder,
no R2-backed `MemoryStore`. It is strictly smaller than the managed tier.

This ADR resolves the sequencing gap ADR 0003 left open.

## Decision

**Three phases, not two. The concurrency layer ships before both Teams and the
managed runtime, because both depend on it for safety:**

```
Phase 1 — Concurrency layer (ADR 0010, greenfield)
   Turso project-lock → validate-against-manifest → apply → release,
   in front of the existing file replica. No hosted recall/consolidation.
            │
            │ makes safe multi-writer (humans AND agents)
            ▼
Phase 2 — Teams tier (seats + per-seat billing + shared workspace)
   Ships on the concurrency-safe file replica. The first real per-seat revenue.
   Shared-project WRITE access is the concurrency-gated surface;
   read access is safe regardless.
            │
            │ ADR 0012 R2 store + extractor impl land in parallel/after
            ▼
Phase 3 — Full managed runtime (the ADR 0003 moat)
   R2-backed MemoryStore (ADR 0012) + hosted recall/consolidation/extraction
   against cloud-resident files. Unlocks Q19 intelligence entitlements
   (maxConsolidationRuns / maxPreWarmPerDay). The intelligence differentiator.
```

### Phase 1 — Concurrency layer (prerequisite)

Build [ADR 0010](./0010-cloud-concurrency-control-for-b3.md) for real. Today it
is an Accepted ADR with **zero code** (the sync handler literally comments that
`baseCursor` is "not gated at v1"). The layer:

- Reuses the **existing Turso instance** (ADR 0005) — no new infra.
- Serializes at the **manifest-commit boundary** (`project lock → validate
  against current manifest → apply → release`), not the blob layer.
- Engages on multi-writer contention (distinct API keys, or a stale `baseCursor`
  that indicates a concurrent commit). Single-user multi-device stays on D6
  (last-writer-wins + snapshot) — unchanged.

**Why first:** it is the smallest of the three phases and *both* downstream
phases depend on it — Teams for safe human collaboration, B3 for safe
multi-agent access. Shipping it first unblocks revenue (Teams) *and* a headline
differentiator (B3) without waiting on the full managed runtime.

### Phase 2 — Teams (revenue)

Ship the full Teams tier on the concurrency-safe replica:

- **Seats + per-seat billing** via Polar (ADR 0006), $24/seat/mo.
- **Shared workspace** — the team's shared projects.
- **Role model: Owner / Admin / Member** (locked, see `screens-locked.md` SC7).
- **Shared-project *write* access is the concurrency-gated path.** Read access
  is safe under D6 (multiple readers never conflict); the write path is what
  the phase-1 layer makes safe. This is the precise scope where "Teams needs the
  concurrency layer" lives.

**Why second:** Teams is the largest revenue lever after Pro, and phase 1 is
*all* it needs to be safe — it does **not** require hosted recall/consolidation.
A team that only syncs (no hosted intelligence) is still a compelling, safe,
revenue-generating product. Waiting for the full managed runtime to ship Teams
would defer per-seat revenue behind the single largest engineering lift in the
roadmap, for no safety or product benefit.

### Phase 3 — Full managed runtime (moat)

Build the ADR 0003 thesis for real: run the *same* `Tekmemo` runtime + embedder
on hosted infra against R2-resident files, exposing recall/memory/graph via API.
This is the phase that needs the **R2-backed `MemoryStore`** ([ADR 0012](./0012-r2-memory-store-adapter.md))
— Workers have no Node `fs`, so `local-strategy` won't run there unmodified —
plus a concrete extractor adapter (Q18).

- **Unlocks Q19 intelligence entitlements**: `maxConsolidationRuns`,
  `maxPreWarmPerDay` become enforceable (they are zero until the runtime is
  hosted).
- **Delivers the cloud differentiators** (Q18): always-on consolidation (A1),
  cross-device conflict resolution (A2), one-memory-many-agents (B3, on top of
  the phase-1 layer), session pre-warming (C5).

**Why last:** it is the largest lift (R2 store + hosted recall + consolidation +
extraction + the extract-adapter impl), and the only one with real per-user
compute cost (Workers CPU + LLM tokens). It is the moat, not the revenue
trigger — and sequencing it after Teams means revenue from seats funds the moat
work rather than the moat blocking revenue.

## Consequences

**Positive:**

- **Teams revenue is not blocked by the largest engineering lift.** The
  concurrency layer is smaller than the managed runtime; shipping it first lets
  Teams (the bigger revenue lever) land sooner.
- **One concurrency fix serves two audiences.** Phase 1 makes both multi-human
  (Teams) and multi-agent (B3) writes safe — the same Turso layer, the same
  manifest-commit serialization. No second mechanism for humans vs agents.
- **The trust thesis holds for the audience that stresses it most.** File-first
  ("a human can trust `core.md`") is most tested by a team concurrently editing
  it. Phase 1 → phase 2 means Teams never ships with a silent-data-loss bug.
- **Revenue funds the moat.** Per-seat Teams revenue (phase 2) helps fund the
  managed runtime (phase 3), rather than the moat work gating revenue.
- **ADR 0003's thesis is unchanged.** The cloud is still "run the same runtime
  on managed infra." This ADR only inserts a prerequisite (concurrency) and a
  revenue milestone (Teams) into the sequence ADR 0003 left as a single hop.

**Negative:**

- **Three phases, not two.** More milestones to sequence and communicate. The
  roadmap and docs must reflect the inserted concurrency + Teams step; ADR 0003's
  two-phase framing is now superseded for sequencing (its *thesis* stands).
- **The concurrency layer is load-bearing for Teams before it is battle-tested
  by B3.** Phase 2 depends on a phase-1 layer that has only just shipped. The
  serialization primitive (Turso `SELECT … FOR UPDATE` / advisory lock) is
  boring and well-understood, but the client retry path (re-run writes against
  a new manifest on a stale-base rejection) is real and must be solid before
  Teams writes land on it.
- **Phase 2 Teams is sync-only intelligence.** A Teams customer in phase 2 gets
  safe shared sync but no hosted recall/consolidation until phase 3. Honest, but
  the Teams marketing must not promise hosted intelligence until phase 3 ships
  (the Q18 differentiators).

## Alternatives considered

1. **Full managed runtime first (ADR 0003's literal two-phase order).** Build
   the whole thing — R2 store + hosted recall + consolidation + extraction +
   concurrency — before Teams. **Rejected:** it defers the largest revenue lever
   (Teams per-seat) behind the largest engineering lift, for no safety or
   product benefit. Teams doesn't need hosted intelligence to be valuable; it
   needs *safe concurrent writes*, which is the strictly-smaller phase 1.
2. **Teams first, on the raw file replica (skip the concurrency layer).**
   **Rejected:** ships a silent-data-loss bug for exactly the multi-human
   audience that hits it. Two teammates editing `core.md` concurrently lose a
   write under D6 — the snapshot rolls back but does not merge. This breaks the
   file-first trust thesis at its most visible point. The cheapest path, and the
   wrong one.
3. **Defer Teams until the full managed runtime.** **Rejected:** identical cost
   to alternative 1 for Teams' purposes, and leaves the biggest revenue lever
   gated on the biggest lift. The concurrency layer decouples them deliberately.
4. **Ship B3 (agents) before Teams (humans).** **Rejected as a sequencing
   choice:** both depend on the same phase-1 layer, but Teams carries
   per-seat *revenue* while B3 (multi-agent access) is a capability, not a
   billing event, until the managed runtime lands. Revenue-first is correct for
   a broke founder; B3 rides the same layer and ships when phase 3 does.

## Validation

- **D6 is verified insufficient for concurrent multi-writer**
  ([ADR 0010](./0010-cloud-concurrency-control-for-b3.md) Validation):
  `file-replication.ts` snapshots before mutating push/pull (rollback, not
  merge); two simultaneous pushes pick one winner. Confirmed in code.
- **ADR 0010 is Accepted with zero implementation** — the sync handler at
  `apps/cloud/src/api/sync/index.ts` comments that `baseCursor` is "not gated at
  v1 (no optimistic-concurrency check yet)." Phase 1 is greenfield, as stated.
- **Teams is a locked revenue milestone** (ADR 0006: $24/seat/mo, "Coming Soon",
  implementation gated on Pro revenue or sponsorships). This ADR sequences *when*
  it ships, not *whether*.
- **The managed runtime has zero code presence today** — `apps/cloud` exposes
  only `/v1/health`, `/v1/readiness`, `/v1/projects/:id/sync/*`; it imports
  `@tekbreed/tekmemo` only for `cloud-client` types, never `createTekmemo`. The
  R2-backed `MemoryStore` does not exist (→ [ADR 0012](./0012-r2-memory-store-adapter.md)).
- **Pricing is unaffected** by the sequence — ADR 0006 prices stand; Q33
  reaffirms the managed-tier differentiation is *entitlements* (caps), not
  price.

## References

- [ADR 0003](./0003-managed-runtime-tier.md) — managed-runtime tier (this ADR
  revises its two-phase *sequencing*; the *thesis* — same runtime, managed infra
  — is unchanged).
- [ADR 0010](./0010-cloud-concurrency-control-for-b3.md) — the phase-1 layer
  (locked for B3; this ADR makes it the prerequisite for Teams too).
- [ADR 0012](./0012-r2-memory-store-adapter.md) — the phase-3 R2-backed
  `MemoryStore` prerequisite.
- [ADR 0006](./0006-pricing-and-entitlements.md) — Teams tier ($24/seat/mo) +
  Q33 intelligence-entitlement differentiation.
- Decisions log: [`decisions.md`](../architecture/decisions.md) Q32 (this ADR),
  Q18 (cloud differentiators), Q19 (intelligence entitlements), Q25b (concurrency
  layer).
- Screen IA: [`screens-locked.md`](../architecture/screens-locked.md) SC7
  (Teams), SC8 (managed memory) — the phase-gated UI projection of this
  sequencing.
