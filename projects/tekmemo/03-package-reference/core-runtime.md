# Core Runtime Package Reference

## Package

```txt
tekmemo
```

## Purpose

The `@tekbreed/tekmemo` package is the provider-neutral core runtime and the owner of the **`.tekmemo/` local memory protocol**.

It defines what memory is.
It does not decide where memory is physically stored.

---

# Canonical protocol

The core package owns these canonical paths:

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

The core package should export constants for these paths so every adapter follows the same protocol.

Example:

```ts
export const TEKMEMO_DIR = ".tekmemo";

export const TEKMEMO_PATHS = {
  manifest: ".tekmemo/manifest.json",
  coreMemory: ".tekmemo/memory/core.md",
  notesMemory: ".tekmemo/memory/notes.md",
  memoryEvents: ".tekmemo/events/memory-events.jsonl",
  conversations: ".tekmemo/events/conversations.jsonl",
  chunks: ".tekmemo/indexes/chunks.jsonl",
  graphNodes: ".tekmemo/graph/nodes.jsonl",
  graphEdges: ".tekmemo/graph/edges.jsonl",
  snapshots: ".tekmemo/snapshots/snapshots.jsonl"
};
```

---

# What `@tekbreed/tekmemo` owns

- `.tekmemo/` protocol constants
- manifest types and validation
- core memory helpers
- notes helpers
- conversation event helpers
- memory event types
- chunk record types
- snapshot record types
- source manifest types
- chunking helpers
- deterministic hash/ID helpers
- JSONL parsing helpers
- structured errors
- in-memory store for tests

---

# What `@tekbreed/tekmemo` must not own

- Node filesystem access
- AgentFS implementation
- Cloudflare bindings
- Turso client code
- Upstash client code
- embedding provider calls
- reranking provider calls
- billing
- tenant enforcement
- hosted BYOK storage

---

# Core concepts

## Memory store

A memory store is any backend that can read/write canonical TekMemo paths.

Examples:

- in-memory test store
- local filesystem store from `@tekbreed/tekmemo/fs`
- AgentFS-backed store from `@tekbreed/tekmemo/agentfs`
- future cloud-sync-backed store

## Manifest

The manifest declares protocol version, project metadata, and canonical path mapping.

## Core memory

Stable, human-readable durable memory in:

```txt
.tekmemo/memory/core.md
```

## Notes memory

Human-readable accumulated notes in:

```txt
.tekmemo/memory/notes.md
```

## Memory events

Append-only operational event log in:

```txt
.tekmemo/events/memory-events.jsonl
```

## Conversations

Structured summarized conversation records in:

```txt
.tekmemo/events/conversations.jsonl
```

## Chunk registry

Source-to-chunk traceability records in:

```txt
.tekmemo/indexes/chunks.jsonl
```

---

# Required helper categories

## Bootstrap helpers

- create manifest
- create default memory files
- create event files
- create chunk index file
- create graph files
- create snapshot index file
- idempotent bootstrap
- overwrite bootstrap where requested

## Manifest helpers

- create default manifest
- read manifest
- write manifest
- parse manifest
- validate manifest

## Event helpers

- create memory event
- validate memory event
- append memory event
- read memory events
- parse JSONL event lines
- skip or throw on malformed JSONL

## Chunk helpers

- create chunk record
- append chunk record
- read chunk records
- mark chunk stale
- deterministic chunk hash
- deterministic chunk ID

## Snapshot helpers

- create snapshot path
- create snapshot record
- append snapshot record
- read snapshot records

---

# Edge cases to handle

- unsupported canonical path
- path traversal attempt
- null-byte path
- missing manifest
- invalid manifest version
- invalid ISO timestamp
- empty core memory
- empty notes memory
- malformed JSONL lines
- duplicate event IDs
- invalid event type
- invalid conversation role
- invalid source reference
- invalid memory type
- invalid chunk size
- invalid chunk overlap
- deterministic chunk ID generation
- circular metadata during serialization
- overwrite vs idempotent bootstrap

---

# Required tests

- bootstrap creates the full `.tekmemo/` layout
- bootstrap is idempotent
- overwrite bootstrap replaces expected files
- manifest validates correctly
- core memory can be read and updated
- notes can be appended
- conversations can be appended/read
- memory events can be appended/read
- malformed JSONL can be skipped or thrown
- chunk records can be appended/read
- stale chunks can be marked
- snapshots can be created and listed
- unsafe paths are rejected
- chunking is deterministic
- hashing is deterministic
- in-memory store follows the same store contract
