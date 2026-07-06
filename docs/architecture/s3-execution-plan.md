# S3 Execution Plan — top-to-bottom build to launch

> **Status:** LOCKED execution worklist (2026-06-30). The build plan that turns
> the S3 grilling ([ADR 0013](../adr/0013-two-worker-split.md)–[0015](../adr/0015-docs-blueprint-reprojection.md)
> + the S3-Q1..Q9 CONTEXT terms) into a shipped OSS + Cloud v1.
>
> **Relationship to other docs:**
> - Public direction lives in root [`ROADMAP.md`](../../ROADMAP.md) (refreshed to
>   reflect the self-hosting tier — direction only, no dates).
> - **This** doc is the *internal engineering worklist*: every change, the
>   dependency order, the test bars. It is consumed and closed out, not a
>   marketing artifact. (Per S3-Q8 pushback: not `docs/roadmap.md` — that would
>   collide with `ROADMAP.md` and violate ADR 0008 Rule 2.)
> - Decisions are in [`CONTEXT.md`](../CONTEXT.md) + the ADRs; this plan
>   *executes* them and never re-derives them.

---

## Sequencing philosophy — vertical slices (S2)

Build the **thinnest end-to-end vertical** first, prove the provider-neutral
factory, then widen each axis. The single biggest risk in the whole grilling is
the `createHostedRuntime` refactor — if the factory abstraction is wrong,
*everything* downstream is rework. A thin vertical validates it before 6 adapters
are built against it. Slices produce a runnable self-hosted Memo FS at slice 1;
"battle-tested" is achieved by *running* the system, not by completing layers.

**Dependency chain (linear, must be honored — see S3-Q9):**

```
concurrency layer (ADR 0010)  ←── SC8 hosted writes are unsafe without it
        │
        ▼
Teams writes unlock (phase 2)
        │
        ▼
managed runtime + SC8/SC9 (phase 3)  ←── ships at launch per S3-Q9
```

ADR 0011's *content* (the three phases) is unchanged; S3-Q9 compresses its
*release cadence* into one launch. No slice that depends on a later phase may
ship before its prerequisite.

### Hard ordering rule — no unsafe write path lands before its serialization

> **Non-negotiable.** The plan is ordered so that **no concurrent-write surface
> is reachable before the serialization layer (ADR 0010) that makes it safe
> exists.** This is the rule that prevents shipping a known D6 data-loss bug.

The cloud's conflict model is **D6 (last-writer-wins)**. That is correct and
load-bearing for *single-writer* paths (one user, multi-device sync — a human
rarely writes the same file from two devices in the same second). It is a
**silent data-loss bug** the moment two writers hit the same project
concurrently (multiple agents over the network; teammates on a shared project;
hosted consolidation running while an agent writes). The concurrency layer
(ADR 0010) is the *only* thing that makes concurrent writes safe — it serializes
them: `project-lock → validate-against-manifest → apply → release`.

Therefore the dependency chain is **load-bearing and enforced below**:

```
concurrency layer (ADR 0010)        ← MUST exist first
        │
        ├──→ Teams shared-project writes (phase 2)
        └──→ hosted-memory writes (phase 3, SC8) + B3 multi-agent writes
```

Concretely, **every slice below that exposes a multi-writer surface is gated on
slice 3 (the concurrency layer) being merged first.** Slice 1 (the first
self-host vertical) is split: read endpoints + single-writer write endpoints
ship immediately; **concurrent-writer endpoints (`writeMemory` /
`updateCoreMemory` / graph upserts from multiple clients) are gated on slice 3**
and remain read-only / single-writer until it lands. No `#ifdef`-style
half-shipment: the gate is "the route does not exist / rejects with 503 until
slice 3 merges," never "the route exists unsafely."

See **"Hazards eliminated by ordering"** at the end for the specific races this
prevents, including a latent one in `RemoteBlobMemoryStore.append` that the
concurrency layer must close.

---

## Test-bar discipline (S3-Q8 pushback #2)

This plan specifies the **test strategy and coverage bars**, not the edge cases
themselves — those live in test files (tests are the source of truth for
"battle-tested"; enumerating edge cases as prose would duplicate tests and drift
the moment code changes, the failure mode ADR 0008 Rule 1 forbids).

