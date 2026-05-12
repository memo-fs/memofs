# Provider adapters

TekMemo provides official adapters for industry-leading embedding and AI models. These adapters implement the standard `MemoryEmbedder` contract.

## OpenAI

`@tekmemo/openai` provides embedding integration for OpenAI's `text-embedding-3-*` and `ada-002` models.

### Install

```bash
npm install @tekmemo/openai
```

### Usage

```ts
import { createOpenAIEmbedder } from "@tekmemo/openai";

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

## VoyageAI

`@tekmemo/voyageai` provides high-performance embedding integration for Voyage's specialized models (e.g. `voyage-large-2`, `voyage-code-2`).

### Install

```bash
npm install @tekmemo/voyageai
```

### Usage

```ts
import { createVoyageEmbedder } from "@tekmemo/voyageai";

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
