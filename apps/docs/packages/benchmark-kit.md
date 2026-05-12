# `@tekmemo/benchmark-kit`

A benchmarking toolkit for measuring the performance and quality of TekMemo memory operations.

## Install

```bash
npm install -D @tekmemo/benchmark-kit
```

## How it works

The benchmark kit provides a structured way to measure latency, throughput, and accuracy across different components of the TekMemo stack. Use it to:

- **Compare Embedders:** Measure the latency and accuracy of OpenAI vs VoyageAI for your specific data.
- **Test Recall Quality:** Quantify how well your retrieval pipeline finds relevant context.
- **Measure Store Performance:** Profile the speed of local filesystem vs cloud API operations.
- **Set Thresholds:** Define "budget" limits for latency or pass rates in your CI pipeline.

## API Reference

### `BenchmarkRunner`

The primary class for executing benchmark cases.

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

## Example usage

```ts
import { BenchmarkRunner, createRecallQueryBenchmarkCase } from "@tekmemo/benchmark-kit";
import { createVoyageEmbedder } from "@tekmemo/voyageai";
import { createInMemoryRecallStore } from "@tekmemo/recall";

const embedder = createVoyageEmbedder({ apiKey: process.env.VOYAGE_API_KEY });
const store = createInMemoryRecallStore();
const runner = new BenchmarkRunner();

// Define a benchmark case for semantic search
const recallCase = createRecallQueryBenchmarkCase({
  name: "Voyage Recall Performance",
  store,
  embedder,
  queries: ["How do I handle sync conflicts?"],
  expectedIds: ["doc_sync_policy"]
});

// Run 5 iterations to get averaged stats
const result = await runner.runCase(recallCase, { iterations: 5 });

console.log(`Pass Rate: ${result.stats.passRate * 100}%`);
console.log(`Avg Latency: ${result.stats.avgLatencyMs}ms`);
console.log(`P95 Latency: ${result.stats.p95LatencyMs}ms`);
```

*(Note: The benchmark kit is intended for developer tooling, evaluation harnesses, and CI/CD pipelines. It should not be included in production application bundles.)*
