# TekMemo Core

[![npm](https://img.shields.io/npm/v/tekmemo?label=npm)](https://www.npmjs.com/package/tekmemo)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![Types](https://img.shields.io/badge/types-included-blue)](./dist/index.d.mts)
[![CI](https://github.com/tekbreed/tekmemo/actions/workflows/ci.yml/badge.svg)](https://github.com/tekbreed/tekmemo/actions/workflows/ci.yml)
[![Status](https://img.shields.io/badge/status-preview-orange)](../../README.md)

Provider-neutral, file-first memory runtime for AI apps and agents.

TekMemo core owns the local memory protocol. It does **not** talk to the filesystem, cloud, vector databases, embedding providers, rerankers, billing, or hosted tenancy.

## Canonical local protocol

TekMemo memory starts as inspectable files that developers own:

```txt
.tekmemo/
  manifest.json
  memory/
    core.md
    notes.md
  events/
    memory-events.jsonl
    conversations.jsonl
  indexes/
    chunks.jsonl
  graph/
    nodes.jsonl
    edges.jsonl
  snapshots/
    snapshots.jsonl
  tmp/
```

## What this package provides

- canonical `.tekmemo/` paths
- manifest helpers
- memory store contract
- in-memory test store
- bootstrap helpers
- core memory helpers
- notes helpers
- conversation JSONL helpers
- memory event log helpers
- chunk index helpers
- snapshot index helpers
- search helpers
- chunking helpers
- typed error classes

## Quickstart

```ts
import {
  InMemoryMemoryStore,
  bootstrapMemoryStore,
  writeCoreMemory,
  readCoreMemory,
  appendMemoryEvent,
  createMemoryEvent
} from "tekmemo";

const store = new InMemoryMemoryStore();
await bootstrapMemoryStore(store, { projectId: "local-app" });

await writeCoreMemory(store, "# Core Memory\n\n- The user prefers file-first memory.\n");

await appendMemoryEvent(
  store,
  createMemoryEvent({
    type: "memory.updated",
    sourcePath: ".tekmemo/memory/core.md",
    summary: "Updated core memory"
  })
);

const coreMemory = await readCoreMemory(store);
```

## Package boundary

This package is intentionally provider-neutral.

Use these packages for integrations:

- `@tekmemo/fs` for Node filesystem storage
- `@tekmemo/agentfs` for AgentFS/Turso AgentFS-backed storage
- `@tekmemo/recall` for vector recall contracts
- `@tekmemo/upstash-vector` for Upstash Vector recall
- `@tekmemo/voyageai` and `@tekmemo/openai` for embeddings
- `@tekmemo/rerank` and provider packages for reranking

## Production safety

The core package rejects:

- non-string memory paths
- null-byte paths
- absolute paths
- backslash paths
- parent directory traversal
- paths outside `.tekmemo/`
- unsupported protocol files
- malformed JSONL when strict mode is used
- invalid manifest/event/chunk/snapshot records
- non-canonical manifest paths
- snapshot records whose safe path does not match their ID
- invalid note kinds
- non-object source references
- metadata values that are not true JSON values, including circular references,
  `undefined`, functions, symbols, bigint, and non-finite numbers
