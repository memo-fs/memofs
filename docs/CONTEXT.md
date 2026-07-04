# CONTEXT.md

Canonical working glossary for this repo. Per `grill-with-docs` discipline, this
holds concise definitions of key terms and entry points so context is consistent
across sessions and contributors. **No implementation details** — those live in
code, tests, and ADRs. Version-controlled (the terminology single source of
truth); edits require the same review bar as any other docs change.

## Glossary

### Canonical product nouns (locked Q15 — do not drift)

These four terms are the product's canonical nouns. Each has exactly one job;
do not use them as synonyms for each other.

- **TekMemo** — The OSS memory system as a whole (the product).
_Avoid:_ "engine," "the system" when either means the product.

- **memory runtime** — The *function* layer: the code that runs recall,
  extraction, and consolidation against memory. The "it runs, not just stores"
  claim and the canonical word for code namespaces (`TekMemoRuntimeMode`,
  managed-runtime tier). This is the ambition word for positioning.
_Avoid:_ "engine," "core" (reserved for specific code meanings), "memory"
when you mean the function layer.

- **file-first** — The *storage/trust* mechanism: memory lives as inspectable
  files under `.tekmemo/`. The reason the runtime is trustworthy. Never the
  product category; always the mechanism.
_Avoid:_ "file-based," "filesystem memory."

- **memory** — The actual content: facts, notes, graph, events. The domain noun
  (`core memory`, `memory records`).
_Avoid:_ "knowledge," "data" when you mean the memory content.
  "Knowledge graph" is the accepted term of art for the graph structure itself.

> **Headline (locked Q15):** "TekMemo — the file-first memory runtime for AI
> agents." *File-first* = why you can trust it; *runtime* = why it's smart;
> *default* (the positioning goal) is layered on top, not a category change.

### Code & contracts

- **Tekmemo (class)** — The primary TekMemo client
  (`packages/core/src/tekmemo/Tekmemo.ts`). Construct it with
  `{ rootDir, projectId, mode? }`. **Modes: `local` | `hybrid`** (locked S3-Q5 —
  two modes, not three). The legacy `"cloud"` mode was removed per D4 (the cloud
  is a file replica, not a runtime mode); the volatile `"memory"` mode was
  removed per S3-Q5 (no-legacy: a volatile/test store is expressed by injecting
  an in-memory `MemoryStore` into `local` mode, not by a parallel strategy).
  Owns the hybrid recall pipeline and exposes `core`, `notes`, `graph`,
  `snapshots`, `agentfs`, `sync`, `rerank` namespaces plus `recall()`,
  `context()`, `writeMemory()`, `listRecentMemories()`, `validate()`, `health()`.
  **No read/write policies** (locked S3-Q5 / P-Cut): hybrid mode always
  reads/writes through the local engine; the cloud is reached only via the
  explicit sync verbs (`sync.push`/`sync.pull`), never via an implicit read
  policy.

- **recall** — TekMemo's hybrid retrieval: BM25 + fuzzy token matching, a
  vector channel (when an embedder is configured), a recency boost, and an
  optional reranker. Available on the `Tekmemo` class as `memo.recall(query,
  { limit?, filter? })`. There is exactly one recall pipeline; it does not
  degrade to plain text search in any mode.

- **TekMemoMemoryRuntime** — The **framework-neutral runtime contract** (locked
  S2-Q1) that lives in **core** (`packages/core/src/ai-runtime/types.ts`).
  Methods: `recall`, `readCoreMemory`, `updateCoreMemory`, `listNotes`,
  `createNote`, and an optional `index`. Each AI-framework adapter implements it
  (the Vercel AI SDK adapter via `createAiSdkRuntimeFromTekmemo`); future adapters
  (LangChain, OpenAI Agents SDK, Mastra) implement the same contract → identical
  memory semantics across frameworks. Renamed from `TekMemoAiRuntime` (2026-06-20)
  to drop the AI-SDK-flavored name from a core type. Mirrors the embedder
  interface/impl split. See ADR 0007.

- **createAiSdkRuntimeFromTekmemo** — The supported way to build a
  `TekMemoMemoryRuntime` for the **Vercel AI SDK**. Takes a `Tekmemo` instance and
  delegates every call back to it, so recall always flows through the
  intelligent engine. Lives in **`@tekmemo/adapter-ai-sdk`** (extracted
  from core per decisions log S2-Q1). See ADR 0007.

- **AI SDK helpers** — `buildRuntimeMemoryContext()` (context-first system
  prompt: core memory + notes + recall), `buildRuntimeMemoryToolDefinition()`
  (multi-command memory tool for in-turn recall/remember),
  `runRuntimeMemoryTool()` (executes a tool command with scope enforcement).
  Exported from **`@tekmemo/adapter-ai-sdk`** (not core) per S2-Q1.

- **AiMemoryAccessContext** — Scope object (`projectId`, `userId`,
  `conversationId`, `workspaceId`, `tenantId`, `participantIds`) controlling
  read/write visibility. Passed as `access` to the helpers.

- **Connector** — An ingestion source that fetches external data (Notion,
  GitHub, Slack, …) and writes it into `.tekmemo/` memory. **Runs locally**
  (the cloud never ingests — D1/D2; this is permanent, not a v1 limitation —
  see decisions log Q29). Configured from the web dashboard (control plane);
  executed by the local runtime (data plane). The local connector framework is
  already built (`packages/tekmemo-connectors`); only the dashboard
  control-plane waits, and it needs just the v1 file replica, not the managed
  tier. See [Decisions log](./architecture/decisions.md) Q1–Q3, Q29.

- **Connector config (`connectors.json`)** — The 11th canonical `.tekmemo/`
  file (`.tekmemo/connectors.json`). A sync unit holding each connector's type,
  schedule, source mapping, enabled flag, and an opaque `secretRef` — **never**
  the token itself. Credentials live server-side and are fetched over an
  authenticated call at run time (never replicated to R2). See decisions log Q2.

- **Connector isolation** — Connector-ingested content is written as notes
  with `source: connector` + stable `sourceId` (external id) and a
  content-derived `id`, so re-ingest of unchanged content reproduces identical
  bytes (no phantom sync conflicts). Connectors never clobber human-authored
  notes under the last-writer-wins (D6) model. See decisions log Q3.

- **Recall decay** — The recency component of recall scoring: an exponential
  half-life (default 30 days) applied to the recency boost, so newer memories
  rank higher. Affects ranking only, never storage. Implemented in
  `packages/core/src/recall/hybrid/hybrid-recall.ts`.

- **Managed-runtime tier** — The future cloud tier (v1.x/v2) where TekMemo
  Cloud runs the *same* local `Tekmemo` engine + an embedder against the user's
  R2-resident `.tekmemo/` files, exposing recall/memory/graph via API. The
  long-term purpose of the cloud ("host your memory; integrate via API" — the
  Vercel/Supabase model). **v1 is the file-replica foundation for this, not an
  alternative to it:** the files must exist in the cloud before the cloud can
  run the runtime over them. See [decisions log](./architecture/decisions.md)
  Q4.

