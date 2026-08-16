---
title: "@memofs/testing"
description: "Shared contract tests, in-memory fakes, fixtures, and Vitest presets for MemoFS packages and custom adapters."
---

# Testing Framework (`@memofs/testing`)

`@memofs/testing` is the official testing toolkit for MemoFS. It provides **reusable contract test suites**, **zero-dependency in-memory fakes**, **standardized test fixtures**, and **assertion helpers** to verify that custom storage, embedder, reranker, and LLM adapters conform to MemoFS runtime specifications.

## Installation

Install `@memofs/testing` as a development dependency alongside Vitest:

::: code-group

```sh [pnpm]
pnpm add -D @memofs/testing vitest
```

```sh [npm]
npm install -D @memofs/testing vitest
```

```sh [yarn]
yarn add -D @memofs/testing vitest
```

```sh [bun]
bun add -d @memofs/testing vitest
```
:::

> [!NOTE]
> Requires **Node.js >= 22** and **Vitest ^4.1.5**.

## Subpath Exports

`@memofs/testing` provides specialized subpath exports tailored for different testing needs:

| Import Subpath | Description |
|---|---|
| **`@memofs/testing`** | Root entry point re-exporting all contracts, fakes, fixtures, assertions, and minimal contract types. |
| **`@memofs/testing/contracts`** | Ready-to-run contract test suites for verifying adapter conformance with Vitest. |
| **`@memofs/testing/fakes`** | In-memory, zero-dependency mock classes and factory functions for fast unit tests. |
| **`@memofs/testing/fixtures`** | Standardized sample datasets (memory documents, embeddings, recall queries, graph triples). |
| **`@memofs/testing/vitest`** | Pre-configured `createVitestConfig()` helper for uniform test environment setups. |

## 1. Running Contract Tests (`@memofs/testing/contracts`)

Contract tests verify that a custom provider or storage adapter conforms to the exact expectations of the MemoFS runtime (parameter handling, return shapes, sorting, mutation safety, and error handling).

### Available Contract Suites

| Test Suite Function | Target Contract | Key Invariants Verified |
|---|---|---|
| `defineEmbedderContractTests` | `MinimalEmbedder` | Vector dimensions, empty input handling, query vs document input types, non-mutation of inputs. |
| `defineRerankerContractTests` | `MinimalReranker` | Stable descending rank assignment, non-mutation of input documents, topK truncation, empty document arrays. |
| `defineRecallStoreContractTests` | `MinimalRecallStore` | Vector similarity ranking, metadata filtering (`projectId`, `workspaceId`), document upserts, empty queries. |
| `defineMemoryStoreContractTests` | `MinimalMemoryStore` | Read/write roundtrips, sequential appending, file existence checks, missing file behaviors. |
| `defineBlobClientContractTests` | `MinimalBlobClient` | Binary and text put/get/delete, list prefixing, etag validation. |
| `defineMetadataStoreContractTests` | `MinimalMetadataStore` | SQL/NoSQL transactional metadata operations, key-value lookups, index queries. |
| `defineExtractorContractTests` | `MinimalExtractor` | Entity and relation triple extraction, contradiction handling, confidence ranges. |
| `defineLlmClientContractTests` | `MinimalLlmClient` | Text generation, defensive JSON schema parsing, system prompt forwarding. |

### Example: Testing a Custom Embedder Adapter

Create a test file in your adapter workspace (e.g. `tests/embedder.test.ts`):

```ts
import { describe } from "vitest";
import { defineEmbedderContractTests } from "@memofs/testing/contracts";
import { createCustomEmbedder } from "../src/index";

defineEmbedderContractTests({
  name: "CustomVoyageEmbedder",
  expectedDimensions: 1024,
  createEmbedder: () => {
    return createCustomEmbedder({
      apiKey: process.env.VOYAGE_API_KEY ?? "test-key",
      model: "voyage-3",
    });
  },
});
```

### Example: Testing a Custom Memory Store

```ts
import { describe } from "vitest";
import { defineMemoryStoreContractTests } from "@memofs/testing/contracts";
import { createCustomSqliteStore } from "../src/index";

defineMemoryStoreContractTests({
  name: "SqliteMemoryStore",
  missingReadBehavior: "throw",
  createStore: async () => {
    return createCustomSqliteStore({ dbPath: ":memory:" });
  },
  cleanup: async () => {
    // Optional teardown after all tests finish
  },
});
```

