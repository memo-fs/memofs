# TekMemo — Vector Recall Package Plan

## 1. Why vector recall needs its own package

The current `@tekbreed/tekmemo-upstash` package should not be the source of truth for recall contracts.

Upstash is only one implementation.

TekMemo needs a provider-neutral recall interface:

```txt
@tekbreed/tekmemo/recall
```

Then each vector backend implements it.

---

# 2. Required package: `@tekbreed/tekmemo/recall`

## Purpose
Provider-neutral vector recall contracts.

## Exports

```ts
export interface RecallDocument {
  id: string;
  text: string;
  embedding: number[];
  metadata: RecallMetadata;
}

export interface RecallMetadata {
  tenantId?: string;
  projectId: string;
  sourceType: string;
  sourceId: string;
  memoryType: string;
  sectionName?: string;
  [key: string]: unknown;
}

export interface RecallQuery {
  embedding: number[];
  topK: number;
  filter?: Record<string, unknown>;
  namespace?: string;
}

export interface RecallResult {
  id: string;
  text?: string;
  score: number;
  metadata?: Record<string, unknown>;
}

export interface DeleteBySourceInput {
  projectId: string;
  sourceType: string;
  sourceId: string;
}

export interface RecallStore {
  upsert(documents: RecallDocument[]): Promise<void>;
  query(query: RecallQuery): Promise<RecallResult[]>;
  delete(ids: string[]): Promise<void>;
  deleteBySource(input: DeleteBySourceInput): Promise<void>;
}
```

## Must include
- validation helpers
- filter normalization helpers
- namespace helpers
- contract test suite for adapters
- fake in-memory recall store for tests

---

# 3. Provider packages

## `@tekbreed/tekmemo-upstash`

### Role
Default cloud beta vector recall adapter.

### Must support
- upsert
- query
- metadata filters
- namespace
- delete by IDs
- delete by source with chunk registry support

### Edge cases
- empty docs
- missing embeddings
- invalid topK
- provider timeout
- provider rate limit
- metadata too large
- unsafe namespace
- stale source deletion

---

## `@tekbreed/tekmemo-turso-vector`

### Role
Second vector recall provider.

### Why
Turso is already part of TekMemo Cloud.
This package gives a simple “memory + vectors in Turso” option for lower-volume projects and self-hosting.

### Must support
- vector table schema helpers
- upsert
- query
- project filtering
- source deletion
- optional ANN strategy where supported
- exact fallback where needed

### Edge cases
- wrong embedding dimension
- no vector index
- slow query fallback
- pooled tenant filtering
- project isolation
- missing vector table

---

## `@tekbreed/tekmemo-qdrant`

### Role
Primary serious OSS/self-host vector DB adapter.

### Must support
- collection creation helper
- upsert points
- search with filters
- payload metadata
- delete by ID
- delete by source
- local/self-host and cloud URL modes

### Edge cases
- missing collection
- dimension mismatch
- invalid payload
- API key missing
- network failure
- filter mismatch

---

## `@tekbreed/tekmemo-pinecone`

### Role
Production managed provider adapter.

### Must support
- index/namespace selection
- upsert
- query
- metadata filters
- delete by ID
- delete by source where supported

### Edge cases
- missing namespace
- dimension mismatch
- rate limit
- provider unavailable
- metadata filter differences

---

## Later providers

### `@tekbreed/tekmemo-chroma`
Good for local/dev-friendly vector workflows.

### `@tekbreed/tekmemo-lancedb`
Good for local/object-storage/lakehouse-style retrieval.

### `@tekbreed/tekmemo-weaviate`
Good for hybrid search and teams already using Weaviate.

### `@tekbreed/tekmemo-milvus`
Good for large-scale self-hosted vector infrastructure.

---

# 4. Implementation order

```txt
1. @tekbreed/tekmemo/recall
2. update @tekbreed/tekmemo-upstash to implement RecallStore
3. @tekbreed/tekmemo-turso-vector
4. @tekbreed/tekmemo-qdrant
5. @tekbreed/tekmemo-pinecone
6. later local/enterprise providers
```

---

# 5. Cloud beta recommendation

TekMemo Cloud beta should use:

```txt
@tekbreed/tekmemo/recall
@tekbreed/tekmemo-upstash
```

Do not expose vector provider selection in the first beta UI.

Keep provider routing internal until the product is stable.