- **Extractor adapter** — A pluggable, provider-neutral adapter (mirroring the
  embedder/reranker adapters) that extracts subject–predicate–object triples +
  entities from a note's text to grow the knowledge graph. Layered on top of the
  built-in rule-based extractor (regex patterns, the zero-config offline
  fallback). Like the embedder adapters, it can run on a local model adapter
  (zero API key) or a hosted provider. See decisions log Q5.

- **Memory consolidation** — The v1 intelligence feature that merges
  semantically-duplicate notes and retires superseded facts (marks, not
  deletes, preserving the audit trail) via the existing `supersedes` edge type.
  The differentiator that makes TekMemo feel intelligent rather than just
  searchable. See decisions log Q5.
- **Write intelligence** — The gate applied at write time (the
  `tekmemo.remember` / `writeMemory` path), distinct from retrieval-time
  intelligence. Two layers, decided Q22 (shape C): a hard-reject **write
  blocklist** (secrets/PII — the same safety thesis as the connector
  `secretRef` model, applied to memory content) and a soft **durability tier**
  stamped on every note. Files keep everything that passes the blocklist (full
  audit trail; file-first intact); the disposable recall index + graph prune by
  tier (rebuildable, never the source of truth). The "most underrated lever":
  clean memory beats clever retrieval over noisy memory. See decisions log Q22.
- **Durability tier** — A 2-level classification stamped on every note by write
  intelligence: `durable` (indexed into the recall store + graph; surfaced by
  `recall` / `context`) or `transient` (written to `notes.md` for the audit
  trail and `list_recent_memories`, but not indexed — does not pollute
  retrieval). Distinct from `kind` (what the fact *is*); tier is how long it
  should influence retrieval. Tier-1 (`core.md`) stays a *file* (replace-whole-
  file op), not a tier on a note — a future promotion op bridges note → core.
  Locked Q22. The tier is assigned by a deterministic classifier (from `kind` +
  `confidence` + content shape) as the zero-config floor, re-scored by a
  configured LLM/`Extractor` adapter when present — the same deterministic-
  default + adapter-enhanced seam as embedder/reranker/extractor. Locked Q22.
