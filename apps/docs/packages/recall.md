# `@tekmemo/recall`

Semantic recall memory for AI agents. This package provides the standard contracts and in-memory implementation for storing and querying text embeddings.

## Install

```bash
npm install @tekmemo/recall
```

## How it works

"Recall" is the process of retrieving relevant memory fragments using vector similarity (semantic search). 

This package defines the `RecallStore` interface, which is implemented by various adapters (e.g., `@tekmemo/upstash-vector`). It also provides `InMemoryRecallStore` for testing and local ephemeral sessions.

## API Reference

### `RecallStore` Interface

| Method | Purpose |
| --- | --- |
| `upsert(documents)` | Adds or updates documents with embeddings. |
| `query(query)` | Finds the top-K most similar documents using cosine similarity. |
| `delete(ids)` | Removes specific documents by ID. |
| `deleteBySource(input)` | Deletes all documents matching source identifiers. |

## Example usage

```ts
import { createInMemoryRecallStore } from "@tekmemo/recall";

const store = createInMemoryRecallStore({
  dimension: 1536 // Match your embedding model (e.g. text-embedding-3-small)
});

// Upsert a document with its vector
await store.upsert([{
  id: "doc_1",
  text: "TekMemo is a layered memory runtime.",
  embedding: [0.1, 0.2, ...], // Actual vector array
  metadata: { kind: "summary" }
}]);

// Search for similar context
const results = await store.query({
  embedding: [0.11, 0.19, ...],
  topK: 1,
  includeText: true
});

console.log(results[0].text);
```

## Use cases

- **Semantic Search:** Go beyond keyword matching by searching for meaning.
- **Agent Grounding:** Provide the most relevant "memory hits" to an agent's context window.
- **Local Testing:** Use `InMemoryRecallStore` to test your retrieval logic without a live database.
