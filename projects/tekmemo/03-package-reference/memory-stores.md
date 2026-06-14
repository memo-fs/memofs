# Memory Store Packages

## Packages

```txt
@tekbreed/tekmemo/fs
@tekbreed/tekmemo/agentfs
```

Memory stores implement physical persistence for the canonical `.tekmemo/` protocol.

The protocol itself belongs to `@tekbreed/tekmemo`.

---

# `@tekbreed/tekmemo/fs`

## Purpose

Local filesystem-backed memory store.

Use it for:

- OSS quickstarts
- local-first testing
- examples
- self-hosted workflows
- CLI inspector workflows
- local `.tekmemo/` development

## Canonical layout

`@tekbreed/tekmemo/fs` must read and write:

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

## Must handle

- root directory validation
- missing root directory creation
- unsupported path rejection
- path traversal rejection
- null byte rejection
- symlink policy
- atomic writes
- append-only event logs
- same-instance concurrent appends
- safe read of missing files
- configurable missing-file behavior
- deterministic file layout

## Must not own

- protocol design
- cloud sync
- vector recall
- provider API calls
- billing
- hosted BYOK storage

---

# `@tekbreed/tekmemo/agentfs`

## Purpose

AgentFS-backed memory store.

Use it for:

- syncable file-backed memory
- Turso AgentFS workflows
- agent-readable/editable memory files
- future cloud sync patterns

## Must handle

- canonical `.tekmemo/` paths
- missing files
- optimistic write conflicts
- append fallback
- sync metadata
- safe paths
- remote errors
- retryable failures

---

# Contract tests

Both packages should pass the same `MemoryStore` contract suite.

Required contract behavior:

- bootstrap full `.tekmemo/` layout
- read/write canonical files
- append JSONL records
- reject unsupported paths
- reject traversal paths
- preserve event order
- handle missing files consistently
- avoid corrupting files during write failures
