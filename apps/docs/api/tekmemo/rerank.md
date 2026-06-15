# Reranking Module

Reranking is a crucial step in the recall pipeline. After retrieving a set of potentially relevant documents (e.g. via keyword search or basic vector search), a reranker uses a more powerful semantic model to re-order those documents by their true relevance to the query.

## Core Capabilities

The core reranking capabilities, contract interfaces, and deterministic fallback reranker are built directly into `@tekbreed/tekmemo`.

## Import

All reranking helper functions and structures are imported directly from `@tekbreed/tekmemo`:

```ts
import { ... } from "@tekbreed/tekmemo";
```
### API Reference

| Method | Purpose |
| --- | --- |
| `reranker.rerank(input)` | Scores and sorts documents by relevance. |
| `createDeterministicFallbackReranker()` | Creates a local reranker that sorts based on keyword presence (useful as a fallback). |

---

## VoyageAI Integration

Exposes a production-ready implementation of the reranker contract using VoyageAI's specialized rerank models.

### Example usage

```ts
import { createVoyageReranker } from "@tekbreed/tekmemo";

// Create the reranker instance
const reranker = createVoyageReranker({
  apiKey: process.env.VOYAGE_API_KEY,
  model: "voyage-rerank-2"
});

// Re-order recall results for maximum relevance
const results = await reranker.rerank({
  query: "How do I handle sync conflicts?",
  documents: [
    "Conflict resolution policy: keep-cloud...",
    "Sync push sends local events to the cloud...",
    "Memory records should be small and explicit."
  ],
  topK: 1
});

console.log(`Top match: ${results[0].document}`);
```

## Use Cases

- **Quality Improvement:** Use a cheaper, faster search (like keyword or small vector) for the first pass, then use a reranker to ensure the top results are the most relevant.
- **Context Window Optimization:** Ensure that only the absolute best information is injected into your agent's context window.
- **Hybrid Recall:** Combine local keyword results and cloud vector results, then rerank the union for a unified set of context hits.