**Universal bars (apply to every slice):**
- **Contract tests.** Every provider adapter passes the relevant contract suite
  from `@memofs/testing` (`MemoryEmbedder`, `Reranker`, `Extractor`,
  `LlmClient`, `BlobClient`, `MetadataStore`). A new interface = a new contract
  suite added to the testing package *first*.
- **Miniflare + Vitest** for unit/integration/visual-regression, per AGENTS.md.
  All mock/dev values in Miniflare.
- **Miniflare + Playwright** for e2e, per AGENTS.md.
- **Defensive-parsing parity.** Every LLM-backed adapter must prove malformed
  LLM output never throws (returns the empty/zero result) — the contract the
  rule-based fallback depends on.
- **Cross-runtime.** Anything Worker-loaded proves it has no eager `node:fs`
  import (the `local-strategy` lazy-load discipline).

---

## The slices

### Slice 0 — Foundations (contracts + factory skeleton)

**Build:**
- `LlmClient` core contract in `packages/memofs` (the 4th member of the
  embedder/reranker/extractor family). Add its contract suite to
  `@memofs/testing` *first* (the bar the impl must meet).
- The **provider-neutral `createHostedRuntime` factory** in a new
  `packages/memofs-server` package — takes injected
  `embedder`/`reranker`/`extractor`/`llmClient`/`store`, mirroring how
  `local-strategy` already works. No provider hardcoding. No HTTP yet (slice 1).

**Test bars:**
- `LlmClient` contract suite (deterministic fake impl) is green.
- Factory assembles a `Memofs` from injected fakes; rejects missing required
  slots with a clear error. No real provider calls.

**Defer:** the `LlmClient` *impl* (OpenAI) is slice 4; the HTTP surface is
slice 1.

---

### Slice 1 — First self-host vertical (HTTP + cloud's provider bundle)

**Build:**
- `memofs-server` HTTP surface (JSON-RPC over HTTP): `recall`, `context`,
  `graph`, `memory` endpoints — the runtime API that is the two-Worker boundary.
- Wire it with the **cloud's existing bundle** (R2 blob + Turso metadata + the
  existing Voyage embedder/reranker + Workers AI extractor) as the *first*
  provider config. This proves the factory end-to-end and means cloud + OSS share
  identical launch-critical adapter code.
- A runnable example/deploy doc for OSS self-hosters pointing at an R2-compatible
  bucket + Turso/libSQL + OpenAI (the canonical self-host path at launch).

**⚠️ Write-surface gate (enforced by the Hard ordering rule):** `memofs-server`
ships its **read** endpoints (`recall`, `context`, graph reads) and the
**single-writer** write endpoints immediately. The **concurrent-writer**
endpoints (`writeMemory` / `updateCoreMemory` / graph upserts callable from
multiple clients) are **gated on slice 3**: until the concurrency layer merges,
those routes either do not exist or return `503 Service Unavailable` with a
clear reason. **Never ship them unsafely.** The OSS self-host Node deploy has
the same gate (it serves the identical server code).

**Test bars:**
- End-to-end: `memofs-server` boots against a MinIO (R2-compatible) bucket +
  a local libSQL DB + fakes, serves a `recall` round-trip. Miniflare where the
  target is a Worker; containerized where it's Node.
- The HTTP surface matches the runtime API the cloud will consume via Service
  Binding (slice 2) — same shapes, so the OSS Node deploy and the cloud Worker
  deploy run identical server code.
