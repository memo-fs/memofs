# Server Deployment

`@memofs/server` is the self-hostable, open-source hosted memory server for MemoFS. It runs the exact same file-first memory runtime the cloud runs, packaged as a standard web server you can deploy to Node.js or Cloudflare Workers.

---

## Features

- **Provider-Neutral Factory:** Assembles a `MemoFS` instance from adapters you inject — no provider hardcoding, no env-var reading, no adapter imports.
- **Node.js Binary:** Includes a `memofs-server` bin that boots a `node:http` server.
- **Worker Entry Point:** Subpath export `@memofs/server/worker` for Cloudflare Workers deployment.
- **JSON-RPC over HTTP:** Exposes memory commands over `POST /` (or `POST /rpc`) with JSON-RPC 2.0.

---

## Installation

Install the server package:

::: code-group

```sh [npm]
npm install @memofs/server
```

```sh [pnpm]
pnpm add @memofs/server
```

```sh [yarn]
yarn add @memofs/server
```

```sh [bun]
bun add @memofs/server
```

:::

> [!NOTE]
> Requires **Node.js >= 22**.

## Quick Start

```ts
import { createHostedRuntime } from "@memofs/server";
import { InMemoryMemoryStore } from "@memofs/core";

const runtime = createHostedRuntime({
  // The only required slot: the memory store (your file replica).
  store: new InMemoryMemoryStore(),
  projectId: "my-project",

  // Optional intelligence slots — each runs its deterministic default
  // when omitted. Inject a provider adapter to upgrade a slot.
  // embedder: yourEmbedder,
  // reranker: yourReranker,
  // extractor: yourExtractor,
  // llmClient: yourLlmClient,
});

await runtime.writeMemory({ content: "self-hosted runtime runs the engine" });
const hits = await runtime.recall("self-hosted");
```

---

## The Required Slot: `store`

A memory runtime needs files to read and write. The `store` is your memory store (the file replica). MemoFS Cloud builds it from Cloudflare R2 + Turso; you build it from whatever you run (S3 + Postgres, GCS + D1, or anything else that implements `MemoryStore`). There is no default to fall back on.

## Deterministic Defaults

Every intelligence slot is optional. When you omit one, the runtime runs its deterministic default:

| Slot | Omitted Default | Upgrade |
|------|-----------------|---------|
| `embedder` | Lexical-only recall (BM25 + fuzzy) | Inject for hybrid (vector) recall |
| `reranker` | Lexical token-overlap reranker | Inject for semantic reranking |
| `extractor` | Rule-based graph extractor | Inject for frontier extraction |
| `llmClient` | No LLM tier (regex/deterministic strategist) | Inject for LLM-enhanced intelligence |

---

## Deployment Option A: Node.js Server

The `memofs-server` bin boots a `node:http` server that serves the JSON-RPC runtime API.

Install globally if you want the `memofs-server` binary on your PATH:

::: code-group

```sh [npm]
npm install -g @memofs/server
```

```sh [pnpm]
pnpm add -g @memofs/server
```

```sh [yarn]
yarn global add @memofs/server
```

```sh [bun]
bun add -g @memofs/server
```

:::

```bash
# Boot the server (defaults to port 8787, in-memory store, auth off)
PORT=8787 memofs-server
```

Health check:

```bash
curl http://127.0.0.1:8787/health
# {"ok":true,"name":"memofs-server","version":"0.1.0"}
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | HTTP listen port | `8787` |
| `MEMOFS_SERVER_TOKEN` | Bearer token for auth (auto-enables auth when set) | — |
| `MEMOFS_SERVER_REQUIRE_AUTH` | Explicitly require auth (`"true"`) | — |
| `MEMOFS_PROJECT_ID` | Project ID for the runtime | `"self-host"` |

### Configure the Bundle

The bin ships a deterministic in-memory runtime so it boots out of the box. To wire the real self-host bundle, build the runtime from your adapters and pass it to `handleRuntimeRequest`:

```ts
import { createHostedRuntime, handleRuntimeRequest } from "@memofs/server";
import { createServer } from "node:http";

const runtime = createHostedRuntime({
  store: yourStore,           // e.g. RemoteBlobMemoryStore over R2 + Turso
  projectId: process.env.MEMOFS_PROJECT_ID!,
  embedder: yourEmbedder,     // optional
  // reranker, extractor, llmClient — inject what you need
});

createServer(async (req, res) => {
  // Bridge req/res to a Web Request, then:
  const response = await handleRuntimeRequest(webRequest, {
    runtime,
    requireAuth: true,
    bearerToken: process.env.MEMOFS_SERVER_TOKEN,
  });
  // Write response back...
}).listen(8787);
```

### Secure It

If the port is public, require a bearer token:

```bash
MEMOFS_SERVER_TOKEN="your-secret" memofs-server
```

Setting `MEMOFS_SERVER_TOKEN` auto-enables auth. Clients send `Authorization: Bearer your-secret`. Leave auth off only behind a private network or a Service Binding.

---

## Deployment Option B: Cloudflare Workers

The `@memofs/server/worker` subpath export provides the Worker entry point.

```ts
import { createRuntimeFetchHandler } from "@memofs/server/worker";

