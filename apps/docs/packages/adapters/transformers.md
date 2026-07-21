# Transformers.js Adapter (`@memofs/adapter-transformers`)

The `@memofs/adapter-transformers` adapter enables vector embeddings to run completely locally, offline, and browser/worker-safely using ONNX runtimes and Xenova's Transformers.js.

## Installation

::: code-group

```sh [npm]
npm install @memofs/adapter-transformers
```

```sh [pnpm]
pnpm add @memofs/adapter-transformers
```

```sh [yarn]
yarn add @memofs/adapter-transformers
```

```sh [bun]
bun add @memofs/adapter-transformers
```

```sh [deno]
deno add npm:@memofs/adapter-transformers
```

:::

> [!NOTE]
> Requires **Node.js >= 22**.

## Usage

Configure the client to use local embeddings. The model is downloaded on first run and cached locally:

```ts
import { MemoFS } from "@memofs/core";
import { createTransformersEmbedder } from "@memofs/adapter-transformers";
import { createNodeFsMemoryStore } from "@memofs/core/node-fs";

const memo = new MemoFS({
  store: createNodeFsMemoryStore({ rootDir: "." }),
  projectId: "local-project",
  embedder: createTransformersEmbedder({
    model: "Xenova/all-MiniLM-L6-v2", // Run locally with Xenova models
  }),
});
```

## Configuration API (`TransformersEmbedderConfig`)

| Option | Type | Required | Description |
|---|---|---|---|
| `model` | `string` | No | Model name (default: `"Xenova/all-MiniLM-L6-v2"`). |
| `quantized` | `boolean` | No | Whether to load quantized weights (default: `true` for faster speed). |
| `progressCallback`| `Function` | No | Callback triggered during model file loading. |
