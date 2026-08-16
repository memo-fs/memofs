---
title: "@memofs/core Overview"
description: "Core architecture, subpath exports, runtime boundaries, and memory primitives of the @memofs/core package."
---

# `@memofs/core`

`@memofs/core` is the core memory runtime and provider-neutral contract engine for MemoFS. It provides the architectural foundation for file-first, versioned, and semantic memory for AI agents.

## Subpath Exports

To ensure maximum runtime portability, `@memofs/core` is divided into three distinct entry points:

| Subpath | Target Environment | Description |
|---|---|---|
| **`@memofs/core`** | Node.js, Cloudflare Workers, Deno, Bun, Browser | **Root entry (Worker-safe).** Exposes the unified `MemoFS` client (`new MemoFS({ ... })`), `RemoteBlobMemoryStore`, `InMemoryMemoryStore`, provider contracts, graph algorithms, hybrid recall, security gates, and types. Imports no POSIX filesystem modules. |
| **`@memofs/core/node-fs`** | Node.js (>= 22) | **Node-only entry.** Provides `createNodeMemoFs` (the zero-config factory returning `new MemoFS`), `createNodeFsMemoryStore`, `NodeFsMemoryStore`, synchronous config reader `readMemoFsConfigFileSync`, and test temp directory helpers. |
| **`@memofs/core/cloud-client`** | Any JavaScript runtime | **Cloud sync client.** Exposes `createMemoFsCloudClient`, `createMemoFsCloudClientFromEnv`, and `createProjectScopedClient` for two-phase file replication against MemoFS Cloud. |

## Installation

Install `@memofs/core` using your preferred package manager:

::: code-group

```sh [pnpm]
pnpm add @memofs/core
```

```sh [npm]
npm install @memofs/core
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
> Requires **Node.js >= 22** when running under Node.js runtime.

## Quick Starts

### 1. Node.js Applications (Recommended)

In Node.js applications, use the `createNodeMemoFs` factory from `@memofs/core/node-fs`. It automatically resolves `.memofs/config.json`, initializes a `NodeFsMemoryStore`, and returns a configured `MemoFS` client:

```ts
import { createNodeMemoFs } from "@memofs/core/node-fs";

// Automatically configures NodeFsMemoryStore at rootDir
const memofs = createNodeMemoFs({
  rootDir: ".",
  mode: "local",
});

// Bootstrap canonical .memofs/ files if missing
await memofs.bootstrap();

// Write a classified, durable memory
const result = await memofs.writeMemory({
  title: "Database Selection",
  content: "We use Cloudflare D1 for metadata and R2 for blob storage.",
  kind: "decision",
  tags: ["architecture", "database"],
});
console.log(`Saved memory ${result.id} (tier: ${result.tier})`);

// Retrieve progressive-disclosure prompt context
const context = await memofs.context({
  query: "What database do we use for metadata?",
  taskType: "coding",
  detail: "compact",
});
console.log(context.text);
```

### 2. Edge & Cloudflare Workers

For Cloudflare Workers or serverless edge runtimes where `node:fs` is unavailable, instantiate `MemoFS` directly with `new MemoFS({ ... })` and a Worker-safe storage adapter such as `RemoteBlobMemoryStore` (e.g. backed by `@memofs/adapter-r2` and `@memofs/adapter-turso`) or `InMemoryMemoryStore`:

```ts
import { MemoFS, RemoteBlobMemoryStore } from "@memofs/core";

// Inject Worker-safe blob and metadata storage adapters
const store = new RemoteBlobMemoryStore({
  blobClient: r2BlobClient,       // e.g. from @memofs/adapter-r2
  metadata: tursoMetadataStore,   // e.g. from @memofs/adapter-turso
  rootKey: "my-project-root",
});

const memofs = new MemoFS({
  store,
  projectId: "project-123",
  mode: "local",
});

