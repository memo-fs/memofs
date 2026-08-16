---
title: "@memofs/adapter-transformers"
description: "Local Hugging Face Transformers.js ONNX embedding adapter for 100% offline semantic recall in MemoFS."
---

# Transformers.js Adapter (`@memofs/adapter-transformers`)

The `@memofs/adapter-transformers` adapter runs vector embeddings **100% locally and offline** in-process using ONNX runtime and Hugging Face's Transformers.js (`@huggingface/transformers`).

It requires **no API keys, no external services, and zero network traffic** after the initial model weights are downloaded and cached.

## Subpath Exports

| Export Path | Target Environment | Description |
|---|---|---|
| **`@memofs/adapter-transformers`** | Node.js (>= 22) | **Root entry.** Exposes `TransformersEmbedder`, `createTransformersEmbedder`, error classes, and pipeline types. |
| **`@memofs/adapter-transformers/testing`** | Test runners | Exposes `createFakePipeline` and `createFakePipelineFactory` for deterministic testing without loading ONNX weights. |

## Installation

::: code-group

```sh [pnpm]
pnpm add @memofs/adapter-transformers
```

```sh [npm]
npm install @memofs/adapter-transformers
```

```sh [yarn]
yarn add @memofs/adapter-transformers
```

```sh [bun]
bun add @memofs/adapter-transformers
```

:::

> [!NOTE]
> Requires **Node.js >= 22** when running under the Node.js runtime.

## Usage

Instantiate the local embedder with `createTransformersEmbedder()`:

::: code-group

```ts [createNodeMemoFs (Recommended)]
import { createNodeMemoFs } from "@memofs/core/node-fs";
import { createTransformersEmbedder } from "@memofs/adapter-transformers";

const memo = createNodeMemoFs({
  rootDir: ".",
  embedder: createTransformersEmbedder({
    model: "Xenova/all-MiniLM-L6-v2", // 384 dimensions
    device: "cpu",
    quantized: true,
  }),
});
```

```ts [MemoFS Class]
import { MemoFS } from "@memofs/core";
import { createNodeFsMemoryStore } from "@memofs/core/node-fs";
import { createTransformersEmbedder } from "@memofs/adapter-transformers";

const memo = new MemoFS({
  store: createNodeFsMemoryStore({ rootDir: "." }),
  projectId: "offline-app",
  mode: "local",
  embedder: createTransformersEmbedder({
    model: "Xenova/all-MiniLM-L6-v2",
    device: "cpu",
    quantized: true,
  }),
});
```

:::

## Lazy Loading & Eager Prewarming

To ensure fast CLI and server startup, `@memofs/adapter-transformers` defers loading the heavy ONNX WebAssembly binary and model weights until the first `embedTexts()` call.

If your application requires deterministic latency on the first search request, you can explicitly prewarm the model pipeline at startup:

```ts
const embedder = createTransformersEmbedder({
  model: "Xenova/all-MiniLM-L6-v2",
});

// Eagerly compile the ONNX pipeline and load weights into memory
await embedder.prewarm();
```

## Configuration API (`TransformersEmbedderOptions`)

The `createTransformersEmbedder(options)` factory accepts `TransformersEmbedderOptions`:

| Option | Type | Default | Description |
|---|---|---|---|
| `model` | `string` | `"Xenova/all-MiniLM-L6-v2"` | Hugging Face model repository identifier. Generates 384-dimensional vectors. |
| `device` | `"cpu" \| "gpu" \| "wasm"` | `"cpu"` | Hardware backend target for the ONNX execution engine. |
| `dtype` | `"fp32" \| "fp16" \| "q8" \| "int8" \| "uint8" \| "q4"` | `"fp32"` | Tensor precision format for model weights. |
| `quantized` | `boolean` | `true` | Whether to load quantized ONNX weights for reduced memory and faster CPU inference. |
| `batchSize` | `number` | `32` | Maximum number of text chunks processed in a single pipeline pass. |
| `maxRetries` | `number` | `2` | Number of retry attempts on transient runtime failures. |
| `progressCallback` | `TransformersProgressCallback` | — | Callback invoked during model download with `{ status, file, progress }`. |
| `localModelPath` | `string` | — | Absolute filesystem directory to load custom local ONNX models from. |
| `pipelineFactory` | `FeatureExtractionPipelineFactory` | — | Custom pipeline factory function (primarily used in testing). |

## Error Classes

All errors inherit from `TransformersEmbedderError`:

```ts
class TransformersEmbedderError extends Error {
  readonly cause?: unknown;
}
```

| Error Class | Cause |
|---|---|
| `TransformersValidationError` | Thrown when an input text string exceeds `MAX_TEXT_LENGTH = 8192` characters or input structure is malformed. |
| `TransformersInferenceError` | Thrown when the ONNX runtime fails during forward inference or returns an unexpected tensor shape. |

## Unit Testing with Fake Pipeline

Use the `@memofs/adapter-transformers/testing` subpath to test embeddings logic without downloading or running ONNX models:

```ts
import { describe, it, expect } from "vitest";
import { TransformersEmbedder } from "@memofs/adapter-transformers";
import { createFakePipelineFactory } from "@memofs/adapter-transformers/testing";

describe("Local transformer pipeline", () => {
  it("generates deterministic embeddings with fake pipeline", async () => {
    const pipelineFactory = createFakePipelineFactory({
      dimensions: 384,
      deterministic: true,
    });

    const embedder = new TransformersEmbedder({
      pipelineFactory,
    });

    const result = await embedder.embedText("Refactor database pooling");
    expect(result.dimensions).toBe(384);
    expect(result.embedding).toHaveLength(384);
  });
});
```

## See Also

- [Adapters Overview](/adapters/)
- [OpenAI Adapter Reference](/adapters/openai)
- [Voyage AI Adapter Reference](/adapters/voyage)
- [Hybrid Recall Architecture](/core/recall)

