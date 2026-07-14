---
title: "Why We Built Agent Memory as a Filesystem, Not a Database"
description: "The database-first approach to agent memory creates vendor lock-in, context bloat, and fragile concurrency. MemoFS proves a file-first architecture with structured layers and deliberate write constraints delivers durable, portable memory that works identically from laptop to cloud — without surrendering ownership."
date: 2026-07-12
author: Christopher S. Aondona
tags: [architecture, memory, ai-agents, filesystem, local-first]
cover: null
---

Every AI agent framework eventually hits the same wall: **memory**.

Context windows help, but they're expensive, capped, and fragile — one overflow loses everything. Vector databases promise semantic recall, but they introduce a new database to operate, a new vendor to trust, and a new query language to learn. RAG pipelines work for documents, but agents need something different: they need *their own* memories — decisions made, constraints learned, preferences observed — to persist across sessions, across machines, across time.

The industry converged on a database-first answer: spin up Postgres + pgvector, or Pinecone, or Weaviate. Add an embedding model. Build a retrieval pipeline. Call it "agent memory."

We took a different bet. **We built agent memory as a filesystem.**

This article walks through the MemoFS architecture — why we chose files over tables, how six memory layers prevent context bloat while preserving intelligence, why the recall pipeline blends three retrieval strategies with configurable decay, what "provider-neutral contracts" actually means in practice, and the deliberate constraints (like a write gate that returns `503` until concurrency is proven safe) that make the system trustworthy.

If you're building agents that need to remember, this is the architecture we wish existed two years ago.

## The Problem: Agents Have Amnesia

An AI agent without memory is a stateless function — smart in the moment, useless over time.

**Context windows** were the first workaround. Stuff the prompt with history. But:
- **Expensive** — you pay for tokens you've already processed
- **Limited** — hard caps (128k, 200k, 1M) that fill fast on multi-step tasks
- **Fragile** — one overflow truncates the very context you needed most
- **Opaque** — no way to inspect, search, or curate what the agent "knows"

**Vector databases** were the second answer. Embed everything, query by similarity. But:
- **New infrastructure** — another database to provision, secure, monitor, scale
- **Vendor lock-in** — your memories live in their format, their API, their pricing
- **Overkill for structured facts** — "the user prefers dark mode" doesn't need cosine similarity
- **No built-in semantics for time** — recency, staleness, supersession are all DIY

**RAG pipelines** solve document retrieval. Agents need *self*-retrieval — their own evolving knowledge graph, not a static corpus.

The pattern we kept seeing: teams building custom memory layers on top of databases, re-implementing the same primitives — core facts, append-only notes, conversation logs, semantic indexes, entity graphs, rollback points — every time.

**The insight**: these aren't application concerns. They're *memory primitives*. They belong in the runtime, not the application.

## The Architecture: Six Layers, One Filesystem

MemoFS organizes memory into **six canonical layers**, each with a distinct access pattern and retention policy. All live in `.memofs/` as plain files — markdown, JSONL, JSON.

| Layer | Files | Access Pattern | Purpose |
|-------|-------|----------------|---------|
| **Core Memory** | `memory/core.md` | Loaded every session | Canonical project rules, schemas, stack decisions — the "always-on" context |
| **Notes Memory** | `memory/notes.md` | Appended on demand | Long-form explanations, deployment steps, library rationale — durable but not always needed |
| **Events** | `events/memory-events.jsonl`, `events/conversations.jsonl` | Sequential append | Chronological write audit + conversation reconstruction |
| **Recall Index** | `indexes/chunks.jsonl`, `indexes/embeddings.jsonl` | Semantic/lexical query | Chunked text + vector embeddings for hybrid recall |
| **Graph** | `graph/nodes.jsonl`, `graph/edges.jsonl` | Graph queries | Entities + relationships with temporal validity (`supersedes` edges) |
| **Snapshots** | `snapshots/snapshots.jsonl` (+ snapshot files) | On demand | Versioned checkpoints for safe rollback |

**Why files?**

1. **Universal** — every language, every platform, every CI/CD, every editor reads files. No driver, no ORM, no connection pool.
2. **Inspectable** — `cat .memofs/memory/core.md` shows you exactly what the agent knows. `grep -r "dark mode" .memofs/` finds every preference. Debugging memory is debugging text.
3. **Versionable** — Git tracks `.memofs/` natively. Your memory history *is* your repo history.
4. **Portable** — Copy the directory to another machine, another cloud, another developer's laptop. It works.
5. **No schema migrations** — Add a field to a note? Just write it. The parser is tolerant.

The filesystem *is* the database. The runtime is the query engine.

## Layer by Layer

