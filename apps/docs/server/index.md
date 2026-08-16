---
title: "@memofs/server Overview"
description: "Self-hosted HTTP/JSON-RPC server package for running MemoFS in centralized Node.js or Cloudflare Workers environments."
---

# Server Deployment

`@memofs/server` is the self-hostable hosted memory server for MemoFS. It runs the **exact same memory engine that MemoFS Cloud runs**, packaged as a standard web server you can deploy to a single Node.js process (Fly.io, Railway, Render, VPS) or a serverless Cloudflare Worker.

## Architecture

The server package is built around a **provider-neutral assembly factory** (`createHostedRuntime`) and a **framework-free HTTP core** (`handleRuntimeRequest`):

```
┌────────────────────────────────────────────────────────┐
│                     Client Request                     │
│               (HTTP POST / or GET /health)             │
├───────────────────────────┬────────────────────────────┤
│   Node.js (node:http)     │  Cloudflare Worker Entry   │
│   (bin/memofs-server)     │  (@memofs/server/worker)   │
├───────────────────────────┴────────────────────────────┤
│                  handleRuntimeRequest                  │
│              (Framework-Free HTTP Core)                │
├────────────────────────────────────────────────────────┤
│                 dispatchRuntimeMessage                 │
│              (JSON-RPC 2.0 Router & Gate)              │
│  • Live Read Methods      • Gated Mutating (503 Gate)  │
├────────────────────────────────────────────────────────┤
│                  createHostedRuntime                   │
│         (Assembles MemoFS from Injected Slots)         │
│  • Required: store (R2, S3, MemoryStore)               │
│  • Optional: embedder, reranker, extractor, llmClient  │
└────────────────────────────────────────────────────────┘
```

The cloud runtime Worker and the open-source self-hoster execute **identical factory code** — the only difference is which storage and intelligence adapters are injected into the runtime.

## Subpath Exports & Binaries

| Export | Target | Description |
|---|---|---|
| **`@memofs/server`** | Node.js, Workers, Edge | Root entry point exposing `createHostedRuntime`, `handleRuntimeRequest`, dispatch functions, and constants. |
| **`@memofs/server/worker`** | Cloudflare Workers | Worker entry point exposing `createRuntimeFetchHandler` for serverless deployments. |
| **`memofs-server`** (CLI) | Node.js (CLI binary) | Standalone executable booting a `node:http` server with built-in DoS protection and bearer token auth. |

## Installation

Install `@memofs/server` in your project:

::: code-group

```sh [pnpm]
pnpm add @memofs/server
```

```sh [npm]
npm install @memofs/server
```

```sh [yarn]
yarn add @memofs/server
```

```sh [bun]
bun add @memofs/server
```
:::

> [!NOTE]
> Requires **Node.js >= 22** or Cloudflare Workers runtime.

## Quick Start (Programmatic Runtime Assembly)

```ts
import { createHostedRuntime } from "@memofs/server";
import { InMemoryMemoryStore } from "@memofs/core";

// Assemble a MemoFS instance from injected adapters
const memofs = createHostedRuntime({
  // Required slot: the memory store (file replica)
  store: new InMemoryMemoryStore(),
  projectId: "my-project",

  // Optional intelligence slots — omit to run deterministic defaults
  // embedder: customEmbedder,
  // reranker: customReranker,
  // extractor: customExtractor,
  // llmClient: customLlmClient,
});

// Perform operations directly on the assembled runtime
await memofs.writeMemory({
  title: "Architecture Standard",
  content: "All microservices communicate via gRPC.",
  kind: "decision",
});

const recall = await memofs.recall("microservice communication");
console.log(recall.items[0]?.text);
```

## The Required Slot: `store`

A memory runtime cannot operate without files. The `store` parameter is the foundational memory store implementing the `MemoryStore` interface. MemoFS Cloud builds it using `@memofs/adapter-r2` and `@memofs/adapter-turso`; an open-source self-hoster builds it using S3, Postgres, local filesystem, or custom drivers. There is no fallback default for `store`.

## Deterministic Defaults

All intelligence slots are optional. When omitted, the runtime runs its built-in zero-dependency deterministic engine:

| Slot | Omitted Default | Provider Upgrade |
|---|---|---|
| **`embedder`** | Lexical-only recall (BM25 + fuzzy edit distance) | Inject for hybrid vector search (`@memofs/adapter-openai`, `@memofs/adapter-voyage`) |
| **`reranker`** | Lexical token-overlap reranker (`DeterministicFallbackReranker`) | Inject for semantic reranking (`@memofs/adapter-voyage`) |
| **`extractor`** | Rule-based knowledge graph extractor (`createRuleBasedExtractor`) | Inject for LLM-enhanced extraction (`@memofs/adapter-openai`, `@memofs/adapter-workers-ai`) |
| **`llmClient`** | Deterministic fallback (regex & heuristic strategist) | Inject for LLM-enhanced context generation and consolidation |

## The Write Gate (Hard Ordering Rule)

To prevent data loss caused by concurrent uncoordinated writes, all mutating JSON-RPC methods (`memory.write`, `memory.recordNote`, `memory.updateCore`, `graph.upsertNodes`, `consolidate`, `snapshots.create`, etc.) are protected behind the **Concurrency Gate**:

- Without an injected `concurrencyLayer`, mutating methods return JSON-RPC error code `-32000` with HTTP status `503 Service Unavailable`.
- When a `concurrencyLayer` (`{ acquire: (projectId, fn) => Promise<T> }`) is provided, mutating handlers execute safely inside `acquire`.
- Read methods (`health`, `recall`, `context`, `memory.readCore`, `graph.neighbors`, etc.) are always live and execute without locks.