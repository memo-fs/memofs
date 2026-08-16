---
title: "How to configure Vector Embeddings & Intelligence Drivers"
date: "2026-08-08"
estimatedMinutes: 5
description: "Enable vector embeddings, semantic search, and entity graph consolidation in MemoFS."
---

# How to configure Vector Embeddings & Intelligence Drivers

MemoFS is built with a **deterministic, zero-key fallback** (BM25 lexical search + rule-based entity parsing). When you're ready for semantic retrieval and automated knowledge graph extraction, you can plug in vector embedding and LLM intelligence drivers.

## Available Intelligence Drivers

| Driver | Package | Execution | Best For |
|---|---|---|---|
| **BM25 Default** | Built-in | 100% Local / Zero Keys | Offline development, instant startup |
| **Transformers.js** | `@memofs/adapter-transformers` | 100% Local / ONNX | Local semantic search with zero API costs |
| **Voyage AI** | `@memofs/adapter-voyage` | Cloud API | State-of-the-art code & technical recall |
| **OpenAI** | `@memofs/adapter-openai` | Cloud API | `text-embedding-3-small` / `text-embedding-3-large` |
| **Cloudflare Workers AI** | `@memofs/adapter-workers-ai` | Edge / Serverless | Serverless edge deployment with Cloudflare Workers |

---

## Option 1: Local Semantic Search with Transformers.js

Run vector embeddings completely on-device without sending data across the network:

1. Install the adapter:
   ```bash
   npm install @memofs/adapter-transformers
   ```

2. Configure in `.memofs/config.json`:
   ```json
   {
     "recall": {
       "localEmbeddings": true,
       "embeddingModel": "Xenova/all-MiniLM-L6-v2"
     }
   }
   ```

---

## Option 2: Voyage AI Code Embeddings

Voyage AI offers domain-specific models tailored for code and technical repositories:

1. Install the adapter:
   ```bash
   npm install @memofs/adapter-voyage
   ```

2. In your TypeScript setup:
   ```ts
   import { MemoFS } from "@memofs/core";
   import { createNodeFsMemoryStore } from "@memofs/core/node-fs";
   import { createVoyageEmbedder } from "@memofs/adapter-voyage";

   const memo = new MemoFS({
     store: createNodeFsMemoryStore({ rootDir: "." }),
     embedder: createVoyageEmbedder({
       apiKey: process.env.VOYAGE_API_KEY!,
       model: "voyage-code-3",
     }),
   });
   ```

---

## Option 3: OpenAI Embeddings

Use OpenAI's `text-embedding-3-small` or `text-embedding-3-large`:

1. Install the adapter:
   ```bash
   npm install @memofs/adapter-openai
   ```

2. Initialize in code:
   ```ts
   import { MemoFS } from "@memofs/core";
   import { createNodeFsMemoryStore } from "@memofs/core/node-fs";
   import { createOpenAIEmbedder } from "@memofs/adapter-openai";

   const memo = new MemoFS({
     store: createNodeFsMemoryStore({ rootDir: "." }),
     embedder: createOpenAIEmbedder({
       apiKey: process.env.OPENAI_API_KEY!,
       model: "text-embedding-3-small",
     }),
   });
   ```

## Reindexing Memory

Whenever you switch embedding models, regenerate the vector indexes:

```bash
npx @memofs/cli index --rebuild
```

## Related Resources

* [Configure Intelligence](/server/intelligence)
* [Voyage AI Adapter](/adapters/voyage)
* [OpenAI Adapter](/adapters/openai)
* [Transformers.js Adapter](/adapters/transformers)
