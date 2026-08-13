# Core Concepts

MemoFS organizes agent memory into structured, project-scoped layers. By separating memory by retrieval frequency and purpose, the system prevents context bloat while preserving long-term intelligence.

## Memory Layers

| Layer | Primary Files | Access Pattern | Purpose |
|---|---|---|---|
| **Core Memory** | `memory/core.md` | Loaded on every session | Highly condensed, canonical project rules and baseline facts. |
| **Notes Memory** | `memory/notes.md` | Appended on demand | Long-form notes, historical logs, and deep references. |
| **Events** | `events/memory-events.jsonl`, `events/conversations.jsonl` | Appended sequentially | Memory write events and chronological conversation logs. |
| **Recall Index** | `indexes/chunks.jsonl`, `indexes/embeddings.jsonl` | Semantically queried | Chunked text and vector embeddings powering hybrid recall. |
| **Graph** | `graph/nodes.jsonl`, `graph/edges.jsonl` | Graph queries | Entity-relationship mapping for structured knowledge. |
| **Snapshots** | `snapshots/snapshots.jsonl` | On demand | Versioned checkpoints for rolling back bad decisions or edits. |

## 1. Core Memory (`core.md`)

Core Memory represents the "identity" and "operating rules" of the workspace. It contains the most essential, high-priority facts that the agent must keep in mind at all times.

- **Location:** `.memofs/memory/core.md`
- **Format:** Markdown.
- **Best Use Case:** Project rules, database schemas, tech stack declarations, and key architectural choices.

## 2. Notes Memory (`notes.md`)

Notes Memory is for facts that are important but do not need to be in the active context window for every request.

- **Location:** `.memofs/memory/notes.md`
- **Format:** Markdown (timestamped entries).
- **Best Use Case:** Explanations of complex systems, deployment steps, and library dependencies.

## 3. Events (`memory-events.jsonl`, `conversations.jsonl`)

Events record chronological memory writes and conversation interactions. Rather than reading the entire history, semantic query pipelines search these logs to fetch only relevant fragments.

- **Location:** `.memofs/events/memory-events.jsonl` (memory writes), `.memofs/events/conversations.jsonl` (conversation history)
- **Format:** JSON Lines.
- **Best Use Case:** Reconstructing past chat sessions or auditing when a memory was written.

## 4. Recall Index (`chunks.jsonl`, `embeddings.jsonl`)

The recall index stores chunked text fragments and their vector embeddings. Hybrid recall (BM25 + fuzzy + vector) queries this index to retrieve only the relevant chunks for a given query.

- **Location:** `.memofs/indexes/chunks.jsonl`, `.memofs/indexes/embeddings.jsonl`
- **Format:** JSON Lines.
- **Best Use Case:** Semantic and lexical search over all memory content.

## 5. Graph (`nodes.jsonl`, `edges.jsonl`)

The graph layer stores entities and their relationships as a versioned knowledge graph. It enables structured queries like "what depends on authentication?" and supports temporal fact resolution.

- **Location:** `.memofs/graph/nodes.jsonl`, `.memofs/graph/edges.jsonl`
- **Format:** JSON Lines.
- **Best Use Case:** Entity resolution, dependency tracking, and structured knowledge retrieval.

## 6. Snapshots (`snapshots.jsonl`)

Snapshots capture versioned checkpoints of the memory state, enabling safe rollback capability if an agent produces incorrect or destructive memories.

- **Location:** `.memofs/snapshots/snapshots.jsonl` (index)
- **Format:** JSON Lines index + individual snapshot files.
- **Best Use Case:** Rolling back memory to a clean state after a failed code generation or bad decision.

## Connectors (`connectors.json`)

Connector configuration for external data sources (GitHub, Notion, etc.). Contains no secrets — only `secretRef` pointers. This file is the 11th canonical file in the `.memofs/` layout.

- **Location:** `.memofs/connectors.json`
- **Format:** JSON.
- **Best Use Case:** Declaring which external sources to ingest into memory.

## Code Anchoring & Drift Detection

Memories can be bound to source code files using an `AnchorRef` — a code anchor containing the file's repo-relative path and SHA-256 hash at write time, with an optional TypeScript symbol path.

When a memory is anchored, MemoFS recomputes the file's hash at recall time:

- **File changed or deleted:** The memory transitions to `stale` status, receives `stale: true` on the recall item, and gets demoted in search relevance (`score *= 0.5`). Stale memories are still surfaced (rank-demoted, not suppressed) so the next agent session sees drift happened.
- **File unchanged:** The memory is served normally.

Anchoring is opt-in. Use the `anchor` parameter on `memofs.remember` / `memo.writeMemory()`, or use the `@anchor(file=..., symbol=...)` marker syntax inside memory content.

For `.ts`/`.tsx` files, MemoFS uses the TypeScript Compiler API to validate and extract the symbol path at write time. Non-TypeScript files are anchored by file path and hash only.

Hash results are cached in `.memofs/manifest.json` with mtime-based invalidation (5-minute TTL) for efficient recall performance.

## Memory Decay Floors

Memory facts age out of `active` to `unverified` status when they exceed a kind-specific expiry floor. This prevents stale knowledge from being trusted without re-verification.

| Memory Kind | Expiry (days) |
|---|---|
| `decision` | 365 |
| `constraint` | 180 |
| `reference` | 180 |
| `goal` | 120 |
| `preference` | 90 |
| `summary` | 60 |
| `note` | 30 |

At recall time, memories exceeding their floor transition to `unverified` status, receive `unverified: true` on the recall item, and get a score demotion (`score *= 0.6` — milder than drift's `0.5`). Unverified memories are still surfaced so the next agent session can re-verify them.

Decay is distinct from drift: `stale` means the anchored code changed; `unverified` means the memory is old enough to warrant human or LLM confirmation.

## Memory Archive & Restore

Deprecated memories can be physically moved to cold storage at `.memofs/archive/<id>.json` via `memofs consolidate --archive-deprecated`. This removes them from active recall while preserving full-fidelity JSON records for recovery.

Archived memories are recoverable via `memofs restore <id>`, which writes the note back to `notes.md` and reactivates its graph node status.

**Lifecycle transitions:**

- `active → stale → active` — anchored file changed, then drift resolved
- `active → unverified → active` — exceeded decay floor, then re-verified
- `active → deprecated → archived` — superseded by a newer memory, then consolidated
- `archived → active` — operator restores from archive

All archive and restore operations emit audit events (`memory.archived`, `memory.restored`) to `events/memory-events.jsonl`.