### Core Memory: The Agent's Constitution

`core.md` is the only file loaded on *every* session initialization. It's markdown — human-editable, LLM-readable.

```markdown
# Project: MemoFS Core

## Tech Stack
- Language: TypeScript (strict)
- Runtime: Node.js >= 22, Cloudflare Workers
- Build: tsdown, pnpm
- Testing: Vitest

## Architectural Rules
- Provider-neutral contracts only — no vendor imports in core
- Deterministic defaults for every intelligence slot
- File-first storage; cloud is a replica, not the source of truth
- Write gate: mutations return 503 until concurrency layer lands

## Key Constraints
- Core memory must stay under 8KB (hard limit enforced at write)
- Notes are append-only; never mutate history
- Graph edges carry `supersedes` for temporal fact resolution
```

**Design decision**: Hard cap on core memory (configurable, default ~8KB). Forces distillation. If it doesn't fit, it's not *core* — it belongs in notes or graph.

### Notes Memory: The Agent's Journal

`notes.md` is append-only, timestamped markdown. No size limit. The agent writes here when it learns something worth keeping but not worth putting in core.

```markdown
---
timestamp: "2026-01-15T14:32:00Z"
kind: "decision"
confidence: 0.9
tags: ["architecture", "storage"]
---

## Decision: Use Advisory Locks for Concurrent Appends

**Context**: Multiple agent sessions writing to the same `.memofs/` directory caused lost updates on `notes.md`.

**Options considered**:
1. SQLite WAL mode — adds dependency, breaks file-first
2. File locking (flock) — not portable to Workers
3. Advisory locks via lock files — portable, works on NFS, no kernel support needed

**Decision**: Option 3. Implemented in `packages/core/src/fs/utils/advisory-lock.ts`.

**Tradeoff**: Slightly slower than native flock, but runs everywhere Node runs.
```

**Key point**: Notes carry metadata (`kind`, `confidence`, `tags`) as YAML frontmatter. The recall pipeline indexes this for filtering ("show me only `decision` notes with `confidence > 0.8`").

### Events: The Write-Ahead Log

Two JSONL streams:

- `memory-events.jsonl` — every `writeMemory`, `recordNote`, `updateCore`, `upsertGraph` call with input, output, timestamp, actor
- `conversations.jsonl` — full conversation turns (user/assistant/tool) for session reconstruction

```jsonl
{"type":"writeMemory","timestamp":"2026-01-15T14:32:00Z","actor":"agent:codex","input":{"content":"Advisory locks chosen for concurrent appends","kind":"decision"},"output":{"success":true}}
```

Not for context — for forensics. Reconstruct what the agent knew at step 3. Audit when a memory was written.

### Recall Index: Hybrid Retrieval (BM25 + Fuzzy + Vector)

The recall index stores chunked text fragments and their vector embeddings. Queries run **three parallel channels**:

1. **Vector channel** — semantic search via configured `MemoryEmbedder` (Voyage, OpenAI, local ONNX). Handles conceptual similarity where keywords fail.
2. **Lexical channel (BM25)** — full-text search over exact terms. Ensures error messages, filenames, specific keywords match precisely.
3. **Fuzzy channel** — character-level edit distance. Handles typos, syntax fragments, name variations.

Results merge via **Reciprocal Rank Fusion (RRF)**, then reranked by a configurable `Reranker` (deterministic lexical-overlap fallback by default, upgradeable to semantic reranker).

```typescript
// packages/core/src/recall/hybrid/hybrid-recall.ts
finalScore = 
  relevanceWeight * rerankScore +
  recencyWeight * recencyBoost +
  confidenceWeight * confidence
```

**Recency decay** uses a configurable half-life (default 30 days). A memory created "now" scores 1.0 on recency; one half-life old scores ~0.5; two half-lives ~0.25. Memories without timestamps get a neutral 0.5. The index *self-tunes* toward current relevance without ever hard-deleting anything.

**Key insight**: Deterministic defaults (BM25 + fuzzy + lexical reranker) work surprisingly well *without any vector embeddings*. Add an embedder when you need semantic depth — the pipeline upgrades seamlessly.

### Graph Memory: Entities + Relationships + Time

The graph layer stores entities and relationships as a versioned knowledge graph. Enables structured queries: "what depends on authentication?" "show me the history of this decision."

```jsonl
{"id":"ent:auth","type":"module","name":"Authentication","createdAt":"2026-01-10T00:00:00Z"}
{"id":"ent:user","type":"module","name":"User Management","createdAt":"2026-01-10T00:00:00Z"}
{"id":"edge:auth-user","source":"ent:auth","target":"ent:user","relation":"dependsOn","createdAt":"2026-01-10T00:00:00Z"}
```

