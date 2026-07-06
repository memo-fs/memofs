# New Architecture — Decisions Log

> **Governing artifact (2026-07-04):** [`reconciliation-2026-07-02.md`](./reconciliation-2026-07-02.md)
> (LOCKED). It locked five keystone decisions (K1–K5) that resolve contradictions
> between this log's Q8 ("ONE Worker", bundled adapter) and the S3 grilling
> (`s3-execution-plan.md`, ADRs 0013–0015). Where this log's body conflicts with
> K1–K5, the reconciliation wins. The relevant amendments: scope flipped
> `@memofs/*` → `@memofs/*` (recorded as [ADR 0016](../adr/0016-scope-flip-and-dir-equals-name.md));
> D1 rejected, Turso/libSQL stays (K1); the two-Worker split is gated on a bundle
> measurement (K3, [ADR 0013](../adr/0013-two-worker-split.md) amended); D2's
> sync-only v1 is reinstated, the managed runtime is a v1.1 fast-follow (K2,
> [ADR 0011](../adr/0011-managed-runtime-sequencing.md) amended).

> **Terminology note:** Q15 (locked 2026-06-21) established the canonical
> glossary. Uses of "engine" in Q1–Q14 predate this — the canonical term is
> "memory runtime." Uses of "smart"/"intelligent" as unquantified claims are
> now avoided; the canonical metric is cold-start token reduction (Q16). See
> `docs/CONTEXT.md` → Canonical product nouns.

