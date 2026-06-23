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
  (`packages/tekmemo/src/tekmemo/Tekmemo.ts`). Construct it with
  `{ rootDir, projectId, mode? }`. Modes: `local`, `hybrid`, `memory` (the
  legacy `"cloud"` mode is removed per D4 — the cloud is now a file replica,
  not a runtime mode). Owns the hybrid recall pipeline and exposes
  `core`, `notes`, `graph`, `snapshots`, `agentfs`, `sync`, `rerank`
  namespaces plus `recall()`, `context()`, `writeMemory()`,
  `listRecentMemories()`, `validate()`, `health()`.

- **recall** — TekMemo's hybrid retrieval: BM25 + fuzzy token matching, a
  vector channel (when an embedder is configured), a recency boost, and an
  optional reranker. Available on the `Tekmemo` class as `memo.recall(query,
  { limit?, filter? })`. There is exactly one recall pipeline; it does not
  degrade to plain text search in any mode.

- **TekMemoMemoryRuntime** — The **framework-neutral runtime contract** (locked
  S2-Q1) that lives in **core** (`packages/tekmemo/src/ai-runtime/types.ts`).
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
  intelligent engine. Lives in **`@tekbreed/tekmemo-adapter-ai-sdk`** (extracted
  from core per decisions log S2-Q1). See ADR 0007.

- **AI SDK helpers** — `buildRuntimeMemoryContext()` (context-first system
  prompt: core memory + notes + recall), `buildRuntimeMemoryToolDefinition()`
  (multi-command memory tool for in-turn recall/remember),
  `runRuntimeMemoryTool()` (executes a tool command with scope enforcement).
  Exported from **`@tekbreed/tekmemo-adapter-ai-sdk`** (not core) per S2-Q1.

- **AiMemoryAccessContext** — Scope object (`projectId`, `userId`,
  `conversationId`, `workspaceId`, `tenantId`, `participantIds`) controlling
  read/write visibility. Passed as `access` to the helpers.

- **Connector** — An ingestion source that fetches external data (Notion,
  GitHub, Slack, …) and writes it into `.tekmemo/` memory. **Runs locally**
  (the cloud never ingests — D1/D2). Configured from the web dashboard (control
  plane); executed by the local runtime (data plane). See
  [Decisions log](./architecture/decisions.md) Q1–Q3.

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
  `packages/tekmemo/src/recall/hybrid/hybrid-recall.ts`.

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

- **Connector framework (`@tekbreed/tekmemo-connectors`)** — A new published
  package (locked Q6) holding the local connector framework + built-in
  connectors (Notion, GitHub, …). Executes ingestion locally per Q1; config
  syncs via `.tekmemo/connectors.json` per Q2. See decisions log Q6.

- **Extractor interface** — The provider-neutral contract for LLM-based graph
  extraction (locked Q5), to be **defined in core `packages/tekmemo`**. Concrete
  adapter packages (e.g. a `-transformers`-based local extractor) are added only
  when first implemented — no speculative empty package. See decisions log Q6.

- **Connector (interface)** — The provider-neutral plugin contract in
  `@tekbreed/tekmemo-connectors` (locked Q7); each connector (GitHub, Notion,
  later Linear/Slack/…) implements it. Adding a connector = writing a new
  adapter, not refactoring the framework. v1 ships GitHub + Notion; Linear is
  queued as #3.

- **Cloud stack** — TekMemo Cloud runs as **one Cloudflare Worker**: Hono API +
  React Router **v8** framework-mode SSR dashboard, served via Static Assets.
  Storage: R2 (blobs, free egress) + Turso/libSQL + Drizzle. Auth: Better Auth
  (pending capability check). Scheduling/queues: Upstash QStash+Redis+Workflow.
  Email: managed Plunk. Errors: Sentry. Load testing: Grafana k6. Billing: Polar.
  Railway deferred to the managed-runtime tier (ADR 0003). See ADR 0005. (v8 is
  GA with an official `@react-router/cloudflare` Workers adapter — verified via
  `npm view`; this reverses an earlier "v8 doesn't exist" draft that was wrong.)

- **Entitlement model** — Cloud enforcement uses **numeric capability caps**,
  never `plan === "Pro"` checks (§12.3). Three entitlement dimensions (locked
  Q19): `maxHostedStorageBytes` (Free ~1GB / Pro ~25GB / Teams ~100GB),
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

- **AI SDK adapter (`@tekbreed/tekmemo-adapter-ai-sdk`)** — A new **published
  adapter package** (locked S2-Q1) holding the Vercel AI SDK integration that
  previously lived in `packages/tekmemo/src/ai-sdk/`. Owns the runtime bridge
  (`createAiSdkRuntimeFromTekmemo`), the AI SDK tool wrapper
  (`buildMemoryToolDefinition` / `runStructuredMemoryTool`), prepare-call memory
  text, agent-session instructions, and scope policy. The `ai` peer dep is a
  real dep of the adapter, not optional-in-core. Mirrors the embedder/reranker/
  (future) extractor/connector adapter pattern (AGENTS.md: provider-neutral
  core). See decisions log S2-Q1.

- **AgentFS** — The **framework-agnostic session-workspace primitive** that
  stays in **core** (`packages/tekmemo/src/agentfs/`, locked S2-Q1). Defines
  `AgentfsLikeClient` (readText/writeText/appendText/exists/deleteText +
  optional sync) and `createTekMemoAgentSession` (isolated per-session
  workspace: pulls memory in, scaffolds plan/commands/errors/changes/notes,
  extracts curated durable memory → `notes.md`, with checkpoint + sync
  before/after). Imports core only — zero AI-vendor coupling. The session
  equivalent of `sync/`, so it belongs in core, not an adapter package.

## Key entry points

- AI SDK runtime: `packages/tekmemo-adapter-ai-sdk/` *(was
  `packages/tekmemo/src/ai-sdk/runtime/tekmemo-runtime.ts`; extracted per
  decisions log S2-Q1).*
- `Tekmemo` class: `packages/tekmemo/src/tekmemo/Tekmemo.ts`
- AgentFS session controller:
  `packages/tekmemo/src/agentfs/session/agent-session.ts`
- AI SDK tests: `packages/tekmemo-adapter-ai-sdk/tests/` *(moved with the
  package)*
- Runnable example: `examples/ai-sdk/agent.ts`
- Docs: `apps/docs/packages/tekmemo/ai-sdk/`, `apps/docs/api/tekmemo/ai-sdk.md`

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
  integration out of core into `@tekbreed/tekmemo-adapter-ai-sdk`; keep
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
- [ADR 0004](./adr/0004-v1-intelligence-extraction-and-consolidation.md)
  *(revised 2026-06-22)* — v1.x extensions appended: the `unverified` node
  status (Q24 v1.x re-verification) and writer-critic consolidation (Q25a).
- [Decisions log](./architecture/decisions.md) — Full new-architecture design
  sessions (Q1–Q10 + S2-Q1 + Q11–Q20 + Q21–Q28 all locked): the above ADRs
  plus package triage (remove upstash, consolidate benchmarks, shelve
  mcp-worker for v1, add `tekmemo-connectors` package, defer extractor adapter
  package), the connector set (GitHub + Notion at v1, Linear queued), the
  license decision (MIT), and the full retrieval-model session (Q22 write
  intelligence, Q23 strategist, Q24 staleness loop, Q25a writer-critic,
  Q25b cloud concurrency, Q26 entity-centric, Q27 progressive recall, Q28
  local concurrency).