**Temporal fact resolution** via `supersedes` edges. When consolidation runs (the second half of v1 intelligence), duplicate entities merge and stale facts retire — marked `deprecated`, never deleted. The audit trail is preserved.

**Extraction**: Rule-based default (regex/heuristic), upgradeable to LLM-enhanced. The `Extractor` contract is provider-neutral — inject your own.

### Snapshots: Semantic Rollback

Not git — *semantic* memory snapshots. Capture the full memory state (core, notes, graph, indexes) at a point in time. Restore to undo a bad code generation, a hallucinated decision, a corrupted graph.

```typescript
const snapshot = await memo.snapshots.create({ label: "before-refactor" });
// ... agent does something destructive ...
await memo.snapshots.restore(snapshot.id);
```

---

## The Write Gate: Safety Over Availability

This is the most counterintuitive decision in MemoFS: **every mutating method returns `503 Service Unavailable` until the concurrency layer is injected.**

```typescript
// packages/server/src/runtime-api/dispatch.ts
// The write-gate (Hard ordering rule):
// Gated mutating methods return 503 when no concurrency layer is injected
// When injected, the lock + manifest validation lets mutating handlers
// run safely under concurrent writers.
```

**Why?** Last-writer-wins on agent memory silently corrupts the very context the agent relies on. Two agents updating the same graph node? Lost update. Two sessions appending to notes? Lost append. The corruption is silent, delayed, and catastrophic — the agent makes decisions on stale facts.

We'd rather **block writes** than ship a footgun. Reads work fully today. To write memory programmatically before the gate lifts, use the `MemoFS` client directly in-process (it handles local concurrency via advisory locks).

The concurrency layer is coming. Until then, the gate is "method rejects," never "method present unsafely."

---

## Local-First, Cloud-Optional Sync

MemoFS is designed around a **file-first architecture**:

- **OSS (local)**: The core memory engine (`@memofs/core`), CLI (`memofs`), and adapters run completely locally. Primitives, memories, indexes stored in `.memofs/` within your workspace.
- **MemoFS Cloud (optional)**: A secure cloud replica. Acts as a sync transport — replicates your local memory files across machines. The Cloud is a *repository sync backend*, not a separate closed-source memory system.

**Sync verbs are explicit** — no implicit read/write policies:

```typescript
// Push: compute manifest, upload changed blobs, advance sync cursor
await memo.sync.push({ projectId: "my-project" });

// Pull: download changed files, remove deleted ones, re-derive indexes
await memo.sync.pull({ projectId: "my-project" });
```

The cloud runs the *exact same runtime* (`@memofs/server`) — same file-first engine, same provider-neutral contracts. Self-hosters deploy the same binary to Node.js or Cloudflare Workers, wiring their own storage (R2 + Turso, S3 + Postgres, etc.) via the `RemoteBlobMemoryStore` adapter.

---

## Provider-Neutral Contracts: You Own the Adapters

Every intelligence slot is an interface, not an implementation:

| Slot | Interface | Default | Upgrade |
|------|-----------|---------|---------|
| `embedder` | `MemoryEmbedder` | Lexical-only (BM25 + fuzzy) | Voyage, OpenAI, Transformers.js |
| `reranker` | `Reranker` | Lexical token-overlap | Cohere, Jina, custom |
| `extractor` | `Extractor` | Rule-based graph extractor | LLM-enhanced |
| `llmClient` | `LlmClient` | None (regex strategist) | OpenAI, Anthropic, local |

```typescript
import { RemoteBlobMemoryStore } from "@memofs/core";
import { createR2BlobClient } from "@memofs/adapter-r2";
import { createTursoMetadataStore } from "@memofs/adapter-turso";
import { createVoyageEmbedder } from "@memofs/adapter-voyage";

const store = new RemoteBlobMemoryStore({
  blobClient: createR2BlobClient({ binding: env.BLOBS }),
  metadata: createTursoMetadataStore({ client: db.$client, projectId }),
  rootKey: projectId,
});

const memo = new MemoFS({
  store,
  projectId,
  embedder: createVoyageEmbedder({ apiKey: env.VOYAGE_KEY }), // or omit for lexical-only
});
```

**Core never imports a vendor package**. Adapters live in separate `@memofs/adapter-*` packages. You choose what runs in your stack — no lock-in, no hidden dependencies.

---

## Common Misconceptions (Steelmanned)

> **"It's just RAG."**

RAG retrieves *documents*. MemoFS manages *agent memory* — the agent's own evolving knowledge (decisions, constraints, preferences, entity relationships) with temporal validity, rollback, and structured graph queries. Different primitives, different access patterns.

