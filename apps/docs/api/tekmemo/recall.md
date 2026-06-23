# Recall Module

The recall module retrieves the memory fragments most relevant to a query. In local and hybrid modes it runs a configurable **recall engine** that combines a lexical path (BM25 + fuzzy matching) with an optional semantic vector path (embeddings), then reranks and weights results by relevance, recency, and confidence.

## Import

```ts
import { createInMemoryRecallStore } from "@tekbreed/tekmemo";
```

## How it works

"Recall" is the process of retrieving relevant memory fragments so an agent's
context window carries only what matters, instead of an entire `notes.md`.

Local recall supports **four strategies**, chosen via `recall.engine`:

| `engine` | How it retrieves | Requires an embedder? |
| --- | --- | --- |
| `lexical` | BM25 + fuzzy keyword matching only. | No |
| `vector` | Semantic embeddings only. | Yes |
| `hybrid` | Both paths merged, reranked, and weighted by recency + confidence. | Yes |
| `auto` (default) | `hybrid` when an embedder is available, else `lexical`. | No (falls back to lexical) |

With **no embedder configured**, local recall defaults to lexical — so memory is
searchable with zero setup and no API keys. The `RecallStore` interface below is
the vector-path contract; `InMemoryRecallStore` and `FsRecallStore` are provided
for testing and persistent local sessions.

## Quick start with Tekmemo

The [`Tekmemo`](./tekmemo) class exposes recall through the top-level `recall` method, which handles engine selection, embedding, and store lookup automatically:

```ts
import { Tekmemo } from "@tekbreed/tekmemo";

const memo = new Tekmemo({ rootDir: "./.tekmemo", projectId: "my-app" });

// Zero-config lexical recall — no embedder, no API keys required
const hits = await memo.recall("How do I handle sync conflicts?");
console.log(hits.results.map((r) => r.text));
```

### Zero-API-key hybrid recall

For semantic matching with no cloud, enable the local ONNX embedder — it runs
in-process via [`@tekbreed/tekmemo-adapter-transformers`](./provider-adapters)
and only downloads the model on the first recall:

```ts
import { Tekmemo } from "@tekbreed/tekmemo";

const memo = new Tekmemo({
  rootDir: "./.tekmemo",
  projectId: "my-app",
  recall: { engine: "auto", localEmbeddings: true },
});
```

The vector path is an enhancement: if the embedder fails or the adapter is
missing, recall (and writes) keep working on the lexical path.

### Using a provider embedder

For higher-quality semantic recall, pass a provider adapter through the constructor. With an embedder present, `engine: "auto"` upgrades to hybrid automatically:

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
| `createFsRecallStore()` | `@tekbreed/tekmemo` | Persistent local-first store (`.tekmemo/indexes/embeddings.jsonl`). |

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

- **Zero-config recall:** Search memory by keyword (BM25 + fuzzy) with no embedder and no API keys.
- **Semantic Search:** Go beyond keyword matching by searching for meaning (vector path).
- **Hybrid Grounding:** Merge both paths and weight by recency + confidence so the freshest, most relevant memory reaches the agent's context window.
- **Local Testing:** Use `InMemoryRecallStore` to test your retrieval logic without a live database.
