# TekMemo — Expanded OSS Package List

_Created: 2026-05-04_

## 1. Purpose

This document updates the TekMemo package map to include:

- vector recall provider abstraction
- additional vector recall provider adapters
- reranking provider abstraction
- reranking provider adapters
- BYOK policy
- open-source boundary
- release sequencing

The package system should remain useful to external developers, not only TekMemo Cloud.

That means the OSS package line must be:

- provider-neutral where possible
- adapter-driven
- BYOK-friendly
- testable with fake clients
- usable without TekMemo Cloud
- cleanly separated from billing and tenant enforcement


---

# Current architecture note

The package map is now centered around the canonical local memory protocol:

```txt
.tekmemo/
  manifest.json
  memory/core.md
  memory/notes.md
  events/memory-events.jsonl
  events/conversations.jsonl
  indexes/chunks.jsonl
  graph/nodes.jsonl
  graph/edges.jsonl
  snapshots/snapshots.jsonl
```

`@tekbreed/tekmemo` owns this protocol.
`@tekbreed/tekmemo/fs` implements it for the local filesystem.
Provider packages must not invent their own file layout.

---

# 2. Final package groups

## Group A — Core memory runtime

| Package | OSS? | BYOK? | Purpose |
|---|---:|---:|---|
| `@tekbreed/tekmemo` | Yes | No | Core memory contracts, `.tekmemo/` standard, memory records, memory operations, chunk/source contracts |
| `@tekbreed/tekmemo/fs` | Yes | No | Local filesystem memory store |
| `@tekbreed/tekmemo/agentfs` | Yes | Config-based | AgentFS/Turso AgentFS-backed memory store and sync hooks |
| `@tekbreed/tekmemo/ai-sdk` | Yes | No | AI SDK tool definitions and memory tool bridge |

---



---

## Group A2 — AI runtime integrations

| Package | OSS? | BYOK? | Purpose |
|---|---:|---:|---|
| `@tekbreed/tekmemo/ai-sdk` | Yes | No | Vercel AI SDK-compatible TekMemo tools |
| `@tekbreed/tekmemo-tanstack-ai` | Yes | No | TanStack AI-compatible TekMemo tools |

### Rule

Runtime integration packages translate TekMemo memory capabilities into a specific AI framework's tool format.

They must not own storage, billing, provider keys, cloud tenancy, or vector-provider routing.


## Group B — Embeddings

| Package | OSS? | BYOK? | Purpose |
|---|---:|---:|---|
| `@tekbreed/tekmemo-voyage` | Yes | Yes | Voyage embedding adapter |
| `@tekbreed/tekmemo/openai` | Yes | Yes | OpenAI embedding adapter |
| `@tekbreed/tekmemo-cohere-embed` | Later | Yes | Cohere embedding adapter if demand appears |
| `@tekbreed/tekmemo-jina-embed` | Later | Yes | Jina embedding adapter if demand appears |

### Recommendation
Implement and stabilize only these first:

```txt
@tekbreed/tekmemo-voyage
@tekbreed/tekmemo/openai
```

Do not add Cohere/Jina embeddings until the first 7 packages pass tests.

---

## Group C — Vector recall

| Package | OSS? | BYOK? | Purpose |
|---|---:|---:|---|
| `@tekbreed/tekmemo/recall` | Yes | No | Provider-neutral vector recall contracts |
| `@tekbreed/tekmemo-upstash` | Yes | Yes | Upstash Vector recall adapter |
| `@tekbreed/tekmemo-turso-vector` | Yes | Yes | Turso/libSQL vector recall adapter |
| `@tekbreed/tekmemo-qdrant` | Yes | Yes | Qdrant vector recall adapter |
| `@tekbreed/tekmemo-pinecone` | Yes | Yes | Pinecone vector recall adapter |
| `@tekbreed/tekmemo-chroma` | Later | Yes | Chroma recall adapter |
| `@tekbreed/tekmemo-lancedb` | Later | Yes | LanceDB recall adapter |
| `@tekbreed/tekmemo-weaviate` | Later | Yes | Weaviate recall adapter |
| `@tekbreed/tekmemo-milvus` | Later | Yes | Milvus/Zilliz recall adapter |

### Recommendation
Build in this order:

```txt
1. @tekbreed/tekmemo/recall
2. @tekbreed/tekmemo-upstash
3. @tekbreed/tekmemo-turso-vector
4. @tekbreed/tekmemo-qdrant
5. @tekbreed/tekmemo-pinecone
```

Defer:

```txt
@tekbreed/tekmemo-chroma
@tekbreed/tekmemo-lancedb
@tekbreed/tekmemo-weaviate
@tekbreed/tekmemo-milvus
```

until real user demand appears.

---

## Group D — Reranking

| Package | OSS? | BYOK? | Purpose |
|---|---:|---:|---|
| `@tekbreed/tekmemo/rerank` | Yes | No | Provider-neutral reranking contracts |
| `@tekbreed/tekmemo/rerank-voyage` | Yes | Yes | Voyage rerank adapter |
| `@tekbreed/tekmemo/rerank-cohere` | Yes | Yes | Cohere rerank adapter |
| `@tekbreed/tekmemo/rerank-jina` | Yes | Yes | Jina rerank adapter |

