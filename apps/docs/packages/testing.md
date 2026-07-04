# Testing Framework (`@tekmemo/testing`)

`@tekmemo/testing` provides a shared framework containing contract tests, fakes, fixtures, and assertion helpers to ensure all custom or provider-specific adapters (embedders, rerankers, stores) satisfy TekMemo's runtime specifications.

---

## Installation

Install the testing utilities as a development dependency:

```bash
npm install -D @tekmemo/testing
```

---

## Package Subpaths

The package exposes specialized entry points:

| Import Path | Purpose |
|---|---|
| `@tekmemo/testing/contracts` | Automated test suites validating adapter API conformance. |
| `@tekmemo/testing/fakes` | Zero-dependency mock implementations for unit testing. |
| `@tekmemo/testing/fixtures` | Standardized mock datasets (vectors, text chunks, documents). |

---

## 1. Running Contract Tests

Contract tests ensure that a custom adapter implementation behaves identically to built-in adapters.

### Example: Testing a Custom Embedder

Create a test file in your adapter package (e.g. `vitest.config.ts` powered):

```ts
import { describe } from "vitest";
import { embedderContractTests } from "@tekmemo/testing/contracts";
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
import { createFakeEmbedder } from "@tekmemo/testing/fakes";

const embedder = createFakeEmbedder({
  dimensions: 1536,
  latencyMs: 5, // Simulate network delay
  deterministic: true, // Same text always results in same mock vector
});

const [vector] = await embedder.embed(["hello world"]);
console.log(vector.length); // 1536
```
