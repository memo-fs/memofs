# Transformers.js Adapter (`@memofs/adapter-transformers`)

The `@memofs/adapter-transformers` adapter enables vector embeddings to run completely locally, offline, and browser/worker-safely using ONNX runtimes and Xenova's Transformers.js.

---

## Installation

```bash
npm install @memofs/adapter-transformers
```

---

## Usage

Configure the client to use local embeddings. The model is downloaded on first run and cached locally:

```ts
import { MemoFS } from "@memofs/core";
import { createTransformersEmbedder } from "@memofs/adapter-transformers";
import { createNodeFsMemoryStore } from "@memofs/core/node-fs";

const memo = new MemoFS({
  store: createNodeFsMemoryStore({ rootDir: "./.memofs" }),
  projectId: "local-project",
  embedder: createTransformersEmbedder({
    model: "Xenova/all-MiniLM-L6-v2", // Run locally with Xenova models
  }),
});
```

---

## Configuration API (`TransformersEmbedderConfig`)

| Option | Type | Required | Description |
|---|---|---|---|
| `model` | `string` | No | Model name (default: `"Xenova/all-MiniLM-L6-v2"`). |
| `quantized` | `boolean` | No | Whether to load quantized weights (default: `true` for faster speed). |
| `progressCallback`| `Function` | No | Callback triggered during model file loading. |
