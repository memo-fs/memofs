# Reranking Module

Reranking is a crucial step in the recall pipeline. After retrieving a set of potentially relevant documents (e.g. via keyword search or basic vector search), a reranker uses a more powerful semantic model to re-order those documents by their true relevance to the query.

## Core Capabilities

The core reranking capabilities, contract interfaces, and deterministic fallback reranker are built directly into `@tekbreed/tekmemo`.

## Import

```ts
import { createDeterministicFallbackReranker, createVoyageReranker } from "@tekbreed/tekmemo";
```

## Quick start with Tekmemo

The [`Tekmemo`](./tekmemo) class exposes reranking utilities through `memo.rerank`:

```ts
import { Tekmemo } from "@tekbreed/tekmemo";

const memo = new Tekmemo({ rootDir: "./.tekmemo", projectId: "my-app" });

// Sort results by rerank score
const sorted = memo.rerank.sort(results);

// Trim to top K
const top3 = memo.rerank.applyTopK(sorted, 3);

// Get a deterministic fallback reranker
const fallback = memo.rerank.createFallback();
```

## API Reference

### `Tekmemo.rerank`

| Method | Purpose |
| --- | --- |
| `memo.rerank.sort(results, key?)` | Sorts rerank results by score. |
| `memo.rerank.applyTopK(results, topK)` | Trims results to top K. |
| `memo.rerank.createFallback()` | Creates a deterministic fallback reranker (keyword-based). |

### Reranker contract

| Method | Purpose |
| --- | --- |
| `reranker.rerank(input)` | Scores and sorts documents by relevance. |
| `createDeterministicFallbackReranker()` | Creates a local reranker that sorts based on keyword presence. |

## VoyageAI Integration

For production reranking with VoyageAI's specialized models:

```ts
import { Tekmemo } from "@tekbreed/tekmemo";
import { createVoyageReranker } from "@tekbreed/tekmemo-adapter-voyage";

const reranker = createVoyageReranker({
  apiKey: process.env.VOYAGE_API_KEY,
  model: "voyage-rerank-2",
});

const results = await reranker.rerank({
  query: "How do I handle sync conflicts?",
  documents: [
    "Conflict resolution policy: keep-cloud...",
    "Sync push sends local events to the cloud...",
    "Memory records should be small and explicit.",
  ],
  topK: 1,
});

console.log(`Top match: ${results[0].document}`);
```

## Use Cases

- **Quality Improvement:** Use a cheaper, faster search for the first pass, then rerank to ensure top results are the most relevant.
- **Context Window Optimization:** Ensure only the absolute best information is injected into an agent's context window.
- **Hybrid Recall:** Combine local keyword results and cloud vector results, then rerank the union for a unified set of context hits.
