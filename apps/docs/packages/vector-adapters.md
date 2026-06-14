# Vector Adapters Module

Vector adapters implement the `RecallStore` contract, allowing TekMemo to store and search memory using semantic vector search.

## Upstash Vector

The Upstash Vector adapter provides a serverless recall store backed by Upstash's global vector database. It is optimized for low-latency retrieval in serverless environments like Cloudflare Workers and Vercel.

### Installation

Ensure you install the `@upstash/vector` peer dependency alongside the main package:

```bash
npm install @upstash/vector @tekbreed/tekmemo
```

### Usage

```ts
import { createUpstashRecallStore } from "@tekbreed/tekmemo";

const store = createUpstashRecallStore({
  url: process.env.UPSTASH_VECTOR_REST_URL,
  token: process.env.UPSTASH_VECTOR_REST_TOKEN,
  namespace: "my-project-production" // Optional
});

// Search for relevant memory
const results = await store.query({
  query: "How do I configure the CLI?",
  limit: 5,
  includeMetadata: true
});

console.log(`Found ${results.items.length} relevant fragments.`);
```

## Features

- **Namespace Isolation:** Supports multi-tenant or multi-project setups using Upstash namespaces.
- **Filter Builder:** Provides a structured DSL for filtering recall results by tags, kinds, or custom metadata.
- **Metadata Normalization:** Automatically handles the conversion between TekMemo's memory model and Upstash's vector metadata format.
- **Zero-Dependency Transport:** Uses standard `fetch` for communication, making it compatible with all modern JavaScript runtimes.

## Use when

Use the Upstash adapter when you need a hosted, zero-maintenance vector store for project memory that scales with your application.
