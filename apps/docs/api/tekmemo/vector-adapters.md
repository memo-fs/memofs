# Vector Adapters

Vector adapters implement the `RecallStore` contract, allowing TekMemo to store and search memory using semantic vector search. These are now standalone packages.

## Upstash Vector (`@tekbreed/tekmemo-adapter-upstash`)

Serverless recall store backed by Upstash's global vector database. Optimized for low-latency retrieval in serverless environments like Cloudflare Workers and Vercel.

### Installation

```bash
npm install @tekbreed/tekmemo-adapter-upstash @tekbreed/tekmemo
```

### Usage

```ts
import { createUpstashRecallStore } from "@tekbreed/tekmemo-adapter-upstash";

const store = createUpstashRecallStore({
  url: process.env.UPSTASH_VECTOR_REST_URL,
  token: process.env.UPSTASH_VECTOR_REST_TOKEN,
  namespace: "my-project-production",
});
```

Use with the [`Tekmemo`](./tekmemo) class:

```ts
import { Tekmemo } from "@tekbreed/tekmemo";
import { createUpstashRecallStore } from "@tekbreed/tekmemo-adapter-upstash";

const memo = new Tekmemo({
  rootDir: "./.tekmemo",
  projectId: "my-app",
  embedder: myEmbedder,
  recallStore: createUpstashRecallStore({
    url: process.env.UPSTASH_VECTOR_REST_URL!,
    token: process.env.UPSTASH_VECTOR_REST_TOKEN!,
  }),
});
```

## Features

- **Namespace Isolation:** Supports multi-tenant or multi-project setups using Upstash namespaces.
- **Filter Builder:** Provides a structured DSL for filtering recall results by tags, kinds, or custom metadata.
- **Metadata Normalization:** Automatically handles the conversion between TekMemo's memory model and Upstash's vector metadata format.
- **Zero-Dependency Transport:** Uses standard `fetch` for communication, making it compatible with all modern JavaScript runtimes.

## Use when

Use the Upstash adapter when you need a hosted, zero-maintenance vector store for project memory that scales with your application.
