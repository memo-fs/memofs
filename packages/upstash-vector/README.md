# `@tekmemo/upstash-vector`

[![npm](https://img.shields.io/npm/v/%40tekmemo%2Fupstash-vector?label=npm)](https://www.npmjs.com/package/@tekmemo/upstash-vector)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![Types](https://img.shields.io/badge/types-included-blue)](./dist/index.d.mts)
[![CI](https://github.com/tekbreed/tekmemo/actions/workflows/ci.yml/badge.svg)](https://github.com/tekbreed/tekmemo/actions/workflows/ci.yml)
[![Status](https://img.shields.io/badge/status-active-brightgreen)](../../README.md)

Production-ready Upstash Vector adapter for TekMemo recall.

This package implements the provider-neutral `RecallStore` contract from `@tekmemo/recall`.

It is intentionally **not** the owner of TekMemo recall contracts. The contract lives in:

```txt
@tekmemo/recall
```

This package only translates that contract into Upstash Vector operations.

The production target is the official `@upstash/vector` SDK. The adapter also accepts a minimal compatible index shape so tests and dependency-injected hosts can use fakes.

---

## Installation

```bash
pnpm add @tekmemo/upstash-vector @tekmemo/recall @upstash/vector
```

---

## Basic usage

```ts
import { Index } from "@upstash/vector";
import { createUpstashRecallStore } from "@tekmemo/upstash-vector";

const index = new Index({
  url: process.env.UPSTASH_VECTOR_REST_URL!,
  token: process.env.UPSTASH_VECTOR_REST_TOKEN!
});

const recall = createUpstashRecallStore(index, {
  environment: "prod",
  tenantId: "ten_123",
  projectId: "proj_123",
  dimension: 1024
});

await recall.upsert([
  {
    id: "chunk_123",
    text: "TekMemo uses file-first memory.",
    embedding: [0.1, 0.2, 0.3],
    metadata: {
      tenantId: "ten_123",
      projectId: "proj_123",
      sourceType: "document",
      sourceId: "core",
      memoryType: "core",
      sourcePath: ".tekmemo/memory/core.md"
    }
  }
]);

const results = await recall.query({
  embedding: [0.1, 0.2, 0.3],
  topK: 5,
  filter: {
    memoryType: "core"
  }
});
```

---

## Namespace strategy

By default, namespaces are generated as:

```txt
tekmemo-<environment>-<tenantId>-<projectId>
```

Examples:

```ts
createUpstashRecallStore(index, {
  environment: "prod",
  tenantId: "ten_123",
  projectId: "proj_123"
});
```

produces:

```txt
tekmemo-prod-ten_123-proj_123
```

You can also pass an explicit namespace:

```ts
createUpstashRecallStore(index, {
  namespace: "tenant/proj"
});
```

---

## BYOK support

This package is BYOK-ready.

The host app supplies the Upstash client or credentials. This package never stores secrets.

In TekMemo Cloud:

- the closed-source cloud layer should decrypt and inject user-owned credentials
- this package should only receive a configured Upstash-compatible index instance

---

## Delete by source

Upstash Vector does not expose a universal provider-neutral “delete all vectors by metadata” contract in this package.

So `deleteBySource` requires a source-to-chunk resolver:

```ts
const recall = createUpstashRecallStore(index, {
  environment: "prod",
  resolveChunkIdsBySource: async ({ projectId, sourceType, sourceId }) => {
    return chunkRegistry.findIdsBySource({ projectId, sourceType, sourceId });
  }
});
```

This matches TekMemo’s architecture: the chunk registry should know which chunks came from each `.tekmemo/` source.

---

## Edge cases handled

- invalid Upstash client shape
- unsafe namespaces
- unsafe tenant/project IDs
- invalid batch sizes
- invalid dimensions
- missing embeddings
- NaN / Infinity embeddings via `@tekmemo/recall`
- duplicate document IDs in a batch
- document-level namespace grouping
- provider upsert failures
- provider query failures
- provider delete failures
- non-array query responses
- unsafe delete IDs
- delete deduplication
- delete batching
- `deleteBySource` without resolver
- source resolver failures
- metadata normalization
- reserved metadata keys
- filter escaping
- required tenant/project isolation filters

---

## Testing

```bash
pnpm --filter @tekmemo/upstash-vector typecheck
pnpm --filter @tekmemo/upstash-vector test:run
pnpm --filter @tekmemo/upstash-vector build
```
