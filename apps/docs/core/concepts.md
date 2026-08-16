---
title: "Core Memory Concepts"
description: "Architecture of canonical files, durability tiers, secret safety, code anchoring, memory decay, and knowledge graphs in MemoFS."
---

# Core Concepts

MemoFS organizes agent memory into structured, project-scoped layers. By separating memory by retrieval frequency and purpose, the system prevents context bloat while preserving long-term intelligence.

## The 11 Canonical Files Layout

Inside your workspace root, MemoFS manages all memory state in the `.memofs/` directory across 11 canonical files:

```
.memofs/
├── manifest.json              # [1]  Tracked memory assets & anchor hash cache
├── memory/
│   ├── core.md                # [2]  Core canonical rules & baseline facts
│   └── notes.md               # [3]  Archival timestamped memory notes
├── events/
│   ├── memory-events.jsonl    # [4]  Append-only memory write/event audit log
│   └── conversations.jsonl    # [5]  Chronological conversation interaction log
├── indexes/
│   ├── chunks.jsonl           # [6]  Chunked text fragments for lexical recall
│   └── embeddings.jsonl       # [7]  Persisted vector embeddings
├── graph/
│   ├── nodes.jsonl            # [8]  Entity nodes (concepts, tools, decisions)
│   └── edges.jsonl            # [9]  Relationship triples & dependencies
├── snapshots/
│   ├── snapshots.jsonl        # [10] Checkpoint index
│   └── <snapshot-id>.json     # Dynamic snapshot checkpoints
├── connectors.json            # [11] External source connectors (no secrets)
├── archive/
│   └── <memory-id>.json       # Full-fidelity cold-archived memory records
└── tmp/                       # Temporary workspace scratch directory
```

### Canonical Files Reference

| File | Protocol Constant | Format | Access Pattern | Purpose |
|---|---|---|---|---|
| `.memofs/manifest.json` | `MANIFEST_PATH` | JSON | Read at startup | Manifest of all canonical paths, metadata, and the anchor hash cache. |
| `.memofs/memory/core.md` | `CORE_MEMORY_PATH` | Markdown | Loaded in prompt context | Condensed, high-signal project identity, baseline rules, and constraints. |
| `.memofs/memory/notes.md` | `NOTES_MEMORY_PATH` | Markdown | Appended on demand | Long-form timestamped notes, decisions, and architectural references. |
| `.memofs/events/memory-events.jsonl` | `MEMORY_EVENTS_PATH` | JSONL | Append-only | Audit log of memory operations (`memory.created`, `memory.archived`, etc.). |
| `.memofs/events/conversations.jsonl` | `CONVERSATIONS_MEMORY_PATH` | JSONL | Append-only | Chronological agent conversation turns for historical reconstruction. |
| `.memofs/indexes/chunks.jsonl` | `CHUNKS_INDEX_PATH` | JSONL | Queried on recall | Text chunks and lexical metadata for BM25 and fuzzy search. |
| `.memofs/indexes/embeddings.jsonl` | `EMBEDDINGS_INDEX_PATH` | JSONL | Queried on recall | Persisted vector embeddings for semantic similarity scoring. |
| `.memofs/graph/nodes.jsonl` | `GRAPH_NODES_PATH` | JSONL | Graph queries | Entity vertices (features, symbols, concepts, decisions, actors). |
| `.memofs/graph/edges.jsonl` | `GRAPH_EDGES_PATH` | JSONL | Graph queries | Relationship edges (`depends_on`, `supersedes`, `uses`, `mentions`). |
| `.memofs/snapshots/snapshots.jsonl` | `SNAPSHOTS_INDEX_PATH` | JSONL | On-demand | Metadata index tracking available memory snapshots and checkpoints. |
| `.memofs/connectors.json` | `CONNECTORS_PATH` | JSON | Sync unit | Declarations for external data sources (GitHub, Notion). Uses `secretRef` only. |

## Durability Tiers (`durable` vs `transient`)

When a memory is written via `memofs.writeMemory()`, MemoFS classifies its durability tier:

```
                         ┌─────────────────────────┐
                         │   memofs.writeMemory()  │
                         └────────────┬────────────┘
                                      │
                                      ▼
                      ┌───────────────────────────────┐
                      │   Durability Classification   │
                      │    (classifyDurability)       │
                      └───────┬───────────────┬───────┘
                              │               │
                     durable  │               │  transient
                              ▼               ▼
                   ┌─────────────────┐ ┌─────────────────────────┐
                   │ • notes.md      │ │ • notes.md (Audit trail)│
                   │ • memory-events │ │ • memory-events         │
                   │ • recall index  │ └─────────────────────────┘
                   │ • graph store   │   (Excluded from search   │
                   └─────────────────┘    so retrieval stays clean)
```

- **`durable`**: High-value facts, decisions, and constraints. Written to `notes.md`, recorded in `memory-events.jsonl`, and **indexed into the recall index and knowledge graph** so they steer future agent sessions.
- **`transient`**: Scratchpad observations, temporary working state, or low-confidence guesses. Written to `notes.md` and `memory-events.jsonl` as an audit trail, but **never indexed into recall or graph**. This prevents scratch thoughts from polluting prompt context.

### Classification Rules

The deterministic classifier evaluates signals in the following order:

1. **Explicit Override:** If `input.tier` is explicitly provided (`"durable"` or `"transient"`), it is honored verbatim.
2. **Low Confidence:** If `confidence < 0.4` (`TRANSIENT_CONFIDENCE_THRESHOLD`), the memory is classified as `transient`.
3. **Low Signal Content:** If content length `< 20` characters (`TRANSIENT_CONTENT_MIN_LENGTH`) after trimming, it is classified as `transient`.
4. **Memory Kind:**
   - Durable kinds (`decision`, `constraint`, `goal`, `preference`, `reference`) → `durable`.
   - Working state kinds (`note`, `summary`) → `transient`.
5. **Default:** If no kind is specified, defaults to `durable` to prevent accidental omission from search.

## Write Blocklist & Secret Safety

To prevent accidental leakage of credentials into syncable memory files, all writes through `memofs.writeMemory()`, `memofs.core.update()`, and `memofs.agentfs.complete()` pass through the **Write Blocklist Gate** (`assertWriteAllowed`):

- **Zero-Config, Always-On:** The blocklist runs locally with zero external network dependencies.
- **Hard Rejection:** Writes containing secret material throw `MemoryWriteBlockedError` immediately. Nothing is persisted.
- **Safe Redaction:** Error messages and violation previews contain only redacted snippets (first 3 characters + `…` + last character, e.g., `sk-…z`) — never full tokens.

### Monitored Secret Patterns

The `BLOCKLIST_RULES` engine catches:
- **Provider API Keys:** AWS access keys (`AKIA...`), GitHub tokens (`ghp_...`), OpenAI API keys (`sk-...`), Google AI keys (`AIza...`), Slack tokens (`xox...`), Stripe live keys (`sk_live_...`), MemoFS API keys (`tm_...`, `mfs_live_...`).
- **PEM Private Key Blocks:** `-----BEGIN PRIVATE KEY-----` and associated RSA/EC key blocks.
- **JSON Web Tokens (JWT):** Base64url-encoded triples (`eyJ...`).
- **Database Connection Strings:** URIs containing embedded credentials (`postgres://user:pass@host:5432/db`).
- **Secret Assignments:** Generic `password=...`, `apiKey=...`, `secret: ...` assignments with alphanumeric characters and digits exceeding 12 characters.

## Code Anchoring & Drift Detection

Memories can be bound to source code files using an `AnchorRef`. This binds the memory to a repository-relative path and the file's SHA-256 content hash computed at write time:

```ts
// Explicit anchor
await memofs.writeMemory({
  title: "Auth Token Rotation",
  content: "Tokens are verified in src/auth/verify.ts using asymmetric RSA256.",
  kind: "decision",
  anchor: {
    file: "src/auth/verify.ts",
    hash: "a3f5b8...",
    symbol: "src/auth/verify.ts#verifyToken", // Optional AST symbol path
  },
});
```

Alternatively, use the inline marker syntax in note content:
```markdown
We enforce strict JWT validation. @anchor(file="src/auth/verify.ts", symbol="verifyToken")
```

### Drift Detection at Recall Time

When `memofs.recall()` or `memofs.context()` executes:
1. The recall engine consults the **Anchor Hash Cache** in `.memofs/manifest.json` (5-minute TTL with mtime invalidation).
2. If the anchored source file was modified or deleted on disk, the recalled item is flagged with `stale: true`.
3. Stale memories receive an automated **50% relevance score demotion** (`score *= 0.5`).
4. Stale items are still returned (rank-demoted rather than hidden) so agents are informed that the underlying code has drifted.

