# `@memofs/core`

`@memofs/core` is the core memory runtime and provider-neutral contract engine for MemoFS. It provides the architectural foundation for file-first, versioned, and semantic memory for AI agents.

## Features

- **Unified Core Runtime:** Provides the main `MemoFS` client orchestrating storage and intelligence.
- **Provider-Neutral Contracts:** Interfaces for embedders, rerankers, extractors, and LLM clients.
- **AgentFS:** Virtual filesystem abstraction for project memory files.
- **Hybrid Recall:** Out-of-the-box local BM25, fuzzy, and semantic search routing.
- **Durable Graph Memory:** Entity-relationship mapping for versioned memory snapshots.

## Installation

Install the core package using your preferred package manager:

::: code-group

```sh [npm]
npm install @memofs/core
```

```sh [pnpm]
pnpm add @memofs/core
```

```sh [yarn]
yarn add @memofs/core
```

```sh [bun]
bun add @memofs/core
```

```sh [deno]
deno add npm:@memofs/core
```
:::

> [!NOTE]
> Since `@memofs/core` is designed to be environment-agnostic (runnable on Node.js, Cloudflare Workers, etc.), it does not include a filesystem adapter by default. For Node.js applications, use the subpath export `@memofs/core/node-fs`.<br/> <br/>
> Requires **Node.js >= 22**


## Quick Start

Initialize memory in your project and read the core memory:

```ts
import { MemoFS } from "@memofs/core";
import { createNodeFsMemoryStore } from "@memofs/core/node-fs";

// Create a Node.js filesystem-backed memory store
const store = createNodeFsMemoryStore({
  // MemoFS creates `.memofs/` inside this workspace root.
  rootDir: ".",
});

// Create the unified client
const memo = new MemoFS({
  store,
  projectId: "my-project",
  mode: "local",
});

await memo.bootstrap();

// Retrieve core memory (returns raw markdown string)
const core = await memo.core.read();
console.log(core);
```

## Runtime Boundaries

The root `@memofs/core` entry can load in Node.js and Workers when you inject a
compatible `MemoryStore`. The filesystem store is deliberately Node-only:

```ts
import { createNodeFsMemoryStore } from "@memofs/core/node-fs";
```

For Workers, inject a Worker-safe store such as `RemoteBlobMemoryStore` with
your blob and metadata adapters. The root package does not select a storage
backend automatically.

## Package Architecture

The `@memofs/core` is organized around a strict layering model:

1. **`core`**: Canonical schemas, documents, events, and in-memory stores.
2. **`agentfs`**: Virtual file matching and leases.
3. **`ai-runtime`**: Core LLM client and intelligence contract definitions.
4. **`recall`**: Hybrid lexical and vector query routing.
5. **`graph`**: Graph database engine and snapshot rollback.
6. **`security`**: Durability tier classifier and secret blocklist gating.

## Boundaries

As a public open-source core package, `@memofs/core` remains strictly neutral:
- It **does not** import or bundle any provider-specific packages (e.g., OpenAI, Voyage, or Turso).
- It **does not** contain proprietary cloud tenancy, pricing models, or dashboard features.
- All public capabilities are exported directly from the package root or the Node-only `@memofs/core/node-fs` subpath.
