# Transformers.js Adapter (`@tekmemo/adapter-transformers`)

The `@tekmemo/adapter-transformers` adapter enables vector embeddings to run completely locally, offline, and browser/worker-safely using ONNX runtimes and Xenova's Transformers.js.

---

## Installation

```bash
npm install @tekmemo/adapter-transformers
```

---

## Usage

Configure the client to use local embeddings. The model is downloaded on first run and cached locally:

```ts
import { Tekmemo } from "@tekmemo/core";
import { createTransformersEmbedder } from "@tekmemo/adapter-transformers";
import { createNodeFsMemoryStore } from "@tekmemo/core/node-fs";

const memo = new Tekmemo({
  store: createNodeFsMemoryStore({ rootDir: "./.tekmemo" }),
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
