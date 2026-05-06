# `@tekmemo/recall`

[![npm](https://img.shields.io/npm/v/%40tekmemo%2Frecall?label=npm)](https://www.npmjs.com/package/@tekmemo/recall)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![Types](https://img.shields.io/badge/types-included-blue)](./dist/index.d.mts)
[![CI](https://github.com/tekbreed/tekmemo/actions/workflows/ci.yml/badge.svg)](https://github.com/tekbreed/tekmemo/actions/workflows/ci.yml)
[![Status](https://img.shields.io/badge/status-active-brightgreen)](../../README.md)

Provider-neutral vector recall contracts, validation helpers, scoring utilities, filter matching, and an in-memory test implementation for TekMemo.

This package does **not** talk to Upstash, Turso, Qdrant, Pinecone, Chroma, LanceDB, Weaviate, or Milvus directly.

Those provider-specific packages should implement the `RecallStore` interface exported here.

## Why this package exists

TekMemo is file-first. Local memory lives in `.tekmemo/`, but recall providers can vary.

The recall flow is:

```txt
.tekmemo memory files
  -> chunk records
  -> embeddings
  -> RecallStore implementation
  -> recall query results
  -> optional reranking
```

`@tekmemo/recall` defines the provider-neutral contract for that recall layer.

## Install

```bash
pnpm add @tekmemo/recall
```

## Core API

```ts
import type { RecallStore, RecallDocument, RecallQuery } from "@tekmemo/recall";
```

### `RecallStore`

```ts
export interface RecallStore {
  upsert(documents: RecallDocument[]): Promise<void>;
  query(query: RecallQuery): Promise<RecallResult[]>;
  delete(ids: string[], options?: { namespace?: string }): Promise<void>;
  deleteBySource(input: DeleteBySourceInput): Promise<void>;
}
```

## In-memory store

Use the in-memory store for local tests, examples, and adapter contract tests.

```ts
import { createInMemoryRecallStore } from "@tekmemo/recall";

const store = createInMemoryRecallStore({
  duplicateDocumentIdBehavior: "last-write-wins"
});

await store.upsert([
  {
    id: "chunk_1",
    text: "TekMemo uses local .tekmemo memory files.",
    embedding: [1, 0, 0],
    metadata: {
      projectId: "proj_1",
      sourceType: "document",
      sourceId: "core",
      memoryType: "core"
    }
  }
]);

const results = await store.query({
  embedding: [1, 0, 0],
  topK: 5,
  filter: {
    projectId: "proj_1"
  }
});
```

## Namespaces

Use namespaces to isolate tenants/projects in providers that support namespaces.

```ts
import { createProjectNamespace } from "@tekmemo/recall";

const namespace = createProjectNamespace({
  tenantId: "ten_1",
  projectId: "proj_1"
});
```

## Filters

The neutral filter format supports:

- exact values
- `$eq`
- `$ne`
- `$in`
- `$nin`
- `$gt`
- `$gte`
- `$lt`
- `$lte`
- `$exists`
- `$contains`

Provider adapters should map this neutral shape to the provider's native filter syntax.

## Production behavior

This package handles:

- invalid embeddings
- dimension mismatches
- invalid `topK`
- unsafe IDs
- unsafe namespaces
- non-JSON metadata
- circular metadata
- unsupported filter operators
- deterministic sorting
- namespace isolation
- metadata filtering
- duplicate document IDs
- deletion by ID
- deletion by source

## Package boundary

This package must not own:

- embedding providers
- vector provider SDKs
- reranking providers
- cloud billing
- cloud tenancy
- BYOK secret storage

Provider packages should depend on this package and implement `RecallStore`.