### Recommendation
Build first:

```txt
@tekbreed/tekmemo/rerank
@tekbreed/tekmemo/rerank-voyage
```

Add later:

```txt
@tekbreed/tekmemo/rerank-cohere
@tekbreed/tekmemo/rerank-jina
```

---

## Group E — Advanced memory and ingestion

| Package | OSS? | BYOK? | Purpose |
|---|---:|---:|---|
| `@tekbreed/tekmemo/graph` | Yes | No | Graph memory contracts and local graph expansion |
| `@tekbreed/tekmemo-connectors` | Yes | Provider-config | Connector framework, source manifests, cursors |
| `@tekbreed/tekmemo/mcp` | Yes | Config-based | MCP server exposing TekMemo tools |
| `@tekbreed/tekmemo/cli` | Yes | Config-based | Developer CLI for local memory, indexing, diagnostics |
| `@tekbreed/tekmemo-cloud-sync` | Yes/Partial | Token-based | Cloud sync client contracts, not full cloud backend |
| `@tekbreed/tekmemo-evals` | Yes | No | Evaluation utilities and recall quality checks |
| `@tekbreed/tekmemo/benchmark-kit` | Yes | Config-based | Benchmark runner and reproducible performance tests |
| `@tekbreed/tekmemo-observability` | Yes | Config-based | Telemetry hooks and event helpers |

---

## Group F — Internal cloud-only packages

These should stay closed source.

| Package | OSS? | Purpose |
|---|---:|---|
| `@tekbreed/tekmemo-cloud-tenancy` | No | Tenant routing, pooled/dedicated DB decisions |
| `@tekbreed/tekmemo-cloud-billing` | No | Plans, subscriptions, add-ons, billing state |
| `@tekbreed/tekmemo-cloud-usage` | No | Hosted usage enforcement, quota gates |
| `@tekbreed/tekmemo-cloud-api-keys` | No | Hosted encrypted BYOK and API key management |
| `@tekbreed/tekmemo-cloud-dashboard` | No | Cloud UI composition |
| `@tekbreed/tekmemo-cloud-admin` | No | Internal admin/support tooling |

### Important rule
The OSS adapters can support BYOK.

TekMemo Cloud’s encrypted BYOK storage, tenant routing, billing, usage enforcement, and dashboard should remain closed source.

---

# 3. Final expanded package list

## Public OSS packages

```txt
tekmemo
@tekbreed/tekmemo/fs
@tekbreed/tekmemo/agentfs
@tekbreed/tekmemo/ai-sdk

@tekbreed/tekmemo-voyage
@tekbreed/tekmemo/openai

@tekbreed/tekmemo/recall
@tekbreed/tekmemo-upstash
@tekbreed/tekmemo-turso-vector
@tekbreed/tekmemo-qdrant
@tekbreed/tekmemo-pinecone
@tekbreed/tekmemo-chroma
@tekbreed/tekmemo-lancedb
@tekbreed/tekmemo-weaviate
@tekbreed/tekmemo-milvus

@tekbreed/tekmemo/rerank
@tekbreed/tekmemo/rerank-voyage
@tekbreed/tekmemo/rerank-cohere
@tekbreed/tekmemo/rerank-jina

@tekbreed/tekmemo/graph
@tekbreed/tekmemo-connectors
@tekbreed/tekmemo/mcp
@tekbreed/tekmemo/cli
@tekbreed/tekmemo-cloud-sync
@tekbreed/tekmemo-evals
@tekbreed/tekmemo/benchmark-kit
@tekbreed/tekmemo-observability
```

## Closed-source cloud packages

```txt
@tekbreed/tekmemo-cloud-tenancy
@tekbreed/tekmemo-cloud-billing
@tekbreed/tekmemo-cloud-usage
@tekbreed/tekmemo-cloud-api-keys
@tekbreed/tekmemo-cloud-dashboard
@tekbreed/tekmemo-cloud-admin
```

---

# 4. Critical release focus

Do not attempt to implement every package before launch.

The first serious OSS release should include:

```txt
tekmemo
@tekbreed/tekmemo/fs
@tekbreed/tekmemo/ai-sdk
@tekbreed/tekmemo/agentfs
@tekbreed/tekmemo/recall
@tekbreed/tekmemo-upstash
@tekbreed/tekmemo-voyage-ai
@tekbreed/tekmemo/openai
@tekbreed/tekmemo/rerank
@tekbreed/tekmemo/rerank-voyage
```

The second release can add:

```txt
@tekbreed/tekmemo-turso-vector
@tekbreed/tekmemo-qdrant
@tekbreed/tekmemo/cli
@tekbreed/tekmemo/benchmark-kit
@tekbreed/tekmemo-evals
```

The third release can add:

```txt
@tekbreed/tekmemo-pinecone
@tekbreed/tekmemo/rerank-cohere
@tekbreed/tekmemo/rerank-jina
@tekbreed/tekmemo/mcp
@tekbreed/tekmemo-connectors
@tekbreed/tekmemo-observability
```

Everything else should wait until demand appears.
