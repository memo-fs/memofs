---
title: "@memofs/server API Reference"
description: "Complete TypeScript API reference for @memofs/server: runtime assembly, HTTP core, Cloudflare Worker handler, and JSON-RPC dispatch."
---

# `@memofs/server` API Reference

The `@memofs/server` package exports the hosted runtime assembly factory, framework-free HTTP core request handlers, Cloudflare Worker adapters, and JSON-RPC 2.0 protocol dispatchers.

## Assembly & Runtime Factories

### `createHostedRuntime(options: HostedRuntimeOptions): MemoFS`

Assembles a unified `MemoFS` instance using an injected storage adapter and optional intelligence drivers (embedders, rerankers, extractors).

```ts
import { createHostedRuntime } from "@memofs/server";

const memofs = createHostedRuntime({
  store: memoryStore,
  projectId: "my-hosted-project",
  embedder: customEmbedder,
});
```

#### `HostedRuntimeOptions`

| Option | Type | Required | Description |
|---|---|---|---|
| `store` | `MemoryStore` | **Yes** | Backing storage implementation (`NodeFsMemoryStore`, `RemoteBlobMemoryStore`, `InMemoryMemoryStore`). |
| `projectId` | `string` | **Yes** | Project identifier scoping this runtime. |
| `embedder` | `MemoryEmbedder` | No | Text embedder instance for vector indexing. |
| `recallStore` | `RecallStore` | No | Vector index store. Auto-wired when embedder is present. |
| `reranker` | `Reranker` | No | Reranking provider for recall candidates. |
| `extractor` | `Extractor` | No | Entity and relationship extractor for knowledge graphs. |
| `llmClient` | `LlmClient` | No | LLM transport for generative intelligence and consolidation. |
| `name` | `string` | No | Runtime client name (default: `"memofs-server"`). |
| `version` | `string` | No | Runtime version (default: `"0.1.0"`). |

## HTTP Core Handlers

### `handleRuntimeRequest(request: Request, options: RuntimeHttpOptions): Promise<Response>`

Framework-agnostic handler that processes HTTP requests containing standard JSON-RPC 2.0 payloads.

```ts
import { handleRuntimeRequest } from "@memofs/server";

const response = await handleRuntimeRequest(request, {
  runtime: memofs,
  requireAuth: true,
  bearerToken: process.env.MEMOFS_SERVER_TOKEN,
  allowedOrigins: ["https://app.example.com"],
});
```

#### `RuntimeHttpOptions`

| Option | Type | Required | Description |
|---|---|---|---|
| `runtime` | `MemoFS` | **Yes** | Target runtime instance executing memory operations. |
| `concurrencyLayer` | `ConcurrencyLayer` | No | Injected coordinator for gating/serializing mutating requests. |
| `requireAuth` | `boolean` | No | Require a bearer token on `POST /` (default: `false`). |
| `bearerToken` | `string` | No | The expected bearer token when `requireAuth` is `true`. |
| `allowedOrigins` | `readonly string[]` | No | Allowed browser `Origin` values for CORS preflight. |

### `createRuntimeFetchHandler(options: RuntimeFetchHandlerOptions)`
*(Exported from `@memofs/server/worker` and `@memofs/server`)*

Produces a standard Cloudflare Workers `fetch(request, env, ctx)` handler.

```ts
import { createRuntimeFetchHandler } from "@memofs/server/worker";

export default {
  fetch: createRuntimeFetchHandler({
    createRuntime: async (env, request) => {
      return createHostedRuntime({
        store: getR2Store(env),
        projectId: request.headers.get("x-project-id") ?? "default",
      });
    },
    requireAuth: false,
  }),
};
```

## JSON-RPC 2.0 Protocol Methods

All requests are dispatched as standard JSON-RPC 2.0 objects (`{ jsonrpc: "2.0", id: 1, method: "...", params: { ... } }`).

### Read-Only (Live) Methods