## Memory Decay Floors

Knowledge naturally ages. To prevent obsolete decisions from being trusted indefinitely, MemoFS assigns kind-specific decay floors via `EXPIRY_DAYS`:

| Memory Kind | Expiry Floor | Typical Use Case |
|---|---|---|
| **`decision`** | **365 days** | Major architectural decisions and library selections. |
| **`constraint`** | **180 days** | Strict project requirements and compliance rules. |
| **`reference`** | **180 days** | Links to external documentation, specs, and schemas. |
| **`goal`** | **120 days** | Milestone objectives and sprint goals. |
| **`preference`** | **90 days** | Code style, formatting, and tooling preferences. |
| **`summary`** | **60 days** | High-level overviews of past refactors or discussions. |
| **`note`** | **30 days** | Working observations and implementation notes. |

When a memory exceeds its expiry floor:
- The item is flagged with `unverified: true`.
- It receives a **40% score demotion** (`score *= 0.6` — milder than code drift).
- Surfacing unverified memories signals to agents that human or automated re-verification is warranted.

## Knowledge Graph & Fact Statuses

MemoFS includes an entity-relationship graph stored in `graph/nodes.jsonl` and `graph/edges.jsonl`.

### Graph Fact Statuses

Every node and edge maintains a `status`:

```
┌──────────────────────────────────────────────────────────┐
│                    FACT STATUS UNION                     │
├──────────────┬───────────────────────────────────────────┤
│ `active`     │ Current, verified canonical knowledge.    │
│ `deprecated` │ Superseded by a newer fact (kept for audit│
│ `conflicted` │ Direct contradiction detected.            │
│ `stale`      │ Anchored code file has drifted or deleted.│
│ `unverified` │ Exceeded memory decay floor.              │
│ `archived`   │ Moved to cold storage in .memofs/archive/ │
│ `deleted`    │ Marked for deletion.                      │
└──────────────┴───────────────────────────────────────────┘
```

### Orthogonal Flags

Nodes and edges also carry orthogonal boolean flags that do not override the primary status:
- **`disputed: boolean`**: True when contested by conflicting facts.
- **`stale: boolean`**: True when the bound code file has drifted.
- **`unverified: boolean`**: True when fact age exceeds its kind-specific floor.

## Memory Archive & Restore Lifecycle

Deprecated memories can be moved out of active memory into cold storage (`.memofs/archive/<id>.json`) using `memofs.archiveDeprecated()`:

```mermaid
stateDiagram-v2
    [*] --> active: writeMemory()
    active --> stale: Code drifts (hash mismatch)
    stale --> active: Drift resolved / re-anchored
    active --> unverified: Age > EXPIRY_DAYS
    unverified --> active: Re-verified
    active --> deprecated: Superseded (consolidation)
    deprecated --> archived: archiveDeprecated()
    archived --> active: restoreMemory(id)
```

1. **`active → deprecated`**: Consolidation identifies an edge `A supersedes B` and transitions fact `B` to `deprecated`.
2. **`deprecated → archived`**: `memofs.archiveDeprecated()` moves the deprecated note to `.memofs/archive/<id>.json` and removes it from `notes.md`. Bound graph nodes transition to `archived`.
3. **`archived → active`**: `memofs.restoreMemory(id)` reads the archive file, re-inserts the note into `notes.md`, reactivates the graph node, and deletes the archive JSON.

## Progressive Context Retrieval

Instead of dumping the entire memory store into an LLM prompt, MemoFS uses a **4-Stage Strategist Retrieval Pipeline**:

1. **Rewrite:** Tokenizes the query, appends task-specific lexicon (e.g. `coding`, `debug`, `refactor`, `docs`), and expands synonyms.
2. **Resolve:** Looks up matching entities in the knowledge graph and computes active neighbor subgraphs.
3. **Filter:** Applies code drift demotions (0.5x), decay demotions (0.6x), and suppresses retired entities.
4. **Budget:** Slices sections under `maxBytes` (`SECTION_WEIGHTS`: `recall: 3`, `entities: 2`, `recent: 1`, `notes: 1`) and generates progressive expansion cursors (`expand`).
