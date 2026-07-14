# Voyage AI Adapter (`@memofs/adapter-voyage`)

The Voyage AI adapter integrates Voyage's high-performance, domain-optimized vector embedding and reranking endpoints into MemoFS's hybrid recall system.

## Installation

::: code-group

```sh [npm]
npm install @memofs/adapter-voyage
```

```sh [pnpm]
pnpm add @memofs/adapter-voyage
```

```sh [yarn]
yarn add @memofs/adapter-voyage
```

```sh [bun]
bun add @memofs/adapter-voyage
```

```sh [deno]
deno add npm:@memofs/adapter-voyage
```

:::

> [!NOTE]
> Requires **Node.js >= 22**.

## Usage

Inject both the Voyage embedder and Voyage reranker to boost semantic query relevance:

```ts
import { MemoFS } from "@memofs/core";
import { createVoyageEmbedder, createVoyageReranker } from "@memofs/adapter-voyage";
import { createNodeFsMemoryStore } from "@memofs/core/node-fs";

const memo = new MemoFS({
  store: createNodeFsMemoryStore({ rootDir: "./.memofs" }),
  projectId: "voyage-project",
  
  // Vector generation
  embedder: createVoyageEmbedder({
    apiKey: process.env.VOYAGE_API_KEY,
    model: "voyage-3",
  }),
  
  // Relevance sorting
  reranker: createVoyageReranker({
    apiKey: process.env.VOYAGE_API_KEY,
    model: "rerank-2",
  }),
});
```

## Configuration API

### Embedder Config (`VoyageEmbedderConfig`)

| Option | Type | Required | Description |
|---|---|---|---|
| `apiKey` | `string` | Yes | Voyage API key. Defaults to `process.env.VOYAGE_API_KEY`. |
| `model` | `string` | No | Voyage embedding model (default: `"voyage-3"`). |
| `dimensions` | `number` | No | Vector dimensions to truncate results to. |

### Reranker Config (`VoyageRerankerConfig`)

| Option | Type | Required | Description |
|---|---|---|---|
| `apiKey` | `string` | Yes | Voyage API key. |
| `model` | `string` | No | Voyage rerank model (default: `"rerank-2"`). |
| `maxDocuments`| `number` | No | Maximum candidates to send for reranking (default: `100`). |
