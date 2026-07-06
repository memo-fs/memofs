# `@memofs/testing`

<p align="center">
  <a href="https://www.npmjs.com/package/@memofs/testing"><img src="https://img.shields.io/npm/v/%40memofs%2Ftesting?label=%40memofs%2Ftesting&style=for-the-badge" alt="npm version" /></a> &nbsp;
  <a href="https://github.com/christophersesugh/memofs"><img src="https://img.shields.io/badge/status-alpha-orange?style=for-the-badge" alt="Status: Alpha" /></a> &nbsp;
  <a href="https://www.npmjs.com/package/@memofs/testing"><img src="https://img.shields.io/npm/dm/%40memofs%2Ftesting?style=for-the-badge" alt="npm downloads" /></a> &nbsp;
  <a href="https://github.com/christophersesugh/memofs/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/christophersesugh/memofs/ci.yml?branch=main&style=for-the-badge&label=CI" alt="CI" /></a> &nbsp;
  <a href="https://docs.memo.memofs.dev/"><img src="https://img.shields.io/badge/docs-online-blue?style=for-the-badge" alt="Docs" /></a> &nbsp;
  <a href="https://github.com/christophersesugh/memofs/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg?style=for-the-badge" alt="MIT License" /></a>
</p>

Shared contract tests, fixtures, and fakes for Memo FS packages.

## What is this?

**Shared contract tests, fixtures, and fakes for Memo FS packages.** Ensures all provider adapters (embedders, rerankers, recall stores, memory stores) satisfy Memo FS's core contracts with consistent behavior.

## Installation

```bash
npm install -D @memofs/testing
```

You also need `vitest` and `@memofs` as peer dependencies.

## What's Included

| Entrypoint | Purpose |
|------------|---------|
| `@memofs/testing/contracts` | Shared contract test suites |
| `@memofs/testing/fakes` | Fake implementations for testing |
| `@memofs/testing/fixtures` | Test data fixtures |
| `@memofs/testing/vitest` | Vitest-specific utilities |

## Quick Start

### Contract Tests for Embedder

```ts
import { describe } from "vitest";
import { embedderContractTests } from "@memofs/testing/contracts";
import { createOpenAIEmbedder } from "@memofs/adapter-openai";

// Define your adapter under test
const target = () => createOpenAIEmbedder({
 apiKey: process.env.OPENAI_API_KEY!,
 model: "text-embedding-3-large",
});

// Run the contract suite — ensures your embedder satisfies the contract
describe("OpenAI Embedder Contract", () => {
 embedderContractTests(target);
});
```

### Contract Tests for Recall Store

```ts
import { describe } from "vitest";
import { recallStoreContractTests } from "@memofs/testing/contracts";
import { createInMemoryRecallStore } from "@memofs";

const target = () => createInMemoryRecallStore();

describe("In-Memory Recall Store Contract", () => {
 recallStoreContractTests(target, {
 requiresEmbedder: true,
 supportsBatching: true,
 supportsMetadataFiltering: true,
 });
});
```

### Contract Tests for Reranker

```ts
import { describe } from "vitest";
import { rerankerContractTests } from "@memofs/testing/contracts";
import { createVoyageReranker } from "@memofs/adapter-voyage";

const target = () => createVoyageReranker({
 apiKey: process.env.VOYAGE_API_KEY!,
 model: "rerank-2",
});

describe("Voyage Reranker Contract", () => {
 rerankerContractTests(target);
});
```

### Contract Tests for Memory Store

```ts
import { describe } from "vitest";
import { memoryStoreContractTests } from "@memofs/testing/contracts";
import { createNodeFsMemoryStore } from "@memofs";

describe("NodeFs Memory Store Contract", () => {
 memoryStoreContractTests(() => createNodeFsMemoryStore({ rootDir: ".test" }));
});
```

## Fake Implementations

Pre-built fakes for unit testing without external API dependencies:

### Fake Embedder

```ts
import { createFakeEmbedder } from "@memofs/testing/fakes";

const embedder = createFakeEmbedder({
 dimensions: 1536,
 latencyMs: 5, // Simulated delay per call
 deterministic: true, // Same output for same input
});

const result = await embedder.embed(["hello"]);
// FakeEmbedder tracks all calls: embedder.calls
```

### Fake Reranker

