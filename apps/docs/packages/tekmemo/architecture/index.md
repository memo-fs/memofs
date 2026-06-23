# Architecture

TekMemo is designed around **inspectable memory boundaries**: the files a human reads are the source of truth, and everything else (recall indexes, the graph, snapshots) is a derived artifact that can be rebuilt. This page is the map of how the pieces fit; each layer links to its deeper page.

## The layers

```text
   your code / agent / CLI
            │
            ▼
┌───────────────────────┐
│   Tekmemo client      │  unified façade — one API surface, picks a strategy
│   (@tekbreed/tekmemo) │
└──────────┬────────────┘
           │ resolves mode + policy
   ┌───────┴────────┐
   ▼                ▼
┌─────────┐   ┌──────────┐
│ local   │   │ hybrid   │  local engine + cloud file-replica sync
│ strategy│   │ strategy │  (read/write policy fans out each op)
└────┬────┘   └────┬─────┘
     │             │
     ▼             ▼
┌─────────────────────────────────────────┐
│  memory primitives (core types,         │
│  documents, events, canonical paths)    │
└─────────────────────────────────────────┘
     │             │             │
     ▼             ▼             ▼
┌─────────┐ ┌───────────┐ ┌───────────┐
│ recall  │ │  graph    │ │  cloud    │
│ + rerank│ │  memory   │ │  client   │
│ + embed │ │ (extract) │ │ (sync API)│
└─────────┘ └───────────┘ └───────────┘
```

| # | Layer | Responsibility | Package |
| --- | --- | --- | --- |
| 1 | **Memory primitives** | Core types, document/event helpers, validation, and the canonical file paths. The bedrock everything else imports. | `@tekbreed/tekmemo` |
| 2 | **Runtime strategies** | Local (filesystem engine), hybrid (policy router over local + cloud sync), and in-memory (tests). One is selected from the resolved config. | `@tekbreed/tekmemo` |
| 3 | **`Tekmemo` client** | The unified façade. Picks a strategy and exposes one API surface (`recall`, `notes`, `graph`, `context`, `sync`, …) regardless of mode. | `@tekbreed/tekmemo` |
| 4 | **Recall + providers** | Embedding, vector search, reranking. The [intelligence layer](../intelligence) — hybrid recall, local ONNX embedder, deterministic reranker. | `@tekbreed/tekmemo` + adapters |
| 5 | **Graph memory** | Entities and relationships extracted from prose; consolidation merges duplicates and retires superseded facts. | `@tekbreed/tekmemo` |
| 6 | **Cloud client** | The TekMemo Cloud API transport. In hybrid mode it's a file-sync replica (`push`/`complete`/`pull`/`status`), not a separate engine. | `@tekbreed/tekmemo` |
| 7 | **Integrations** | The standalone CLI, the MCP server, the AI SDK adapter, and the connector framework. Thin shells over the core. | `@tekbreed/tekmemo-{cli,mcp-server,adapter-ai-sdk,connectors}` |

## How a request flows

A `memo.recall("how does auth work")` call illustrates the boundaries:

1. **Client** validates input and delegates to the active **strategy**.
2. **Strategy** (local or hybrid) runs the recall pipeline: lexical (BM25 + fuzzy, always) merged with vector (when an embedder is configured), reranked.
3. **Memory primitives** serve the source content — `core.md` + `notes.md` + indexed chunks.
4. In **hybrid**, the read policy decides whether the cloud replica is consulted (fallback on error) — but the engine always runs locally.

Every layer has a deterministic default, so the same call works with zero configuration and upgrades gracefully when you add providers.

## Source of truth vs. derived

The single most important architectural fact: **the files are authoritative; derived indexes are disposable.** `core.md` and `notes.md` *are* the memory; the recall index, embeddings, and graph are rebuildable caches derived from them. Delete the indexes and TekMemo regenerates them; edit a file by hand and the next recall reflects it. See [File-first memory](../file-first-memory) and [Memory model](./memory-model).

## Deep dives

| Topic | Page |
| --- | --- |
| How packages depend on each other (core has no deps; adapters/shells depend on core) | [Package boundaries](./package-boundaries) |
| The six memory primitives and how they relate | [Memory model](./memory-model) |
| Entities, relationships, extraction, and consolidation | [Graph memory](./graph-memory) |
| Lexical / vector / hybrid recall, embedders, reranking | [Indexing and recall](./indexing-recall) |
| File-replica sync, cursors, conflict handling | [Sync and events](./sync-events) |
| Write blocklist, `secretRef` model, threat model | [Security](./security) |

For the full intelligence picture (recall + extraction + consolidation + durability), see [Memory intelligence](../intelligence).
