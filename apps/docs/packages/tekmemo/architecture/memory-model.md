# Memory model

TekMemo's memory model is the answer to: *what counts as memory, and how do the different kinds relate?* It combines six primitives into one system where inspectable files are the source of truth and derived indexes are disposable.

The guiding philosophy is that project memory should be **inspectable, explicit, and versioned** — like code — rather than "invisible" prompt stuffing where an agent infers everything from scratch on every run.

## The six primitives

```text
                    ┌─────────────┐
        read often   │  core.md    │  the stable briefing (small, injected everywhere)
                    └──────┬──────┘
                           │ grows over time
                           ▼
                    ┌─────────────┐
        append      │  notes.md   │  durable decisions / constraints / summaries
                    └──────┬──────┘
                           │ every write logs an event
                           ▼
                    ┌─────────────┐
        audit       │  events     │  append-only ledger (memory-events.jsonl)
                    └──────┬──────┘
                           │ indexed for retrieval
                           ▼
              ┌────────────┴────────────┐
              ▼                         ▼
       ┌─────────────┐          ┌─────────────┐
derive │  recall idx  │  derive  │   graph     │  entities + relationships
       │ chunks/embs │          │ nodes/edges │
       └─────────────┘          └─────────────┘
                                       ▲
                                       │ point-in-time capture
                               ┌───────┴───────┐
                       backup  │   snapshots   │  immutable, named, restorable
                               └───────────────┘
```

### 1. Core memory — `core.md`

The **stable project briefing.** The foundational facts an agent must know *every time* it works in the project: tech stack, critical architecture rules, active conventions. Kept deliberately small because it's injected into every context package. Edit it by hand like a README.

### 2. Notes — `notes.md`

**Durable, additive records** of decisions, constraints, preferences, references, and summaries. Unlike core memory, notes accumulate over time and are historical — when an agent learns something new or solves a hard bug, it stores a note so future agents don't repeat the work. Each note has a `kind`, optional `tags`, provenance (`sourceRefs`), and a durability `tier`. See [Memory records](../memory-records).

### 3. Events — `memory-events.jsonl`

An **append-only ledger** recording every write. Every time a note is added or core memory is updated, an event is logged. This is what makes sync, audit, and rollback possible: the ledger is the source of truth for *what changed and when*, and connector dedup reads it to skip already-ingested items.

### 4. Recall index — `chunks.jsonl` / `embeddings.jsonl`

**Derived** retrieval artifacts. Large documents are split into chunks; embeddings are computed per chunk. These power [recall](../intelligence#recall) and are fully disposable — delete them and TekMemo rebuilds them from the source files.

### 5. Graph memory — `nodes.jsonl` / `edges.jsonl`

A web of **entities and relationships** extracted from prose. Nodes are concepts/files/decisions; edges are typed relationships (`depends-on`, `related-to`, `supersedes`, …). The graph answers architectural questions ("what depends on this module?") and is grown by the [extractor](../intelligence#graph-extraction). See [Graph memory](./graph-memory).

### 6. Snapshots — `snapshots/*.json`

**Point-in-time, immutable** backups of the entire memory state. Named (e.g. `pre-v2-refactor`), used to diff memory over time and to restore after a bad change. The snapshot index lives at `snapshots.jsonl`; each snapshot is its own immutable file.

## How they relate

The primitives split cleanly into **source of truth** vs. **derived**:

| Primitive | Role | If deleted... |
| --- | --- | --- |
| `core.md`, `notes.md` | Source of truth (human-readable) | The memory is gone — these *are* the memory. |
| `memory-events.jsonl` | Audit ledger | Lost history (and connector dedup falls back to recent-memory scan). |
| recall index (`chunks`, `embeddings`) | **Derived** | Rebuilt automatically on next recall. |
| graph (`nodes`, `edges`) | Derived (but auditable) | Rebuilt by re-running extraction over the notes. |
| snapshots | Backups | Lost restore points (not the live memory). |

This split is the file-first thesis in concrete form: **files are the source of truth; the derived index is disposable.** It's why TekMemo can offer zero-config recall — the expensive artifacts can always be regenerated from the cheap, readable source files.

## Trust order

When TekMemo composes a context package, it packs memory in a deliberate order — the order an agent should trust when sources disagree:

`directive` → `core` → `graph entities` → `recall` → `recent` → `notes`

Core memory is the most authoritative (it's the briefing you curated); recent events and notes are progressively more contextual. This matters when, say, a recent note contradicts a core constraint — the directive section tells the agent how to reconcile them.

## See also

- [File-first memory](../file-first-memory) — the philosophy this model is built on.
- [Memory filesystem](../filesystem-layout) — where each primitive lives on disk.
- [Memory records](../memory-records) — the note schema and kinds.
- [Memory intelligence](../intelligence) — recall, extraction, consolidation, durability.
- [Graph memory](./graph-memory) — the entity/relationship model in depth.
