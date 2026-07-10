# Testing Framework (`@memofs/testing`)

`@memofs/testing` provides a shared framework containing contract tests, fakes, fixtures, and assertion helpers to ensure all custom or provider-specific adapters (embedders, rerankers, stores) satisfy MemoFS's runtime specifications.

---

## Installation

Install the testing utilities as a development dependency:

::: code-group

```sh [npm]
npm install -D @memofs/testing
```

```sh [pnpm]
pnpm add -D @memofs/testing
```

```sh [yarn]
yarn add -D @memofs/testing
```

```sh [bun]
bun add -d @memofs/testing
```

:::

> [!NOTE]
> Requires **Node.js >= 22**.

---

## Package Subpaths

The package exposes specialized entry points:

| Import Path | Purpose |
|---|---|
| `@memofs/testing/contracts` | Automated test suites validating adapter API conformance. |
| `@memofs/testing/fakes` | Zero-dependency mock implementations for unit testing. |
| `@memofs/testing/fixtures` | Standardized mock datasets (vectors, text chunks, documents). |

---

## 1. Running Contract Tests

Contract tests ensure that a custom adapter implementation behaves identically to built-in adapters.

### Example: Testing a Custom Embedder

Create a test file in your adapter package (e.g. `vitest.config.ts` powered):

```ts
import { describe } from "vitest";
import { embedderContractTests } from "@memofs/testing/contracts";
import { createCustomEmbedder } from "./my-embedder";

describe("Custom Embedder Contract Compliance", () => {
  embedderContractTests(() => createCustomEmbedder({
    apiKey: "test-key",
  }));
});
```

Supported contract test suites:
- `embedderContractTests`
- `rerankerContractTests`
- `recallStoreContractTests`
- `memoryStoreContractTests`

---

## 2. Using Fakes in Unit Tests

Fakes allow you to test your application logic without calling external model providers or writing files to disk.

### Example: Mocking vector generation

```ts
import { createFakeEmbedder } from "@memofs/testing/fakes";

const embedder = createFakeEmbedder({
  dimensions: 1536,
  latencyMs: 5, // Simulate network delay
  deterministic: true, // Same text always results in same mock vector
});

const [vector] = await embedder.embed(["hello world"]);
console.log(vector.length); // 1536
```
