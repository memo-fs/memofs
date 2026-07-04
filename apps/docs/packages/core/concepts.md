# Core Concepts

TekMemo organizes agent memory into structured, project-scoped layers. By separating memory by retrieval frequency and purpose, the system prevents context bloat while preserving long-term intelligence.

## The 5 Memory Layers

| Layer | Primary File | Access Pattern | Purpose |
|---|---|---|---|
| **Core Memory** | `core.md` | Loaded on every session | Highly condensed, canonical project rules and baseline facts. |
| **Archival Memory** | `notes.md` | Retrieved on demand | Long-form notes, historical logs, and deep references. |
| **Recall Memory** | `conversations.jsonl` | Semantically queried | Chronological conversation logs and context fragments. |
| **Sync State** | Metadata | Internal lifecycle | Tracks whether changes are local, remote, or queued. |
| **Restore Points** | Snapshots | Version control | Checkpoints for rolling back bad decisions or edits. |

---

## 1. Core Memory (`core.md`)
Core Memory represents the "identity" and "operating rules" of the workspace. It contains the most essential, high-priority facts that the agent must keep in mind at all times.
- **Location:** `.tekmemo/memory/core.md`
- **Format:** Markdown.
- **Best Use Case:** Project rules, database schemas, tech stack declarations, and key architectural choices.

## 2. Archival Memory (`notes.md`)
Archival Memory is for facts that are important but do not need to be in the active context window for every request.
- **Location:** `.tekmemo/memory/notes.md`
- **Format:** Markdown.
- **Best Use Case:** Explanations of complex systems, deployment steps, and library dependencies.

## 3. Recall Memory (`conversations.jsonl`)
Recall Memory records chronological interactions. Rather than reading the entire history, semantic query pipelines search this layer to fetch only relevant chunks.
- **Location:** `.tekmemo/events/conversations.jsonl`
- **Format:** JSON Lines.
- **Best Use Case:** Reconstructing past chat sessions or recalling a decision made days ago.

## 4. Sync State
Sync State manages consistency between your local workspace and a remote replica (e.g. TekMemo Cloud).
- **Format:** Runtime file-manifest checks.
- **Best Use Case:** Running offline with zero latency, and pushing updates when reconnecting.

## 5. Restore Points (Snapshots)
Snapshots capture versioned checkpoints of the memory state, enabling safe rollback capability if an agent produces incorrect or destructive memories.
- **Location:** `.tekmemo/snapshots/`
- **Format:** JSON-serialized graphs.
- **Best Use Case:** Rolling back memory to a clean state after a failed code generation or bad decision.