- **Retrieval strategist** — The read-side intelligence inside `tekmemo.context`
  (decided Q23, shape C): a 4-stage pipeline that turns one model call into a
  curated briefing. Stages: **rewrite** (lexicon/semantic query expansion),
  **resolve** (collapse fragments to graph entities), **filter** (active-only —
  drops `status: "deprecated"` nodes; the read-time enforcement of the Q24
  staleness loop), **budget** (weighted section allocation by `maxBytes`, not
  tail-truncation). Each stage runs a deterministic default zero-config; a
  configured LLM/`Extractor` adapter upgrades each stage independently. **Core
  memory is non-negotiable:** `core.md` is injected before the strategist runs
  and excluded from budget competition (Tier-1-always-injected, mechanically
  enforced — the read-side expression of "everything else is explicitly
  searched, not guessed at by the agent"). Replaces the flat `buildContext()`
  assembler. See decisions log Q23.
- **Staleness loop** — The connection between consolidation (which retires
  facts) and recall (which serves them). Today the loop is **open**: consolidation
  marks a node `status: "deprecated"`, but recall never consults graph node
  status, so a superseded fact is still served. Q24 closes it in two phases:
  **v1 = mechanical** — the strategist's Filter stage drops/marks anything whose
  extracted entities include a `deprecated` node (pure wiring; near-zero new
  code; unblocks all of Q17 Tier-2). **v1.x = semantic** — a re-verification
  stage in consolidation (LLM-enhanced, when an adapter is configured) scores
  active facts for consistency with recent memory; low-trust facts get
  `status: "unverified"` (a third state — flagged, not retired), which the
  Filter surfaces with a warning rather than hiding. Distinct from **decay**
  (old-and-rarely-relevant, already solved by the 30-day recency half-life):
  staleness is *confidently wrong because the world changed*, which ranking
  makes worse, not better. See decisions log Q24.
- **Writer-critic consolidation** — The LLM-enhanced tier of memory
  consolidation (v1.x/cloud, locked Q25a shape C). The deterministic
  `consolidateGraph` (alias/label merges + `supersedes` retirements) stays as
  the zero-config floor, unchanged. When an LLM adapter is configured, a
  **semantic consolidation stage** runs *before* it: the adapter proposes
  semantic merges/retirements the deterministic pass can't see (e.g. "We auth
  with JWT" vs "Login uses JSON Web Tokens"), and a **critic** check gates each
  proposal against the originals for data loss/hallucination. Passed proposals
  feed into the deterministic pass as if they were alias collisions / supersede
  edges. This is the cloud's A1 differentiator ("always-on consolidation")
  made real, and the most auditable form of semantic dedup (originals
  preserved + merge decision recorded). See decisions log Q25a.
- **Concurrency-control layer (B3)** — The transactional layer the cloud adds
  in front of its R2 file replica to make **B3 ("one memory, many agents via
  API keys", Q18)** safe (locked Q25b shape C). Multi-agent writers to the same
  project serialize through a **Turso/libSQL** layer (already in the cloud
  stack per ADR 0005) that does project-lock → validate-against-manifest →
  apply → release. The files in R2 remain the durable source of truth; the DB
  is a derived, rebuildable concurrency-control layer — the same relationship
  the local recall store has to local files. File-first holds in both:
  originals stay as files; the DB is disposable. Single-user multi-device is
  unaffected (still last-writer-wins, D6 holds). This is the first capability
  the *cloud* has that *local* doesn't — and the correct one: concurrency is a
  cloud-scale problem (many agents over the network), not a local one. See
  decisions log Q25b.
- **Entity-centric recall** — The first of two Q17 Tier-2 capabilities that
  Q23's strategist *enables but does not itself define* (locked Q26, shape B).
  `tekmemo.context` gains an **Entities section**, emitted **after core**
  (Tier-1, always-injected) and **before recall** (unresolved Tier-2 fragments).
  Each resolved entity renders as: label + type + current-state summary (active
  edges only — the Q24 filter is what makes the state "current") + provenance.
  This is the trust ordering: core = what's true; entities = what's currently
  true about the things in this task (resolved from the graph, high-trust);
  recall = everything else relevant (unresolved fragments, lower-trust, broader).
  Sourced from `resolveCurrentFacts` over the graph, called by the strategist's
  Resolve stage. **Degrades gracefully** — when the graph has nothing for a
  query (extraction is weak/absent), the Entities section is simply empty and
  recall fragments carry the briefing exactly as today. So entity-centric is an
  *enhancement over* fragment recall, gated by extraction quality (the Q5/Q18
  critical path), never a replacement. Honors Q21's 4-verb surface (lives inside
  `tekmemo.context`, no 5th verb) and composes with Q24 (active-only) + Q27
  (progressive expansion of this section). Entity rendering format (triples vs
  sentences vs key/value) is an implementation/copy detail, not architectural.
  See decisions log Q26.
- **Progressive recall** — The second of two Q17 Tier-2 capabilities the
  strategist enables but doesn't itself define (locked Q27, shape B). Q17
  called this the **"biggest single cutter"** of the four — the headline
  delivery of the Q16 cold-start-token north star. Mechanism: `tekmemo.context`
  returns a **compact briefing with expandable sections**, each carrying an
  opaque expansion token; the agent calls back with `section` + `expand` to pull
  only what it needs. The agent sees the **index** (what exists) before the
  **content** (everything). Compact ≈ 6kb; full ≈ 80kb; the agent pulls the 2kb
  it needs and stops — vs ~64kb truncated today. This is **selective**
  expansion (Q17's "expand only sections it needs"), not sequential pagination
  (which loads everything in order). The expand token is opaque and encodes the
  resolved pointers from the first call, so the second call re-resolves fast —
  no re-rewriting, no re-querying. The one new machinery it introduces: the
  strategist must be **stateful across two calls** (session-scoped cursor
  cache), which today's stateless `buildContext()` is not. Honors Q21's 4-verb
  surface (expansion is a *parameter* on `tekmemo.context`, not a 5th verb) and
  composes with Q26 (the Entities section is the highest-value expand target:
  compact summary small, full edges+provenance large). Compact rendering quality
  is load-bearing (a bad index → agent expands the wrong thing) — a copy/format
  problem, deferred to implementation, not architectural. See decisions log Q27.
- **Local concurrency lock** — The advisory file lock (`.tekmemo/.lock`) at the
  **MemoryStore layer** that serializes local processes writing to the same
  `.tekmemo/` directory (locked Q28, shape B). Prevents replace-whole-file and
  read-modify-write races on `core.md` and `graph/*.jsonl` — the real
  corruption vectors (append-only `notes.md` is largely safe under `O_APPEND`).
  Acquired on first mutating write, held process-lifetime or per-op; a second
  process attempting a mutating op gets a clear error ("another TekMemo process
  holds the lock"). Non-mutating reads don't block. The **git index model**
  (`.git/index.lock`): advisory, not mandatory — survives a crashed process
  because you can remove a stale lock; carries PID + timestamp so a stale lock
  is detectable and reclaimable. Distinct from the **cloud** concurrency layer
  (Q25b): local *serializes* (second process errors — a second local process is
  almost always accidental, not a workload); cloud *serializes-through-a-DB*
  (multi-agent writers are the intended B3 workload). Lives in the
  `MemoryStore` abstraction so every store impl gets it; the in-memory store
  (tests) no-ops. Filling the gap the research flagged as the "honest limit of
  file-first": day-one v1 scenario (two Claude Code windows on one repo) no
  longer silently loses a core-memory write. See decisions log Q28.

- **Connector framework (`@tekmemo/connectors`)** — A new published
  package (locked Q6) holding the local connector framework + built-in
  connectors (Notion, GitHub, …). Executes ingestion locally per Q1; config
  syncs via `.tekmemo/connectors.json` per Q2. See decisions log Q6.

- **Extractor interface** — The provider-neutral contract for LLM-based graph
  extraction (locked Q5), to be **defined in core `packages/tekmemo`**. Concrete
  adapter packages (e.g. a `-transformers`-based local extractor) are added only
  when first implemented — no speculative empty package. See decisions log Q6.

- **LlmClient (interface)** — The provider-neutral **transport** contract for a
  chat / structured-generation LLM call (locked S3-Q4 / [ADR 0014](./adr/0014-llm-client-core-interface.md)),
  defined in **core** as the **fourth member** of the embedder/reranker/extractor
  contract family. Shape: `complete({ system, user, schema? }) → { text |
  structured }`. Consumed by every LLM-enhanced intelligence feature — the
  retrieval strategist (Q23 rewrite/resolve/filter/budget), writer-critic
  consolidation (Q25a), staleness re-verification (Q24 v1.x), semantic
  consolidation (Q25a). Each feature already locks a deterministic-default +
  adapter-enhanced seam; `LlmClient` is the *adapter* half — the deterministic
  default runs when none is injected (regex rewrite, the deterministic
  `consolidateGraph`, etc.). **Distinct from `Extractor`** (a *domain* op — grow
  the graph; `extract({ text }) → { nodes, edges, contradictions }`): `LlmClient`
  is the *transport*. A provider's `Extractor` impl composes an `LlmClient`
  internally, but the contracts stay separate — the same relationship
  `RemoteBlobMemoryStore` has to `BlobClient`. CONTEXT.md's earlier overload of
  "adapter" to mean *either* an LLM *or* the `Extractor` was a hedge; this
  resolves it into a precise contract.
_Avoid:_ `ChatModel` (Vercel-AI-SDK-flavored — that name belongs in the
`tekmemo-adapter-ai-sdk` package), `Generator` (too generic), "the adapter" when
you mean this specific transport contract (say `LlmClient`).

- **Connector (interface)** — The provider-neutral plugin contract in
  `@tekmemo/connectors` (locked Q7); each connector (GitHub, Notion,
  later Linear/Slack/…) implements it. Adding a connector = writing a new
  adapter, not refactoring the framework. v1 ships GitHub + Notion; Linear is
  queued as #3.

- **Cloud stack** — TekMemo Cloud runs as **one Cloudflare Worker** (v1
  file-replica; the two-Worker split is gated on a K3 bundle measurement — see
  [ADR 0013](./adr/0013-two-worker-split.md) amended): Hono API +
  React Router **v8** framework-mode SSR dashboard, served via Static Assets.
  Storage: R2 (blobs, free egress) + Turso/libSQL + Drizzle. Auth: Better Auth
  (pending capability check). Scheduling/queues: Upstash QStash+Redis+Workflow.
  Email: managed Plunk. Errors: Sentry. Load testing: Grafana k6. Billing: Polar.
  Railway deferred to the managed-runtime tier (ADR 0003). See ADR 0005. (v8 is
  GA with an official `@react-router/cloudflare` Workers adapter — verified via
  `npm view`; this reverses an earlier "v8 doesn't exist" draft that was wrong.)

- **Entitlement model** — Cloud enforcement uses **numeric capability caps**,
  never `plan === "Pro"` checks (§12.3). Three entitlement dimensions (locked
  Q19): `maxHostedStorageBytes` (Free 500MB / Pro 10GB / Teams 50GB),
  `maxConnectors` (Free=1 / Pro=3 / Teams=∞), and **`maxConsolidationRuns`**
  (Free=1/day, Pro=24/day, Teams=∞ — the intelligence-compute cap, enforced
  once the managed-runtime tier lands). All checked as `count < cap`.
  Capacity-pack add-ons (refresh/storage/connector top-ups) are designed into
  the schema at v1 but shipped at v2 when Pro revenue justifies metered
  billing. See ADR 0006.

### Product strategy (locked Q16–Q20)

- **Intelligence north star** — The single measurable metric for every
  intelligence feature: *how much does it shrink the tokens a fresh session
  burns to get usable context?* "Super intelligent" is defined as cold-start
  token reduction, not a vibe. The frame for the locked v1 intelligence scope
  (Q5) and the basis for prioritizing every "110%" capability beyond it.
_Avoid:_ "smart," "intelligent," "super-smart" as unquantified claims.

- **Tier 2 local intelligence (v1.x)** — Four capabilities, sequenced by
  leverage: stale-fact hiding → entity-centric recall → progressive recall →
  contradiction detection. All cut cold-start tokens; all leverage existing
  graph/temporal/recall plumbing. Locked Q17.

- **Cloud differentiators (v1.x/v2, locked Q18)** — The four capabilities only
  centralization (the managed-runtime tier) enables: always-on consolidation
  (A1), cross-device conflict resolution (A2), one-memory-many-agents via API
  keys (B3), and session pre-warming (C5). Deferred to v2: memory webhooks
  (B4), cross-project/org memory (D6). Rejected: anonymous cross-user
  distillation (D7) — privacy posture stays a feature.
  - **Headline cloud promise:** "Your memory follows you everywhere — always
    deduped, always current, shared across every agent you use, and pre-warmed
    before you even ask."

- **Extractor strategy (locked Q18)** — `tekmemo-adapter-extractor-transformers`
  is the **v1 default + demo**: extraction+consolidation run 100% locally with
  zero API key, preserving the file-first trust thesis. API-based extractors
  (`-openai`, `-voyage`, …) are opt-in for users wanting frontier quality and
  the **managed-tier monetization lever** (the cloud runs frontier extraction
  on your behalf — a paid-tier reason to upgrade). See ADR 0004.

- **Pricing tiers** — Free ($0) + Pro ($9/mo, ships v1) + Teams ($24/mo,
  "Coming Soon" disabled, per-seat when implemented). Billed via **Polar**
  (Merchant of Record — handles global tax; Benefits API maps to entitlements;
  metered for storage overage). See ADR 0006.

- **AI SDK adapter (`@tekmemo/adapter-ai-sdk`)** — A new **published
  adapter package** (locked S2-Q1) holding the Vercel AI SDK integration that
  previously lived in `packages/core/src/ai-sdk/`. Owns the runtime bridge
  (`createAiSdkRuntimeFromTekmemo`), the AI SDK tool wrapper
  (`buildMemoryToolDefinition` / `runStructuredMemoryTool`), prepare-call memory
  text, agent-session instructions, and scope policy. The `ai` peer dep is a
  real dep of the adapter, not optional-in-core. Mirrors the embedder/reranker/
  (future) extractor/connector adapter pattern (AGENTS.md: provider-neutral
  core). See decisions log S2-Q1.

- **AgentFS** — The **framework-agnostic session-workspace primitive** that
  stays in **core** (`packages/core/src/agentfs/`, locked S2-Q1). Defines
  `AgentfsLikeClient` (readText/writeText/appendText/exists/deleteText +
  optional sync) and `createTekMemoAgentSession` (isolated per-session
  workspace: pulls memory in, scaffolds plan/commands/errors/changes/notes,
  extracts curated durable memory → `notes.md`, with checkpoint + sync
  before/after). Imports core only — zero AI-vendor coupling. The session
  equivalent of `sync/`, so it belongs in core, not an adapter package.

### Managed-runtime sequencing & prerequisites (locked Q31–Q33)

- **Managed-runtime phases** — The three-phase sequence (locked Q32 / ADR 0011,
  revises ADR 0003's two-phase order) from v1 to the hosted runtime:
  1. **Phase 1 — concurrency layer** ([ADR 0010](./adr/0010-cloud-concurrency-control-for-b3.md)):
     a Turso/libSQL serialization layer in front of the file replica
     (project-lock → validate-against-manifest → apply → release). Makes
     multi-writer safe for *both* B3 (agents) and Teams (humans). Greenfield
     (ADR locked, zero code at decision time).
  2. **Phase 2 — Teams tier:** seats + per-seat billing (Polar) + shared
     workspace, shipping on the concurrency-safe replica. Shared-project
     **write** access is the concurrency-gated surface. The first real per-seat
     revenue. Screen: `screens-locked.md` SC7.
  3. **Phase 3 — full managed runtime** (the ADR 0003 moat): run the *same*
     `Tekmemo` runtime on hosted infra against R2-resident files; exposes
     recall/memory/graph via API. Unlocks Q19 intelligence entitlements +
     the Q18 cloud differentiators (A1/A2/B3/C5). Screen: `screens-locked.md`
     SC8.
  - **Forcing insight:** D6 (last-writer-wins) makes Teams-on-replica a
    silent-data-loss bug; the concurrency layer is strictly smaller than the
    full managed runtime, so it ships first and unblocks Teams revenue safely.

- **Remote-blob memory store contract** — The provider-neutral contract (locked
  Q31 / [ADR 0012](./adr/0012-r2-memory-store-adapter.md)) that lets the
  `Tekmemo` runtime read/write its canonical `.tekmemo/` files against a
  remote-blob backend instead of a POSIX filesystem. Defined in **core** as
  `RemoteBlobMemoryStore({ blobClient, metadata, rootKey })` over two injected
  interfaces — `BlobClient` (get/put/delete, opaque-keyed) and `MetadataStore`
  (the canonical-file manifest: path → blob id + size + sha256). Mirrors the
  `Embedder`/`Extractor`/`Connector` interface-in-core + impl-in-adapter seam.
  Required because Cloudflare Workers have no Node `fs` — `local-strategy`
  can't run there unmodified. The cloud reuses its **existing** R2-blob +
  Turso-manifest layout (the file-replica sync infra) rather than inventing a
  parallel store — one set of files, the runtime is a new reader/writer over
  them.

- **R2 memory store adapter (`@tekmemo/adapter-r2`)** — The concrete
  published adapter (locked Q31 / ADR 0012) implementing the
  **`BlobClient`** contract for Cloudflare R2: `createR2BlobClient(binding:
  R2Bucket)`. **Blob-only** (locked S3-Q3 — the blob and metadata axes were
  decoupled from the original bundled R2+Turso package). The `R2Bucket` coupling
  lives in the adapter, never in core. Chosen over an in-core store (Cloudflare
  coupling in MIT core) and a cloud-internal store (would break ADR 0003's
  "self-host the same engine free" thesis).

### Storage adapter axis (locked S3-Q3 — blob decoupled from metadata)

- **Blob-vs-metadata decoupling** — The remote-blob store contract has **two
  orthogonal axes** (`BlobClient` + `MetadataStore`) that a self-hoster picks
  **independently** — there is no single "I use X" for storage the way there is
  for a role provider (OpenAI, Voyage). The original ADR 0012 bundling
  (`tekmemo-adapter-r2` held both R2 blob **and** Turso metadata) was an accident
  of the cloud's history (both built at once), not a design decision, and it
  would have forced N×M combo packages (S3×Postgres, S3×Turso, …) to cover the
  matrix. Locked S3-Q3 decouples: **one package per backend**, N+M packages
  instead of N×M. A future `tekmemo-adapter-s3` / `-gcs` (blob) and
  `-postgres` / `-d1` / `-sqlite` (metadata) implement the same contracts.
_Avoid:_ "tekmemo-adapter-r2-turso" (the legacy bundled name); combo package
names generally.
- **`tekmemo-adapter-turso` (`@tekmemo/adapter-turso`)** — The new
  **metadata-only** package (locked S3-Q3) holding the Turso/libSQL
  `MetadataStore` extracted out of the old bundled R2 package. A
  **replica-aware** store: reuses the cloud's existing `project_files` table
  (the sync-replica reuse optimization from ADR 0012 — "one set of files").
  `apps/cloud` imports `tekmemo-adapter-r2` + `tekmemo-adapter-turso` (one extra
  import; behavior unchanged).
- **`tekmemo-adapter-s3` (`@tekmemo/adapter-s3`)** — The new
  **blob-only** package (locked S3-Q3): a `BlobClient` over the S3 API
  (universal — covers AWS S3, MinIO, Backblaze B2, DigitalOcean Spaces, and R2
  via its S3-compatible API). The build-now blob adapter for self-hosters.
- **`tekmemo-adapter-postgres` (`@tekmemo/adapter-postgres`)** — The
  new **metadata-only** package (locked S3-Q3): a `MetadataStore` over a
  `pg`/Postgres connection. A **standalone** store (no sync replica to reuse),
  so it owns its **own schema** (`tekmemo_files`) + an `ensureSchema()` migration,
  unlike the replica-aware Turso store. The build-now metadata adapter for
  self-hosters.
- **Replica-aware vs standalone MetadataStore** — The two flavors of
  `MetadataStore` impl (same 3-method contract, impl-side difference only):
  **replica-aware** (Turso — reuses the cloud's `project_files` table) vs
  **standalone** (Postgres / D1 / SQLite — owns its table + migration). The
  contract is identical; the difference is purely who owns the schema. A
  self-hoster running `tekmemo-server` with no sync replica always uses a
  standalone store.
- **Deferred store adapters** — GCS (blob) and D1 / SQLite (metadata) follow the
  same contracts when added; S3 + Postgres cover the overwhelming majority of
  self-hosters in two packages. SQLite (zero-infra metadata, via `node:sqlite`)
  is the strongest "easiest self-host" story but waits on Node stabilizing
  `node:sqlite` past experimental.

- **Teams role model** — The locked permission model for the Teams tier (phase
  2, Q32 / `screens-locked.md` SC7): **Owner** (billing + delete team + role
  management), **Admin** (invite/remove members + manage shared projects),
  **Member** (read + write shared projects). Joining a team augments a member's
  workspace (shared projects appear alongside personal ones, Linear/Vercel
  style) — it does not replace it.

- **Hosting differentiation** — How hosted-memory users differ from sync-only
  users, price-wise (locked Q33, reaffirms Q19): **same tiers/prices;
  intelligence-entitlement caps differentiate.** A sync-only Pro user and a
  hosting Pro user both pay $9; the hosting user is bounded by
  `maxConsolidationRuns` / `maxPreWarmPerDay` (`count < cap`). No separate
  "Hosted Memory" product line (would break Q9's single-tier-ladder
  discipline). **Margin guardrail:** Free's 1 consolidation/day runs on the
  **deterministic floor only** (zero LLM spend); Pro+ gets **frontier**
  extraction (the Q18 monetization lever) — so the Free tier's hosted compute
  is cost-safe.

### Launch scope (locked S3-Q9 — full vision at launch)

- **Ship the full vision at launch; defer only two adapters.** The v1 launch
  builds everything the S3 grilling locked, **except** two store adapters (S3
  blob, Postgres metadata) which are documented + deferred. Everything else —
  including the LLM-enhanced intelligence tier and the hosted-memory surface —
  ships at launch (locked S3-Q9). This overrules the "defer the 110% layer"
  recommendation: the deterministic defaults *and* their LLM-enhanced upgrades
  both ship at v1.
- **Compresses ADR 0011's three-phase sequence into one launch — under a Hard
  ordering rule.** Building SC8 (hosted memory) at launch forces its safety
  prerequisite — the **concurrency layer** (ADR 0010/0011 phase 1) — to also
  ship at launch, because hosted multi-agent writes are a known D6 data-loss
  bug without it. The chain is linear: concurrency layer (phase 1) → Teams
  writes unlock (phase 2) → managed runtime + SC8/SC9 (phase 3). **The Hard
  ordering rule (in `s3-execution-plan.md`) makes this load-bearing: no
  concurrent-write surface (slice 1's writer endpoints, slice 7's Team writes,
  slice 8's hosted-memory writes) may be reachable before the concurrency layer
  merges — gated as "route absent / 503," never "route present unsafely."**
  Amends ADR 0011's "ship phases sequentially" sequencing; does not amend its
  *content* (the phases are unchanged, only the release cadence collapses). The
  rule also closes a **latent `RemoteBlobMemoryStore.append` read-modify-write
  race** (non-atomic `safeRead → concat → put`; concurrent appends to
  `notes.md` lose one silently) — the concurrency layer must wrap `append`, in
  scope for the concurrency slice, not a follow-up.
- **Launch-critical (BUILD):** `LlmClient` core contract + OpenAI impl; provider-
  neutral `createHostedRuntime`; `tekmemo-server` (+ HTTP surface); two-Worker
  split; R2 blob-only split + Turso metadata extraction; OpenAI `Extractor`; the
  LLM-enhanced intelligence tier (strategist Q23 / writer-critic Q25a / staleness
  Q24 v1.x / semantic consolidation Q25a); the concurrency layer (ADR 0010);
  Teams full (writes unlocked); SC8 hosted-memory screen + SC9 entitlement rows;
  no-legacy cleanup (`"memory"` mode + policies); docs (mode/policy sweep, Server
  page, `configure/*` landing pages, `connectors.md`, `intelligence.md`); SC10
  recent-activity L2 spec; Voyage v4 (incidental to the hosted-runtime deletion).
- **Deferred (DOCUMENT ONLY, post-launch):** `tekmemo-adapter-s3` (blob); 
  `tekmemo-adapter-postgres` (metadata). OSS self-hosting launches against the
  cloud's R2 + Turso bundle (R2 is S3-compatible; Turso/libSQL is free + easy);
  the native S3/Postgres adapters are *conveniences*, not blockers. GCS (blob)
  + D1/SQLite (metadata) remain further-out.
_Avoid:_ "v1 is sync-only" (it isn't — the full managed runtime ships at launch
under S3-Q9); "defer the intelligence tier" (it ships).

### Cloud screen inventory (locked S3-Q8 — resolves built-vs-locked drift)

- **Screen-inventory reconciliation** — The locked `screens-locked.md` inventory
  and the **built** dashboard routes disagreed (verified against
  `apps/cloud/src/routes/`). S3-Q8 resolves it in the no-legacy direction:
  everything built is either locked or deleted; nothing ships un-specced.
  - **SC7 (Teams) reopened to v1, read-mostly.** `/dashboard/team` is built
    (`0dbf5c1`), so the phase-2 gate is honest only if it tracks reality.
    Decision: Team ships as a **v1 nav item in a read-mostly form**; the unsafe
    surface — **write access to shared projects** — stays gated on ADR 0011
    phase 1 (the concurrency layer), exactly as SC7 already specified. This
    separates "the screen exists" from "the concurrency-gated action is
    enabled." Moves Team from phase-2 to **v1** (the 6-item dashboard nav gains
    its first conditional entry).
  - **SC10 (Recent activity) — new v1 screen.** `/dashboard/recent-activity` is
    built but was un-specced. Locked as SC10: an activity feed backed by
    `memory_events` (the audit trail already in the schema), **project-scoped**
    (events for the selected project). Earns its place as a low-cost v1 surface;
    its IA + data source + scope now defined.
  - **SC4.1 inventory fix — OAuth kickoff route.** `oauth/start.$provider.tsx`
    exists alongside `oauth/callback`; only `callback` was named in SC4.1.
    Add `start` as the OAuth kickoff route (implied by having OAuth at all; an
    omission, not drift).
- **SC8 provider line (open-core honesty)** — The hosted-memory screen
  (`/dashboard/memory`) gains a **read-only "Runtime providers" line** in its
  Runtime-status section ("Embedder: Voyage v4 · Extractor: Workers AI ·
  Reranker: Voyage"). The honest expression of "we run the same `tekmemo-server`
  you could self-host, here's what we chose for you" — reinforces open-core
  trust at near-zero screen cost. Rejected: letting users pick cloud providers
  per-project (managed-runtime-as-platform, breaks the "we run it, you don't
  think about it" value prop).
- **L2 functional spec = "100% locked"** — "Lock cloud screens to 100%
  functionality" means **L2**: every screen's data sources, mutations/actions,
  state machine, entitlement gates (Q19 numeric caps), and empty/error/loading/
  over-cap edge states — the *behavior contract*, not pixels or copy. L1 (IA) is
  done; L2 is the target; L3 (copy via `copywriting`) + L4 (design via
  `frontend-design` + `shadcn`) are downstream skills per AGENTS.md. The output
  is a per-screen functional spec (folded into the roadmap output doc).
- **Self-host-vs-Cloud framing shifts, no new screen.** SC8/SC9 + the landing
  "Comparison" section (SC2.1 §8) reframe the cloud's hosted memory from "a
  runtime you can't get elsewhere" (now false) to "we run the *same*
  `tekmemo-server` you could self-host, minus the ops" (managed convenience).
  Copy shift (L3), recorded so the copywriter knows. The self-host-vs-cloud
  comparison lives on the **existing landing** + the **docs Server page** — not
  a new cloud screen.

### Docs IA (locked S3-Q6 — amends ADR 0008's blueprint)

- **Docs blueprint reprojection** — The post-S3 docs structure (locked S3-Q6 /
  [ADR 0015](./adr/0015-docs-blueprint-reprojection.md)). ADR 0008's **four IA
  rules** (code-is-truth; one home per fact; decisions linked not copied; DRY via
  includes) stand **unchanged** — only its **routing blueprint** is reprojected
  onto the package surface that S3 changed. Not a re-open of ADR 0008 (that would
  re-litigate rules that aren't the drift source and violate Rule 3); an amend.
- **Configure landing pages** — Two **orienting index pages**, not duplicates
  (`/configure/intelligence`, `/configure/storage`). They exist because S3
  introduced two new conceptual structures users must grasp before picking a
  provider: the **4-role intelligence model** (`MemoryEmbedder` / `Reranker` /
  `Extractor` / `LlmClient`) and the **2-axis storage model** (`BlobClient` vs
  `MetadataStore`, picked independently). A landing page explains the structure
  + the deterministic-default + adapter-enhanced seam once, then **links** to
  each provider/backend page. It may **not** re-state a provider's signature,
  defaults, or model list — those live on the provider page (Rule 2). A copy is a
  defect.
- **Server nav item** — `tekmemo-server` gets its **own top-level nav entry**
  (parallel to CLI/MCP), not nested under a "Self-hosting" group — it is a
  first-class deployable artifact (S3-Q1). Cloud content stays deferred to
  `memo.tekbreed.com` (SC1); the docs link out, never host a cloud comparison
  page.

### No-legacy / public-API trim (locked S3-Q5)

- **Two modes, no policies** — The locked v1 `Tekmemo` client surface has
  **two** runtime modes (`local` | `hybrid`) and **no** read/write policy enum
  (locked S3-Q5, the "no legacy support" cut). Both cuts remove dead API that
  contradicted the locked "cloud = file replica, not engine" thesis (D4 / ADR
  0003):
  - **`"memory"` mode + `memory-strategy.ts` removed.** A volatile store is now
    expressed by injecting an in-memory `MemoryStore` into `local` mode
    (`createInMemoryMemoryStore()` + `createInMemoryRecallStore()`), not by a
    parallel strategy that duplicates the whole API surface against a Map.
    Modes collapse 3 → 2.
  - **`RuntimeReadPolicy` / `RuntimeWritePolicy` (`local-first` | `cloud-first`
    | `local-only`) removed.** `cloud-first` promised cloud-served reads the
    architecture cannot deliver (the cloud is a replica, not an engine). Sync is
    already a first-class explicit operation (`sync.push`/`sync.pull`); a read
    policy duplicated it. The "managed runtime might serve reads someday"
    extension point is reintroduced *only* when Phase 3's managed runtime
    actually serves them (a runtime-binding policy, not a cloud-client policy) —
    YAGNI until then.
- **Sync verbs are the only cloud surface** — The cloud is reached via exactly
  two explicit verbs: `sync.push` (two-phase: compute manifest → upload →
  complete) and `sync.pull` (download changed + remove deleted + re-derive
  indexes). Never an implicit read/write policy. `local` mode throws on both
  verbs (no cloud configured); `hybrid` mode wires them through the
  `FileSyncLayer`. The honest expression of "cloud = file replica."

### Self-hosting (locked S3-Q1)

- **Self-hosted runtime** — An **OSS** deployment where a user runs the
  *hosted-runtime substrate* (the same `Tekmemo` engine the cloud runs over
  remote-resident files) **on their own infra**, with **their own providers**:
  their own blob store, metadata store, embedder, reranker, and extractor. The
  substrate is **provider-neutral by construction** — the cloud simply supplies
  one bundle (R2 + Turso + Voyage + Workers AI); an OSS self-hoster supplies a
  different bundle (e.g. S3/GCS + Postgres/D1 + OpenAI + a local extractor).
  No vendor lock-in; no TekMemo Cloud dependency. **Distinct from** the
  **managed runtime** (the cloud runs it) — same substrate, **different
  operator**. The reason `createHostedRuntime` must stop hardcoding providers
  (it becomes a thin config-driven assembler over injected adapters, mirroring
  `local-strategy`). The reason the missing store adapters (`-s3`/`-gcs` blob,
  a non-Turso `MetadataStore`) must exist: the `RemoteBlobMemoryStore` core
  contract is already provider-neutral; only the impls are missing.
_Avoid:_ "self-hosted cloud," "on-prem runtime" (on-prem implies the cloud
product relocated; self-hosted runtime is the OSS substrate, not the cloud).

- **tekmemo-server (`@tekmemo/server`)** — The **OSS-deployable
  hosted-runtime server** (locked S3-Q1, shape B). A published package that
  serves the hosted runtime over an API (HTTP/JSON-RPC), built on the
  **provider-neutral** `createHostedRuntime` factory. Deployable two ways: as a
  **single Node process** for OSS self-hosters (Fly / Railway / Render / a VPS —
  no size cap, nothing to split); or as a **Cloudflare Worker** for the cloud,
  where it runs as the **runtime Worker** behind a Service Binding. Provider
  selection via env vars + adapter packages (own blob store, metadata store,
  embedder, reranker, extractor). The actual fulfillment of ADR 0003's
  "self-host the same engine free" — a first-class OSS artifact, not "use the
  library." Owns the provider-neutral factory; `apps/cloud` consumes it. The
  cloud and the OSS self-hoster run **identical `tekmemo-server` code** — the
  only difference is the deployment target + the providers injected.
  **Distinct from** `@tekmemo/core` (the core library, in-process only) and
  `apps/cloud` (the SaaS = substrate + commercial layer).

### Self-hosting commercial boundary (locked S3-Q7)

- **Self-hosting scope — runtime only** — TekMemo **blesses self-hosting of the
  runtime** (`tekmemo-server`), and **only** the runtime (locked S3-Q7). Two
  layers stay **cloud-only** and are never self-hostable:
  - **Sync** (cross-device file replication) — inherently *centralized*; "self-
    hosting sync" = running your own cloud replica with no benefit over the
    managed cloud. Cloud-only.
  - **The commercial layer** (auth / Better Auth, billing / Polar, the React
    Router dashboard, Teams) — that is `apps/cloud`, the SaaS. Not a self-
    hostable product.
- **Why bless, not starve.** TekMemo is MIT; users can self-host the runtime
  *anyway* via the library — "not offering it" only guarantees a painful OSS
  experience with no offsetting revenue. Blessing it is the Supabase / Vercel /
  PostHog / Plausible open-core pattern: the self-hostable tier drives trust +
  adoption (memory is sensitive; the *option* to self-host is what gets the
  privacy-conscious user to consider the cloud later), while the cloud captures
  the majority who don't want to operate infra. Cannibalization is real but
  small: the user who'll run a VPS + Postgres + manage OpenAI bills is rarely
  the user who'd pay $9 to avoid it.
- **Entitlement model does not apply to self-hosters.** A self-hoster using
  their own S3 + Postgres + OpenAI consumes zero cloud compute — no cloud
  account, no Q19/Q33 entitlements. The Q19/Q33 caps govern *cloud* users only.
  The only edge case: a *mixed* user (self-hosted runtime + cloud sync) — then
  **sync entitlements apply, runtime entitlements don't** (the runtime is
  self-hosted).

### Cloud worker topology (locked S3-Q2; **commitment gated by K3 — see [ADR 0013](./adr/0013-two-worker-split.md) amended**)

> **K3 (2026-07-04):** the two-Worker split below is the **canonical topology**,
> but the commitment to actually split is gated on a `wrangler deploy --dry-run`
> measurement that has not yet run. The "runtime imports do not fit in 3 MB"
> claim is asserted, never measured — `@tekmemo/server` is a thin factory over
> injected adapters. Three outcomes: ≤ 3 MB → collapse to one Worker; ≤ 10 MB →
> free-tier-only split; > 10 MB → split stands. WF-3 owns the dry-run. The
> split's *thesis* (the boundary is the runtime API; cloud and OSS run identical
> `@tekmemo/server` code) is unchanged by K3.

- **Two-Worker split** — The cloud deploys as **two** Cloudflare Workers, not
  one (locked S3-Q2; revises ADR 0005's "one Worker" claim). A hard constraint
  on the free plan: a Worker is capped at **3 MB** (compressed), and the
  commercial stack (RRv8 SSR dashboard + Better Auth + Drizzle + Hono sync API)
  plus the runtime + its adapter imports (Tekmemo core + R2 + Voyage + Workers
  AI) do not fit in 3 MB. Splitting achieves 3 + 3. The split is
  architecturally clean — the boundary between the two Workers *is* the runtime
  API (`recall`/`context`/`graph`/`memory`), which is also the boundary an OSS
  self-hoster gets over HTTP from `tekmemo-server`. **Remains correct after a
  future Workers Paid upgrade** (10 MB cap): isolating the runtime lets it
  scale independently (it is the CPU-heavy part — embeddings, extraction,
  consolidation), and keeps the cloud's bundle shape identical to the OSS
  server. Not a workaround to undo later; the right shape the 3 MB cap forced
  early.
- **Commercial Worker (`apps/cloud` → `workers/app.ts`)** — The cloud's
  commercial layer: RRv8 SSR dashboard + Better Auth + Polar billing + the sync
  API + connectors control-plane. **No runtime bundle** — stays under 3 MB.
  Hosted-memory calls delegate to the runtime Worker over a **Service Binding**.
  The only part that is *commercial* (auth, billing, dashboard, sync); the
  intelligence never lives here.
- **Runtime Worker (`tekmemo-server` deployed as a Cloudflare Worker)** — The
  cloud's hosted-runtime deployment: runs the same `tekmemo-server` package the
  OSS self-hoster deploys as a Node process. Holds per-project `Tekmemo`
  instances; served to the commercial Worker via a **Service Binding**
  (sub-ms hop within a colo; a real but v1-irrelevant cost — sync-only at v1,
  runtime calls land in Phase 3). The CPU-heavy surface (embeddings, extraction,
  consolidation) lives here, isolated from the commercial layer. v1 ships the
  package + factory; per-project instance state across Service-Binding calls is
  a Phase 3 implementation detail (instance map / Durable Object), not a v1
  blocker.

## Key entry points

- AI SDK runtime: `packages/tekmemo-adapter-ai-sdk/` *(was
  `packages/core/src/ai-sdk/runtime/tekmemo-runtime.ts`; extracted per
  decisions log S2-Q1).*
- `Tekmemo` class: `packages/core/src/tekmemo/Tekmemo.ts`
- Provider-neutral hosted-runtime factory: `packages/tekmemo-server/` *(new, S3-Q1
  — `createHostedRuntime`, consumed by the OSS server + the cloud's runtime
  Worker).*
- `LlmClient` contract: `packages/core/src/ai-runtime/` *(new core interface,
  S3-Q4 / ADR 0014 — the 4th member of the embedder/reranker/extractor family).*
- AgentFS session controller:
  `packages/core/src/agentfs/session/agent-session.ts`
- AI SDK tests: `packages/tekmemo-adapter-ai-sdk/tests/` *(moved with the
  package)*
- Runnable example: `examples/ai-sdk/agent.ts`
- Docs: `apps/docs/packages/tekmemo/ai-sdk/`, `apps/docs/api/tekmemo/ai-sdk.md`
- S3 execution plan (the build worklist): `docs/architecture/s3-execution-plan.md`

## Decisions

- [ADR 0002](./adr/0002-connectors-run-locally.md) — Connectors run locally;
  cloud only replicates files. Config syncs via `.tekmemo/connectors.json`
  (tokens server-side, never in R2); connector writes isolated +
  content-deterministic.
- [ADR 0003](./adr/0003-managed-runtime-tier.md) — Cloud's long-term purpose
  is a managed-runtime tier (run the *same* local engine on hosted infra); v1
  ships the file-replica foundation first.
- [ADR 0004](./adr/0004-v1-intelligence-extraction-and-consolidation.md) —
  v1 intelligence = LLM-based extraction + memory consolidation via a
  provider-neutral adapter (local-model option preserves zero-config
  intelligence).
- [ADR 0005](./adr/0005-cloud-tech-stack.md) — Cloud tech stack: one
  Cloudflare Worker (Hono API + React Router v8 SSR + Static Assets) on R2 +
  Turso/Drizzle, Upstash, managed Plunk, Sentry, k6. Whole repo MIT.
- [ADR 0006](./adr/0006-pricing-and-entitlements.md) — Free / Pro $9 / Teams
  $24-coming-soon; entitlement-based enforcement (numeric caps, not plan-name
  checks); Polar billing (Merchant of Record).
- [ADR 0007](./adr/0007-ai-sdk-extraction.md) — Extract the Vercel AI SDK
  integration out of core into `@tekmemo/adapter-ai-sdk`; keep
  framework-agnostic `agentfs/` in core. Runtime interface
  (`TekMemoMemoryRuntime`, renamed from `TekMemoAiRuntime`) stays in core as the
  framework-neutral contract; the Vercel tool/protocol layer stays in the
  adapter.
- [ADR 0008](./adr/0008-docs-information-architecture.md) — Docs information
  architecture: four IA rules (code is source of truth, one home per fact,
  decisions recorded once in ADR system, DRY via VitePress includes) + routing
  blueprint.
- [ADR 0009](./adr/0009-intelligent-retrieval-model.md) — The intelligent
  retrieval model: ~25 MCP tools collapse to 4 verbs; `buildContext()` is
  replaced by a 4-stage retrieval strategist (rewrite/resolve/filter/budget,
  deterministic-default + LLM-enhanced); core memory non-negotiable; a separate
  Entities section (entity-centric recall); per-section expansion cursors
  (progressive recall); the write-side gate (blocklist + 2-level durability
  tier); and the v1 mechanical staleness fix (Filter honors `deprecated`).
  Captures Q21 + Q22 + Q23 + Q24-v1 + Q26 + Q27.
- [ADR 0010](./adr/0010-cloud-concurrency-control-for-b3.md) — A Turso/libSQL
  concurrency-control layer in front of the R2 file replica makes B3 ("one
  memory, many agents", Q18) safe. The first cloud-only capability; revises
  ADR 0003 (cloud = same engine + managed infra **+ concurrency control**).
  Captures Q25b.
- [ADR 0011](./adr/0011-managed-runtime-sequencing.md) — Managed-runtime
  sequencing: **concurrency layer → Teams → full managed runtime** (three
  phases, revises ADR 0003's two-phase order). D6 makes Teams-on-replica a
  silent-data-loss bug; the concurrency layer is smaller than the full runtime
  and ships first, unblocking Teams revenue safely. Captures Q32.
- [ADR 0012](./adr/0012-r2-memory-store-adapter.md) — R2-backed `MemoryStore`
  as a new adapter `@tekmemo/adapter-r2` + a provider-neutral
  remote-blob store contract (`RemoteBlobMemoryStore`) in core. The hard OSS
  prerequisite for phase 3 (Workers have no Node `fs`). Captures Q31.
- [ADR 0013](./adr/0013-two-worker-split.md) — The cloud deploys **two**
  Workers (commercial + runtime) joined by a Service Binding, not one. A 3 MB
  free-plan constraint forces it; the runtime-API boundary makes it
  architecturally clean (identical to the OSS `tekmemo-server` surface).
  Revises ADR 0005. Captures S3-Q2.
- [ADR 0014](./adr/0014-llm-client-core-interface.md) — A provider-neutral
  **`LlmClient`** transport contract in core (the fourth member of the
  embedder/reranker/extractor family), distinct from `Extractor`. Powers the
  strategist/critic/staleness/semantic-consolidation features' LLM-enhanced
  tiers. Captures S3-Q4.
- [ADR 0015](./adr/0015-docs-blueprint-reprojection.md) — Amends ADR 0008's
  **routing blueprint** (the four IA rules stand unchanged). Reprojects the docs
  page map onto the post-S3 package surface: package-anchored sidebar + two
  task-oriented landing pages (`configure/intelligence`, `configure/storage`)
  that orient without duplicating, a first-class **Server** nav item, and the
  Q6 mode/policy sweep folded in. Captures S3-Q6.
- [ADR 0004](./adr/0004-v1-intelligence-extraction-and-consolidation.md)
  *(revised 2026-06-22)* — v1.x extensions appended: the `unverified` node
  status (Q24 v1.x re-verification) and writer-critic consolidation (Q25a).
- [Decisions log](./architecture/decisions.md) — Full new-architecture design
  sessions (Q1–Q10 + S2-Q1 + Q11–Q20 + Q21–Q28 + Q29–Q33 all locked): the above
  ADRs plus package triage (remove upstash, consolidate benchmarks, shelve
  mcp-worker for v1, add `tekmemo-connectors` package, defer extractor adapter
  package), the connector set (GitHub + Notion at v1, Linear queued), the
  license decision (MIT), the full retrieval-model session (Q22 write
  intelligence, Q23 strategist, Q24 staleness loop, Q25a writer-critic,
  Q25b cloud concurrency, Q26 entity-centric, Q27 progressive recall, Q28
  local concurrency), and the managed-runtime sequencing session (Q29
  connectors-never-cloud, Q30/Q33 pricing reaffirmed, Q31 R2 store, Q32
  three-phase sequence). Projects into `screens-locked.md` SC1–SC9.

