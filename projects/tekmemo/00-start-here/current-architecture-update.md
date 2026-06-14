# Current Architecture Update — `.tekmemo/` Protocol

_Created: 2026-05-04_

## What changed

TekMemo is now centered around a formal local filesystem protocol:

```txt
.tekmemo/
  manifest.json
  memory/core.md
  memory/notes.md
  events/memory-events.jsonl
  events/conversations.jsonl
  indexes/chunks.jsonl
  graph/nodes.jsonl
  graph/edges.jsonl
  snapshots/snapshots.jsonl
```

This is now the canonical OSS contract.

Older references to a loose file layout such as:

```txt
.tekmemo/
  core.md
  notes.jsonl
  conversations.jsonl
  chunks.jsonl
```

should be treated as outdated.

---

# Product meaning

TekMemo should be described as:

> Developer-owned, file-first memory infrastructure for AI apps and agents.

The local `.tekmemo/` directory is what makes that true.

It means developers can:

- run memory locally without cloud cost
- inspect what agents remember
- see where memory came from
- track when memory changed
- index memory into recall providers
- sync to TekMemo Cloud only when they need hosted API, teams, restore history, and production controls

---

# Implementation meaning

The package line should now follow this ownership model:

| Concern | Owner |
|---|---|
| `.tekmemo/` protocol | `@tekbreed/tekmemo` |
| local filesystem persistence | `@tekbreed/tekmemo/fs` |
| AgentFS/Turso file-backed sync | `@tekbreed/tekmemo/agentfs` |
| vector recall contracts | `@tekbreed/tekmemo/recall` |
| vector provider adapters | `@tekbreed/tekmemo-upstash`, `@tekbreed/tekmemo-turso-vector`, `@tekbreed/tekmemo-qdrant`, etc. |
| rerank contracts | `@tekbreed/tekmemo/rerank` |
| rerank provider adapters | `@tekbreed/tekmemo/rerank-voyage`, `@tekbreed/tekmemo/rerank-cohere`, etc. |
| hosted sync/teams/billing/usage | TekMemo Cloud |

---

# Critical documentation updates

The following docs have been updated to match the new architecture:

- [Memory Architecture](/05-architecture/memory-architecture)
- [Local `.tekmemo/` Protocol](/05-architecture/local-tekmemo-protocol)
- [Core Runtime](/03-package-reference/core-runtime)
- [`@tekbreed/tekmemo` Package](/03-package-reference/tekmemo)
- [Memory Stores](/03-package-reference/memory-stores)
- [`@tekbreed/tekmemo/fs` Package](/03-package-reference/fs)
- [Package Boundaries](/02-oss-and-packages/package-boundaries)
- [Package Map](/02-oss-and-packages/package-map)
- [Package Test Plan](/09-testing-benchmarks/package-test-plan)

---

# Rule going forward

Any package or cloud feature that touches local memory must respect this rule:

```txt
.tekmemo/ is the portable memory source of truth.
```

Vector databases, hosted APIs, cloud dashboards, and rerankers are downstream systems.
They are not the memory source of truth.