export default {
  fetch: createRuntimeFetchHandler({
    createRuntime: (env) => buildRuntimeFromBindings(env),
    requireAuth: false, // behind a private Service Binding
  }),
};
```

`createRuntimeFetchHandler` takes a `createRuntime` function that builds a `MemoFS` instance from Worker bindings (R2, D1/Turso, AI, etc.) and an optional `requireAuth` flag. The runtime is built lazily per invocation.

---

## HTTP API (JSON-RPC 2.0)

Both deploy targets serve the same surface:

- `GET /health` — liveness probe (`{"ok":true,...}`)
- `POST /` or `POST /rpc` — JSON-RPC 2.0 dispatch
- `OPTIONS` — CORS preflight (when `allowedOrigins` is set)

### Example: Recall

**Request (`POST /`):**

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "recall",
  "params": {
    "query": "how to deploy database",
    "limit": 3
  }
}
```

**Response:**

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "items": [
      {
        "content": "Database migrations run via Drizzle Migrator.",
        "score": 0.89,
        "source": { "kind": "notes", "path": "memory/notes.md" }
      }
    ]
  }
}
```

### Method Surface

| Method | What it does | Status |
|--------|-------------|--------|
| `health` | Liveness probe | Live |
| `recall` | Semantic/hybrid recall | Live |
| `context` | Task briefing (progressive disclosure) | Live |
| `memory.readCore` | Read core memory document | Live |
| `memory.readNotes` | Read notes document | Live |
| `memory.readConversations` | Read conversation history | Live |
| `memory.listRecent` | List recent memory events | Live |
| `memory.validate` | Validate memory integrity | Live |
| `graph.listNodes` | List graph nodes | Live |
| `graph.listEdges` | List graph edges | Live |
| `graph.neighbors` | Graph neighbors query | Live |
| `graph.path` | Graph path search | Live |
| `snapshots.list` | List snapshots | Live |
| `memory.write` | Write a memory | **Gated (`503`)** |
| `memory.recordNote` | Record a note | **Gated (`503`)** |
| `memory.updateCore` | Update core memory | **Gated (`503`)** |
| `memory.appendConversation` | Append a conversation entry | **Gated (`503`)** |
| `graph.upsertNodes` | Upsert graph nodes | **Gated (`503`)** |
| `graph.upsertEdges` | Upsert graph edges | **Gated (`503`)** |
| `consolidate` | Run consolidation | **Gated (`503`)** |
| `snapshots.create` | Create a snapshot | **Gated (`503`)** |
| `snapshots.restore` | Restore a snapshot | **Gated (`503`)** |

### The Write Gate

Every mutating method returns `503` until the concurrency layer lands. This is deliberate: concurrent writes to the same project would silently lose data under last-writer-wins. The gate is "method rejects," never "method present unsafely."

Reads work fully today. To write memory programmatically before the gate lifts, use the `MemoFS` client directly in-process.

---

## API Reference

### `createHostedRuntime(options)`

Assembles a `MemoFS` instance from injected adapters. Provider-neutral — never reads env vars, never imports an adapter package.

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `store` | `MemoryStore` | Yes | The memory store (file replica) |
| `projectId` | `string` | Yes | Project ID scoping this runtime |
| `embedder` | `MemoryEmbedder` | No | Inject for hybrid (vector) recall |
| `recallStore` | `RecallStore` | No | Persisted embeddings store |
| `reranker` | `Reranker` | No | Inject for semantic reranking |
| `extractor` | `Extractor` | No | Inject for frontier graph extraction |
| `llmClient` | `LlmClient` | No | Inject for LLM-enhanced intelligence |
| `name` | `string` | No | Runtime name (health output). Default: `"memofs-server"` |
| `version` | `string` | No | Runtime version (health output). Default: `"0.1.0"` |

### `handleRuntimeRequest(request, options)`

Framework-free HTTP core. Takes a Web `Request` + an assembled `MemoFS` runtime + options, returns a Web `Response`.

| Option | Type | Description |
|--------|------|-------------|
| `runtime` | `MemoFS` | The assembled runtime (required) |
| `requireAuth` | `boolean` | Require a bearer token on `POST /` |
| `bearerToken` | `string` | The expected bearer token |
| `allowedOrigins` | `readonly string[]` | Allowed browser origins for CORS |

### `createRuntimeFetchHandler(options)`

Cloudflare Worker fetch handler factory.

| Option | Type | Description |
|--------|------|-------------|
| `createRuntime` | `(env) => MemoFS` | Builds the runtime from Worker bindings |
| `requireAuth` | `boolean` | Require a bearer token |

---

## See Also

- [Self-host deploy guide](https://github.com/christophersesugh/memofs/tree/main/examples/server)
- [Core Client API](/packages/core/client)
- [Configuration](/packages/core/configuration)
