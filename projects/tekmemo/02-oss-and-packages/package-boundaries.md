# TekMemo — Package Boundaries and Responsibilities

## 1. Core rule

Every package must answer three questions:

1. What does it own?
2. What must it not own?
3. What edge cases must it handle?

This prevents TekMemo from becoming a tangled framework.

---

# 2. Canonical local memory boundary

The canonical local protocol is:

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

Only the `@tekbreed/tekmemo` core package owns this protocol.

All storage adapters must implement it.

No package should invent another local memory root.

---

# 3. Provider-neutral core packages

## `@tekbreed/tekmemo`

### Owns

- `.tekmemo/` protocol constants
- manifest types and validation
- core memory types
- memory operation helpers
- memory event types
- conversation record types
- source manifest types
- chunk record types
- snapshot record types
- provider-neutral contracts
- in-memory test store

### Must not own

- filesystem implementation
- AgentFS implementation
- cloud billing
- provider API calls
- vector database calls
- model provider calls
- hosted BYOK storage

### Required tests

- full `.tekmemo/` bootstrap
- manifest validation
- core memory read/update
- notes append/read
- conversations append/read
- memory events append/read
- malformed JSONL handling
- chunk registry operations
- snapshot record operations
- invalid paths rejected
- safe errors

---

## `@tekbreed/tekmemo/fs`

### Owns

- Node.js filesystem persistence for `.tekmemo/`
- safe root normalization
- safe canonical path resolution
- directory creation
- atomic writes
- append serialization
- symlink policy
- missing-file behavior

### Must not own

- protocol design
- embeddings
- vector recall
- reranking
- cloud sync
- billing

### Required tests

- root validation
- canonical path resolution
- traversal rejection
- null byte rejection
- unsupported path rejection
- missing file strict/empty modes
- atomic writes
- concurrent appends
- symlink rejection
- integration with `@tekbreed/tekmemo` bootstrap

---

## `@tekbreed/tekmemo/recall`

### Owns

- vector recall contracts
- recall document shape
- recall query shape
- recall result shape
- filter abstraction
- namespace abstraction
- adapter contract tests

### Must not own

- Upstash specifics
- Turso specifics
- Qdrant specifics
- embeddings
- reranking
- billing

---

## `@tekbreed/tekmemo/rerank`

### Owns

- reranking contracts
- input validation
- deterministic fallback reranker
- adapter contract tests
- score normalization contract

### Must not own

- Voyage API calls
- Cohere API calls
- Jina API calls
- vector search
- embedding generation

---

# 4. Provider adapters

Provider adapters must do only provider-specific translation.

They should not invent product policy.

Examples:

- `@tekbreed/tekmemo-upstash` maps `RecallStore` to Upstash Vector.
- `@tekbreed/tekmemo-turso-vector` maps `RecallStore` to Turso vector tables.
- `@tekbreed/tekmemo/rerank-voyage` maps `Reranker` to Voyage rerank API.
- `@tekbreed/tekmemo/openai` maps `MemoryEmbedder` to OpenAI embeddings.

---

# 5. BYOK-sensitive packages

Provider adapters should accept credentials from the host app.

```ts
new ProviderAdapter({
  apiKey: process.env.PROVIDER_API_KEY
});
```

or cloud-managed BYOK:

```ts
new ProviderAdapter({
  apiKey: decryptedUserProviderKey
});
```

Provider packages should never store secrets themselves.

TekMemo Cloud may store encrypted BYOK secrets, but that belongs to closed-source cloud infrastructure.
