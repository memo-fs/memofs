# Benchmark Kit (`@tekmemo/benchmark-kit`)

`@tekmemo/benchmark-kit` is a reusable testing framework that provides benchmarks, runners, statistical analysis, and markdown reporters to measure the throughput, latency, and quality of TekMemo adapters.

---

## Installation

```bash
npm install @tekmemo/benchmark-kit
```

---

## Core Components

### 1. `BenchmarkSuite`
Groups benchmarks under test. Each benchmark corresponds to a target (such as an embedder or reranker) and a list of workload tasks.

```ts
import { BenchmarkSuite } from "@tekmemo/benchmark-kit";

const suite = new BenchmarkSuite("embedder-benchmarks")
  .setIterations(5);
```

### 2. `BenchmarkRunner`
Orchestrates execution of the workloads, handles warmup iterations, and aggregates latencies.

```ts
import { BenchmarkRunner } from "@tekmemo/benchmark-kit";

const runner = new BenchmarkRunner({
  warmupIterations: 1,
  timeout: 60000,
});
const results = await runner.runSuite(suite);
```

### 3. Built-In Workloads
Provides preset workloads for common TekMemo interfaces:
- `createEmbedderWorkloads(embedder)`: Measures vector computing performance.
- `createRerankWorkloads(reranker)`: Measures reranking performance.
- `createRecallWorkloads(recallStore)`: Measures upsert and query latency.
- `createMemoryStoreWorkloads(memoryStore)`: Measures file read/write throughput.

---

## Complete Example

Compare the latency of OpenAI vs. Voyage AI embedders:

```ts
import { BenchmarkSuite, BenchmarkRunner, MarkdownReporter } from "@tekmemo/benchmark-kit";
import { createEmbedderWorkloads } from "@tekmemo/benchmark-kit/workloads";
import { createOpenAIEmbedder } from "@tekmemo/adapter-openai";
import { createVoyageEmbedder } from "@tekmemo/adapter-voyage";

// 1. Initialize targets
const targets = {
  openai: createOpenAIEmbedder({ model: "text-embedding-3-small" }),
  voyage: createVoyageEmbedder({ model: "voyage-3" }),
};

// 2. Build suite
const suite = new BenchmarkSuite("embedder-comparison");
for (const [name, embedder] of Object.entries(targets)) {
  suite.benchmark(name, createEmbedderWorkloads(embedder));
}

// 3. Run and Report
const runner = new BenchmarkRunner();
const results = await runner.runSuite(suite);

await MarkdownReporter.report(results, {
  outputPath: "./benchmarks/embedder-results.md",
});
```