```ts
import { createFakeReranker } from "@memofs/testing/fakes";

const reranker = createFakeReranker({
 scores: [0.95, 0.8, 0.6, 0.4, 0.2], // Scores mapped by index
 latencyMs: 10,
});
```

### Fake Recall Store

```ts
import { createFakeRecallStore } from "@memofs/testing/fakes";

const recallStore = createFakeRecallStore();

await recallStore.upsert([...items]);
const results = await recallStore.query({ query: "test", topK: 5 });

// Inspect state: recallStore.documents, recallStore.queryHistory
```

### Fake Memory Store

```ts
import { createFakeMemoryStore } from "@memofs/testing/fakes";

const store = createFakeMemoryStore({
 records: { "mem-1": { content: "Hello", metadata: {} } },
});

const record = await store.read("mem-1");
await store.write("mem-2", { content: "World" });
```

## Fixtures

Pre-configured test data for consistent testing:

```ts
import {
 embeddingFixtures,
 rerankFixtures,
 recallFixtures,
 memoryFixtures,
} from "@memofs/testing/fixtures";

// Embedding fixtures
const { singleText, batchTexts, expectedDimensions } = embeddingFixtures;

// Reranking fixtures
const { query, documents, expectedTopK } = rerankFixtures;

// Recall fixtures
const { upsertDocuments, queryText, filterCondition } = recallFixtures;

// Memory fixtures
const { record, manifest } = memoryFixtures;
```

## Assertion Helpers

Domain-specific assertions for adapter testing:

```ts
import {
 expectVector,
 expectSortedDescending,
 expectFiniteNumber,
 expectNoMutation,
 cloneForMutationCheck,
} from "@memofs/testing";

// Verify embedding vector shape
expectVector(embedding, { dimensions: 1024 });

// Verify results are sorted by score descending
expectSortedDescending(results, (r) => r.score);

// Verify a number is finite (not NaN, Infinity)
expectFiniteNumber(latencyMs);

// Verify a function does not mutate its input
const cloned = cloneForMutationCheck(input);
await processData(cloned);
expectNoMutation(input, cloned);
```

## Vitest Integration

Setup vitest custom matchers and lifecycle hooks:

```ts
// In vitest.setup.ts
import "@memofs/testing/vitest";
```

This registers custom timeout handling and integration test helpers for vitest.

## Contract Test Configuration

Each contract test suite accepts options to tune which tests run:

```ts
export interface EmbedderContractOptions {
 expectedDimensions?: number;
 supportsBatching?: boolean;
 skipTests?: string[]; // Test names to skip
 timeout?: number; // Per-test timeout
}

export interface RecallStoreContractOptions {
 requiresEmbedder?: boolean;
 supportsBatching?: boolean;
 supportsMetadataFiltering?: boolean;
 supportsNamespacePartitioning?: boolean;
 skipTests?: string[];
 timeout?: number;
}

export interface RerankerContractOptions {
 supportsTopK?: boolean;
 topK?: number;
 skipTests?: string[];
 timeout?: number;
}

export interface MemoryStoreContractOptions {
 skipTests?: string[];
 timeout?: number;
}
```

## Using in Adapter Package Tests

Complete test file pattern for an adapter package:

```ts
// packages/my-adapter/src/embedder/my-embedder.test.ts
import { describe, it, expect } from "vitest";
import { embedderContractTests } from "@memofs/testing/contracts";
import { createFakeEmbedder } from "@memofs/testing/fakes";
import { embeddingFixtures } from "@memofs/testing/fixtures";
import { createMyEmbedder } from "./my-embedder";

// Contract compliance
describe("My Embedder Contract", () => {
 embedderContractTests(() => createMyEmbedder({ apiKey: "test" }));
});

// Unit tests with fakes
describe("My Embedder Consumer", () => {
 it("batches requests correctly", async () => {
 const fake = createFakeEmbedder({ dimensions: 1024 });
 const consumer = new MyConsumer(fake);
 // ...test consumer logic using fakes
 });
});
```

## Boundary

This package owns contract test suites, fake implementations, fixtures, assertion helpers, and vitest integration utilities. It does not own the Memo FS core contracts themselves, specific provider adapter implementations, or the testing framework infrastructure.

## Contributing

See our central [Contributing Guide](../../CONTRIBUTING.md) and development scripts for details on formatting, linting, and testing within the monorepo.

## License

MIT
