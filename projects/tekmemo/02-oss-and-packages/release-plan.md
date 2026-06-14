# TekMemo — Expanded Package Release Plan

## 1. Goal

Do not release every package at once.

Release in layers.

Each layer should produce a usable system.

The first release must prove the local-first story:

```txt
.tekmemo/ files
  -> local memory operations
  -> event log
  -> chunk registry
  -> optional recall/rerank
```

---

# 2. Release 0 — Stabilize local protocol and first stores

## Packages

```txt
tekmemo
@tekbreed/tekmemo/fs
```

## Goal

Make the `.tekmemo/` local protocol production-grade.

## Exit criteria

- `@tekbreed/tekmemo` owns canonical `.tekmemo/` constants
- `@tekbreed/tekmemo` bootstraps full protocol layout
- `@tekbreed/tekmemo` handles manifest, events, conversations, chunk records, snapshots
- `@tekbreed/tekmemo/fs` safely reads/writes `.tekmemo/`
- unit tests cover path safety, JSONL, chunking, snapshots, atomic writes, and symlinks
- docs explain local protocol clearly

---

# 3. Release 1 — AI SDK and AgentFS integration

## Packages

```txt
@tekbreed/tekmemo/ai-sdk
@tekbreed/tekmemo/agentfs
```

## Goal

Make TekMemo usable from agents and syncable file-backed environments.

## Exit criteria

- AI SDK tools use the core memory protocol
- AgentFS store passes memory store contract tests
- no provider-specific logic leaks into core

---

# 4. Release 2 — Embeddings and default recall

## Packages

```txt
@tekbreed/tekmemo-voyage
@tekbreed/tekmemo/openai
@tekbreed/tekmemo/recall
@tekbreed/tekmemo-upstash
```

## Goal

Index `.tekmemo/` memory into recall providers.

## Exit criteria

- `@tekbreed/tekmemo/recall` defines provider-neutral contracts
- `@tekbreed/tekmemo-upstash` implements `RecallStore`
- Voyage/OpenAI embedders pass contract tests
- chunk registry maps source to indexed chunks

---

# 5. Release 3 — Reranking

## Packages

```txt
@tekbreed/tekmemo/rerank
@tekbreed/tekmemo/rerank-voyage
```

## Goal

Improve recall quality after vector candidate retrieval.

## Exit criteria

- provider-neutral reranker contract exists
- Voyage reranker works with BYOK
- recall -> rerank flow works end-to-end

---

# 6. Release 4 — Turso and Qdrant recall

## Packages

```txt
@tekbreed/tekmemo-turso-vector
@tekbreed/tekmemo-qdrant
```

## Goal

Support your stack and OSS/self-host users better.

---

# 7. Release 5 — Production provider expansion

## Packages

```txt
@tekbreed/tekmemo-pinecone
@tekbreed/tekmemo/rerank-cohere
@tekbreed/tekmemo/rerank-jina
```

## Goal

Support production teams and provider preference.

---

# 8. Release 6 — Developer workflow and proof

## Packages

```txt
@tekbreed/tekmemo/cli
@tekbreed/tekmemo/benchmark-kit
@tekbreed/tekmemo-evals
@tekbreed/tekmemo-observability
```

## Goal

Make TekMemo easier to inspect, test, benchmark, and trust.

---

# 9. Release 7 — Advanced workflows

## Packages

```txt
@tekbreed/tekmemo/graph
@tekbreed/tekmemo-connectors
@tekbreed/tekmemo/mcp
@tekbreed/tekmemo-cloud-sync
```

## Goal

Expand memory workflows after the core loop is stable.


---

# Runtime integration expansion — TanStack AI

## Package

```txt
@tekbreed/tekmemo-tanstack-ai
```

## Goal

Support TanStack AI's `toolDefinition()` architecture without coupling the core runtime to TanStack AI.

## Exit criteria

- package exposes `createTekMemoTanStackTools`
- package accepts `toolDefinition` from the host app
- package exposes read/write/append/event/search memory tools
- mutation tools require approval by default
- only allowlisted `.tekmemo/` paths can be read/written
- tests cover invalid tool factory, invalid runtime, unsafe paths, mutation limits, search availability, and metadata safety

