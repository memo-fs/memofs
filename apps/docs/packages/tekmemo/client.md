# The `Tekmemo` client

`Tekmemo` is the single entry point for all memory operations in `@tekbreed/tekmemo`. Instead of wiring stores, documents, recall, and cloud calls together by hand, you construct one client and pick a runtime mode.

```ts
import { Tekmemo } from "@tekbreed/tekmemo";

const memo = new Tekmemo({ rootDir: "./.tekmemo", projectId: "my-app" });

await memo.core.read();
await memo.notes.record({ content: "Ship feature X", kind: "decision" });
const hits = await memo.recall("architecture decisions");
```

## Runtime modes

`Tekmemo` is backed by a **strategy pattern**. The mode you pick decides where reads and writes go:

| Mode | Strategy | Use when |
| --- | --- | --- |
| `local` (default) | Filesystem store (`createNodeFsMemoryStore`) | You want inspectable project memory in `.tekmemo/`. |
| `hybrid` | Local **and** cloud, routed by read/write policies | You want local files plus a cloud replica for sync and recall. |
| `memory` | Volatile, Map-backed store | You write tests, demos, or sandboxes. Nothing persists. |

There is no `cloud` mode. Cloud is a **sync transport** — a file replica of your local `.tekmemo/`.
To use it, pick `hybrid` mode and inject a [`cloudClient`](./cloud-client) (or configure `cloud` +
`sync.*`), then push/pull memory between machines. The hosted MCP endpoint is a separate product
that runs the engine against TekMemo Cloud — see [Cloud client](./cloud-client).

Resolution priority: **constructor args → env vars → `.tekmemo/config.json` → defaults**. See [Configuration](./configuration).

## Constructing a client

### Local (default)

```ts
import { Tekmemo } from "@tekbreed/tekmemo";

const memo = new Tekmemo({
  rootDir: "./.tekmemo",
  projectId: "my-app",
});
```

### Cloud-backed (hybrid + sync)

Cloud is reached through a `cloudClient` in hybrid mode — there is no `mode: "cloud"`. The cloud
is a file replica: push your `.tekmemo/` up, pull changes down.

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
    apiKey: process.env.TEKMEMO_API_KEY,
  }),
});

await memo.sync.push({ /* files */ });
```

### Hybrid with policies

```ts
const memo = new Tekmemo({
  mode: "hybrid",
  projectId: "proj_123",
  readPolicy: "local-first",
  writePolicy: "local-first",
  cloud: {
    baseUrl: "https://memo.tekbreed.com/api/v1",
    apiKey: process.env.TEKMEMO_API_KEY,
  },
});
```

### In-memory (for tests)

```ts
const memo = new Tekmemo({ mode: "memory", projectId: "test" });
```

## Bringing your own store, embedder, or cloud client

`Tekmemo` stays DI-friendly. You can inject any implementation of the core interfaces:

```ts
import {
  Tekmemo,
  createTekMemoCloudClient,
  createNodeFsMemoryStore,
} from "@tekbreed/tekmemo";