> **"Files don't scale."**

SQLite handles terabytes. The `.memofs/` directory is a database — just one with a universal query language (`cat`, `grep`, `jq`, `git`). The runtime adds indexes (BM25, vector, graph) on top. Scale is an indexing problem, not a storage problem.

> **"No ACID = unsafe."**

The write gate *is* the safety mechanism. Local writes serialize via advisory locks. Cloud sync is explicit push/pull with manifest validation. The concurrency layer (when it lands) adds distributed locking. Unsafe would be *pretending* concurrent writes are safe when they're not.

---

## What's Still Unsolved (Honest Gaps)

| Problem | Status | Notes |
|---------|--------|-------|
| **Concurrent writes across processes/machines** | Mitigated (write gate + advisory locks locally; sync is explicit push/pull) | Distributed concurrency layer in design — will lift the 503 gate |
| **Cross-project graph queries** | Not supported | Graph is project-scoped. Multi-project entities need a shared workspace layer |
| **Memory pruning / TTL policies** | Manual only | No automated "forget facts older than X with confidence < Y" — by design (auditability), but tooling needed |
| **Multi-tenant isolation** | Not in OSS core | Cloud handles tenancy; self-hosters build their own namespace layer |
| **Staleness detection** | Partially mitigated | Recency decay in recall + `supersedes` edges in graph + consolidation pass. But no autonomous re-verification against ground truth (code, docs, running system) — requires LLM-enhanced strategist |

The **staleness** problem is the deepest: how does the system know a memory is no longer true? Consolidation retires facts via `supersedes` edges. Recency decay downweights old memories in recall. But there's no autonomous re-verification against ground truth — that's a v2 intelligence problem.

---

## Practical Implications: When to Use MemoFS vs. a Vector DB

| Use MemoFS When... | Use a Vector DB When... |
|--------------------|-------------------------|
| Agent needs *its own* durable memory (decisions, prefs, constraints) | You're searching *external* document corpora (docs, tickets, codebases) |
| You want zero-infra local dev (`npx memofs init`) | You need managed scaling from day one |
| Portability matters (laptop → CI → prod → colleague's laptop) | You're building a traditional RAG chatbot |
| You need structured memory (graph, snapshots, typed layers) | You only need semantic similarity on text |
| You want to own your memory format and adapters | You're fine with vendor APIs and pricing |

**Migration path**: Start local. `npm i @memofs/core && npx memofs init`. Add cloud sync when you need multi-device. Self-host the server when you need team workspaces. Eject adapters when you need custom storage.

---

## What the First Week Looks Like

```bash
# Day 1: Local memory
npm i @memofs/core
npx memofs init
# .memofs/ created with core.md, notes.md, indexes/, graph/, snapshots/

# Day 2: Hook into your agent
# import { MemoFS } from "@memofs/core";
# const memo = new MemoFS({ store: createNodeFsMemoryStore({ rootDir: ".memofs" }), projectId: "my-agent" });
# await memo.bootstrap();

# Day 3: Write core memory (project rules, stack decisions)
# await memo.core.update(coreMarkdown);

# Day 4: Let the agent record notes and recall
# await memo.notes.record({ content: "User prefers dark mode", kind: "preference" });
# const hits = await memo.recall({ query: "UI preferences" });

# Day 5: Enable hybrid recall with local embeddings (no API keys)
# import { createLazyLocalEmbedder } from "@memofs/core";
# const memo = new MemoFS({ ..., embedder: createLazyLocalEmbedder() });

# Day 6: Try the MCP server in your editor
# npx -y @memofs/mcp-server --runtime local --root /path/to/project
# Works with Claude Desktop, Cursor, Zed

# Day 7: Add cloud sync when ready
# MEMOFS_RUNTIME=hybrid MEMOFS_CLOUD_URL=... MEMOFS_API_KEY=... memo sync push
```

---

## Try It

- **Core package**: `npm i @memofs/core` — [docs](https://docs.memofs.dev/packages/core/)
- **CLI**: `npx memofs` — [commands](https://docs.memofs.dev/packages/cli/)
- **MCP Server** (Claude Desktop, Cursor, Zed): `npx -y @memofs/mcp-server --runtime local --root /path/to/project`
- **Self-host server**: `npm i @memofs/server` — [deploy guide](https://github.com/memo-fs/memofs/tree/main/examples/server)
- **Discord**: [github.com/memo-fs/memofs/discussions](https://github.com/memo-fs/memofs/discussions)

---

*Building agents that remember? We'd love to hear what you're building — and what memory primitives you're missing. Open a discussion on GitHub or join the Discord.*