# Server Deployment

`@memofs/server` is the self-hostable, open-source hosted memory server for MemoFS. It runs the exact same file-first memory runtime the cloud runs, packaged as a standard web server you can deploy to Node.js or Cloudflare Workers.

## Features

- **Provider-Neutral Factory:** Assembles a `MemoFS` instance from adapters you inject — no provider hardcoding, no env-var reading, no adapter imports.
- **Node.js Binary:** Includes a `memofs-server` bin that boots a `node:http` server.
- **Worker Entry Point:** Subpath export `@memofs/server/worker` for Cloudflare Workers deployment.
- **JSON-RPC over HTTP:** Exposes memory commands over `POST /` (or `POST /rpc`) with JSON-RPC 2.0.

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

```sh [deno]
deno add npm:@memofs/server
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