// Read core memory
const coreRules = await memofs.core.read();
console.log(coreRules);
```

## Key Capabilities

- **File-First Canonical Storage:** All memory is persisted under `.memofs/` across 11 canonical Markdown, JSON, and JSONL files.
- **Write Intelligence & Safety:** Built-in secret blocklist (`BLOCKLIST_RULES`) prevents API keys, JWTs, and passwords from reaching memory files. Durability tiering (`durable` vs `transient`) keeps scratch notes in the audit log while keeping search indexes clean.
- **Progressive Context Delivery:** `memofs.context()` generates token-budgeted prompt briefings with section cursors (`expand`), preventing LLM prompt bloat while allowing on-demand deep dives.
- **Hybrid Recall & Decay:** Combines BM25 lexical search, fuzzy matching, and vector embeddings with exponential recency decay (30-day half-life).
- **Code Anchoring & Drift Detection:** Binds memories to code paths and SHA-256 hashes via `AnchorRef`. When code changes, facts transition to `stale` with automated score penalties.
- **Knowledge Graph & Consolidation:** Extracts entity-relationship triples, performs weighted shortest-path traversals, and merges duplicate entities while retiring superseded facts without data loss.
- **Agent Workspaces (AgentFS):** Provides isolated execution sandboxes (`memofs.agentfs`) with automatic durable-memory extraction upon task completion.
- **Two-Phase Cloud Sync:** Replicates local memory files to MemoFS Cloud with cryptographic hash verification and monotonic sync cursors.

## Package Architecture

`@memofs/core` is structured in modular layers:

```
┌────────────────────────────────────────────────────────┐
│                        MemoFS                          │
│               (Unified High-Level Client)              │
├───────────────────┬────────────────────────────────────┤
│   Runtime Layer   │  • agentfs  • recall   • graph     │
│                   │  • sync     • rerank   • security  │
├───────────────────┼────────────────────────────────────┤
│   Storage Layer   │  • NodeFsMemoryStore (@node-fs)    │
│                   │  • RemoteBlobMemoryStore (Worker)  │
│                   │  • InMemoryMemoryStore (Testing)   │
├───────────────────┼────────────────────────────────────┤
│   Canonical Files │  • 11 Canonical .memofs/ files     │
└───────────────────┴────────────────────────────────────┘
```

1. **`core`**: Canonical schemas, document parsers (`core.md`, `notes.md`, `conversations.jsonl`), event logging, manifest validation, and memory store contracts.
2. **`agentfs`**: Virtual workspace filesystem, session scaffolding, outcome-driven cleanup, and advisory memory leases.
3. **`ai-runtime`**: Framework-neutral contracts (`MemoFSMemoryRuntime`, `LlmClient`, `Extractor`, `MemoryEmbedder`, `Reranker`).
4. **`recall`**: Hybrid lexical (BM25 + fuzzy) and vector query router, cosine similarity, metadata filtering, and the 4-stage strategist.
5. **`graph`**: Knowledge graph store, node/edge query engine, BFS/Dijkstra shortest path, automated rule-based extraction, and consolidation.
6. **`security`**: Durability tier classifier and write-time secret blocklist enforcement.
7. **`cloud-client`**: HTTP transport client for file-based replication against MemoFS Cloud.

## Design Principles & Boundaries

- **Zero-Dependency Core Intelligence:** Core capabilities (lexical search, rule-based extraction, deterministic reranking, durability classification) require zero external API keys or cloud dependencies.
- **Provider-Neutral Contracts:** Interfaces for embedders, rerankers, extractors, and LLM transports are strictly abstract in core; concrete providers live in adapter packages (`@memofs/adapter-openai`, `@memofs/adapter-voyage`, `@memofs/adapter-transformers`, etc.).
- **Strict Storage Decoupling:** Core logic operates exclusively against the abstract `MemoryStore` interface. POSIX `node:fs` calls are isolated strictly within `@memofs/core/node-fs`.
