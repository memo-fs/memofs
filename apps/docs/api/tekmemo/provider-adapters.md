# Provider Adapters

TekMemo provides official standalone adapter packages for industry-leading embedding and reranking models. Each adapter implements the standard `MemoryEmbedder` contract from `@tekbreed/tekmemo`.

## OpenAI (`@tekbreed/tekmemo-adapter-openai`)

Exposes embedding integration for OpenAI's `text-embedding-3-*` and `ada-002` models.

### Installation

```bash
npm install @tekbreed/tekmemo-adapter-openai @tekbreed/tekmemo
```

### Usage

```ts
import { createOpenAIEmbedder } from "@tekbreed/tekmemo-adapter-openai";

const embedder = createOpenAIEmbedder({
  apiKey: process.env.OPENAI_API_KEY,
  model: "text-embedding-3-small",
  dimensions: 1536,
});

const results = await embedder.embedTexts({
  texts: ["This is a test document.", "Another piece of memory."],
});
```

Use with the [`Tekmemo`](./tekmemo) class:

```ts
import { Tekmemo } from "@tekbreed/tekmemo";
import { createOpenAIEmbedder } from "@tekbreed/tekmemo-adapter-openai";

const memo = new Tekmemo({
  rootDir: "./.tekmemo",
  projectId: "my-app",
  embedder: createOpenAIEmbedder({ apiKey: process.env.OPENAI_API_KEY! }),
});
```

---

## VoyageAI (`@tekbreed/tekmemo-adapter-voyage`)

High-performance embedding and reranking integration for Voyage's specialized models (e.g. `voyage-large-2`, `voyage-code-2`).

### Installation

```bash
npm install @tekbreed/tekmemo-adapter-voyage @tekbreed/tekmemo
```

### Usage

```ts
import { createVoyageEmbedder } from "@tekbreed/tekmemo-adapter-voyage";

const embedder = createVoyageEmbedder({
  apiKey: process.env.VOYAGE_API_KEY,
  model: "voyage-2",
});

const results = await embedder.embedTexts({
  texts: ["How does the billing system work?", "Explain the graph schema."],
});
```

## Shared Features

- **Batching:** Automatically handles large text arrays by splitting them into batches that fit the provider's limits.
- **Retries:** Configurable exponential backoff for network and rate-limit errors.
- **Validation:** Strict validation of dimensions, model names, and input lengths.
- **Error Mapping:** Converts raw API errors into typed TekMemo errors.
