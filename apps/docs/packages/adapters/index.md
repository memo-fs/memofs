# Adapters Overview

Memo FS is designed to be completely provider-neutral. The core memory runtime does not bundle or lock you into any specific LLM provider, vector database, or cloud host. Instead, you inject **adapters** to upgrade storage and intelligence capabilities.

---

## Adapter Types

Adapters are divided into two axes: **Storage** (managing raw files and metadata indexes) and **Intelligence** (managing embeddings, reranking, and graph extraction).

```
memofs/
├── Storage Axis
│   ├── Blob Stores (R2)
│   └── Metadata Stores (Turso)
└── Intelligence Axis
    ├── Embedders (OpenAI, Voyage AI, Transformers.js)
    ├── Rerankers (Voyage AI)
    ├── Extractors (Workers AI)
    └── Agent Bridges (Vercel AI SDK)
```

---

## Available Adapters

### Storage Axis
- **`@memofs/adapter-r2`**: Connects raw file storage (AgentFS) to a Cloudflare R2 bucket.
- **`@memofs/adapter-turso`**: Connects knowledge graph queries and search metadata to Turso / libSQL databases.

### Intelligence Axis
- **`@memofs/adapter-openai`**: Vector embeddings using OpenAI's `text-embedding-3` models.
- **`@memofs/adapter-voyage`**: High-performance semantic embeddings and reranking using Voyage AI models.
- **`@memofs/adapter-transformers`**: Runs vector embeddings completely locally using ONNX and Transformers.js.
- **`@memofs/adapter-workers-ai`**: Extracts entity-relationship graphs from memories using serverless Llama models on Cloudflare.
- **`@memofs/adapter-ai-sdk`**: Runtime bridges and tool definitions for the Vercel AI SDK framework.