const memo = new Tekmemo({
  projectId: "my-app",
  store: createNodeFsMemoryStore({ rootDir: "./.tekmemo" }),
  embedder: myEmbedder, // enables vector-backed local recall
  recallStore: myRecallStore,
  cloudClient: createTekMemoCloudClient({
    baseUrl: "https://memo.tekbreed.com/api/v1",
    apiKey: process.env.TEKMEMO_API_KEY!,
  }),
});
```

When an `embedder` is provided without a `recallStore`, the client creates an in-memory recall store and indexes notes/core memory automatically.

## Read and write policies

Hybrid mode routes every operation through a read policy and a write policy. Each accepts one of three values:

| Policy value | Behaviour |
| --- | --- |
| `local-first` (default) | Try local first, fall back to cloud on failure. Writes go to local, then cloud. |
| `cloud-first` | Try cloud first, fall back to local. Writes go to cloud, then local. |
| `local-only` | Never touch the cloud. |

Reads use the primary store and fall back to the secondary on error. Writes go to the primary store first; a secondary-write failure is captured as a warning rather than thrown. Recall merges and de-duplicates results from both stores.

## API surface

The client groups operations into namespaces so the same shape works in every mode.

| Namespace / method | Purpose |
| --- | --- |
| `memo.core.read()` / `memo.core.update(content)` | Read or replace the project briefing (`core.md`). |
| `memo.notes.read()` / `memo.notes.record(note)` | Read notes and append a durable note. |
| `memo.conversations.read()` / `.append(entry)` | Read and append to conversation history. |
| `memo.graph.upsertNodes()` / `.upsertEdges()` / `.neighbors()` / `.path()` / `.listNodes()` / `.listEdges()` | Manage graph entities and relationships. |
| `memo.snapshots.create()` / `.list()` / `.restore(id)` | Create, list, and restore memory snapshots. |
| `memo.agentfs.*` | Start, read, write, extract, and complete AgentFS sessions. |
| `memo.sync.push()` / `.pull()` / `.status()` | Push, pull, and inspect cloud sync (cloud/hybrid only). |
| `memo.rerank.*` | Sort and apply `topK` to rerank results; build a deterministic fallback reranker. |
| `memo.recall(query, options?)` | Semantic or keyword recall. |
| `memo.context(input)` | Compose a single context payload (core + recent + recall) for an LLM. |
| `memo.writeMemory(input)` | Write arbitrary memory (used internally by `notes.record`). |
| `memo.listRecentMemories(input?)` | List recent memory events. |
| `memo.validate(input?)` | Validate the local store (manifest, core, notes, events, snapshots). |
| `memo.health()` | Health check reporting mode and capabilities. |
| `memo.runCommand(command)` | Run a low-level memory command against the store. |
| `memo.bootstrap(options?)` | Manually bootstrap the store with default files. |

### Example: context for an LLM call

```ts
const { text } = await memo.context({
  query: "how does auth work",
  includeCore: true,
  includeRecent: true,
  limit: 5,
});

// text is a single truncated string ready to drop into a system prompt
```

### Example: graph traversal

```ts
await memo.graph.upsertNodes({
  nodes: [{ id: "auth", type: "module", label: "Auth" }],
});
await memo.graph.upsertEdges({
  edges: [{ from: "auth", to: "db", type: "depends_on" }],
});

const path = await memo.graph.path({ from: "auth", to: "db" });
```

## Mode availability

Not every operation is available in every mode. Calls that a mode does not support throw a clear runtime error instead of silently no-op'ing:

| Operation | `local` | `hybrid` | `memory` |
| --- | :---: | :---: | :---: |
| `core`, `notes`, `recall`, `context` | ✅ | ✅ | ✅ |
| `graph.*` | ✅ | ✅ | ✅ |
| `snapshots` | ✅ | ✅ | stub |
| `agentfs` file I/O | ✅ | ✅ | — |
| `sync.*` | — | ✅ (needs `cloudClient`) | — |

> The hosted MCP **endpoint** is a separate product that runs the engine against TekMemo Cloud and
> can't read your local disk. It is not a `mode` of this client — see
> [Cloud client](./cloud-client) and [Hosted MCP](../mcp/hosted).

## How it relates to the rest of the package

`Tekmemo` is a thin façade over building blocks that are all still exported individually:

- `createNodeFsMemoryStore` / `InMemoryMemoryStore` — storage adapters
- `createTekMemoCloudClient` — the cloud transport (see [Cloud client](./cloud-client))
- `readCoreMemory`, `writeCoreMemory`, `appendTimestampedNote`, … — low-level document helpers
- `createTekMemoAgentSession` — AgentFS sessions

Reach for `Tekmemo` for application code. Drop down to the building blocks when you need finer control or are writing adapters.
