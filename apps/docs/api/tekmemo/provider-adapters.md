# Provider Adapters Module

TekMemo provides official adapters for industry-leading embedding and AI models. These adapters implement the standard `MemoryEmbedder` contract.

## Installation

Install the provider's peer dependency alongside the main `@tekbreed/tekmemo` package. For example, for OpenAI:

```bash
npm install openai @tekbreed/tekmemo
```

## OpenAI Integration

Exposes embedding integration for OpenAI's `text-embedding-3-*` and `ada-002` models.

### Usage

```ts
import { createOpenAIEmbedder } from "@tekbreed/tekmemo";

const embedder = createOpenAIEmbedder({
  apiKey: process.env.OPENAI_API_KEY,
  model: "text-embedding-3-small",
  dimensions: 1536 // Optional
});

const results = await embedder.embedTexts({
  texts: ["This is a test document.", "Another piece of memory."]
});

console.log(results.embeddings[0].vector);
```

---

## VoyageAI Integration

Provides high-performance embedding integration for Voyage's specialized models (e.g. `voyage-large-2`, `voyage-code-2`).

### Usage

```ts
import { createVoyageEmbedder } from "@tekbreed/tekmemo";

const embedder = createVoyageEmbedder({
  apiKey: process.env.VOYAGE_API_KEY,
  model: "voyage-2"
});

const results = await embedder.embedTexts({
  texts: ["How does the billing system work?", "Explain the graph schema."]
});

console.log(results.embeddings[0].vector);
```

## Shared Features

- **Batching:** Automatically handles large text arrays by splitting them into batches that fit the provider's limits.
- **Retries:** Configurable exponential backoff for network and rate-limit errors.
- **Validation:** Strict validation of dimensions, model names, and input lengths.
- **Error Mapping:** Converts raw API errors into typed TekMemo errors (e.g. `OpenAIAPIError`).