## 2. In-Memory Fakes (`@memofs/testing/fakes`)

Fakes allow you to write fast, deterministic unit tests without making live network requests or touching disk files:

```ts
import {
  createFakeEmbedder,
  createFakeReranker,
  createFakeMemoryStore,
  createFakeRecallStore,
  createFakeLlmClient,
  createFakeExtractor,
} from "@memofs/testing/fakes";
```

### Fake Embedder (`FakeEmbedder`)

Generates deterministic mock vectors and records all invocation parameters for test assertions:

```ts
import { createFakeEmbedder } from "@memofs/testing/fakes";

const embedder = createFakeEmbedder({ dimensions: 1536 });

const result = await embedder.embedTexts({
  texts: ["User prefers dark mode", "Postgres is used for auth"],
  inputType: "document",
});

console.log(result.embeddings[0].embedding.length); // 1536
console.log(embedder.calls); // Inspect recorded calls
```

### Fake Memory Store (`FakeMemoryStore`)

Simulates `.memofs/` storage entirely in an in-memory `Map`:

```ts
import { createFakeMemoryStore } from "@memofs/testing/fakes";

const store = createFakeMemoryStore();

await store.write(".memofs/memory/core.md", "# Project Rules\n");
await store.append(".memofs/memory/core.md", "- Strict TypeScript\n");

const content = await store.read(".memofs/memory/core.md");
console.log(content); // "# Project Rules\n- Strict TypeScript\n"

const snapshot = store.snapshot();
console.log(Object.keys(snapshot)); // [".memofs/memory/core.md"]
```

### Fake LLM Client (`FakeLlmClient`)

Returns deterministic responses and captures completed prompts:

```ts
import { createFakeLlmClient } from "@memofs/testing/fakes";

const llm = createFakeLlmClient({
  resolveText: (input) => `Mock summary for: ${input.user}`,
});

const completion = await llm.complete({
  user: "Summarize this sprint's decisions",
  system: "You are an assistant",
});

console.log(completion.text); // "Mock summary for: Summarize this sprint's decisions"
console.log(llm.calls.length); // 1
```

## 3. Standard Test Fixtures (`@memofs/testing/fixtures`)

Fixtures provide realistic, pre-computed test data:

```ts
import {
  // Embedding fixtures
  createVector,
  EMBEDDING_TEXTS_FIXTURE,
  // Memory documents
  CORE_MEMORY_FIXTURE,
  MEMORY_FIXTURE_PATHS,
  // Recall documents
  createRecallDocumentsFixture,
  // Reranking fixtures
  createRerankDocumentsFixture,
  // Knowledge graph fixtures
  createDuplicateNodesFixture,
  createSupersededEdgesFixture,
} from "@memofs/testing/fixtures";

// Generate a deterministic 1536-dimensional unit vector
const vector = createVector(1536, 42);

// Standard memory paths
console.log(MEMORY_FIXTURE_PATHS.core);  // ".memofs/memory/core.md"
console.log(MEMORY_FIXTURE_PATHS.notes); // ".memofs/memory/notes.md"
```

## 4. Assertion Helpers (`@memofs/testing`)

Built-in assertions for common validation patterns:

```ts
import {
  expectFiniteNumber,
  expectVector,
  expectSortedDescending,
  expectNoMutation,
  cloneForMutationCheck,
} from "@memofs/testing";

// Asserts a number is finite and non-NaN
expectFiniteNumber(score);

// Asserts an array of numbers has the expected length and finite floats
expectVector(embedding, 1536);

// Asserts an array of scores is sorted in strictly descending order
expectSortedDescending([0.95, 0.82, 0.41, 0.12]);

// Verifies that a function did not mutate input arguments
const original = cloneForMutationCheck(inputObject);
mutateCheckTarget(inputObject);
expectNoMutation(original, inputObject);
```

## 5. Vitest Configuration Preset (`@memofs/testing/vitest`)

Standardize test runner configuration across packages:

```ts
// vitest.config.ts
import { createVitestConfig } from "@memofs/testing/vitest";

export default createVitestConfig({
  test: {
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
    },
  },
});
```
