# Benchmark Kit Module

The benchmark kit is built directly into `@tekbreed/tekmemo` for measuring the performance and quality of TekMemo memory operations.

## Installation

```bash
npm install -D @tekbreed/tekmemo
```

## Import

```ts
import {
  BenchmarkRunner,
  createEmbedderBenchmarkCase,
  createRecallQueryBenchmarkCase,
  createRerankBenchmarkCase,
  createMemoryReadBenchmarkCase,
} from "@tekbreed/tekmemo";
```

## How it works

The benchmark kit provides a structured way to measure latency, throughput, and accuracy across different components of the TekMemo stack. Use it to:

- **Compare Embedders:** Measure the latency and accuracy of OpenAI vs VoyageAI for your specific data.
- **Test Recall Quality:** Quantify how well your retrieval pipeline finds relevant context.
- **Measure Store Performance:** Profile the speed of local filesystem vs cloud API operations.
- **Set Thresholds:** Define "budget" limits for latency or pass rates in your CI pipeline.

## Quick start with Tekmemo

You can use a [`Tekmemo`](./tekmemo) client's store and embedder directly with the benchmark kit:

```ts
import { Tekmemo } from "@tekbreed/tekmemo";
import {
  BenchmarkRunner,
  createRecallQueryBenchmarkCase,
} from "@tekbreed/tekmemo";

const memo = new Tekmemo({ rootDir: "./.tekmemo", projectId: "my-app" });
const runner = new BenchmarkRunner();

const recallCase = createRecallQueryBenchmarkCase({
  name: "Local Recall Performance",
  store: memo.store,
  embedder: memo.embedder!,
  queries: ["How do I handle sync conflicts?"],
  expectedIds: ["doc_sync_policy"],
});

const result = await runner.runCase(recallCase, { iterations: 5 });
console.log(`Pass Rate: ${result.stats.passRate * 100}%`);
console.log(`Avg Latency: ${result.stats.avgLatencyMs}ms`);
```

## API Reference

### `BenchmarkRunner`

| Method | Purpose |
| --- | --- |
| `runner.runCase(case, options)` | Runs a single benchmark case with multiple iterations. |
| `runner.runSuite(suite, options)` | Runs a collection of related benchmark cases. |

### Workload Generators

| Helper | Purpose |
| --- | --- |
| `createEmbedderBenchmarkCase()` | Measures the performance of an embedding provider. |
| `createRecallQueryBenchmarkCase()` | Measures the accuracy and speed of memory retrieval. |
| `createRerankBenchmarkCase()` | Measures the impact and latency of a reranking model. |
| `createMemoryReadBenchmarkCase()` | Measures the read speed of a `MemoryStore`. |

*(Note: The benchmark kit is intended for developer tooling, evaluation harnesses, and CI/CD pipelines. It should not be included in production application bundles.)*