- **Write-gate test:** pre-slice-3, a second concurrent writer to the same
  project gets `503`, not a silent lost write. Post-slice-3, both writers
  serialize (slice 3's contract suite).

**Defer:** native S3 + Postgres adapters (slice "Deferred"); the
OpenAI `Extractor` lands in slice 4 (OSS self-hosters use the cloud bundle's
Workers AI extractor or the rule-based fallback until then).

---

### Slice 2 — Cloud two-Worker split (ADR 0013)

**Build:**
- Second Cloudflare Worker: the **runtime Worker** = `memofs-server` deployed as
  a Worker, holding per-project `Memofs` instances.
- **Commercial Worker** (`apps/cloud`) loses the runtime bundle; hosted-memory
  calls delegate to the runtime Worker over a **Service Binding**.
- **Delete `apps/cloud/src/server/hosted-runtime.ts`** — replaced by the shared
  factory (slice 0). The `voyage-3-large` pin dies with it (Voyage v4 refresh is
  *incidental* to this slice, not separate work).
- Wire the Service Binding surface = the runtime API from slice 1.

**Test bars:**
- Commercial Worker bundle < 3 MB (the free-plan constraint that forced the
  split); runtime Worker bundle < 3 MB.
- Service-Binding round-trip: commercial → runtime `recall` returns correct
  results. Per-project instance state across binding calls (instance map; a
  Durable Object is a later optimization, not v1 — record it).
- Existing cloud sync + dashboard tests stay green (the commercial Worker's
  behavior is unchanged except hosted-memory delegation).

**Order note:** this slice depends on slice 0's factory; it does NOT depend on
slice 1's HTTP (the Service Binding is a direct call, not HTTP) — but building
slice 1 first proves the server code shape, so keep the order.

---

### Slice 3 — Concurrency layer (ADR 0010/0011 phase 1) — the safety gate

> **THE gate.** This is the merge that unlocks every concurrent-write surface
> downstream: slice 1's hosted-writer endpoints flip from `503` → live;
> slice 7's Teams shared-project writes unlock; slice 8's hosted-memory writes
> (SC8) + B3 multi-agent writes unlock. **None of those may ship before this
> slice merges.** Per the Hard ordering rule, this is the load-bearing
> prerequisite of the S3-Q9 compressed-sequence chain.

**Build:**
- The Turso/libSQL serialization layer in front of the file replica:
  `project-lock → validate-against-manifest → apply → release`. Makes multi-writer
  safe for both B3 (agents) and Teams (humans).
- **MUST close the `RemoteBlobMemoryStore.append` race** (see Hazards #2): the
  non-atomic read-modify-write in `append()` is unsafe under concurrency. The
  serialization layer wraps *all* mutating store ops (`write` / `append` /
  `delete`) — `append` specifically must serialize so two concurrent appends to
  `notes.md` cannot clobber each other. This is in-scope for slice 3, not a
  follow-up, because slice 1's writer endpoints turn on the moment slice 3
  merges.
- On merge, remove slice 1's write-surface gate (the `503`s become real routes).

**Test bars:**
- Concurrency contract suite: **two concurrent hosted writers to one project
  serialize correctly; no lost writes** (the D6 data-loss scenario, proven
  closed).
- **`append` race closed:** two concurrent `append`s to the same path both land
  (interleaved or ordered, never one lost) — the specific
  `RemoteBlobMemoryStore.append` hazard, proven fixed.
- Lock lifecycle: release on crash (stale-lock reclaimable, the git-index model);
  a held lock blocks a second writer cleanly (clear error, not a hang).
- The single-user multi-device path is unaffected (still last-writer-wins, D6) —
  prove the serialization layer is a no-op when there is no contention.

---

### Slice 4 — Provider adapter widen (OpenAI extractor + LlmClient impl)

**Build:**
- **OpenAI `Extractor`** in `memofs-adapter-openai` (the `extractor/` role joins
  `embedder/`). Direct Workers-AI-parity: chat-completion → subject-predicate-
  object facts, same relation vocabulary. This unlocks the canonical OSS
  self-host bundle (S3 + OpenAI for extraction).
- **OpenAI `LlmClient` impl** in `memofs-adapter-openai` (the
  `LlmClient` column — slice 0's contract, now implemented). Shares the OpenAI
  client with the extractor internally (composition).

**Test bars:**
- OpenAI `Extractor` passes the `Extractor` contract suite + provider-specific
  malformed-LLM-output tests (defensive-parse parity with Workers AI).
- OpenAI `LlmClient` passes the `LlmClient` contract suite (slice 0) +
  structured-output (JSON-schema) round-trip tests.
- Both adapters: no eager `node:fs`; `fetch`-based client (Worker-safe).

**Defer:** OpenAI `Reranker` (no native API; second-class; OpenAI users pair with
Voyage reranker). Workers AI `LlmClient` (defer).

---

### Slice 5 — Store-axis decoupling (R2 blob-only + Turso metadata extraction)

**Build:**
- **`memofs-adapter-r2` → blob-only.** Remove `turso-metadata-store.ts` from it.
- **`memofs-adapter-turso` → new, metadata-only.** The extracted Turso store
  (replica-aware: reuses the cloud's `project_files` table).
- `apps/cloud` imports `memofs-adapter-r2` + `memofs-adapter-turso` (one extra
  import; behavior unchanged).

**Test bars:**
- `BlobClient` contract suite green for R2 (unchanged behavior post-split).
- `MetadataStore` contract suite green for Turso (unchanged behavior post-split).
- Cloud's hosted runtime + sync still green against the decoupled imports.

**Defer:** S3 + Postgres native adapters (see "Deferred").

---

### Slice 6 — LLM-enhanced intelligence tier (ships at launch per S3-Q9)

> The deterministic defaults already ship (rule-based extractor, deterministic
> `consolidateGraph`, regex strategist). This slice adds their `LlmClient`-upgraded
> tiers — the deferred-to-launch-because-S3-Q9-says-so intelligence layer.

**Build (each feature: deterministic-default stays; `LlmClient` upgrade layers
on when injected):**
- **Retrieval strategist** (Q23): the 4-stage pipeline (rewrite/resolve/filter/
  budget). Deterministic default zero-config; `LlmClient` upgrades each stage.
- **Writer-critic consolidation** (Q25a): the semantic-consolidation stage before
  the deterministic pass; a critic gates each proposal.
- **Staleness re-verification** (Q24 v1.x): the `unverified` node status +
  re-verification stage; the Filter surfaces (not hides) low-trust facts.
- **Semantic consolidation** (Q25a): the adapter proposes merges the deterministic
  pass can't see.

**Test bars:**
- Each feature: deterministic-default path green with no `LlmClient` injected
  (zero-config); upgraded path green with a fake `LlmClient` (the deterministic
  seam is the contract).
- Strategist: core-memory non-negotiable (Tier-1 always injected) mechanically
  enforced. Staleness: `deprecated` nodes dropped, `unverified` surfaced.

---

### Slice 7 — Teams full (writes unlocked, phase 2)

> **Backward-gated on slice 3 (concurrency layer) — Hard ordering rule.** SC7
> reopened to v1 per S3-Q8. The Team *screen* (read-mostly: members list, roles,
> shared projects visible) is safe under D6 and can ship earlier; **the write
> unlock is the gated surface** and does not ship until slice 3 has merged.

**Build:**
- `/dashboard/team` moves from read-mostly → full: **shared-project writes
  unlock** (the concurrency-gated surface). Members get write access to shared
  projects, safe under the concurrency layer.
- The conditional "Team" nav item ships (not phase-2-conditional — v1). The
  read-mostly form may ship before slice 3; the write actions behind it are
  disabled (UI present, action returns "requires the concurrency layer" / 503)
  until slice 3 merges — same gate pattern as slice 1.

**Test bars:**
- Two teammates writing the same shared project serialize through the
  concurrency layer (slice 3); no D6 loss.
- Pre-slice-3: the write action is disabled and returns a clear error, never a
  silent lost write.
- Role model enforced (Owner/Admin/Member capabilities per the locked model).

---

### Slice 8 — Managed runtime + SC8/SC9 (phase 3, ships at launch per S3-Q9)

> **Backward-gated on slices 2 (runtime Worker) + 3 (concurrency) — Hard ordering
> rule.** SC8 hosted-memory screen. Hosted-memory **writes** (agent B3 writes,
  always-on consolidation A1 mutating the graph) are concurrent writes — they do
  not ship until slice 3 merges. The SC8 *screen* (read-only views: runtime
  status, consolidation run log, memory explorer) is safe under D6 and can render
  earlier; the write/enable surface is gated.

**Build:**
- **SC8 `/dashboard/memory`** — the four sections: Runtime status (with the
  read-only **"Runtime providers" line** — open-core honesty, S3-Q8),
  Consolidation (runs-today vs `maxConsolidationRuns`), Pre-warming (vs
  `maxPreWarmPerDay`), Memory explorer.
- **SC9** — `/pricing` + `/dashboard/billing` gain the Q33 entitlement rows
  (consolidation runs/day, pre-warming) + the 4-dimension entitlement snapshot.
- The 5th Overview card "Hosted memory" (extends SC3.1) when the tier's active.

**Test bars:**
- Entitlement enforcement: `count < cap` for all four dimensions (numeric caps,
  never `plan === "Pro"`).
- The "Runtime providers" line reflects the actual injected bundle.

---

### Slice 9 — No-legacy cleanup (S3-Q5)

**Build:**
- Remove `"memory"` mode + `packages/memofs/src/memofs/memory-strategy.ts`.
  Volatile store = inject an in-memory `MemoryStore` into `local` mode.
- Remove `RuntimeReadPolicy` / `RuntimeWritePolicy` from the public API. Hybrid
  mode always reads/writes local; sync is the explicit cloud surface.
- Delete `apps/cloud/TODO.md` (stale MSW line). Reword the "legacy in-memory
  maps" comment in `local-strategy.ts`. Verify/remove `local-embedder.ts` if
  dead vs `memofs-adapter-transformers`.

**Test bars:**
- `Memofs({ mode: "memory" })` constructor path removed; `local` mode with an
  in-memory store covers the volatile case.
- No public reference to the policy enums remains; examples updated.

---

### Slice 10 — Docs reprojection (ADR 0015)

**Build:**
- **Server nav item** (top-level, parallel to CLI/MCP) + the `memofs-server`
  home page.
- **Mode/policy sweep** across the ~8 pages (drop `"memory"` mode + policy
  tables; constructor shows `local | hybrid`).
- **`connectors.md` + `intelligence.md`** — ADR 0008's never-completed missing
  pages, folded in.
- **`configure/intelligence` + `configure/storage` landing pages** — orienting
  indexes (4-role model; 2-axis model), link-not-duplicate discipline.
- **AI-SDK pages** repoint at `@memofs/adapter-ai-sdk` +
  `MemofsMemoryRuntime` (the lingering S2-Q1 drift).
- The 15 drifted + 8 missing pages from ADR 0008's triage — same class, batched.

**Test bars:**
- `check:links` green (dead links fail the build — the Rule-1 enforcement).
- Landing pages contain no provider signature/defaults (Rule-2 audit).

---

### Slice 11 — Cloud L2 functional spec + final coverage hardening

**Build:**
- **L2 functional spec** for every cloud screen (S3-Q8): data sources, mutations,
  state machine, entitlement gates, empty/error/loading/over-cap edge states.
  Includes SC10 recent-activity (project-scoped activity feed), SC7 Team
  (full, writes unlocked), SC8 hosted-memory (with provider line), the SC4.1
  OAuth-start inventory fix.
- **Self-host-vs-Cloud copy** on landing `/` (SC2.1 §8 Comparison) + docs Server
  page — the "we run the same `memofs-server`, minus the ops" framing.
- **Coverage hardening:** tighten every slice's test bars to "battle-tested."
  The LLM-enhanced tier gets property/fuzz tests on defensive parsing.

**Test bars:**
- Full e2e (Miniflare + Playwright): signup → project → sync → connectors →
  hosted memory → team → billing flows green.
- Every entitlement edge (over-cap, plan-upgrade mid-flow) covered.

---

## Hazards eliminated by ordering

The Hard ordering rule exists to make these specific races **unreachable**, not
merely "unlikely." Each is a silent data-loss bug (no error, no merge, no
conflict detected) under D6. They are closed by slice 3 (the concurrency layer)
and gated off until it merges.

1. **`core.md` replace-whole-file race (the canonical D6 loss).** Two hosted
   writers each read `core.md`, mutate, write back; the second write clobbers
   the first. The exact scenario ADR 0010 was designed for. Closed by the
   serialization layer wrapping `write()`. Unreachable pre-slice-3 because
   slice 1's writer endpoints return `503`; slices 7/8's write actions are
   disabled.

2. **`RemoteBlobMemoryStore.append` non-atomic read-modify-write (latent,
   discovered during this grilling).** `append()` at
   `packages/memofs/src/fs/remote-blob-memory-store.ts:167` is
   `safeRead → concat → put → upsertEntry` — a read-modify-write with no lock.
   `notes.md` (append-only, the canonical write path) is the hot surface: two
   concurrent agent writes to `notes.md` lose one silently. **Closed by slice 3**:
   the serialization layer wraps all mutating store ops, and `append` in
   particular must serialize so concurrent appends interleave, never clobber.
   This is in-scope for slice 3 (not a follow-up) because slice 1's writer
   endpoints turn on the moment slice 3 merges.

3. **Hosted consolidation (A1) racing an agent write.** Always-on consolidation
   retires graph nodes (mutates `graph/*.jsonl`) while an agent writes a new
   fact; under D6 the agent's write or the retirement is lost. Closed by slice 3
   serializing both through the project lock. Unreachable pre-slice-3 because
   SC8's consolidation-run surface (slice 8) does not ship until slice 3 merges.

4. **Teams shared-project concurrent teammate writes.** Two members edit the
   same shared project; D6 loses one. Closed by slice 3. Unreachable pre-slice-3
   because the shared-project write action (slice 7) is disabled until slice 3
   merges (the read-mostly Team screen is safe under D6).

**The invariant the ordering enforces:** *no code path exists in a released
slice that lets two writers mutate the same project's files without serializing
through the concurrency layer.* Every gate above is "route absent / 503," never
"route present unsafely."

---

## Deferred — documented, post-launch (S3-Q9)

These are **not** launch-critical. OSS self-hosting launches against the cloud's
R2 + Turso bundle (R2 is S3-compatible; Turso/libSQL is free + easy); the native
adapters are conveniences, not blockers.

| Deferred item | Why deferrable | Resumes when |
|---|---|---|
| **`memofs-adapter-s3`** (blob) | R2's S3-compatible API serves self-hosters initially ("bring your R2-compatible endpoint"). A native S3 client is a convenience. | Post-launch, first adapter ask. |
| **`memofs-adapter-postgres`** (metadata) | Self-hosters start with Turso/libSQL (free, easy). The standalone-store schema (`memofs_files` + `ensureSchema()`) is the real effort. | Post-launch, alongside S3. |
| **OpenAI `Reranker`** | No native rerank API; LLM-judge is a worse Voyage reranker. OpenAI users pair with Voyage. | If a user explicitly needs OpenAI-only. |
| **Workers AI `LlmClient`** | Frontier extraction is its launch role; the LLM-enhanced tier runs on OpenAI's `LlmClient` (slice 4) at launch. | If Workers AI LLM parity is asked for. |
| **GCS (blob) + D1/SQLite (metadata)** | Further-out store adapters; S3 + Postgres precede them. | Post the S3/Postgres adapters. |
| **SQLite metadata (`node:sqlite`)** | Strongest "easiest self-host" story but waits on Node stabilizing `node:sqlite` past experimental. | When Node stabilizes it. |
| **Optional runtime Worker → Durable Object** | Per-project instance state across Service-Binding calls uses an instance map at v1; a DO is a scale optimization. | If hosted-memory load justifies it. |
| **Admin panel (SC6)** | Reserved at v1 (`/admin/*` namespace + `accounts.is_staff`); staff ops covered by Polar/Turso/Cloudflare/Sentry dashboards. | Post-revenue. |
| **Capacity-pack add-ons** | Designed into the schema at v1, shipped at v2 when Pro revenue justifies metered billing. | v2. |
| **Memory webhooks (B4) + cross-project/org memory (D6)** | Rejected-at-v1 cloud differentiators (Q18). | Revisit post-v1. |

---

## Acceptance — "100% ready and battle-tested"

The launch is done when:
1. Every **BUILD** slice (0–11) is merged with its test bars green.
2. The **two-Worker split** is deployed (commercial + runtime, both < 3 MB).
3. **The Hard ordering rule holds end-to-end:** the concurrency layer (slice 3)
   merged before any of slice 1's writer endpoints, slice 7's Team writes, or
   slice 8's hosted-memory writes went live. No concurrent-write surface was ever
   reachable before its serialization. (This is the no-data-loss guarantee.)
4. **The four Hazards are proven closed** by the slice-3 concurrency contract
   suite (incl. the `RemoteBlobMemoryStore.append` race fix).
5. `memofs-server` is published and deployable (Node single-process + Worker).
6. Docs `check:links` is green and the mode/policy sweep is complete.
7. The L2 functional spec covers all 16 + SC10/SC7-v1 screens.
8. The **Deferred** section above is the *only* unshipped locked scope.
