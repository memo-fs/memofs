# Memory model

The core philosophy of TekMemo is that project memory should be inspectable, explicit, and versioned—just like code. It favors structured, durable records over "invisible" prompt stuffing where an agent attempts to infer everything from scratch on every run.

The memory model combines several primitives:

### 1. Core memory (`core.md`)
The stable project briefing. This contains the foundational facts an AI assistant must know every time it works in the project (e.g. tech stack, critical architecture rules, active conventions).

### 2. Notes (`notes.md`)
Durable records of decisions, constraints, preferences, references, and summaries. Unlike core memory, notes are additive and historical. When an agent learns something new or solves a hard bug, it stores a note so future agents don't repeat the mistake.

### 3. Events (`events.jsonl`)
An append-only ledger that records changes over time. Every time a note is added or core memory is updated, an event is logged. This makes sync, audit, and agent workflows easier to inspect and rollback.

### 4. Chunks (`chunks.jsonl`)
Automatically generated index files that split large memory documents (like `notes.md`) into smaller semantic segments for fast retrieval during a recall search.

### 5. Graph memory (Nodes & Edges)
A web of entities and relationships that helps tools answer architectural questions (e.g. "What depends on this file?" or "Which ticket led to this decision?").

### 6. Snapshots
A point-in-time, immutable backup bundle of the entire memory state. Snapshots can be named (e.g. "pre-v2-refactor") and used to diff memory changes over time.