| Method | Parameters | Return Value | Description |
|---|---|---|---|
| `health` | `{}` | `MemoFSHealthResult` | Liveness check and component status. |
| `recall` | `{ query: string, limit?: number, filter?: RecallFilter }` | `RecallResult` | Semantic and lexical retrieval. |
| `context` | `MemoryContextInput` | `MemoryContextResult` | Formatted markdown/context briefing. |
| `memory.readCore` | `{}` | `string` | Content of `memory/core.md`. |
| `memory.readNotes` | `{}` | `string` | Content of `memory/notes.md`. |
| `memory.readConversations` | `{ limit?: number }` | `ConversationEntry[]` | Chronological conversation logs. |
| `memory.listRecent` | `{ limit?: number }` | `RecentMemoryResult` | Chronological log of recent memory events. |
| `memory.validate` | `{ strict?: boolean }` | `ValidateMemoryResult` | Integrity and schema validation check. |
| `graph.listNodes` | `ListGraphInput` | `{ items: GraphNodeInput[] }` | Entity nodes in knowledge graph. |
| `graph.listEdges` | `ListGraphInput` | `{ items: GraphEdgeInput[] }` | Relationship edges in knowledge graph. |
| `graph.neighbors` | `GraphNeighborsInput` | `GraphNeighborsResult` | Related entities and connections. |
| `graph.path` | `GraphPathInput` | `GraphPathResult` | Shortest relation path between entities. |
| `snapshots.list` | `{}` | `SnapshotRecord[]` | Checkpoints and rollback history. |

### Mutating (Gated) Methods

> [!NOTE]
> Mutating methods require an active `concurrencyLayer` to serialize concurrent requests. When no concurrency layer is supplied, these methods safely return `503 Service Unavailable` with `CONCURRENCY_GATE_ERROR_CODE` (`-32000`).

| Method | Parameters | Return Value | Description |
|---|---|---|---|
| `memory.write` | `WriteMemoryInput` | `WriteMemoryResult` | Stores a classified memory item. |
| `memory.recordNote` | `TimestampedNoteInput` | `WriteMemoryResult` | Appends a timestamped log note. |
| `memory.updateCore` | `{ content: string }` | `void` | Overwrites `memory/core.md`. |
| `memory.appendConversation` | `ConversationEntry` | `void` | Appends a conversation record. |
| `graph.upsertNodes` | `{ nodes: GraphNodeInput[] }` | `{ nodes: GraphNodeInput[] }` | Updates knowledge graph entities. |
| `graph.upsertEdges` | `{ edges: GraphEdgeInput[] }` | `{ edges: GraphEdgeInput[] }` | Updates knowledge graph relations. |
| `consolidate` | `ConsolidateMemoryInput` | `ConsolidateMemoryResult` | Merges/retires overlapping memories. |
| `snapshots.create` | `SnapshotMemoryInput` | `SnapshotMemoryResult` | Takes a point-in-time checkpoint. |
| `snapshots.restore` | `{ id: string }` | `void` | Reverts filesystem to checkpoint. |

## Direct Dispatch Utilities

For custom network transports (WebSockets, IPC, Worker Service Bindings):

```ts
import { dispatchRuntimeMessage, dispatchRuntimeText } from "@memofs/server";

// Dispatches parsed JSON-RPC payload across the runtime
const response = await dispatchRuntimeMessage(
  memofs,
  { jsonrpc: "2.0", id: "req-1", method: "recall", params: { query: "auth" } },
  { concurrencyLayer: myMutex }
);

// Dispatches raw string payload
const rawResponseString = await dispatchRuntimeText(
  memofs,
  '{"jsonrpc":"2.0","id":1,"method":"health"}'
);
```

## Protocol Constants

- `RUNTIME_METHOD`: Canonical dictionary of all method name strings.
- `LIVE_METHODS`: Set of live, read-only methods.
- `GATED_METHODS`: Set of mutating methods gated on the concurrency layer.
- `CONCURRENCY_GATE_ERROR_CODE`: `-32000`
- `CONCURRENCY_GATE_HTTP_STATUS`: `503`
- `CONCURRENCY_GATE_MESSAGE`: `"Concurrent writes require the concurrency layer. This method is read-only until it is injected."`
- `concurrencyGateFailure(id)`: Helper generating the standard 503 JSON-RPC error response.
