# `Tekmemo` Client

The `Tekmemo` class is the single entry point for all memory operations in `@tekbreed/tekmemo`. It is a unified façade backed by a strategy pattern — you construct one client and pick a runtime mode.

## Import

```ts
import { Tekmemo } from "@tekbreed/tekmemo";
```

## Constructor

```ts
new Tekmemo(config?: TekmemoConfig)
```

Config is resolved with this priority: **constructor args → env vars → `.tekmemo/config.json` → defaults**.

### Common options

| Option | Type | Description |
| --- | --- | --- |
| `mode` | `"local" \| "hybrid" \| "memory"` | Runtime strategy. Defaults to `"local"`. There is no `"cloud"` mode — cloud is a sync transport reached via [`cloudClient`](#cloud-backed-memory) or [sync](#memosync). |
| `rootDir` | `string` | Root directory for local memory (e.g. `"./.tekmemo"`). |
| `projectId` | `string` | Default project ID. |
| `readPolicy` | `"local-first" \| "cloud-first" \| "local-only"` | Hybrid read policy. |
| `writePolicy` | `"local-first" \| "cloud-first" \| "local-only"` | Hybrid write policy. |
| `cloud.baseUrl` | `string` | TekMemo Cloud API base URL. |
| `cloud.apiKey` | `string` | TekMemo Cloud API key. |
| `store` | `MemoryStore` | Custom memory store (DI). |
| `embedder` | `MemoryEmbedder` | Custom embedder for vector recall (DI). |
| `recallStore` | `RecallStore` | Custom recall store (DI). |
| `cloudClient` | `TekMemoCloudClient` | Pre-built cloud client (DI). |

See [Configuration](/packages/tekmemo/configuration) for the full resolution chain.

## Runtime modes

| Mode | Strategy | Use when |
| --- | --- | --- |
| `local` (default) | Filesystem store | Inspectable project memory in `.tekmemo/`. |
| `hybrid` | Local + cloud, routed by policies | Local files plus cloud recall and sync. |
| `memory` | Volatile Map-backed store | Tests, demos, sandboxes. Nothing persists. |

There is no `cloud` runtime mode. To use hosted memory, reach the cloud through the
[`cloudClient`](#cloud-backed-memory) option (a file-sync transport: `push`/`pull`/`status`)
or add the [`sync`](#memosync) namespace in hybrid mode. The hosted MCP endpoint is a separate
product that backs onto TekMemo Cloud and can't read your local disk — see
[Cloud client](/packages/tekmemo/cloud-client).

## Read-only properties

| Property | Type | Description |
| --- | --- | --- |
| `mode` | `TekMemoRuntimeMode` | Active runtime mode. |
| `projectId` | `string` | Resolved project ID. |
| `tenantId?` | `string` | Optional tenant ID. |
| `workspaceId?` | `string` | Optional workspace ID. |
| `store` | `MemoryStore` | Underlying memory store. |
| `embedder?` | `MemoryEmbedder` | Configured embedder. |
| `recallStore?` | `RecallStore` | Configured recall store. |
| `cloud?` | `TekMemoCloudClient` | Configured cloud client. |
| `readPolicy` | `RuntimeReadPolicy` | Active read policy. |
| `writePolicy` | `RuntimeWritePolicy` | Active write policy. |
| `name` | `string` | Client name. |
| `version` | `string` | Client version. |

## Namespaces

### `memo.core`

Read and update the project briefing (`core.md`).

| Method | Signature | Returns |
| --- | --- | --- |
| `read` | `(signal?)` | `Promise<string>` — core memory content. |
| `update` | `(content: string, signal?)` | `Promise<void>` |

### `memo.notes`

Read and append durable notes.

| Method | Signature | Returns |
| --- | --- | --- |
| `read` | `(signal?)` | `Promise<string>` — notes content. |
| `record` | `(note: Omit<TimestampedNote, "timestamp">, signal?)` | `Promise<WriteMemoryResult>` |

### `memo.conversations`

Read and append conversation history.

| Method | Signature | Returns |
| --- | --- | --- |
| `read` | `(options?)` | `Promise<ConversationEntry[]>` |
| `append` | `(entry: ConversationEntry)` | `Promise<void>` |

### `memo.graph`

Manage graph entities and relationships.

| Method | Signature | Returns |
| --- | --- | --- |
| `upsertNodes` | `(input: { nodes: GraphNodeInput[] }, signal?)` | `Promise<{ nodes: GraphNodeInput[] }>` |
| `upsertEdges` | `(input: { edges: GraphEdgeInput[] }, signal?)` | `Promise<{ edges: GraphEdgeInput[] }>` |
| `neighbors` | `(input: GraphNeighborsInput, signal?)` | `Promise<{ items, nextCursor? }>` |
| `path` | `(input: GraphPathInput, signal?)` | `Promise<GraphPathResult>` |
| `listNodes` | `(input: ListGraphInput, signal?)` | `Promise<{ items, nextCursor? }>` |
| `listEdges` | `(input: ListGraphInput, signal?)` | `Promise<{ items, nextCursor? }>` |

### `memo.snapshots`

Create, list, and restore memory snapshots.

| Method | Signature | Returns |
| --- | --- | --- |
| `create` | `(input?, signal?)` | `Promise<SnapshotMemoryResult>` |
| `list` | `()` | `Promise<SnapshotRecord[]>` |
| `restore` | `(id: string)` | `Promise<void>` |

### `memo.agentfs`

Manage AgentFS sandboxed coding sessions.

| Method | Signature | Returns |
| --- | --- | --- |
| `createSession` | `(options)` | `TekMemoAgentSession` |
| `startSession` | `(input, signal?)` | `Promise<AgentSessionResult>` |
| `readFile` | `(input, signal?)` | `Promise<unknown>` |
| `writeFile` | `(input, signal?)` | `Promise<unknown>` |
| `appendFile` | `(input, signal?)` | `Promise<unknown>` |
| `extract` | `(input, signal?)` | `Promise<AgentSessionExtractResult>` |
| `complete` | `(input, signal?)` | `Promise<unknown>` |

### `memo.sync`

Cloud sync operations (hybrid mode with a `cloudClient` only). The cloud is a file replica — push
your local `.tekmemo/` up, pull changes down, and check status.

| Method | Signature | Returns |
| --- | --- | --- |
| `push` | `(input, signal?)` | `Promise<SyncPushResult>` |
| `complete` | `(input, signal?)` | `Promise<SyncPushCompleteResult>` |
| `pull` | `(input, signal?)` | `Promise<SyncPullResult>` |
| `status` | `(input?, signal?)` | `Promise<SyncStatusResult>` |

### `memo.rerank`

Reranking utilities.

| Method | Returns |
| --- | --- |
| `sort(results, key?)` | Sorted rerank results. |
| `applyTopK(results, topK)` | Results trimmed to top K. |
| `createFallback()` | A `DeterministicFallbackReranker` instance. |

## Top-level methods

| Method | Signature | Returns | Description |
| --- | --- | --- | --- |
| `recall` | `(query: string, options?)` | `Promise<RecallResult>` | Semantic or keyword recall. |
| `context` | `(input: MemoryContextInput, signal?)` | `Promise<MemoryContextResult>` | Compose a single context payload for an LLM. |
| `writeMemory` | `(input: WriteMemoryInput, signal?)` | `Promise<WriteMemoryResult>` | Write arbitrary memory. |
| `listRecentMemories` | `(input?, signal?)` | `Promise<RecentMemoryResult>` | List recent memory events. |
| `validate` | `(input?, signal?)` | `Promise<ValidateMemoryResult>` | Validate the local store. |
| `health` | `(signal?)` | `Promise<TekMemoHealthResult>` | Health check. |
| `runCommand` | `(command: MemoryCommand)` | `Promise<string>` | Run a low-level memory command. |
| `bootstrap` | `(options?)` | `Promise<void>` | Manually bootstrap the store. |

## Error handling

The `Tekmemo` class can throw errors from two sources depending on the runtime mode:

- **Core runtime errors** (`TekMemoError` and subclasses) — thrown by local operations such as reading files, parsing documents, or validating inputs.
- **Cloud client errors** (`TekMemoCloudError` and subclasses) — thrown when cloud or hybrid mode calls the TekMemo Cloud API.

```ts
import {
  Tekmemo,
  isTekMemoError,
  isTekMemoCloudError,
  MemoryNotFoundError,
} from "@tekbreed/tekmemo";

const memo = new Tekmemo({ rootDir: "./.tekmemo", projectId: "my-app" });

try {
  await memo.core.read();
} catch (error) {
  if (error instanceof MemoryNotFoundError) {
    // core.md doesn't exist yet — bootstrap or write it
  } else if (isTekMemoError(error)) {
    console.error(`[${error.code}] ${error.message}`);
  } else if (isTekMemoCloudError(error)) {
    console.error(`[${error.status}] ${error.code}: ${error.message}`);
  }
}
```

See [Core Primitives](./core) for the full runtime error hierarchy and [`Errors`](/packages/tekmemo/errors) for cloud client errors.

## Mode availability

Not every operation is available in every mode. Calls that a mode does not support throw a clear
runtime error instead of silently no-op'ing:

| Operation | `local` | `hybrid` | `memory` |
| --- | :---: | :---: | :---: |
| `core`, `notes`, `recall`, `context` | ✅ | ✅ | ✅ |
| `graph.*` | ✅ | ✅ | ✅ |
| `snapshots` | ✅ | ✅ | stub |
| `agentfs` file I/O | ✅ | ✅ | — |
| `sync.*` | — | ✅ (needs `cloudClient`) | — |

> The hosted MCP **endpoint** (a separate product) runs engine operations against TekMemo Cloud
> and can't read your local disk. It is not a `mode` of this client — see
> [Cloud client](/packages/tekmemo/cloud-client) and [Hosted MCP](/packages/mcp/hosted).

## Examples

### Local mode

```ts
import { Tekmemo } from "@tekbreed/tekmemo";

const memo = new Tekmemo({ rootDir: "./.tekmemo", projectId: "my-app" });
await memo.core.read();
await memo.notes.record({ content: "Ship feature X", kind: "decision" });
const hits = await memo.recall("architecture decisions");
```

### Cloud-backed memory

There is no `mode: "cloud"`. Cloud is a **sync transport** — a file replica of your local
`.tekmemo/`. Reach it by injecting a cloud client into hybrid mode, then use `memo.sync`:

```ts
import {
  Tekmemo,
  createTekMemoCloudClient,
} from "@tekbreed/tekmemo";

const memo = new Tekmemo({
  mode: "hybrid",
  projectId: "proj_123",
  rootDir: "./.tekmemo",
  cloudClient: createTekMemoCloudClient({
    baseUrl: "https://memo.tekbreed.com/api/v1",
    apiKey: process.env.TEKMEMO_API_KEY!,
  }),
});

// Mirror local memory to the cloud replica
await memo.sync.push({ /* files */ });
```

### Hybrid mode

```ts
const memo = new Tekmemo({
  mode: "hybrid",
  projectId: "proj_123",
  readPolicy: "local-first",
  writePolicy: "local-first",
  cloud: {
    baseUrl: "https://memo.tekbreed.com/api/v1",
    apiKey: process.env.TEKMEMO_API_KEY!,
  },
});
```

### Dependency injection

```ts
import {
  Tekmemo,
  createTekMemoCloudClient,
  createNodeFsMemoryStore,
} from "@tekbreed/tekmemo";

const memo = new Tekmemo({
  projectId: "my-app",
  store: createNodeFsMemoryStore({ rootDir: "./.tekmemo" }),
  embedder: myEmbedder,
  cloudClient: createTekMemoCloudClient({
    baseUrl: "https://memo.tekbreed.com/api/v1",
    apiKey: process.env.TEKMEMO_API_KEY!,
  }),
});
```

## See also

- [The `Tekmemo` client guide](/packages/tekmemo/client) for usage patterns and examples
- [Configuration](/packages/tekmemo/configuration) for the full resolution chain
