# Recall Module

The recall module provides semantic recall memory for AI agents. It defines the standard contracts and in-memory implementation for storing and querying text embeddings.

## Import

```ts
import { createInMemoryRecallStore } from "@tekbreed/tekmemo";
```

## How it works

"Recall" is the process of retrieving relevant memory fragments using vector similarity (semantic search).

This module defines the `RecallStore` interface, which is implemented by various adapters (e.g., the [Upstash Vector adapter](./vector-adapters)). It also provides `InMemoryRecallStore` for testing and local ephemeral sessions.

## Quick start with Tekmemo

The [`Tekmemo`](./tekmemo) class exposes recall through the top-level `recall` method, which handles embedding and store lookup automatically:

```ts
import { Tekmemo } from "@tekbreed/tekmemo";

const memo = new Tekmemo({ rootDir: "./.tekmemo", projectId: "my-app" });

// Semantic recall — Tekmemo uses the configured embedder and recall store
const hits = await memo.recall("How do I handle sync conflicts?");
console.log(hits.results.map((r) => r.text));
```

For recall with a custom embedder or store, pass them through the constructor:

```ts
import { Tekmemo } from "@tekbreed/tekmemo";
import { createOpenAIEmbedder } from "@tekbreed/tekmemo-adapter-openai";

const memo = new Tekmemo({
  rootDir: "./.tekmemo",
  projectId: "my-app",
  embedder: createOpenAIEmbedder({ apiKey: process.env.OPENAI_API_KEY }),
});
```

## API Reference

### `Tekmemo.recall`

| Method | Purpose |
| --- | --- |
| `memo.recall(query, options?)` | Semantic or keyword recall. Returns top-K results with scores. |

### `RecallStore` interface

| Method | Purpose |
| --- | --- |
| `upsert(documents)` | Adds or updates documents with embeddings. |
| `query(query)` | Finds the top-K most similar documents using cosine similarity. |
| `delete(ids)` | Removes specific documents by ID. |
| `deleteBySource(input)` | Deletes all documents matching source identifiers. |

### Store implementations

| Helper | Package | Purpose |
| --- | --- | --- |
| `createInMemoryRecallStore()` | `@tekbreed/tekmemo` | Volatile in-memory store for tests. |
| `createUpstashRecallStore()` | `@tekbreed/tekmemo-adapter-upstash` | Production Upstash Vector store. |

## Direct usage (advanced)

For standalone recall operations outside of `Tekmemo`:

```ts
import { createInMemoryRecallStore } from "@tekbreed/tekmemo";

const store = createInMemoryRecallStore({ dimension: 1536 });

await store.upsert([{
  id: "doc_1",
  text: "TekMemo is a layered memory runtime.",
  embedding: [0.1, 0.2, ...],
  metadata: { kind: "summary" },
}]);

const results = await store.query({ embedding: [0.11, 0.19, ...], topK: 1, includeText: true });
console.log(results[0].text);
```

## Use cases

- **Semantic Search:** Go beyond keyword matching by searching for meaning.
- **Agent Grounding:** Provide the most relevant "memory hits" to an agent's context window.
- **Local Testing:** Use `InMemoryRecallStore` to test your retrieval logic without a live database.
