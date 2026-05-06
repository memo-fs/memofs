# `@tekmemo/agentfs`

[![npm](https://img.shields.io/npm/v/%40tekmemo%2Fagentfs?label=npm)](https://www.npmjs.com/package/@tekmemo/agentfs)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![Types](https://img.shields.io/badge/types-included-blue)](./dist/index.d.mts)
[![CI](https://github.com/tekbreed/tekmemo/actions/workflows/ci.yml/badge.svg)](https://github.com/tekbreed/tekmemo/actions/workflows/ci.yml)
[![Status](https://img.shields.io/badge/status-experimental-yellow)](../../README.md)

AgentFS-backed `MemoryStore` adapter for TekMemo.

This package lets TekMemo use an AgentFS-like remote file runtime while preserving the canonical local memory protocol:

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

## Install

```bash
pnpm add tekmemo @tekmemo/agentfs
```

## Basic usage

```ts
import { bootstrapMemoryStore, CORE_MEMORY_PATH } from "tekmemo";
import { createAgentfsMemoryStore } from "@tekmemo/agentfs";

const store = createAgentfsMemoryStore(agentfsClient, {
  scope: "project",
  projectId: "proj_123"
});

await bootstrapMemoryStore(store);
await store.write(CORE_MEMORY_PATH, "# Core Memory\n");
```

Behind the scenes, `CORE_MEMORY_PATH` resolves to:

```txt
/stores/project/proj_123/.tekmemo/memory/core.md
```

## Supported scopes

```ts
createAgentfsMemoryStore(client, {
  scope: "project",
  projectId: "proj_123"
});

createAgentfsMemoryStore(client, {
  scope: "user",
  userId: "usr_123"
});

createAgentfsMemoryStore(client, {
  scope: "session",
  sessionId: "sess_123"
});
```

## AgentFS-like client contract

AgentFS is still a beta surface, so this package intentionally accepts a small structural client instead of importing a hard SDK type. In production, pass the real AgentFS SDK/client object through this boundary as long as it provides the methods below.

```ts
interface AgentfsLikeClient {
  readText(path: string): Promise<string>;
  writeText(path: string, content: string): Promise<void>;
  appendText?(path: string, content: string): Promise<void>;
  exists?(path: string): Promise<boolean>;
  sync?: {
    pull?(): Promise<void>;
    push?(): Promise<void>;
    checkpoint?(label: string): Promise<void>;
  };
}
```

`appendText` and `exists` are optional. If `appendText` is missing, the store can fall back to same-instance serialized read/write append.

## Missing file behavior

The default behavior matches the production TekMemo core store: missing reads throw `MemoryNotFoundError`.

```ts
createAgentfsMemoryStore(client, {
  scope: "project",
  projectId: "proj_123",
  missingFileBehavior: "throw"
});
```

For older relaxed behavior:

```ts
createAgentfsMemoryStore(client, {
  scope: "project",
  projectId: "proj_123",
  missingFileBehavior: "empty"
});
```

## Sync hooks

```ts
import { syncBeforeSession, syncAfterSession } from "@tekmemo/agentfs";

await syncBeforeSession(agentfsClient);

// run agent session

await syncAfterSession(agentfsClient, "after-agent-session");
```

`syncAfterSession` checkpoints before pushing by default.

## Leases

```ts
import { InMemoryLeaseManager, withMemoryLease } from "@tekmemo/agentfs";

const leaseManager = new InMemoryLeaseManager();

await withMemoryLease({
  leaseManager,
  storeId: "project:proj_123",
  ownerId: "worker-1",
  ttlMs: 30_000,
  operation: async () => {
    // critical memory operation
  }
});
```

The in-memory lease manager is useful for tests and single-process coordination. Distributed production leases should use a durable/shared implementation.

## Edge cases handled

- invalid AgentFS client shape
- invalid scope
- missing scope IDs
- unsafe IDs with `/`, `\\`, `..`, null bytes, spaces, or unsupported characters
- unsafe root prefixes
- unsupported TekMemo memory paths
- path traversal attempts
- missing files
- non-string provider responses
- non-string write/append content
- client read/write/append/exists failures
- optional native append support
- read/write fallback append
- same-instance append serialization
- sync no-op behavior
- sync failure wrapping
- checkpoint label validation
- lease contention
- expired leases
- release-on-error lease behavior

## Package boundary

`@tekmemo/agentfs` only adapts TekMemo's `MemoryStore` contract to an AgentFS-like file runtime.

It does **not** own:

- the `.tekmemo/` protocol itself
- local filesystem storage
- vector recall
- embeddings
- reranking
- cloud billing
- cloud tenancy
- BYOK storage