> **Status:** Living document. Captures decisions resolved during the
> `new-architecture.md` design session (connectors, cloud shape, decay/conflict,
> package triage, cloud stack, pricing, connector set) and the follow-on
> session 2 (ai-sdk extraction, package review, docs IA) and session 3
> (positioning, intelligence north star, cloud differentiators, pricing
> extension, testing). Updated inline as each branch of the design tree is
> resolved. **Q1–Q10 + S2-Q1 + Q11–Q28 + Q29–Q33 are all locked.** Numbering is
> collision-free:
> - **Q1–Q5** — original open questions (connectors, decay/conflict, cloud
>   purpose, intelligence scope).
> - **Q6** — package triage. **Q7** — per-package review. **Q8** — tech stack
>   (license decision folded in here). **Q9** — pricing. **Q10** — connector set.
> - **S2-Q1** — session 2: `ai-sdk/` extraction. (Numbered `S2-Q*` to avoid
>   collision with the original `Q*` series.)
> - **Q11–Q14** — implementation-time decisions (worker build blocker, DB naming,
>   project provisioning, cursor format).
> - **Q15–Q20** — session 3: positioning & glossary (Q15), intelligence north
>   star (Q16), v1.x local intelligence capabilities (Q17), cloud
>   differentiators + extractor strategy (Q18), pricing extension — intelligence
>   entitlement + hybrid add-on model (Q19), testing stack boundaries (Q20).
> - **Q21–Q28** — session 4: the retrieval model surface (Q21 four-verb tool
>   surface), write intelligence (Q22), the retrieval strategist (Q23), the
>   staleness loop (Q24), writer-critic consolidation (Q25a), cloud concurrency
>   control for B3 (Q25b), entity-centric recall output (Q26), progressive
>   recall protocol (Q27), local concurrency enforcement (Q28).
> - **Q29–Q33** — session 6: managed-runtime sequencing & prerequisites
>   (grill-with-docs). Q29 corrects a recurring premise about connectors;
>   Q30/Q33 reaffirm pricing; Q31 → ADR 0012 (R2 memory store adapter);
>   Q32 → ADR 0011 (three-phase sequencing, revises ADR 0003). Projects into
>   `screens-locked.md` SC7–SC9 (Teams, managed memory, pricing/billing deltas).
>
> **Relationship to other docs:**
> - Governs and extends `docs/architecture/cloud-sync-and-refactor.md` (the
>   locked cloud-sync refactor spec, decisions D1–D9).
> - Supersedes the rough proposal in root `new-architecture.md` (its open
>   questions are answered here one by one).
> - Projects into [`docs/architecture/screens-locked.md`](./screens-locked.md)
>   (the frozen screen IA for the Cloud + Docs apps; `SC-*` decisions trace back
>   here).
> - ADRs (`docs/adr/`) are reserved for decisions that are hard-to-reverse,
>   surprising without context, and the result of a real trade-off. Decisions
>   from this session promoted to ADRs:
>   - [ADR 0002](../adr/0002-connectors-run-locally.md) — connectors run locally
>     (from Q1–Q3).
>   - [ADR 0003](../adr/0003-managed-runtime-tier.md) — managed-runtime tier,
>     foundation-first (from Q4).
>   - [ADR 0004](../adr/0004-v1-intelligence-extraction-and-consolidation.md) —
>     v1 intelligence surface (from Q5).
>   - [ADR 0005](../adr/0005-cloud-tech-stack.md) — cloud tech stack (from Q8).
>   - [ADR 0006](../adr/0006-pricing-and-entitlements.md) — pricing tiers +
>     Polar + entitlement model (from Q9).
>   - [ADR 0007](../adr/0007-ai-sdk-extraction.md) — extract the Vercel AI SDK
>     integration to an adapter package; runtime-via-Memofs contract origin
>     (from S2-Q1).
>   - [ADR 0008](../adr/0008-docs-information-architecture.md) — docs information
>     architecture: four rules + routing blueprint (from session 2, S2-Q3
>     follow-on).
>   - [ADR 0009](../adr/0009-intelligent-retrieval-model.md) — the intelligent
>     retrieval model: 4-verb surface, write-side gate, 4-stage strategist,
>     staleness hiding, entity-centric + progressive recall (from Q21–Q24, Q26,
>     Q27).
>   - [ADR 0010](../adr/0010-cloud-concurrency-control-for-b3.md) — a Turso/libSQL
>     concurrency-control layer for the cloud B3 multi-writer workload (from
>     Q25b).
>   - [ADR 0011](../adr/0011-managed-runtime-sequencing.md) — managed-runtime
>     sequencing: concurrency layer → Teams → full managed runtime (from Q32;
>     revises ADR 0003's two-phase sequence).
>   - [ADR 0012](../adr/0012-r2-memory-store-adapter.md) — R2-backed MemoryStore
>     as a new adapter `@memofs/adapter-r2` + provider-neutral
>     remote-blob store contract in core (from Q31).
>   Q10 (connector set) and the license decision (folded into Q8) are captured in
>   this log; the provider-neutral `Connector` interface from Q10 folds into
>   ADR 0002's extensibility coverage.
> - **Session 3 (Q15–Q20) ADR updates:** ADR 0006 is **updated** by Q19 (adds
>   `maxConsolidationRuns` + `maxPreWarmPerDay` + the v2 add-on architecture).
>   Q18's extractor strategy folds into ADR 0004 + ADR 0003. Q15/Q16/Q17/Q20 are
>   captured in this log only (positioning/roadmap/conventions, not
>   hard-to-reverse architecture).
>
> **How to read:** each entry has `Question → Answer → Rationale → Status →
> Open sub-questions`. A decision is **Locked** once the user confirms it;
> **Draft** while still being grilled.

---

## Q1 — Where do connectors (Notion, GitHub, …) execute?

- **Question:** `new-architecture.md` §3 said "connectors should be in the cloud
  and sync with local memory engine." But the locked refactor (`cloud-sync-and-
  refactor.md` D1/D2) makes the cloud a dumb file replica that never embeds,
  recalls, extracts, or ingests. These conflict. Where do connectors run?
- **Answer:** **Connectors run locally; the cloud only replicates the resulting
  files.** (User picked Option A, 2026-06-20.)
- **Rationale:** A connector is an ingestion operation — it fetches, normalizes,
  chunks, embeds, and extracts into ``.memofs/``. Ingestion is an engine concern;
  the engine is local. Hosting connectors server-side would re-open the
  "cloud-as-engine" decision the refactor just closed and would force the cloud
  to embed/extract, contradicting D7 (indexes derived locally). Cloud stays dumb.
- **Status:** **Locked.** Reaffirms D1/D2; does not modify them.
- **Open sub-questions:** none for this decision (see Q2 for how connectors are
  added/run).

---

## Q2 — How do users add and run connectors if execution is local?

- **Question:** If connectors run on the user's machine, can users still "add"
  them from the web? Where does configuration live, and what triggers a run?
- **Answer:** **Config syncs down from the web dashboard; the local runtime
  executes on schedule/session.** (User picked Option 1, 2026-06-20.)
  - **Control plane = Memo FS Cloud dashboard** (the future `apps/api` build
    target): user adds a connector and pastes a token. The cloud stores config
    + a credential pointer. This is the Linear/`.git/config` model — editable
    from the UI, acted on locally.
  - **Data plane = local runtime** (CLI / MCP server / scheduled daemon): pulls
    the connector config down via sync, fetches the external source (Notion,
    GitHub, …), ingests through the **local** engine into ``.memofs/``, and the
    resulting files sync back up like any other canonical file.
  - **Execution only happens while the local runtime is alive.** Honest for a
    local-first OSS product (like `git` only fetching when you run it).
- **Rationale:** Keeps D1/D2 intact — the cloud holds config + a pointer, never
  engine logic. No new hosted-worker cost. Consistent with the "one brain + a
  mirror" thesis in §1.3 of the refactor doc.
- **Status:** **Locked** (core model **and** both implementation details below).
- **Implementation details (both locked, 2026-06-20, user accepted the
  recommended Option A):**
  1. **Connector-config storage shape:** connector config becomes the **11th
     canonical file** — ``.memofs/`connectors.json` — joining the 10 in
     `packages/memofs/src/core/constants/memory-paths.ts`. It is a sync unit:
     `computeLocalManifest()` in `file-replication.ts` walks 11 files now
     (10 canonical + snapshots + `connectors.json`). Every device sees the same
     connector setup via the existing file-replication sync.
  2. **Secret handling:** tokens **never** ride in the file-replica (R2 blobs
     are readable; `packages/memofs-cli/src/utils/secrets.ts` is built to catch
     exactly this). ``.memofs/`connectors.json` holds only an opaque `secretRef`
     (e.g. `"ss_abc123"`) per connector — type, schedule, source mapping,
     enabled flag, and the ref — **never** the token itself. Tokens live in
     Memo FS Cloud's server-side secret store (MemofsAuth / Turso-encrypted or
     Cloudflare Secret). The local runtime fetches the token over an
     authenticated call right before a run, holds it in memory only, never
     writes it to disk.
- **Cloud contract additions (to be folded into §7/§12 of the refactor doc):**
  - One new canonical file: ``.memofs/`connectors.json` (sync unit, no secrets).
  - One new authenticated endpoint on the future cloud for secret retrieval,
    e.g. `GET /v1/projects/:projectId/connectors/:connectorId/secret` → returns
    the decrypted token to an authenticated, scoped client. This is a
    **config-plane** call (control), not a data-plane/engine call; it does not
    violate D2 (no hosted recall/ingestion).
- **Pattern reference:** GitHub Actions secrets / Vercel env vars — the *what*
  is versioned (synced config), the *credential* is fetched live.

---

## Q3 — Memory decay & conflict resolution: is the local engine smart enough?

- **Question (from `new-architecture.md` open question 2):** with connectors now
  ingesting external data locally and multi-device sync, is the local memory
  engine smart enough to handle memory decay and conflict resolution?
- **Answer:** **Yes for recall decay and human multi-device conflicts; needed a
  new rule for connector re-ingestion conflicts.** (Resolved 2026-06-20, user
  accepted the recommended Option A.)
- **Findings (verified in code):**
  1. **Recall decay — already implemented.** `packages/memofs/src/recall/hybrid/
     hybrid-recall.ts` (lines 89–185) scores
     `finalScore = 0.7·relevance + 0.2·recency + 0.1·confidence`, where `recency`
     is an exponential half-life decay (default 30 days; now→1.0, 30d→0.5,
     60d→0.25). It self-tunes ranking toward current relevance, never
     hard-deletes. Smart enough for ranking.
  2. **Human multi-device conflicts — already decided + implemented (D6).**
     Last-writer-wins per file + mandatory pre-sync snapshot.
     `packages/memofs/src/memofs/sync/file-replication.ts` calls
     `createPreSyncSnapshot()` before every mutating `push` and `pull` (lines
     204, 226) and fails closed. Correct for single-user multi-device (the
     Dropbox/iCloud model).
  3. **Connector re-ingestion conflicts — were NOT safe under D6 alone.**
     Scheduled connectors re-ingest the same external content on multiple
     devices and can produce non-deterministic sha256s (timestamps, ordering),
     causing phantom manifest conflicts; and under last-writer-wins a connector
     run could silently clobber a concurrent *human* note in the same file.
- **Decision (Option A, locked): connector isolation + content-deterministic
  writes.**
  - **Connector isolation:** connector-ingested content writes to **its own**
    region, never intermingled with human-authored notes in a way that a
    background connector run can overwrite a human note under D6. (Exact storage
    shape — new region vs. inside `notes.md` with a stable discriminator — see
    the sub-question below; both satisfy isolation.)
  - **Content-deterministic writes:** connector writes are keyed by **stable
    external id**, with no wall-clock or volatile ordering embedded in the
    hashed bytes. Re-ingesting unchanged external content → identical sha256 on
    every device → manifest diff reports "no change" → no phantom conflict, no
    needless upload.
  - D6 is **unchanged** and remains correct for human edits. No event-log
    engine, no new per-line conflict machinery.
- **Sub-question (storage shape) — Locked: inside `notes.md` with a stable
  `source: connector` discriminator (no new canonical region).** Rationale:
  - `notes.md` is already append-only markdown where every entry carries a
    `source:` field and a content-derived stable `metadata.id` (e.g.
    `mem_d42f34bce417d0e5`).
  - The schema (`packages/memofs-mcp-server/src/schema.ts` `sourceRefSchema`,
    line ~110) already enumerates `"connector"` as a valid `sourceType`, with a
    `sourceId` field for the stable external id.
  - So connector notes fit the existing data model **with zero new files**: a
    connector note is just a note with `source: connector`, `sourceId:
    <external-id>`, and a content-derived `id` (so re-ingest of unchanged
    content reproduces the same bytes).
  - ``.memofs/`connectors.json` (from Q2) holds the *connector config*; the
    *ingested content* lives in `notes.md` (and derived `chunks.jsonl` /
    `embeddings.jsonl` / graph nodes as usual). Config ≠ content.
  - Rejected alternative: a new ``.memofs/`sources/` region as extra sync units.
    More files, more sync surface, no benefit over the existing discriminator
    model that the schema already supports.
- **Status:** **Locked.**
- **Footnote (out of scope for v1):** decay affects **ranking only**, not
  storage. Nothing is garbage-collected. A user connecting a large Notion
  workspace (tens of thousands of pages) will see unbounded JSONL growth in
  `chunks.jsonl` / `embeddings.jsonl` / `graph/nodes.jsonl`. This is acceptable
  at v1 (single-user scale, R2 is cheap) but is flagged as a future concern
  (retention/TTL/archive policy), not a v1 blocker.
## Q4 — How does Memo FS Cloud stay unique and relevant long-term?

- **Question (from `new-architecture.md` open question 3):** how do we make
  Memo FS Cloud VERY unique and outstanding to capture users' attention and
  remain relevant in the long term?
- **Contradiction surfaced:** `README.md` lines 145–146 and `ROADMAP.md` lines
  35–37 promise the cloud will host recall/vector/graph/evals ("🌱 early
  access" / "managed versions of the capabilities the OSS runtime computes
  locally"). But the v1 cloud on this branch is a **file replica** — it does
  not instantiate the `Memofs` runtime (verified in code:
  `packages/memofs/src/memofs/sync/file-replication.ts`; the trimmed
  `MemofsCloudClient` in `cloud-client/types.ts` exposes only
  `health`/`readiness`/`sync`). So v1 physically cannot run recall yet.
- **Answer (locked, 2026-06-20, Option A):** **The cloud's long-term purpose is
  to run the local engine and host memory for API integration. The v1
  file-replica is the foundation for that — not an alternative to it.**
  - **Thesis (the founder's stated intent, affirmed):** "the whole point of the
    cloud is to run the local engine. If you can't/won't run it yourself, we
    host your memory and you integrate via API." This is the Vercel/Supabase
    model applied to memory: self-host the runtime free (OSS), or pay us to run
    the *same code* on managed infra.
  - **Why "foundation-first" sequencing is required, not optional:** to run the
    engine on hosted infra, the cloud first needs the user's ``.memofs/`` files
    resident in R2. That is exactly what the v1 file-replica refactor builds.
    Sync is the *prerequisite* for the managed engine, not a competitor to it.
    The files must exist in the cloud before the cloud can run an engine over
    them.
  - **v1 cloud (this refactor):** file-replica sync + dashboard + connector
    config (Q1–Q3) + health/readiness. Ships soon. The `MemofsCloudClient`
    contract stays at `health`/`readiness`/`sync` (+ the planned
    `connectors/:id/secret` from Q2).
  - **v1.x / v2 cloud (managed-runtime tier):** spin up the identical `Memofs`
    runtime + an embedder (the existing `-transformers` adapter) on Cloudflare
    Workers/Pages against the user's R2-resident files; expose
    recall/memory/graph by *additively* re-expanding `MemofsCloudClient` with
    the engine namespaces. Single engine implementation running in two places
    (laptop + managed infra) against the same files → no drift, one source of
    truth. This is when the README's "hosted vector recall / graph / evals"
    promise becomes literally true.
- **Rationale for sequencing (why ship file-replica first, not hold v1):**
  1. The file-replica work is already ~80% done on this branch; shipping it
     delivers sync *now* and produces the R2-resident files the managed engine
     will read.
  2. The managed-runtime tier is a separate, larger effort (process lifecycle,
     concurrency, memory, cold starts, compute billing) that depends on the
     file-replica existing first — building them serially, labeled v1 then v1.x,
     is faster and less risky than holding v1 for both.
  3. Layering on top of a finished file-replica is clean; tearing up a
     half-built one to bolt on compute mid-stream is a mess.
- **What this does NOT change:** D1/D2/D5 for v1 stand. The managed-runtime tier
  is the next milestone after v1, recorded here so positioning stays honest.
- **Doc fixes required (tracked, not yet applied):**
  - `README.md` lines 145–146: split "Hosted managed MCP endpoint" (the
    Cloudflare Worker — separate, real) from "Hosted vector recall / graph /
    evals" (reframe as the *managed-runtime tier*, a v1.x/v2 milestone, not v1
    early access).
  - `ROADMAP.md` lines 35–37: move "Hosted vector recall / graph / evals" to
    "Later," annotated as the managed-runtime tier built on top of v1 sync.
  - `README.md` architecture section / OSS-vs-Cloud table: state the thesis —
    local-first by default; managed-engine-as-a-service when you don't want to
    run it.
- **Status:** **Locked.**
- **Candidate for ADR:** yes — strong ADR candidate. Hard to reverse (defines
  the cloud's long-term product shape), surprising (a "managed engine" that is
  the local engine re-hosted, sequenced foundation-first), real trade-off
  (ship-now vs. hold-for-compute). Promote at end of session.
## Q5 — How smart/super-intelligent is Memo FS? (v1 intelligence scope)

- **Question (from `new-architecture.md` open question 4):** how smart and
  super-intelligent is Memo FS?
- **Honest current state (audited in code):**
  | Capability | Status | Where |
  |---|---|---|
  | Hybrid recall (BM25 + fuzzy + optional vector + reranker) | ✅ Strong | `packages/memofs/src/recall/hybrid/hybrid-recall.ts`; proven by `tests/intelligence/local-intelligence.test.ts` (zero-config "login auth" → finds "Authentication uses JWT") |
  | Recency-weighted decay | ✅ Real (ranking only) | `hybrid-recall.ts` half-life, 30-day default |
  | Graph auto-extraction | ⚠️ **Weak / pattern-only** | `packages/memofs/src/graph/extraction/rule-based-extractor.ts` — ~7 regex patterns ("X uses Y", "depends_on", "prefers", …). Natural prose yields almost nothing. |
  | Memory consolidation / merging | ❌ None | Same fact written twice = two notes |
  | Semantic deduplication | ❌ None | — |
  | Reasoning / inference over graph | ❌ None | Traversal + filters only |
  | Proactive surfacing | ❌ None | Recall is query-time only |
  | LLM-based extraction | ❌ None | No LLM in the extraction path |
- **One-liner:** Memo FS has genuinely strong retrieval, weak pattern-based
  graph extraction, and no higher-order memory intelligence (consolidation,
  inference, semantic dedup, proactivity). It is "a strong search engine with
  decay," not yet an intelligent memory system in the Mem0/Zep sense.
- **Answer (locked, 2026-06-20, Option B):** **v1 intelligence = hybrid
  retrieval + recency + LLM-based extraction + memory consolidation.**
  - **LLM-based extractor** (pluggable via a new adapter interface, mirroring the
    embedder adapters — see sub-question below): given a note, extract
    arbitrary subject–predicate–object triples + entities, not just the 7 regex
    patterns. Makes the graph actually grow from natural text.
  - **Memory consolidation:** a background/local pass that (a) merges
    semantically-duplicate notes, (b) lets decay actually *retire* superseded
    memories (mark, not delete — preserves the audit trail), (c) resolves
    contradictions ("we used JWT" → later "we switched to OAuth" → first marked
    superseded via the existing `supersedes` edge type the rule-based extractor
    already emits). The plumbing partially exists (`graph/invalidation/
    invalidate-superseded-edges.ts`, the `supersedes` relation type).
  - Rule-based extractor **stays** as the zero-config / offline fallback (no LLM
    configured → regex patterns still extract the obvious triples). LLM
    extractor is layered on top when an adapter is configured.
- **Rationale:** Q4's moat is "we run the best local memory engine on managed
  infra." Retrieval is table-stakes; **consolidation is the differentiator.** A
  competitor shipping memory that consolidates/forgets/infer will out-position
  a retrieval-only engine on capability. Consolidation is also the thing that
  makes a user *feel* the system is smart (it quietly merges/retires without
  being asked).
- **Sub-question — extractor shape (locked): pluggable adapter, provider-neutral.**
  - Mirrors the existing embedder/reranker adapter pattern
    (`@memofs/adapter-openai`, `-voyage`, `-transformers`).
  - Honors `AGENTS.md`: "Core protocol contracts must be provider-neutral."
  - **Key consequence for the local-first thesis:** the `-transformers` adapter
    already proves an LLM-capable model can run fully in-process (ONNX, zero API
    key). An LLM extractor built on a local model adapter means **extraction +
    consolidation can run 100% locally, offline, no cloud** — the same
    "zero-config intelligence" property the recall engine already has. The OSS
    stays genuinely smart without requiring any provider key.
  - Rejected alternative: hard dependency on one LLM provider. Violates
    provider-neutral rule and breaks local-first.
- **Explicitly out of scope for v1 (deferred, not killed):**
  - Multi-hop semantic inference across the graph (A depends-on B, B depends-on
    C ⇒ infer A depends-on C).
  - Proactive surfacing (memory injected into context without a query).
  - Full agentic memory loop (Q's Option C).
  - These are candidates for the managed-runtime tier (Q4) or a later OSS
    release, not v1.
- **Doc/marketing implication:** the "super intelligent" claim must map to
  *specific* capabilities in copy — "hybrid recall, auto-extracted knowledge
  graph (LLM + rule-based), and memory consolidation that merges duplicates and
  retires outdated facts." Not a vague adjective. Tracked as a doc fix.
- **Status:** **Locked.**
- **Candidate for ADR:** yes — defines the intelligence surface for v1 and the
  provider-neutral extractor contract. Promote at end of session.
## Q6 — Package triage: remove / keep / add under the new architecture

- **Question (from `new-architecture.md` open question 5):** with this new
  architecture, which packages should be removed and which should stay?
- **Audit method:** reviewed all 9 `packages/*`, both `apps/*`, `tooling/*`, and
  `benchmarks/` against decisions Q1–Q5 + AGENTS.md rules. Each verdict grounded
  in code (consumer counts, dependency direction, architecture fit).
- **Verdicts (all locked, 2026-06-20):**

  | Package / App | Verdict | Why (grounded) |
  |---|---|---|
  | `packages/memofs` | **KEEP** (core) | The engine. Non-negotiable; Q4/Q5 depend on it. |
  | `packages/memofs-cli` | **KEEP** | Local execution surface for connectors (Q1/Q2); will grow connector commands. |
  | `packages/memofs-mcp-server` | **KEEP** | Agent integration surface; already mid-refactor on this branch. |
  | `packages/memofs-adapter-openai` | **KEEP** | Embedder adapter; provider-neutral (AGENTS.md). |
  | `packages/memofs-adapter-voyage` | **KEEP** | Embedder + reranker adapter; provider-neutral. |
  | `packages/memofs-adapter-transformers` | **KEEP** (strategic) | Local-first keystone: zero-API-key embeddings, and per Q5 the basis for a local LLM extractor. |
  | `packages/memofs-testing` | **KEEP** | Shared contract tests/fixtures; used by all packages. |
  | `apps/docs` | **KEEP** | Docs site; update content per Q4/Q5 doc-fix lists. |
  | `tooling/*` (typescript, utils, tsdown) | **KEEP** | Internal `@repo/*` per AGENTS.md; unchanged. |
  | `packages/memofs-adapter-upstash` | **REMOVE** | **6a.** Zero consumers (no src refs outside itself). Cloud vector-store adapter contradicts D1/D2 (cloud = file replica, not a vector DB). Pre-launch (D8) → delete, no deprecation cycle. |
  | `packages/memofs-benchmark-kit` ↔ `benchmarks/` | **CONSOLIDATE (6b)** | Two overlapping benchmark efforts. Keep `memofs-benchmark-kit` as the **published** reusable lib (datasets, runners, thresholds); make `benchmarks/` (private `@memofs/benchmarks`) **consume** the kit and own only results (`benchmark-results/{full,release,smoke}`). One source of truth: kit owns code, workspace owns results. Matches ROADMAP "Benchmark suite publication." |
  | `apps/memofs-mcp-worker` | **SHELVE for v1 (6c)** | Currently built on the **deleted cloud engine** — its `Env` is `MEMOFS_API_KEY`/`MEMOFS_API_URL`/`cloud-only runtime` (verified in `apps/memofs-mcp-worker/src/index.ts`). Broken under new arch. Rewriting to run the engine in-Worker = the managed-runtime tier (Q4), sequenced as v1.x/v2. So: shelve for v1, remove from deploy path, reopen as the managed-runtime milestone. README line 145 "Hosted managed MCP endpoint" → "Later." |
  | `packages/memofs-connectors` | **ADD (6d)** | Locked by Q1–Q3. The local connector framework + built-in Notion/GitHub connectors. New published package. |
  | `packages/memofs-adapter-extractor` | **DEFER (6d)** | Q5 locked an LLM extractor as pluggable/provider-neutral, but no implementation exists yet. Don't create an empty package speculatively. **Define the `Extractor` interface in core `packages/memofs` now**; add the first concrete adapter package only when built (likely a `-transformers`-based local extractor to preserve zero-config intelligence). |

- **Net package count change:** 9 → 9 published (remove upstash −1, add
  memofs-connectors +1), plus the deferred extractor adapter later.
- **Status:** **Locked.**
- **Candidate for ADR:** yes — shapes the published surface and removes an
  architecture-contradicting package. Promote at end of session.
## Q7 — Per-package final review ("so we don't come back again")

- **Purpose:** for every surviving package/app, state exactly what must change
  to conform to the locked decisions (Q1–Q6) + the in-flight refactor (D1–D9),
  grounded in the actual code state on this branch.
- **Critical finding (verified on branch):** the refactor is **mid-flight**.
  Despite −4642/+1124 lines changed, two locked items are *not yet done* in
  code: `MemofsRuntimeMode` in `packages/memofs/src/memofs/types.ts:10`
  **still contains `"cloud"`** (D4 wants it gone), and `memory-paths.ts` has
  **no connectors path yet** (Q2 needs it). So the branch must finish its own
  D-items before any Q1–Q6 work begins.

### `packages/memofs` (core runtime) — the bulk of the work
- **Finish D4 (modes):** `MemofsRuntimeMode` → `"local" | "hybrid" | "memory"`;
  drop `"cloud"`. `RuntimeReadPolicy`/`WritePolicy` drop `"cloud-only"`. Update
  `config.ts` `resolveMode`/`isRuntimeMode`/`isReadPolicy`/`isWritePolicy`.
- **Q2 — connectors as 11th canonical file:** add
  ``.memofs/`connectors.json` to `CANONICAL_TEKMEMO_FILES` in
  `packages/memofs/src/core/constants/memory-paths.ts` (currently 10 files).
  `file-replication.ts` `computeLocalManifest()` then walks 11 files + snapshots
  automatically (it derives from the constant). Define the `connectors.json`
  schema: `{ connectors: [{ id, type, enabled, schedule, sourceMapping,
  secretRef }] }` — **never** the token.
- **Q3 — connector-write discipline:** enforce that connector ingest writes
  notes with `source: "connector"`, stable `sourceId` (external id), and a
  content-derived `id` (no wall-clock in hashed bytes). The schema
  (`packages/memofs-mcp-server/src/schema.ts` `sourceRefSchema`) already
  accepts `sourceType: "connector"`. The discipline is in the *connector*
  writer (the new `memofs-connectors` package), not core.
- **Q5 — intelligence surface:**
  - Define the provider-neutral `Extractor` interface here (mirrors the embedder
    contract in `packages/memofs/src/...`). It does **not** exist yet (verified).
  - Add **memory consolidation**: a local pass that (a) merges semantically-dup
    notes, (b) marks superseded facts via the existing `supersedes` edge type +
    `graph/invalidation/invalidate-superseded-edges.ts`, (c) respects decay for
    *retirement* (mark) not deletion.
  - Keep the rule-based extractor as the zero-config fallback; LLM extractor
    layers on top when an adapter is configured.
- **Acceptance (D-list from refactor doc §15):** `cloud-strategy.ts` deleted
  (✅ done); `MemofsCloudClient` trimmed to health/readiness/sync (✅ done);
  mode/policy types trimmed (❌ pending — see above); file-based sync types +
  `file-replication.ts` (✅ done); pre-sync snapshot before mutations (✅ done).

### `packages/memofs-cli` — add connector commands
- **Q1/Q2:** add a `memofs connectors` command group — `add`, `remove`, `list`,
  `run`. `add` writes to ``.memofs/`connectors.json` (local, no token — token is
  the server-side `secretRef`); `run` invokes the local connector framework.
- **Q4:** remove any cloud-engine-only commands that assumed hosted recall/graph
  (verify against the in-progress `cloud.ts` diff — already −2000 lines on this
  branch; finish the trim to sync-only commands).
- Keep all local-engine commands unchanged.

### `packages/memofs-mcp-server` — finish the trim, add consolidation tooling
- The branch already cut ~600 lines from `tools/handlers.ts` + `definitions.ts`
  and trimmed `factory.ts`. Finish removing any tool that delegated to the
  deleted cloud engine namespaces.
- **Q5:** consider exposing a consolidation tool (`memofs_consolidate` or an
  automatic background tick) so MCP clients benefit from the new intelligence
  without code changes.
- Verify `sourceRefSchema` (`schema.ts`) already supports `connector` — ✅
  confirmed; no schema change needed for Q3.

### `packages/memofs-adapter-transformers` — basis for future local extractor
- **No changes for v1.** Keep as the zero-API-key embedder.
- **Q5/Q6 note:** when the first LLM extractor is built, a local implementation
  likely lives here (or a sibling `-adapter-extractor-transformers`) to preserve
  the zero-config-intelligence property. Deferred — do not pre-build.

### `packages/memofs-adapter-openai` / `-voyage` — unchanged
- Provider-neutral embedder/reranker adapters. No changes under Q1–Q6. They are
  also the model for the future extractor-adapter shape (Q5).

### `packages/memofs-testing` — extend fixtures
- Add contract fixtures for: file-based sync over 11 canonical files (incl.
  `connectors.json` with a `secretRef` and no token), connector-write
  determinism (same external content → same sha256), and consolidation
  (supersede + merge). The shared fakes are the right home for these.

### `packages/memofs-connectors` — **NEW, build from scratch**
- The local connector framework + ≥1 built-in connector (Notion or GitHub as
  the reference impl). Executes ingestion locally (Q1), reads config from
  ``.memofs/`connectors.json` (Q2), resolves `secretRef` → token via the future
  authenticated `GET .../connectors/:id/secret` endpoint, writes notes with
  `source: "connector"` + deterministic ids (Q3).
- Depends on `@memofs/core` (core) for the write path. Published as
  `@memofs/connectors`.

### `apps/docs` — content fixes (tracked in Q4/Q5)
- Rewrite OSS-vs-Cloud framing: v1 cloud = file-replica sync + connectors
  config; managed-runtime tier (hosted engine) is v1.x/v2. Fix README lines
  145–146 and ROADMAP lines 35–37 references that the docs site mirrors.
- Add a "Connectors" doc (local execution, web-config, secret handling) and an
  "Intelligence" doc (hybrid recall + LLM extraction + consolidation).

### `apps/memofs-mcp-worker` — **SHELVE (6c)**
- Remove from the deploy path for v1 (CI/`wrangler deploy`). Document that it
  reopens as the first instance of the managed-runtime tier (Q4). Its current
  `cloud-only runtime` wiring is dead against the new arch and must not ship.

### `packages/memofs-adapter-upstash` — **REMOVE (6a)**
- Delete the package, drop it from `pnpm-workspace.yaml` glob (covered by
  `packages/*`), and remove any README/package-table references (README line
  115). Pre-launch → no deprecation cycle.

### `benchmarks/` ↔ `packages/memofs-benchmark-kit` — **CONSOLIDATE (6b)**
- `memofs-benchmark-kit` owns code (datasets, runners, thresholds);
  `benchmarks/` (`@memofs/benchmarks`, private) consumes it and owns only
  result artifacts under `benchmark-results/`. Remove duplicated suite/dataset
  code from `benchmarks/`.

### `tooling/*` — unchanged
- `@repo/typescript`, `@repo/utils`, `@repo/tsdown`. Internal per AGENTS.md.

- **Sequencing note:** finish the in-flight D4/D5 refactor items on
  `packages/memofs` first (they're half-done on this branch), then Q2's
  connectors.json + Q5's Extractor interface + consolidation, then the new
  `memofs-connectors` package, then docs. Removals (upstash, worker shelving)
  can happen in parallel.

---

## Q8 — Tech stack for Memo FS Cloud (broke + launch-ASAP)

- **Question (from `new-architecture.md` new question 8):** what tech stack for
  Memo FS Cloud? Proposed: Better Auth, Railway, Turso/Drizzle, R2, React Router
  v8, Tailwind, Voyage adapter. Constraint: **completely broke, must launch
  ASAP.** Also: what's missing in the stack?
- **Hard constraints honored:** broke (favor free tiers / zero monthly cost) +
  ASAP (favor what's already started + official docs + minimal ops).

### Locked stack (v1 file-replica cloud)

| Layer | Choice | Why (cost/ASAP/arch-fit) |
|---|---|---|
| **Compute (API + dashboard)** | **Cloudflare Workers — ONE Worker** running Hono API + React Router **v8** framework-mode SSR dashboard, served via Static Assets | Hono + `@cloudflare/hono` adapter; RRv8 has first-class official support on Workers via the GA `@react-router/cloudflare` adapter + Cloudflare Vite plugin (verified: `@react-router/cloudflare@8.0.1` is `latest`). Free tier covers v1 (sync + dashboard are small). **Splittable to two Workers via service bindings** when the 3MB-free / 10MB-paid bundle cap bites or when the managed-runtime tier (ADR 0003) lands — no rewrite, just a seam. **(K3, 2026-07-04: the split is now gated on a `wrangler deploy --dry-run` measurement — [ADR 0013](../adr/0013-two-worker-split.md) amended. The v1 file-replica stays one Worker until measured.)** |
| **Blob storage** | **Cloudflare R2** | Already locked (`cloud-sync-and-refactor.md` §12.2). ~$0.015/GB, **free egress** — critical for a sync product (downloads are the main traffic). |
| **Metadata DB** | **Turso (libSQL) + Drizzle ORM** | Already locked (§12.2). libSQL/SQLite, free tier covers v1; Drizzle for type-safe DX matching the TS-everywhere stack. |
| **Auth** | **Better Auth** *(pending capability check)* | Must cleanly handle: (a) `tm_…` API keys for machine-to-machine sync, (b) OAuth callbacks for Notion/GitHub connectors, (c) scoped tokens (`memory:sync`). **Verify before final commit**; if it can't do all three, pick an alternative. |
| **Static assets / hosting** | **Workers + Static Assets** (NOT Pages) | Cloudflare has announced Pages ↔ Workers are **converging**; Workers + Static Assets is the recommended path for new projects. A single Worker serves SSR HTML + JS/CSS. |
| **CSS** | **Tailwind CSS** | Standard, fast, zero cost. |
| **Scheduling / queues / idempotency** | **Upstash QStash + Redis + Workflow** | Serverless, generous free tier (QStash ~10k msg/day free). QStash → connector schedules (Q1/Q2) + consolidation passes (Q5); Redis → rate limit/cursors/idempotency; Workflow → the managed-tier recall/extract pipelines later. **≠ the removed `memofs-adapter-upstash` vector adapter (Q6) — different product, no conflict.** |
| **Email** | **Managed Plunk** (account already held, NOT self-hosted) | $0.001/email, 3k free/mo, zero ops. Replaces earlier Resend suggestion. |
| **Observability (errors)** | **Sentry free tier** | Zero ops. |
| **Load testing** | **Grafana k6** | CLI, no server; sits beside `memofs-benchmark-kit` + `benchmarks/`. (Full Grafana+Prometheus dashboard deferred — overkill for v1.) |

### Corrections made to the original proposal

1. **React Router: confirmed v8 (revises an earlier, erroneous v8→v7 downgrade).**
   The first draft of ADR 0005 downgraded the proposal from v8 to v7, believing
   v8 hadn't shipped. That belief was wrong: `react-router@8.0.1` is the `latest`
   dist-tag and **`@react-router/cloudflare@8.0.1`** ships the official GA
   Cloudflare Workers adapter (verified via `npm view react-router dist-tags` /
   `npm view @react-router/cloudflare dist-tags`). v8 is the target; `apps/cloud`
   already pins `react-router@8.0.0`. v8 framework mode is the officially-
   supported SSR-on-Workers path. See ADR 0005 "Revision history."
2. **Railway removed from v1.** Railway has no meaningful free tier for
   production (~$5/mo floor). v1 is file-replica — it fits entirely in
   Cloudflare/Upstash free tiers. **Railway deferred to the managed-runtime
   tier** (ADR 0003), which is the one workload that can't be serverless (engine
   + ONNX models blow past the 10MB Worker cap).
3. **Pages → Workers + Static Assets.** Pages is converging into Workers;
   building new infra on it is wrong. One Worker serves SSR + assets.
4. **Voyage adapter is not a cloud-stack piece.** It's an OSS *runtime* embedder
   (`memofs-adapter-voyage`); v1 cloud does no embedding (D2). It matters again
   only at the managed-runtime tier.

### "What's missing?" — gaps that were absent from the proposal

1. **R2 presigned-URL generation** (server-side, via the R2 S3-compatible API —
   `aws4fetch` or `@aws-sdk/client-s3`). The entire sync model (§4.4/§4.5)
   depends on the server issuing presigned PUT/GET URLs.
2. **Secrets store for connector tokens** (ADR 0002). Tokens must not touch R2.
   v1: Turso-encrypted column or **Workers Secrets / KV**.
3. **Background scheduler** → covered now by Upstash QStash (above).
4. **Billing/entitlements enforcement** (§12.3). v1 free-tier-only launch:
   a Turso `entitlements` table read on every push. Paid billing via **Polar**
   (MoR + benefits API; see Q9) — wired when the Pro tier launches, not before.
5. **Email** → covered by Plunk (above).
6. **Observability** → covered by Sentry (above).

### Deployment topology (one Worker now, splittable later — K3 gates the split)

```
apps/cloud/                    ← Cloudflare Worker(s), MIT.
  ├── api/                     ← Hono (/v1/sync/*, health, connectors/:id/secret)
  ├── dashboard/               ← React Router v8 framework mode (SSR)
  └── assets binding           ← serves JS/CSS from the same deploy
# apps/memofs-mcp-worker/     ← SHELVED (Q6). Reopens as Worker 2 (managed
#                                 runtime) or as a service-bound companion.
```

- Worker 1 (cloud) + Worker 2 (managed runtime, future) communicate via
  **service bindings** — same Cloudflare account, same repo.
- The cloud Worker `import`s from `@memofs/core` (workspace types, no npm
  publish needed pre-launch). It must implement 31 exported types from
  `cloud-client/types.ts`.

### License decision (locked)

- **Whole repo stays MIT** (current state: root + `@memofs/core`).
- **Rejected: AGPL / closed-source on the cloud.** Reasons:
  1. AGPL's copyleft trigger is *distribution*; a hosted SaaS isn't distributed
     (the "ASP loophole"), so it barely protects a service — yet it *does* bite
     OSS adopters (most enterprises block AGPL deps on sight, fatal for a
     pre-launch OSS project that needs adoption).
  2. The cloud's value is **operational** (R2/Turso/Workers/keys/uptime/support),
     not the source. Copying the Worker code yields empty bindings + zero users.
     Same model as Supabase / Plunk / Cal.com / PostHog — open-core, hosted-rev.
  3. The cloud `import`s MIT types from the core; a restrictive license on the
     cloud half would force a clean-room boundary inside one repo — friction that
     breaks "ship ASAP."
- **Real protection comes from:** (a) **trademark** — reserve "TekMemo" /
  "TekMemo Cloud" so nobody else can brand their hosted version; (b) the
  operational moat; (c) **SSOT of the client types** (you publish
  `@memofs/core`, you control protocol evolution — followers stay a step
  behind); (d) data/network-effects once users have memory in *your* cloud.
- **One legitimate exception (not applicable):** if proprietary/closed third-
  party code were taken into the cloud Worker, that portion would need closing.
  None exists in this stack (Hono, RRv8, Drizzle, CF bindings — all open).

- **Status:** **Locked.**
- **Candidate for ADR:** yes — strong ADR candidate. Hard to reverse (the
  compute/storage/hosting choice + license frame the whole cloud), surprising
  (Workers-not-Pages, RR-not-SPA, MIT-not-AGPL despite "protect the cloud"
  instinct), real trade-offs (free-tier limits vs. Railway ease; openness vs.
  nominal protection). Promote after the Better Auth capability check confirms.

---

## Q9 — Pricing tiers for Memo FS Cloud

- **Question (from `new-architecture.md` new question 6):** what should the
  actual pricing be and what tiers should we have?
- **Grounding:** v1 runs on free tiers (R2 free egress, Turso free, Workers
  free, Upstash free, Plunk 3k/mo free), so **per-user cost ≈ $0**. Pricing is
  therefore a positioning + growth exercise, not cost-recovery. Enforcement
  follows the locked §12.3 model: **capability checks (`maxHostedStorageBytes`,
  `maxConnectors`), never `plan === "Pro"`.**
- **Answer (locked, 2026-06-20, Option B):** **Free (generous) + Pro ($9) +
  Teams (Coming Soon, disabled).**

  | Tier | Price | Storage | Connectors | Status |
  |---|---|---|---|---|
  | **Free** | $0 | 500 MB hosted | **1** (GitHub *or* Notion) | Ships v1 |
  | **Pro** | **$9/mo** | 10 GB hosted | **up to 3** (GitHub, Notion, + whatever ships) | Ships v1 |
  | **Teams** | **$24/seat/mo** (list price, shown disabled) | 50 GB + shared workspace (future) | **unlimited** | "Coming Soon" button, disabled — captures demand, no billing built |

- **Rationale:**
  - **Generous Free tier** is non-negotiable for OSS dev-tool adoption (the
    Supabase/Plunk/PostHog/Turso playbook). The OSS is the funnel; the cloud's
    Free tier is the activation step.
  - **One paid tier at v1** (Pro) avoids premature tier-ladder complexity; Teams
    added when funded (Pro revenue or sponsorships), per the ADR-0003
    managed-runtime sequencing. Billed via **Polar** (Q9), not Stripe.
  - **Teams "Coming Soon" (disabled)** captures demand signal + anchors the
    value ladder now, while it's cheap to change the number, without building
    billing/seat-management prematurely.
- **Entitlement model (numeric caps, not named-feature allowlists):**
  - Storage: `entitlements.maxHostedStorageBytes` (already locked, §12.3). Free
    500MB, Pro 10GB, Teams 50GB. *(Revised 2026-06-23 from the earlier
    ~1GB/~25GB/~100GB placeholders: a tighter base ladder keeps ~97–98% gross
    margin at current R2 pricing while reserving headroom for paid storage
    add-ons later — see "Add-ons" below.)*
  - **Connectors: `entitlements.maxConnectors`** (new). Enforced as
    `connectors.length < maxConnectors` — Free=1, Pro=3, Teams=∞. **Not** a
    per-connector allowlist, per §12.3's "no `plan === 'Pro'`" principle.
    - Free: exactly 1 (GitHub *or* Notion).
    - Pro: up to 3, of whatever exists in the catalog at launch. If only
      GitHub+Notion ship at launch, Pro users get a 3-slot allowance that fills
      when connector #3 lands (Q10). **No phantom promise.**
    - Teams: unlimited, whatever the catalog holds when Teams ships.
- **Cost/margin math (honest):** R2 ≈ $0.015/GB → 10GB ≈ $0.15/mo cost at Pro
  (~98% margin at $9); 50GB ≈ $0.75/mo at Teams (~97% margin at $24/seat). Free
  at 500MB ≈ $0.008/mo — negligible.
- **Billing provider (locked, corrects earlier Stripe assumption): Polar, not
  Stripe.** Verified fit:
  - **Merchant of Record** → handles global sales tax/VAT (Stripe Tax would be
    extra cost/complexity). Offloads tax compliance entirely — significant for a
    solo founder.
  - **Benefits API** (`/v1/benefits/`) → maps directly to the §12.3 entitlement
    model (gating by `maxHostedStorageBytes` / `maxConnectors`).
  - **Metered/usage-based billing** → storage overage can be billed per
    byte-event.
  - **Fee reality (on record):** as of 2026, Polar Starter = **5% + 50¢ per
    transaction**. On a $9 Pro sub: ~$0.95 fee → net ~$8.05. Higher than Stripe's
    ~2.9% + 30¢ on small txns, but the trade (MoR + tax handled + billing UI +
    OSS-native) is worth it at broke+ASAP. Move to a lower-rate tier if volume
    grows.
- **Teams decisions (locked):**
  - **List price locked now: $24/mo** (3× Pro, deliberately not a round multiple).
    Locked while cheap to change; implementation deferred.
  - **Per-seat billing model (intended, for honest page copy): $24/seat/mo.**
    Implementation (seats, shared workspace, SCIM) deferred to when Teams ships,
    gated on Pro revenue or sponsorships (per ADR 0003).
- **Add-ons (deferred, intentional headroom):** the conservative base storage
  ladder (500MB / 10GB / 50GB) is deliberately sized to leave a clean upsell
  ladder — paid storage packs (+10GB / +50GB) and a future higher tier — to add
  once billing is live and demand is observable. Do not build add-on SKUs at v1.
- **Annual billing (deferred):** not at v1 — same "avoid premature billing
  complexity" principle as the one-paid-tier decision. The pricing FAQ already
  states "Not yet, but we're planning to introduce one." Cheap fast-follower
  post-launch; Polar supports annual natively, so no rewrite.
- **Status:** **Locked.**
- **Candidate for ADR:** yes — defines the commercial shape + the
  entitlement-based enforcement model. Promote at end of session.

---

## Q10 — Connector set: is Notion + GitHub enough? what third?

- **Question (from `new-architecture.md` new question 7):** are Notion and
  GitHub enough connectors, or which other relevant ones do we need?
- **Lens:** connectors are how Memo FS proves its "intelligent memory" thesis
  (Q5) in practice — ingested content must get *consolidated, deduped, recallable
  by meaning*, not just dumped. So the third connector is chosen for **demo
  value + overlap with paying users** ($9 Pro ICP), not ease of build.
- **Answer (locked, 2026-06-20, Option A):**
  - **v1 ships GitHub + Notion.** Both non-negotiable for v1:
    - **GitHub** — mandatory; Memo FS is "memory for AI apps and coding agents"
      (README). Issues/PRs/discussions/READMEs → recallable context is the
      killer coding-agent demo. OAuth well-trodden.
    - **Notion** — mandatory; the dominant knowledge base for Memo FS's exact
      startup/indie-hacker/dev-tool audience. Pages/databases → memory is a
      compelling cloud pitch.
  - **Linear is queued as connector #3** (first post-launch addition). Why:
    maximum audience overlap with paying Pro users (Linear's ICP ≈ Memo FS's);
    best consolidation demo (Linear issues + GitHub PRs + Notion decisions often
    describe the same thing from different angles → the Q5 consolidation thesis
    made visible); clean GraphQL API + OAuth, buildable within broke+ASAP.
  - **Pro's 3-slot allowance (from Q9) is honest at 2 connectors:** the cap is
    `maxConnectors=3` checked as `length < 3`, not a named-feature list. With 2
    shipped, Pro users have one unfilled slot that fills when Linear lands — no
    phantom promise (per §12.3 "no `plan === 'Pro'`" principle).
- **Explicitly deferred (Teams-tier or later):**
  - **Slack** — huge overlap + classic "memory" use case, but **noisy** (volume
    risks the unbounded-JSONL-growth footnote from Q3) and Slack API rate-limits
    are painful. Defer; revisit when consolidation/retention is mature.
  - **Confluence** — enterprise knowledge base, Teams-tier magnet; Atlassian
    OAuth is heavy, not broke+ASAP ICP at v1.
  - **Google Drive/Docs** — universal but Google OAuth + Drive API scope reviews
    are slow/approval-heavy; broke+ASAP hostile.
  - **X/Reddit** — low overlap with paying dev-tool users; noisy.
- **Framework decision (locked): provider-neutral `Connector` interface from day
  one.** The new `packages/memofs-connectors` (from Q6) defines a shared
  `Connector` interface; each connector (GitHub, Notion, later Linear/Slack/…) is
  a plugin implementing it — mirroring the embedder/extractor adapter pattern
  everywhere else in the codebase (AGENTS.md: "provider-neutral"). Adding a
  connector later = "write a new adapter," not "refactor the framework."
- **Status:** **Locked.**
- **Candidate for ADR:** partial — the *set* is a product roadmap call (better
  in this log + ROADMAP than an ADR), but the **provider-neutral Connector
  interface** is ADR-worthy (shapes the extensibility contract). Fold into the
  Q1/Q6 connector ADR coverage.

---

## S2-Q1 — `ai-sdk/` and `agentfs/`: stay in core or extract?

> **Session 2 scope note:** the original session's Q1–Q10
> (Q1–Q5 original open questions; Q6 triage, Q7 per-package review, Q8 stack,
> Q9 pricing, Q10 connector set) are locked. This session continues the grill
> with four new branches: (S2-Q1) composability of the two remaining un-scoped
> core subsystems, (S2-Q2) package code review, (S2-Q3) docs architecture,
> (S2-Q4) root-docs alignment. Numbered `S2-Q*` to avoid collision with the
> original `Q*` numbering.

- **Question:** `packages/memofs/src/ai-sdk/` (Vercel AI SDK integration) and
  `packages/memofs/src/agentfs/` (session-workspace layer) are un-scoped under
  the new architecture. With "composable as possible + extending soon," do they
  stay in core or get extracted?
- **Grounding (audited in code):**
  - **`ai-sdk/` = a provider integration, not a primitive.** `createAiSdkRuntime
    FromMemofs(memo)` bridges a `Memofs` into `MemofsAiRuntime`;
    `buildMemoryToolDefinition` / `runStructuredMemoryTool` wrap a **Vercel AI
    SDK** tool (zod discriminated union: view/create/update/search);
    `buildPrepareCallMemoryText` / `buildRuntimeMemoryContext` inject memory
    text into prompts. `ai` is an **optional peer dep** in core today
    (`>=5.0.0 <7.0.0`, resolved `ai@^6`). Core's root `index.ts` re-exports
    Vercel-specific tool schemas — i.e. core's public surface is *not*
    provider-neutral today.
  - **`agentfs/` = a framework-agnostic primitive.** `AgentfsLikeClient`
    interface (readText/writeText/appendText/exists/deleteText + optional
    sync). `createMemofsAgentSession` spins an isolated per-session workspace
    (context/working/output), pulls memory in, scaffolds, extracts curated
    durable memory → `notes.md`, with checkpoint + sync before/after. Imports
    core only (`MemoryStore`, `MemoryPath`, canonical paths). **Zero** AI-SDK
    dep, **zero** AI-vendor dep. It is the session equivalent of `sync/`.
  - **Consumers:** `packages/memofs-cli/src/commands/agent.ts`;
    `examples/{nextjs,openai-agents-sdk,ai-sdk}/`; `apps/docs` (4 pages).
  - **Contradiction surfaced:** `AGENTS.md` requires "Core protocol contracts
    must be provider-neutral." Every other integration follows the adapter
    pattern in its own package (`memofs-adapter-openai/-voyage/-transformers`,
    future `-extractor`/`-connectors`). **The Vercel AI SDK integration is the
    one violator living inside core.** `agentfs` is clean.
- **Answer (locked, 2026-06-20, Option B):** **Extract `ai-sdk/` to a new
  published adapter package; keep `agentfs/` in core.**
  - `packages/memofs/src/ai-sdk/*` → **new `@memofs/adapter-ai-sdk`**
    (published). It owns the Vercel AI SDK tool wrapper, runtime bridge,
    prepare-call memory text, agent-session instructions, scope policy. The
    `ai` peer dep moves from "optional in core" to "real dep of the adapter"
    (correct: depending on the AI SDK adapter means depending on the AI SDK).
  - `packages/memofs/src/agentfs/` **stays in core.** It is a primitive over
    the memory store (like `sync/`, `graph/`, `recall/`), not tied to any AI
    vendor.
- **Rationale:**
  1. **Pattern parity.** Embedder / reranker / extractor / connector all follow
     "protocol contract in core, provider impl in `memofs-adapter-*`." The
     Vercel AI SDK integration is a provider impl — it belongs on the same seam.
  2. **Extensibility is additive.** "Add LangChain / OpenAI Agents SDK / Mastra
     support" = new adapter package, import the runtime contract from core,
     ship. Core never changes. Under status quo, each new framework bloats core.
  3. **Core stays provider-neutral.** Today core's `index.ts` re-exports Vercel-
     specific tool schemas; a user wanting only the memory engine still pulls
     those types. After extraction, core's surface is vendor-free.
  4. **`agentfs` correctly stays.** No provider coupling; extracting it (the
     rejected Option C) is fragmentation for its own sake.
- **Migration footprint (finite, ~1 session):** move `src/ai-sdk/*` → new
  package; update imports in `packages/memofs-cli/src/commands/agent.ts` + the
  three `examples/*` + the 4 `apps/docs` pages; drop the `ai` optional peer dep
  from core `package.json`; republish. No runtime behavior change.
- **Sub-question (locked, 2026-06-20, Option 2): interface splits into two
  layers with different homes.**
  - **L1 — runtime interface → core**, renamed `MemofsAiRuntime` →
    **`MemofsMemoryRuntime`**. Methods: `recall`, `readCoreMemory`,
    `updateCoreMemory`, `listNotes`, `createNote`, optional `index`. Pure
    memory operations, zero framework types. The name change drops the
    AI-SDK-flavored naming so a future reader doesn't assume vendor coupling.
    Replaces its `JsonObject` re-export from `ai` with core's own `JsonObject`
    (`core/types/json.ts`) — removes the last AI-SDK type leak from core.
  - **L2 — Vercel tool/protocol layer → the adapter.**
    `buildMemoryToolDefinition` / `runStructuredMemoryTool` (zod tool wrapper),
    `memoryToolInputSchema`, `buildPrepareCallMemoryText`,
    `buildRuntimeMemoryContext`, `buildAgentSessionInstructions`,
    `scopePolicy`. All Vercel-AI-SDK-specific; stays with the impl.
  - **Precedent (why this split is correct):** the embedder pattern already does
    exactly this — `Embedder` *interface* is a core type, OpenAI/Voyage/
    transformers *implementations* are adapter packages. The memory-runtime
    interface follows the identical seam. When `memofs-adapter-langchain` (or
    OpenAI Agents SDK / Mastra) is built later, it implements the **same**
    `MemofsMemoryRuntime` — zero new interface to invent, identical memory
    semantics across frameworks.
  - **Rename footprint (bounded):** the interface file, `memofs-runtime.ts`,
    the adapter's exports, `memofs-cli/src/commands/agent.ts`,
    `examples/ai-sdk/`, 3 test files, the 4 `apps/docs` pages.
- **Status:** **Locked** (Option B + sub-question Option 2 + rename).
  **Executed 2026-06-20** — the migration described above is now landed and
  validated in code (not docs-only): the 14 `src/ai-sdk/*` files moved into
  `packages/memofs-adapter-ai-sdk/` (+ tests + README + LICENSE + tsdown/
  tsconfig/ vitest), `MemofsAiRuntime` renamed to `MemofsMemoryRuntime`
  (framework-neutral L1 contract now in `packages/memofs/src/ai-runtime/`),
  the `ai` peer dep dropped from core, and the 3 `examples/*` consumers +
  `examples/package.json` updated. **Validated green:** `pnpm install`;
  typecheck on core, adapter, CLI, MCP server, examples; test:run on core
  (369), adapter (23 | 3 skipped), CLI (98), MCP server (40) — all pass.
  Resolves the "S2-Q1 recorded complete but never executed" gap noted in
  [`s2-q2-package-review.md`](./s2-q2-package-review.md) §B3. Docs drift
  (`apps/docs/.../ai-sdk/*`, `ROADMAP.md`) remains, scoped to S2-Q3/Q4.
- **Candidate for ADR:** **yes** — hard to reverse (published package boundary
  + a renamed core contract), surprising (moving code *out* of core + renaming
  a public type pre-launch), real trade-off (status-quo convenience vs.
  composability). Drafted as [ADR 0007](../adr/0007-ai-sdk-extraction.md).

---

## Q11 — Cloud Worker build: `@cloudflare/vite-plugin` × React Router v8 manifest incompatibility

- **Discovered:** 2026-06-20, during P0 verify-c (production build gate).
- **Symptom:** `pnpm build` in `apps/cloud` fails in the third (Cloudflare
  Worker) build phase:
  ```
  [plugin react-router:virtual-modules]
  Error: ENOENT: no such file or directory, open
  '.../apps/cloud/build/client/.vite/manifest.json'
  ```
- **What actually happens (traced in installed source):**
  1. RR's client env build correctly emits `build/client/.vite/manifest.json`
     (visible in the build log: `6.68 kB`).
  2. RR's SSR env build runs and calls `cleanViteManifests()` (`@react-router/dev/dist/vite.js`),
     which deletes `.vite/manifest.json` for every environment whose
     `viteManifestEnabled` is false — including the **client** manifest — then
     removes the now-empty `build/client/.vite/` directory.
  3. `@cloudflare/vite-plugin@1.42.1` then starts its **own** Worker
     environment build (`memofs_cloud`), whose `react-router:virtual-modules`
     load hook re-reads `build/client/.vite/manifest.json` to build the inlined
     browser manifest — but step 2 already deleted it → `ENOENT`.
- **Why this is external, not our bug:** `@react-router/cloudflare@8.0.1`
  ships **no Vite plugin/preset** (runtime adapters only), so the
  `@cloudflare/vite-plugin` Worker build is the only Worker-bundling path.
  RR v8 (released days ago) relocated manifests + "always enables" the Vite
  Environment API; `@cloudflare/vite-plugin@1.42.1` officially supports only
  RR v7. No public fix or v8-aware version exists yet (confirmed via web
  search 2026-06-20).
- **Scope of impact:** **Production build/deploy path only.** The Vite dev
  server (`pnpm dev`), `tsc` typecheck, and `vitest` are all **green** —
  `workers/dev-api.ts` + `vite/dev-api.ts` serve `/v1/*` and SSR identically
  to prod. Verified: `/` → 200 (SSR dashboard HTML renders), `/v1/health` →
  200 `{data,meta}`, `/v1/readiness` → 200 with capabilities, `/v1/nope` → 404
  envelope.
- **Options considered:**
  - **A. Pin React Router to v7** (the version `@cloudflare/vite-plugin`
    officially supports). Highest certainty; costs the v8 improvements we
    picked it for and touches `react-router`, `@react-router/dev`,
    `@react-router/cloudflare`, and any v8-only API we use (`ServerRouter`
    no-`abortDelay`, `meta` signature, auto-routes). Reversible.
  - **B. Ship a tiny Vite plugin that snapshots `build/client/.vite/manifest.json`
    on the client env `writeBundle` and restores it before the Worker env
    reads it.** Keeps v8; fragile (patches third-party ordering), must be
    re-validated on every bump of either package.
  - **C. Drop `@cloudflare/vite-plugin`, build the Worker manually**
    (`react-router build` produces `build/server/index.js`, a valid Worker
    entry; point `wrangler.jsonc` `main` at it and run `wrangler deploy`
    separately). Most control; loses the plugin's dev-time binding injection
    (`context.cloudflare.env`) and `persistState`, so the dev-server story
    changes.
  - **D. Wait for a v8-aware `@cloudflare/vite-plugin` release** and proceed
    on P1/P2 (schema, sync handlers, presign) which don't need the prod build.
    Build gate is only needed at first deploy.
- **Status:** **Open — needs user decision.** Recorded here so the blocker is
  traceable. P1/P2 work (Drizzle schema, sync handlers, R2 presign, auth) is
  unblocked and proceeds regardless; only the production deploy is gated.
- **Candidate for ADR:** yes, once resolved — it's surprising (a green dev
  cycle + a red prod build on bleeding-edge deps) and the resolution is a
  real trade-off.

---

## Q12 — DB naming convention: `snake_case` identifiers, `camelCase` consts, `PascalCase` types

- **Question:** before generating the first Drizzle migration (P1.3), we need a
  locked DB naming convention so every table/column/index reads consistently
  and there is no drift between the relational layer (Drizzle) and raw SQL
  (migrations, dashboards, ad-hoc queries). Which convention?
- **Answer (locked, 2026-06-21):**
  - **DB identifiers** (table names, column names, index/constraint names) =
    `snake_case`.
  - **Drizzle table consts** (the JS variable holding the table definition) =
    `camelCase`.
  - **Inferred row types** (`typeof table.$inferSelect` / `$inferInsert`) =
    `PascalCase`.
  - Drizzle decouples the JS name from the DB name: the first arg to
    `sqliteTable()` is the literal DB string; the variable name is TS-only. So
    the const `apiKeys` maps to the table `api_keys`, and idiomatic JS
    `account.apiKey` maps to the column `api_key`.
- **Rationale:**
  - SQLite/libSQL, like Postgres, folds unquoted identifiers to lowercase and
    has no native camelCase. `snake_case` is the ecosystem norm (Turso, Postgres,
    Drizzle's own generated SQL) and reads cleanly in raw SQL — important when
    debugging migrations or querying the dashboard DB by hand.
  - Keeping the **JS/TS surface idiomatic** (`camelCase` consts/props,
    `PascalCase` types) means app code reads like the rest of the TS-everywhere
    codebase; the `snake_case` stays where it belongs — in the DB and migrations.
  - Decoupled naming is Drizzle's intended pattern, not a workaround: the
    column-builder arg is explicitly the DB string, the property access is the
    app string. No global config or mapper needed.
- **Examples (already applied in `apps/cloud/src/db/schema.ts`):**
  | Layer | Identifier | Example |
  |---|---|---|
  | Table (DB) | `snake_case` | `api_keys`, `project_files`, `sync_cursors` |
  | Column (DB) | `snake_case` | `account_id`, `polar_customer_id`, `max_hosted_storage_bytes` |
  | Index (DB) | `snake_case` | `project_files_project_path_uq` |
  | Const (TS) | `camelCase` | `apiKeys`, `projectFiles`, `syncCursors` |
  | Property (TS) | `camelCase` | `account.apiKey`, `project.accountId` |
  | Row type (TS) | `PascalCase` | `ApiKey`, `ProjectFile`, `SyncCursor` (when inferred) |
- **Enforcement:** the convention is encoded in the JSDoc header of
  `apps/cloud/src/db/schema.ts` and is the review bar for every future schema
  change. No lint rule added (Drizzle's column-builder API doesn't expose the
  literal name to a linter cleanly); enforced by review + the header doc.
- **Status:** **Locked.** Applied to the five tables shipped so far
  (`accounts`, `api_keys`, `projects`, `project_files`, `sync_cursors`); the
  convention governs all future tables (e.g. the `users` / Better-Auth tables
  when auth lands).
- **Open sub-questions:** none.
- **Candidate for ADR:** no — a naming convention is a style rule, not a hard-
  to-reverse / surprising / real-trade-off decision. It lives here as the
  governing reference and in the schema header.

---

## Q13 — Project provisioning: auto-provision on first push

- **Question:** when a client calls `/v1/projects/:projectId/sync/*` against a
  `:projectId` that does not yet exist in the `projects` table, how should the
  cloud behave? The spec (§4) assumes a project exists, but nothing in the auth
  / account flow creates one, and `projects.isDefault` implies an account gets a
  default project at some point.
- **Answer (locked, 2026-06-21, recommended Option A):** **auto-provision on
  first push; pull/status return empty for a missing project.**
  - **Push** (`POST …/sync/push` / `…/sync/push/complete`): if `:projectId` is
    absent in `projects`, lazily create it owned by the authenticated account
    (`projects.accountId = c.var.account.id`), with the id taken verbatim from
    the URL path. This is the git model — the remote appears on first push.
    Ownership is established at provisioning; a subsequent push by a *different*
    account's key to the same id is a 403 (handled by the existing ownership
    check, not by provisioning).
  - **Pull / status** on a missing project return an **empty** result
    (`manifest: {}`, `cursor: "0"`, `storageBytes: 0`) rather than a 404, so a
    brand-new client's first pull is a clean no-op rather than an error. This
    matches "the cloud holds nothing yet," which is the truth for a missing
    project.
- **Rationale:**
  - Local-first: the first device's first push is the act that brings the
    project into existence server-side. No out-of-band provisioning step, no
    dashboard prerequisite, no chicken-and-egg between "configure sync" and
    "create project."
  - Keeps sync handlers self-contained — provisioning is a push-path concern,
    not a separate control-plane endpoint that would have to be built and
    documented before v1 can sync.
  - `projects.is_default` stays for the future dashboard's notion of a default
    project per account; it is not set by auto-provision (a sync-provisioned
    project is just "a project this key has synced").
- **Implementation:** `ensureProject(db, accountId, projectId)` — returns the
  existing project if present (after the ownership check), else inserts one. The
  ownership check (`project.accountId === account.id`) is performed for every
  authenticated sync request regardless of provisioning, so a key that does not
  own an existing project gets 403 before any sync logic runs.
- **Status:** **Locked.**
- **Open sub-questions:** none.
- **Candidate for ADR:** no — a small, reversible behavioural choice grounded in
  the local-first thesis; recorded here as the reference for the sync handlers.

---

## Q14 — Cursor format: plain decimal string

- **Question:** `sync_cursors.seq` is an integer and `SyncCursor` is a string.
  The client treats the cursor as opaque, but the server must pick a concrete
  encoding for pull-`since` comparisons and for the value returned on push/pull.
- **Answer (locked, 2026-06-21, recommended Option A):** **the cursor is the
  plain decimal string of `seq`** (e.g. `"42"`). `since` is parsed back to an
  integer with `Number(...)`; comparisons are numeric.
- **Rationale:**
  - `seq` is already an integer monotonic counter; `String(seq)` is the obvious
    encoding. No base64, no JSON, no `{seq, projectId}` envelope — none of which
    buy anything for a single-project, single-counter value.
  - Trivially debuggable by hand (read the cursor in a log, compare to
    `sync_cursors.seq` in the DB directly).
  - `cursor: "0"` doubles as the "no commits yet" sentinel for a fresh project,
    which is what pull/status return for a not-yet-pushed project (Q13). A
    missing project and a project with no commits are indistinguishable from the
    cursor alone — which is correct (the cloud holds nothing either way).
- **Status:** **Locked.**
- **Open sub-questions:** none. If a future requirement needs cross-project or
  sharded cursors, the encoding can change; the client contract (opaque string)
  is unaffected.
- **Candidate for ADR:** no — a trivial encoding choice, recorded here only so
  the handlers stay consistent.

---

## Session 3 — positioning, intelligence, cloud differentiation, pricing, testing

> **Scope note:** the original session's Q1–Q10 and session 2's S2-Q1 plus
> Q11–Q14 are all locked. This session continues the grill with six new
> decisions, numbered **Q15–Q20** (continuing the main sequence; no `S3-`
> prefix needed since Q15+ is collision-free). Trigger: lock further decisions
> before building so implementation runs with minimal re-planning. Inputs: a
> locked testing intent (MSW + Playwright + Vitest), a new positioning ambition
> ("the default memory runtime for AI agents," "super intelligent"), and a
> brainstorm ask for cloud differentiation beyond file-replica.

## Q15 — Positioning & canonical glossary

- **Question:** how does the ambition "the default memory runtime for AI agents"
  relate to the existing "file-first memory" positioning, and what are the
  canonical nouns?
- **Clarification from user (important):** this is **not** a shift away from
  file-first. File-first stays the trust mechanism. The new axis is
  *intelligence* — the runtime must run (recall/extract/consolidate), not just
  store. "Default" is a marketing goal, not a category change.
- **Answer (locked, 2026-06-21):** four canonical nouns, each with one job:
  - **Memo FS** — the OSS memory system as a whole (the product).
  - **memory runtime** — the *function* layer (recall/extraction/consolidation
    that runs). Canonical for code namespaces too (`MemofsRuntimeMode`,
    managed-runtime tier). The ambition word.
  - **file-first** — the *storage/trust* mechanism (inspectable files under
    ``.memofs/``). Never the category; always the mechanism.
  - **memory** — the content (facts, notes, graph, events).
  - **Headline:** "Memo FS — the file-first memory runtime for AI agents."
  - "Engine" is **demoted to a deprecated prose synonym**; it survives only
    where code literally names something.
- **Rationale:** prevents "runtime / engine / memory / file-first" from drifting
  into synonyms across docs, marketing, and code. The glossary is captured in
  `docs/CONTEXT.md` (canonical nouns section) per `grill-with-docs` discipline.
- **Status:** **Locked.** Reflected in `docs/CONTEXT.md`.
- **Candidate for ADR:** no — a glossary/positioning call, not a hard-to-reverse
  architecture decision. Lives in `CONTEXT.md` + this log.

## Q16 — Intelligence north star: cold-start token reduction

- **Question:** how do we make "super intelligent" concrete and defensible
  rather than a vibe?
- **Answer (locked, 2026-06-21):** **the intelligence north star is cold-start
  token reduction** — the single measurable metric every intelligence feature is
  justified by: *how much does it shrink the tokens a fresh session burns to get
  usable context?* "Super intelligent" := cuts cold-start tokens.
- **Rationale:**
  - It's the only "intelligence" claim that is both **measurable** and
    **universally felt** (anyone who pastes context into an agent feels the
    pain). Q5 explicitly warned the "super intelligent" claim must map to
    specific capabilities — this is that mapping.
  - It **does not expand v1 scope.** It reframes the locked Q5 v1 items
    (hybrid recall, temporal resolution, LLM extractor, consolidation) as the
    engine that delivers the token cut. Finishing Q5 *is* the v1 delivery of
    the north star.
  - It sets up the "110%" roadmap: every additional capability is prioritized
    by how much further it cuts tokens / makes the agent smarter per token.
- **Consequence:** marketing/demo can make a defensible quantitative claim
  ("session A: 8,200 tokens of pasted context; session B with Memo FS recall:
  640 tokens — same agent, same task"). The README "file-first" promise is
  reframed (not broken): file-first is *why you trust it*; the runtime cutting
  tokens is *why it's smart*.
- **Status:** **Locked.**
- **Candidate for ADR:** partial — folded into ADR 0004's intelligence surface
  (it is the metric for that surface). No new ADR.

## Q17 — v1.x local "110%" intelligence capabilities (Tier 2)

- **Question:** which post-v1 local capabilities deliver the "110%"?
- **Answer (locked, 2026-06-21):** commit **four Tier 2 capabilities**, sequenced
  by leverage (each cuts cold-start tokens and leverages existing plumbing):

  | # | Capability | Token-cut mechanism | Leverages |
  |---|---|---|---|
  | 1 | **Stale-fact hiding** | Never surface a superseded fact → context is current, never self-contradicting | `supersedes` edge + `GraphFactStatus` ✅ |
  | 2 | **Entity-centric recall** | "current state of auth" (one resolved node) instead of "every mention of auth" (N fragments) | Graph + `resolveCurrentFacts` ✅ |
  | 3 | **Progressive recall** | Ship a compact briefing first; agent expands only sections it needs. Biggest single cutter | `recall/hybrid` ranked slices ✅ |
  | 4 | **Contradiction detection** | Refuse to feed conflicting facts; surface the conflict. Trust over efficiency | `GraphFactStatus: "conflicted"` ✅ |

- **Rationale for the sequence:** stale-hiding is a prerequisite for the other
  three (progressive/entity recall are worthless if they surface stale facts);
  near-zero new code. Entity-centric is the high-token-cut "smart" demo.
  Progressive is the headline marketing proof of the north star. Contradiction
  is last (lowest token-cut, highest trust value).
- **Rationale for committing all four:** "super intelligent" needs all four to
  be defensible — drop progressive and there's no demo; drop entity-centric and
  recall returns fragments not facts; drop contradiction and the runtime can
  silently lie. They're a package.
- **Dependency surfaced (critical path):** Tier 2's entity-centric recall and
  contradiction detection depend on a well-formed graph, which is populated by
  the **LLM extractor** (Tier 1, Q5) — and consolidation + cross-device conflict
  resolution (cloud, Q18) also depend on extraction quality. **Extraction
  quality is the critical path for everything above it.** This drives Q18.
- **Status:** **Locked** (v1.x roadmap; not v1 scope).
- **Candidate for ADR:** no — roadmap sequencing, lives here + ROADMAP.

## Q18 — Cloud differentiators + extractor strategy

- **Question:** what makes the cloud unmissable beyond file-replica, and where
  does the first concrete extractor implementation live?
- **Grounding:** Q4 locked the managed-runtime tier (v1.x/v2: same engine runs
  on Cloudflare against R2-resident files; `MemofsCloudClient` additively
  re-expands to expose recall/memory/graph by API). All differentiators below
  require the managed runtime — none are possible on a dumb file replica.
- **Answer — cloud differentiators (locked, 2026-06-21):** lock **A1 + A2 + B3 +
  C5** as the v1.x/v2 cloud differentiators:

  | ID | Capability | Why only the cloud |
  |---|---|---|
  | **A1** | **Always-on consolidation** | The cloud's union-of-all-devices memory is continuously deduped/retired. You sleep; the cloud merges |
  | **A2** | **Cross-device conflict resolution** | Two devices edited the same fact; cloud resolves + records the supersedence |
  | **B3** | **One memory, many agents** | IDE agent + CI agent + Slack bot address the *same* memory via `tm_…` keys |
  | **C5** | **Session pre-warming** | Cloud is always running; on session-start it pushes top-N likely memories before the agent queries. Directly attacks the north star (Q16) on the cloud's home turf |

  - **Deferred to v2:** B4 (memory webhooks/events), D6 (cross-project/org
    memory) — powerful but add scoping/privacy complexity competing with
    launch-ASAP.
  - **Rejected:** D7 (anonymous cross-user distillation) — the privacy posture
    of a local-first product is a feature; aggregate learning muddies it.
  - **Headline cloud promise:** "Your memory follows you everywhere — always
    deduped, always current, shared across every agent you use, and pre-warmed
    before you even ask."
- **Answer — extractor strategy (locked, 2026-06-21):** **(c)** `memofs-adapter-extractor-transformers`
  is the **v1 default + demo** (zero-API-key, runs offline, preserves the
  file-first trust thesis); API extractors (`-openai`, `-voyage`, …) are opt-in
  for frontier quality and the **managed-tier monetization lever** (cloud runs
  frontier extraction on your behalf — a paid reason to upgrade).
- **Rationale (extractor):**
  - Only option that keeps the trust story intact — an API-key-gated extractor
    for the headline intelligence would undercut the thesis the cloud
    differentiators build on.
  - Matches the embedder precedent (`memofs-adapter-transformers` is already
    the zero-API-key embedder keystone per Q6).
  - The API extractor becomes the managed-tier monetization lever — strengthens
    A1/A2/C5 ("consolidation always clean *because the cloud runs frontier
    extraction*").
- **Cost accepted:** v1's local extraction is noisier than frontier. Mitigated
  by (i) the rule-based extractor as deterministic fallback (Q5), (ii) swappable
  local model.
- **Status:** **Locked.**
- **Candidate for ADR:** yes for the extractor strategy (it's the monetization
  seam between OSS and cloud). Fold into ADR 0004 + ADR 0003 coverage rather
  than a new ADR.

## Q19 — Pricing: intelligence entitlement + hybrid add-on model

- **Question:** do the new cloud differentiators change the locked Q9 pricing,
  and is the entitlement model tiers-only or tiers + add-ons?
- **Answer (locked, 2026-06-21):** **tier names and prices are unchanged**
  (Free / Pro $9 / Teams $24 — Q9 stands). What changes is **what each tier
  entitles**: a third entitlement dimension + a v2 add-on architecture.
  - **Third entitlement: `maxConsolidationRuns`** (the intelligence-compute cap).
    - Free = 1/day (a nightly pass — feels the intelligence, not always-on).
    - Pro = 24/day (hourly — effectively always-current for one developer).
    - Teams = ∞ (true always-on continuous consolidation).
  - **Session pre-warming (C5) is Pro+:** gated as `maxPreWarmPerDay` (Free=0,
    Pro>0, Teams=∞) — a numeric cap, not a `plan === "Pro"` check.
  - **Add-on architecture (designed in at v1, shipped at v2):** capacity packs
    (Memory Refresh Pack, Storage Pack, Connector Pack) let a user top up a
    single dimension without jumping tiers. The entitlement schema must be
    designed now to accommodate additive line items, not a hardcoded tier enum.
- **Rationale (hybrid over pure tiers / pure add-ons):**
  - The intelligence cost profile (LLM tokens + Workers CPU) is spiky and
    user-behavior-dependent, unlike smooth/cheap storage — a flat tier price
    struggles to cover heavy-intelligence Pro users. Some usage dimension is
    warranted.
  - vs **pure tiers:** the heavy-intelligence Pro user gets an upgrade path that
    isn't "pay 2.6× for Teams just for more refreshes."
  - vs **pure add-ons:** no "Free + paid add-on" funnel awkwardness at launch;
    Free→Pro stays clean and bundled.
  - Preserves Q9's locked rule (numeric caps, `count < cap`, never named-feature
    allowlists). `maxConsolidationRuns` is checked exactly like
    `connectors.length < maxConnectors`.
  - **Monetizes the frontier-extractor lever (Q18):** the cloud runs frontier
    extraction *during* each refresh, so `maxConsolidationRuns` literally caps
    LLM spend — cost and entitlement align on one number.
- **Sequencing (honest about broke+ASAP):**
  - **v1 cloud (file replica):** tiers only; intelligence entitlements *present
    but zero* (no managed runtime yet, nothing to gate). Prices as Q9.
  - **v1.x (managed runtime lands):** tiers carry bundled
    `maxConsolidationRuns` / `maxPreWarmPerDay`. Caps enforced; overage =
    "upgrade."
  - **v2 (add-ons):** capacity packs become purchasable via Polar metered
    billing. Designed in at v1, shipped when Pro revenue/demand justifies.
- **Status:** **Locked.** Extends ADR 0006 (entitlement model now has 3 caps +
  a v2 add-on seam).
- **Candidate for ADR:** yes — ADR 0006 must be **updated** to add
  `maxConsolidationRuns` + `maxPreWarmPerDay` + the v2 add-on architecture. The
  entitlement schema discipline (additive line items, not tier enum) is the
  hard-to-reverse part.

## Q20 — Testing stack: MSW + Playwright scoped to the cloud app

- **Question:** lock the testing stack boundaries (MSW + Playwright + Vitest).
- **Grounding (verified on branch, 2026-06-21):**
  - **Vitest** is universal (v4.x via `memofs-testing`'s `createVitestConfig`;
    every package uses `tests/**/*.test.ts`).
  - **MSW** is declared only in `apps/cloud`; its handler file
    (`apps/cloud/tests/mocks/index.ts`) has **every handler commented out** and
    can't run under Vitest (imports `~/utils/env.server`, alias unresolvable per
    `apps/cloud/vitest.config.ts`). Dead scaffold.
  - The *working* HTTP-mock pattern is **fetch-injection**
    (`createMemofsCloudClient({ fetch })` in `packages/memofs/tests/cloud-client/`).
  - **Playwright** is only in `apps/cloud`; `webServer`/`baseURL` commented out;
    `tests/e2e/example.spec.ts` is the default boilerplate hitting
    `https://playwright.dev`.
- **Answer (locked, 2026-06-21):** **split the layer, not the tool.**
  - **Vitest — everywhere** (unit + integration). No change; already universal.
  - **MSW — `apps/cloud` only**, for outbound third-party HTTP (Polar, Plunk,
    GitHub/Notion OAuth, Sentry). Resurrect the dead scaffold there with real
    handlers. Packages keep fetch-injection.
  - **Playwright — `apps/cloud` only**, e2e for marketing + auth + dashboard
    (against a local Worker + MSW'd third parties). No browser e2e in packages.
    CLI gets "e2e" via a thin `execa` smoke test in Vitest; MCP gets
    protocol-level tests.
  - **Grow `memofs-testing`** with a `createCloudMockFetch()` helper — the
    fetch-injection factory for cloud-client contract tests, so packages stop
    hand-rolling fakes. **No** shared MSW server in `memofs-testing` (MSW stays
    cloud-app-scoped).
- **Rationale:**
  - MSW's sweet spot is a standing server with request matching + fixtures for
    *third-party* outbound HTTP — exactly `apps/cloud`'s Polar/Plunk/OAuth
    surface. It is **not** the right tool for the cloud-client *contract* tests,
    which already work via fetch-injection and are faster/cleaner.
  - Resurrecting MSW in `apps/cloud` gives it a real job; rewriting passing
    cloud-client tests to use MSW would be pure churn.
- **Status:** **Locked.**
- **Candidate for ADR:** no — a conventions/tooling call; lives here + AGENTS.md
  rules. The one architectural consequence (entitlement schema shape) is
  captured under Q19.

---

## Session 4 — intelligent retrieval: surface + retrieval model + ship/defer

> **Scope note:** sessions 1–3 (Q1–Q20 + S2-Q1) are locked. This session
> continues the grill with the one seam those sessions never closed: *when and
> how* memory is fetched — the retrieval model that turns "a search engine" into
> "memory that feels intelligent." Trigger: the question "if our memory is
> intelligent, an agent must know when/how to efficiently retrieve — work toward
> this." Numbered **Q21–Q23** (collision-free continuation of Q1–Q20).

## Q21 — Retrieval surface: MCP is primary for coding agents; pull-only accepted; tool surface collapses

- **Question:** for coding agents (Claude Code, Codex, Cursor, Cline, Roo Code),
  is MCP the primary surface, and is tool calling or MCP more efficient?
- **Grounding (verified in host architectures + in code):**
  - The locked runtime-first split (ADR 0007 / Q15 / CONTEXT.md) already
    separates the **runtime** (`MemofsMemoryRuntime` in core) from its
    **surfaces** (MCP, AI-SDK adapter, future HTTP/Python). The runtime knows
    nothing about OpenAI/Anthropic/MCP/LangChain. Surfaces are adapters.
  - The MCP server today exposes **~21 model-facing tools**
    (`packages/memofs-mcp-server/src/tools/definitions.ts`): `memofs.health`,
    `.context`, `.recall`, `.remember`, `.read_core_memory`,
    `.read_notes_memory`, `.list_recent_memories`, `.validate`, `.snapshot`,
    `.update_core_memory`, `.sync_status`, `.sync_pull`, `.sync_push`,
    `.graph_upsert_nodes`, `.graph_upsert_edges`, `.graph_neighbors`,
    `.graph_path`, `.readiness`, `.consolidate`.
  - The in-process push path exists in `memofs-adapter-ai-sdk`
    (`buildRuntimeMemoryContext` / `buildPrepareCallMemoryText`) but its
    retrieval trigger is a pass-through — it recalls on whatever `input.query`
    the caller supplies, with no triggering/rewriting/budgeting/filtering.
- **Hard constraint surfaced (structural, not preference):** **MCP is
  pull-only.** Claude Code / Codex / Cursor / Cline / Roo Code load an MCP
  server and invoke its *tools* when *they* decide to. There is no hook for
  Memo FS to inject memory into their prompt *before* the model thinks.
  Push-based retrieval (context injection — the mechanism that makes memory
  *feel* smart, because it's just there) is **impossible through MCP**. It
  requires in-process integration (the SDK/adapter path, ADR 0007). This is the
  architecture of every closed coding-agent host; it is not negotiable.
- **Answer (locked, 2026-06-21):**
  1. **MCP is the primary surface for coding agents — non-negotiably.** Closed
     coding-agent hosts (Claude Code, Codex, Cursor, Cline, Roo Code) speak MCP
     and **do not** accept injected native functions. There is no "tool calls vs
     MCP" choice for this audience. Native tools / the AI-SDK adapter serve a
     *different* audience (in-process framework agents: Vercel AI SDK, OpenAI
     Agents SDK, LangGraph, Mastra), governed by ADR 0007. Both surfaces are
     first-class; neither is legacy. The runtime is one; the surfaces are many.
  2. **Accept the pull-only constraint for MCP and design around it.** Since the
     model must *decide* to retrieve, TekMemo's job is to make that one decision
     maximally productive: the tool the model calls runs query-rewriting +
     entity-centric resolution + progressive delivery + active-only filtering
     *inside itself*, so one call returns a curated briefing, not a raw search
     dump. The intelligence lives **inside the tool**, not in context injection.
     (Context injection stays available on the in-process / adapter path — Q22.)
  3. **Collapse the model-facing MCP surface to ~4 high-signal verbs.** The
     current ~21-tool surface is a category error: it exposed developer-level
     runtime methods as model-facing tools. The model isn't a developer; it
     cannot choose intelligently among `graph_upsert_nodes` vs `graph_neighbors`
     vs `graph_path`. For a pull-only channel, **the tool surface *is* the
     intelligence surface.** The 4 verbs:
     - `memofs.context` — the smart briefing composer. Returns a curated,
       budgeted, active-only briefing for the current task. **Composes** recall
       + entity-resolution + filtering behind one call. (The push-equivalent,
       achieved inside a pull tool.)
     - `memofs.recall` — deep semantic search when the model wants to dig
       deeper than the briefing.
     - `memofs.remember` — write memory.
     - `memofs.consolidate` — the intelligence lever (ADR 0004): merge + retire.
     The old tools are **not hidden MCP tools**; they become either (a)
     **runtime methods** the developer calls imperatively
     (`memo.graph.neighbors()`, `memo.sync.push()`, `memo.snapshots.create()` —
     already the `MemofsMemoryRuntime` surface), or (b) **parameters** on the 4
     verbs (e.g. the active-only filter is a flag on `recall`/`context`). There
     is no "hidden tool that `memofs.context` triggers" — `memofs.context`'s
     implementation *calls runtime methods* as steps in building the briefing.
     The model never sees those methods as things it could call.
  4. **Power-tools MCP profile (deferred, optional):** a power-user developer
     building a custom agent may want direct graph/sync access over MCP. For
     them, an opt-in second MCP server entry ("developer mode") exposes the full
     surface. Keeps the default clean without castrating the runtime. **Not v1.**
  5. **Local HTTP adapter — rejected (not deferred).** A localhost HTTP surface
     over the runtime is **not v1, not v1.x, not ever.** File-first makes it
     redundant: if memory lives as inspectable files under ``.memofs/``, every
     language already has a driver — `open()`, `os.ReadFile()`,
     `fs::read_to_string()`. A local HTTP server would be a socket wrapper
     around files that are already directly readable — pure overhead that
     reintroduces the exact problem file-first was chosen to solve. The
     PostgreSQL-driver analogy does not transfer: Postgres needs drivers
     because it lives behind a socket; TekMemo's "database" *is* the
     filesystem. Two access paths cover everything:
     - **Direct file read** — any language, zero dep, for raw facts (the
       trust/audit layer; a consumer that only wants known facts reads files).
     - **MCP** — the polyglot *intelligent* surface (any agent host, any
       language, gets the 4 verbs + strategist without speaking TypeScript).
     A Python/Go/Rust agent that wants intelligence uses MCP; one that wants
       raw facts reads files. **There is no third path and no HTTP adapter.**
     This is a rejection, not a deferral — recorded so it is not re-proposed.
     **Distinct from the cloud HTTP API:** `apps/cloud` (ADR 0003/0005) *does*
     expose the runtime over HTTP, but only at the managed tier, against
     cloud-resident file *replicas* (D1/D2) — that is the cloud product, not a
     local adapter. File-first holds in both: originals stay local; the cloud
     holds a replica.
- **Rationale:**
  - The "tool calls vs MCP" question was a false dichotomy — they serve
    different audiences (in-process frameworks vs closed hosts). The real
    decision is the retrieval model (Q22), which is *constrained by* the surface.
  - A pull-only channel's intelligence ceiling is set by **how much intelligence
    fits inside one tool call**. Fewer verbs, each doing more, beats many verbs
    the model can't choose among. This is the only way to make a pull-only
    surface feel intelligent — non-retrieval (the model not choosing to call) is
    the #1 failure mode of RAG-style agents.
  - Collapsing to 4 aligns the model-facing surface with Q16's north star (cut
    cold-start tokens): a curated briefing in one call cuts tokens vs. a model
    fumbling through 21 tools, calling 5 of them, each returning a raw dump.
- **Principle captured:** **the model gets ~4 verbs; the developer gets the full
  runtime.**
- **Status:** **Locked.**
- **Open sub-questions:** the deferred power-tools profile; the exact parameter
  shape of `memofs.context` (Q22 will inform it). These don't block locking the
  4-verb shape.
- **Candidate for ADR:** yes — strong candidate. Hard to reverse (defines the
  model-facing surface, which once consumed is hard to shrink); surprising
  (fewer tools = more intelligence, and "MCP is pull-only so push the
  intelligence into the tool" is counter-intuitive); real trade-off (rich single
  call vs many small calls, model-as-developer vs model-as-user). Promote after
  Q22/Q23 resolve, so the ADR captures the full retrieval model in one place.
- **Promoted 2026-06-22** to [ADR 0009](../adr/0009-intelligent-retrieval-model.md)
  together with Q22 (write intelligence), Q23 (strategist), Q24-v1 (staleness
  mechanical), Q26 (entity-centric), Q27 (progressive recall). Q22 is captured
  as Component 6 of that ADR (the write-side of the same retrieval model); the
  `memofs.context` parameter shape Q21 deferred to "Q22" is now fully
  specified by Components 2–4 (strategist pipeline + Entities section +
  expansion cursors).

---

## Session 5 — the retrieval model: write intelligence, strategist, staleness, entity-centric, progressive, concurrency

> **Scope note:** sessions 1–4 (Q1–Q21) are locked. This session continues the
> grill at the seam Q21 left open: the *retrieval model* — when and how memory
> is fetched, what the agent receives, and how memory stays clean + safe. An
> industry review (2026-06-22) converged on the same gaps from a different
> angle (write discipline > retrieval cleverry; staleness ≠ decay; concurrency
> is the honest limit of file-first). Two independent signals pointing at the
> same place drove the priority order: write intelligence was grilled *first*
> (highest leverage, zero code today), ahead of the retrieval strategist Q21
> originally deferred to. Numbered **Q22–Q28** (collision-free continuation of
> Q1–Q21). **All locked 2026-06-22.** Promoted to [ADR 0009](../adr/0009-intelligent-retrieval-model.md)
> (Q21+Q22+Q23+Q24-v1+Q26+Q27), [ADR 0010](../adr/0010-cloud-concurrency-control-for-b3.md)
> (Q25b), and an [ADR 0004](../adr/0004-v1-intelligence-extraction-and-consolidation.md)
> revision (Q24-v1.x + Q25a).

### Q22 — Write intelligence (the gate on `memofs.remember`)

- **Question:** the retrieval model is only as good as the signal it retrieves.
  `memofs.remember` / `writeMemory` today has no gate — it hashes content and
  appends. How do we keep Tier 2 (`notes.md`) from becoming noise, without
  violating the two sacred properties (file-first: a human can hand-edit
  `notes.md`; audit thesis: mark, never delete)?
- **Answer (locked 2026-06-22, shape C):** **two gates at two layers.**
  1. **Hard-reject write blocklist** (secrets/PII) at the write API — the same
     safety thesis as the connector `secretRef` model (ADR 0002), applied to
     memory content. An agent writing an API key into syncable `notes.md` is a
     security hole today. Deterministic regex, always-on, no LLM. **Ships as a
     security fix regardless of the rest.**
  2. **Soft durability tier**, 2-level (`durable` / `transient`), stamped on
     every note. `durable` ↔ indexed into recall store + graph, surfaced by
     `recall`/`context`. `transient` ↔ written to `notes.md` (audit trail +
     `list_recent_memories`) but **not** indexed. **Files keep everything that
     passes the blocklist; the disposable recall index + graph prune by tier.**
- **Sub-decision (taxonomy, locked):** **2-level**, not 3. `durable` / `transient`
  mirrors the existing `core.md` / `notes.md` file split. A 3-level
  (`core`/`durable`/`transient`) was rejected: making `core` a *tier on a note*
  creates two competing "always-in-context" mechanisms (the `core.md` file *and*
  a `tier: "core"` flag); `core.md` as a replace-whole-file op is the better
  Tier-1 enforcement. A future promotion op bridges note → core.
- **Sub-decision (who produces the tier, locked):** **deterministic default +
  LLM-enhanced** — the same seam as embedder/reranker/extractor. A
  deterministic classifier assigns the tier from `kind` + `confidence` +
  content shape (zero-config floor); a configured `Extractor`/LLM adapter
  re-scores and can override. Cloud/Pro runs frontier-tier classification.
- **Rationale:** the "most underrated lever" (industry review): clean memory
  beats clever retrieval over noisy memory. Source cuts compound; sink cuts are
  one-shot — so write discipline is the higher-leverage delivery of the Q16
  north star. The files-keep-everything / index-prunes split is the only option
  consistent with *both* sacred properties *and* the disposable-index thesis.
- **Status:** **Locked.** Captured as Component 6 of
  [ADR 0009](../adr/0009-intelligent-retrieval-model.md).

### Q23 — The retrieval strategist (the brain inside `memofs.context`)

- **Question:** Q21 locked the 4-verb surface and accepted MCP is pull-only, so
  the intelligence must live *inside the tool*. Today `buildContext()` is a flat
  assembler (directive → core → recent → recall → notes, byte-truncated; query
  passed verbatim). What replaces it?
- **Answer (locked 2026-06-22, shape C):** a **4-stage pipeline** replacing
  `buildContext()`. Each stage is deterministic-by-default with an LLM-adapter
  hook, and each is a pure function (mirroring the `consolidateGraph` /
  `applyConsolidation` split — independently testable).
  - **Rewrite** — lexicon/semantic query expansion ("login flow" → also auth,
    JWT, OAuth).
  - **Resolve** — collapse fragments to graph entities (alias/label lookup).
  - **Filter** — `status === "active"` only (the Q24 v1 fix, enforced here).
  - **Budget** — weighted section allocation by `maxBytes`, not tail-truncation.
- **Sub-decision (core is non-negotiable, locked):** `core.md` is injected
  *before* the strategist runs and is *excluded from budget competition* — it
  gets its bytes first, always. The strategist only budgets the remaining
  `maxBytes`. This is the read-side enforcement of the locked principle
  (*"small core memory is always injected; everything else is explicitly
  searched, not guessed at by the agent"*). The strategist decides what to
  search; the model never guesses.
- **Rationale:** a pull-only channel's intelligence ceiling is set by how much
  intelligence fits inside one tool call. The strategist is the entire MCP
  intelligence story — without it, 4 verbs return flat dumps. Deterministic
  defaults mean every stage does useful work zero-config, so even before any
  LLM the strategist beats today's flat assembler.
- **Status:** **Locked.** Captured as Component 2 of
  [ADR 0009](../adr/0009-intelligent-retrieval-model.md).

### Q24 — The staleness loop (closing the recall ↔ consolidation gap)

- **Question:** consolidation marks a node `status: "deprecated"`; recall never
  checks (verified: zero `status`/`deprecated`/`active` matches in `src/recall/`).
  So a superseded fact is still served. How do we close the loop, and what
  about the harder case (repeatedly-contradicted facts without a clean edge)?
- **Answer (locked 2026-06-22, shape C):** **two phases on the
  deterministic/LLM seam.**
  - **v1 = mechanical:** the strategist's Filter stage (Q23) drops/marks
    anything whose extracted entities include a `deprecated` node. Pure wiring
    — data already exists (consolidation produces it), Filter stage already
    exists (Q23), they just connect. Near-zero new code. **Unblocks all of Q17
    Tier-2.**
  - **v1.x = semantic:** a **re-verification stage in consolidation**
    (LLM-enhanced, when an adapter is configured) scores active facts for
    consistency with recent memory; low-trust facts get `status: "unverified"`
    (a third state — flagged, not retired), which the Filter surfaces with a
    warning.
- **Distinction (locked):** **decay** (old-and-rarely-relevant) ≠ **staleness**
  (confidently wrong because the world changed). Decay is already solved by the
  30-day recency half-life. Staleness is what ranking makes *worse*, not better.
- **Status:** **Locked.** v1 mechanical → Component 5 of
  [ADR 0009](../adr/0009-intelligent-retrieval-model.md). v1.x `unverified` →
  [ADR 0004](../adr/0004-v1-intelligence-extraction-and-consolidation.md) revision
  history.

### Q25a — Writer-critic consolidation (cloud A1 made real)

- **Question:** deterministic `consolidateGraph` only sees alias/label collisions
  and clean `supersedes` edges. Semantic duplication ("We auth with JWT" vs
  "Login uses JSON Web Tokens") is invisible to it. How does semantic dedup
  ship without crippling the OSS consolidation?
- **Answer (locked 2026-06-22, shape C):** **writer-critic as an LLM-enhanced
  consolidation stage; deterministic floor unchanged.** The deterministic
  `consolidateGraph` stays as the zero-config floor. When an LLM adapter is
  configured, a semantic stage runs *before* it: the adapter proposes semantic
  merges/retirements, a **critic** check gates each proposal against the
  originals for data loss/hallucination, and passed proposals feed into the
  deterministic pass as if they were alias collisions / supersedes edges.
- **Rationale:** makes the cloud's A1 differentiator ("always-on
  consolidation", Q18) real; keeps OSS consolidation honest (not crippled); and
  is the most auditable form of semantic dedup file-first supports (originals
  preserved, merge decision recorded).
- **Status:** **Locked.** Captured in the
  [ADR 0004](../adr/0004-v1-intelligence-extraction-and-consolidation.md) revision
  history (elaboration of ADR 0004's consolidation decision, not a new ADR).

### Q25b — Concurrency-control layer for B3 (the cloud-only transactional layer)

- **Question:** B3 ("one memory, many agents", Q18) is concurrent multi-writer
  access to the same project. D6 (last-writer-wins + snapshot) silently loses
  one of two simultaneous pushes. How does the cloud support B3 safely?
- **Answer (locked 2026-06-22, shape C):** **a Turso/libSQL concurrency-control
  layer in front of the R2 file replica.** Multi-agent writers to the same
  project serialize through it (project-lock → validate-against-manifest →
  apply → release). R2 files remain the durable source of truth; the DB is a
  derived, rebuildable concurrency-control layer — the same relationship the
  local recall store has to local files. File-first holds.
- **Rationale:** reuses Turso already in the cloud stack (ADR 0005). The first
  cloud-only capability — and the correct asymmetry: concurrency is a
  cloud-scale problem (many agents over the network), not a local one
  (single-process, enforced by the Q28 advisory lock).
- **Status:** **Locked.** Promoted to
  [ADR 0010](../adr/0010-cloud-concurrency-control-for-b3.md) (revises ADR 0003).

### Q26 — Entity-centric recall: output shape

- **Question:** Q17 locked entity-centric recall ("current state of auth" = one
  resolved node, not N fragments) with mechanism "Graph +
  `resolveCurrentFacts`". The strategist's Resolve stage (Q23) calls it — but
  *what does `memofs.context` return*? Q23 delivered the substrate but not the
  output shape.
- **Answer (locked 2026-06-22, shape B):** a **separate "Entities" section** in
  `memofs.context`, emitted **after core** (Tier-1, non-negotiable) and
  **before recall** (unresolved Tier-2 fragments). Each resolved entity renders
  as label + type + current-state summary (active edges only — the Q24 filter)
  + provenance. This is the trust ordering: core = what's true; entities =
  what's currently true about the things in this task (resolved, high-trust);
  recall = everything else relevant (unresolved fragments, lower-trust,
  broader). Degrades gracefully — empty section when the graph has nothing.
- **Rejected:** folding into recall (loses high-trust artifact distinction); a
  separate tool verb (violates Q21's 4-verb discipline); replacing fragment
  recall outright (collapses for any note the extractor didn't process).
- **Status:** **Locked.** Captured as Component 3 of
  [ADR 0009](../adr/0009-intelligent-retrieval-model.md).

### Q27 — Progressive recall: interaction protocol

- **Question:** Q17 called progressive recall the **"biggest single cutter"** of
  the four Tier-2 capabilities (the headline delivery of the Q16 north star).
  Q23's Budget stage allocates bytes *one-shot*; progressive means disclosure
  *across calls*. What protocol?
- **Answer (locked 2026-06-22, shape B):** **per-section expansion cursors via
  a parameter on `memofs.context`.** First call returns a compact briefing
  with expandable sections, each carrying an opaque expansion token; the agent
  calls back with `section` + `expand` to pull only what it needs. Compact ≈
  6kb; full ≈ 80kb; the agent pulls the 2kb it needs and stops — vs ~64kb
  truncated today. The token is opaque and encodes resolved pointers from the
  first call, so the second call re-resolves fast.
- **New machinery:** the strategist must be **stateful across two calls**
  (session-scoped cursor cache), which today's stateless `buildContext()` is
  not. This is the one real new piece Q27 introduces.
- **Rejected:** sequential cursor pagination (loads everything in order — not
  "expand only what I need"); a `memofs.expand` verb (violates 4-verb
  discipline); LLM-decided agentic expansion (the industry-review anti-pattern
  — re-introduces the judgment load the strategist exists to remove).
- **Status:** **Locked.** Captured as Component 4 of
  [ADR 0009](../adr/0009-intelligent-retrieval-model.md).

### Q28 — Local concurrency enforcement

- **Question:** the industry review flagged concurrency as the honest limit of
  file-first. Local is single-process by contract, but two Claude Code windows
  on one repo is a day-one v1 scenario. Today a replace-whole-file race on
  `core.md` silently loses a write, and the pre-sync snapshot (D6) is for *sync*
  recovery, not local-race recovery. What enforces the local contract?
- **Answer (locked 2026-06-22, shape B):** **advisory file lock at the
  MemoryStore layer** (``.memofs/`.lock`), the git-index model. Acquired on
  first mutating write, held process-lifetime or per-op; a second process
  attempting a mutating op gets a clear error. Non-mutating reads don't block.
  Carries PID + timestamp so a stale lock (crashed process) is detectable and
  reclaimable. Lives in the `MemoryStore` abstraction so every store impl gets
  it; in-memory store (tests) no-ops.
- **Distinction (locked):** local *serializes* (a second local process is
  almost always accidental, not a workload); cloud (Q25b) *serializes-through-
  a-DB* (multi-agent writers are the intended B3 workload). Two different
  mechanisms for two different scales.
- **Status:** **Locked.** Not ADR-worthy (storage-layer convention, like D6);
  recorded here + to be captured in AGENTS.md rules.

---

## Session 6 — managed-runtime sequencing & prerequisites

> **Scope note:** sessions 1–5 (Q1–Q28) are locked. This session continues the
> grill at the seam ADR 0003 left open: *the sequence* between Teams revenue and
> the managed-runtime moat, plus the concrete OSS prerequisites for hosting.
> Triggered by a `grill-with-docs` pass on five questions: (a) do connectors
> integrate at the hosting phase? (b) what are the subscription prices when we
> host memory? (c) what OSS packages are required before hosting? (d) between
> Teams and memory hosting, which first? (e) how do we differentiate hosting
> users from sync-only users price-wise? Two answers (Q31, Q32) promote to new
> ADRs (0011, 0012); three (Q29, Q30, Q33) reaffirm locked decisions and are
> recorded here. Numbered **Q29–Q33** (collision-free continuation of Q1–Q28).
> **All locked 2026-06-24.** Projects into `screens-locked.md` SC7–SC9.

### Q29 — Do connectors integrate at the memory-hosting phase? (premise correction)

- **Question:** the working assumption was "it is when we get to memory hosting
  that we will integrate connector ingestion." Is that correct?
- **Answer (locked 2026-06-24):** **No — that premise contradicts a locked
  decision. Connectors never run in the cloud, at any tier.** ADR 0002 is
  permanent: connectors run locally; the cloud only replicates the resulting
  files. Server-side ingestion is **rejected, not deferred** — it would re-open
  the cloud-as-engine door that D1/D2 closed. The managed-runtime tier changes
  *nothing* about where/how connectors run.
- **Grounding (verified 2026-06-24):**
  - **Local ingestion is already fully built.** `packages/memofs-connectors`
    ships a provider-neutral `Connector` interface + two real connectors
    (GitHub GraphQL fetcher, Notion fetcher) with normalize + tests. Not a stub,
    not waiting on anything.
  - **The only unstarted connector work is the dashboard control-plane**: write
    ``.memofs/`connectors.json` (the 11th canonical file) + the authenticated
    `GET /v1/projects/:projectId/connectors/:connectorId/secret` endpoint (ADR
    0002's contract additions). This needs **only the v1 file-replica cloud** —
    *not* the managed runtime. It is currently an honest empty state
    (`apps/cloud` connectors screen, post-B.6).
- **Rationale:** separating control plane (dashboard stores config + credential
  pointer) from data plane (local runtime executes) is the locked git/GitHub-
  Actions model. Hosting the runtime does not make ingestion a cloud concern.
- **Status:** **Locked.** Reaffirms ADR 0002; no change to any decision. Recorded
  to head off a recurring misconception.
- **Candidate for ADR:** no — a reaffirmation of ADR 0002, not a new decision.

### Q30 — Subscription prices when we start hosting memory

- **Question:** what will the subscription plans cost when memory hosting
  (the managed-runtime tier) ships?
- **Answer (locked 2026-06-24):** **Unchanged from ADR 0006 / Q9 / Q19.**
  Free $0 · Pro $9/mo · Teams $24/seat/mo. The tier names and prices do not
  move when the managed runtime lands. What changes is **what each tier
  entitles** (intelligence-compute caps), not price.
- **Grounding:** Q19 already locked the managed-tier entitlements —
  `maxConsolidationRuns` (Free 1/day · Pro 24/day · Teams ∞) and
  `maxPreWarmPerDay` (Free 0 · Pro >0 · Teams ∞), enforced as `count < cap`,
  never `plan === "Pro"`. These are **zero until the managed runtime ships**
  (there is nothing to gate on a file replica). At phase 3 (ADR 0011) they
  become the active differentiator — *within the unchanged price ladder*.
- **Rationale:** the per-user cost at v1 (file replica) is ≈$0; the managed
  runtime introduces real per-user compute cost (Workers CPU + LLM tokens).
  Rather than re-pricing the ladder, Q19 chose to meter the spiky/cost-driving
  dimension (consolidation runs) as an entitlement cap, with v2 add-on packs for
  overage. This keeps Free→Pro clean and bundled.
- **Status:** **Locked.** Reaffirms ADR 0006 / Q19.
- **Candidate for ADR:** no — ADR 0006 stands unchanged; the Free-tier
  compute boundary nuance is captured in Q33 (below) as a pointer.

### Q31 — OSS packages required before memory hosting + R2 store home

- **Question:** what OSS packages are required before we can build memory
  hosting in the cloud?
- **Answer (locked 2026-06-24):** the runtime intelligence surface is already
  real (audited 2026-06-24: the 4-stage strategist, deterministic
  consolidation, progressive recall, the write gate blocklist + 2-level
  durability tiers, and the local advisory lock are all implemented, not
  stubbed). Hosting is gated on **three gaps, only two of which are "packages":**
  1. **R2/cloud-backed `MemoryStore`** — the hard prerequisite. Cloudflare
     Workers have no Node `fs`; `local-strategy` won't run there. Today only
     `NodeFsMemoryStore` + an in-memory store exist. **This is a new adapter
     package** (see sub-decision below).
  2. **A concrete extractor adapter.** The provider-neutral `Extractor`
     interface + the rule-based deterministic floor exist, but **no concrete
     LLM extractor adapter ships yet** (`memofs-adapter-extractor-transformers`
     for OSS zero-config per Q18; a frontier/API impl for the cloud's
     monetization lever). Without it the hosted runtime is "a *worse* engine
     than competitors'" (ADR 0004).
  3. **The concurrency-control layer** (Q25b / ADR 0010) — a locked ADR with
     **zero code** today. The first cloud-only capability; required for B3.
     Sequenced as phase 1 by Q32.
- **Sub-decision — R2 store home (locked): a new adapter package
  `@memofs/adapter-r2` with a provider-neutral *remote-blob store*
  contract in core.** Mirrors the `Embedder` / `Extractor` / `Connector` pattern
  (interface-in-core, impl-in-adapter). Chosen because ADR 0003's "self-host the
  same engine free" thesis genuinely needs the store reusable outside the cloud
  Worker — an OSS user self-hosting on S3/GCS implements the same contract.
  Rejected: in-core store (Cloudflare coupling in MIT core, violates
  provider-neutral rule); cloud-internal store (breaks the self-host thesis).
- **Rationale:** the adapter seam is the house style and keeps core
  provider-neutral. A captive cloud-internal store would weaken the open-core
  moat to a code path rather than operational excellence.
- **Status:** **Locked.** Promoted to [ADR 0012](../adr/0012-r2-memory-store-adapter.md).
- **Open sub-questions:** the exact `BlobClient` / `MetadataStore` contract
  shape and the "reuse vs reinvent the replica's R2-blob + Turso-manifest
  layout" detail are deferred to implementation inside ADR 0012 (not resolved
  here).

### Q32 — Between Teams and memory hosting, which to build first?

- **Question:** of Teams (per-seat revenue) and the full managed runtime (the
  intelligence moat), which builds first?
- **Answer (locked 2026-06-24, Option A):** **a three-phase sequence —
  concurrency layer → Teams → full managed runtime.**
  1. **Phase 1 — concurrency layer (ADR 0010).** Turso project-lock →
     validate-against-manifest → apply → release, in front of the existing file
     replica. Greenfield (ADR locked, zero code). Makes multi-writer safe for
     *both* B3 (agents) and Teams (humans) — same mechanism.
  2. **Phase 2 — Teams tier.** Ships on the concurrency-safe file replica:
     seats + per-seat billing (Polar) + shared workspace + the Owner/Admin/Member
     role model (locked). Shared-project **write** access is the
     concurrency-gated surface (read is safe under D6 regardless). The first
     real per-seat revenue.
  3. **Phase 3 — full managed runtime (ADR 0003 thesis).** R2-backed
     MemoryStore (ADR 0012) + hosted recall/consolidation/extraction. Unlocks
     the Q19 intelligence entitlements + the Q18 cloud differentiators (A1/A2/B3/C5).
- **Rationale (the forcing insight):** **Teams-on-the-file-replica is a trust
  bug.** A team is, by definition, multiple humans writing to shared memory.
  Under D6 (last-writer-wins + pre-sync snapshot), two teammates editing
  `core.md` concurrently means **one write silently loses** — the snapshot
  rolls back but does not merge. That breaks the file-first *trust* thesis for
  the exact audience that stresses it hardest. The concurrency layer is
  strictly smaller than the full managed runtime and unblocks Teams revenue
  safely; the moat stays the long-term work, funded by seats rather than
  blocking revenue. Shipping Teams on the raw replica (Option B) would ship a
  data-lossing product; building the full runtime first (Option C) defers the
  biggest revenue lever behind the biggest lift for no benefit.
- **Status:** **Locked.** Promoted to [ADR 0011](../adr/0011-managed-runtime-sequencing.md)
  (revises ADR 0003's two-phase sequence; its *thesis* — same runtime, managed
  infra — is unchanged).
- **Candidate for ADR:** yes — see ADR 0011.

### Q33 — How do we differentiate hosting users from sync-only users, price-wise?

- **Question:** within the price ladder, how do we differentiate people hosting
  memory from people only syncing?
- **Answer (locked 2026-06-24):** **keep the Q19 model — same tiers, same
  prices; intelligence-entitlement caps differentiate.** A sync-only Pro user
  and a hosting Pro user both pay $9; the hosting user is bounded by
  `maxConsolidationRuns` / `maxPreWarmPerDay` (enforced as `count < cap`). No
  separate "Hosted Memory" product line (that would break Q9's single-tier-
  ladder discipline and complicate Polar billing).
- **Margin-protecting nuance (locked): Free's 1 consolidation/day runs on the
  deterministic floor only (zero LLM spend); Pro+ gets frontier extraction.**
  Q18 named the frontier extractor "the managed-tier monetization lever"; this
  nails down the Free boundary so the Free tier's hosted compute is cost-safe:
  Free feels the *mechanical* consolidation (the deterministic `consolidateGraph`
  floor), Pro pays for *semantic* (frontier extraction + writer-critic). The
  "1/day" cap is therefore honest and near-zero-cost, not a margin leak.
- **Rationale:** Q19 already locked the architecture (caps, not plan-name
  checks). This decision locks the one open nuance (the Free compute boundary)
  that real per-user cost exposed. Rejected: hosting-as-Pro+-only (modifies
  Q19's Free=1/day — kept); a separate Hosted product line (breaks tier
  discipline).
- **Status:** **Locked.** Reaffirms Q19; closes the Free-tier compute boundary.
  Pointer added to ADR 0006 (no semantic change — ADR 0006 is already
  consistent).
- **Candidate for ADR:** no — reaffirms Q19/ADR 0006; the nuance is a margin
  guardrail, recorded here + as an ADR 0006 cross-ref.

---

## Locked screen IA

The product/architecture decisions above are projected into a frozen screen
map in [`screens-locked.md`](./screens-locked.md) — the locked information
architecture for the Cloud app (`memo.memofs.dev`) and the Docs app
(`docs.memofs.dev`). Screen-level decisions are numbered `SC-*` there and
trace back to the decisions in this log and ADRs 0002–0012. The IA is frozen;
`copywriting` + `frontend-design` refine per-page prose and layout without
re-opening a screen decision (ADR 0008 Rule 3). SC1–SC6 are v1; SC7 (Teams),
SC8 (managed memory), SC9 (pricing/billing deltas) are phase-gated additions
projecting Q32/Q33 — see `screens-locked.md`.

