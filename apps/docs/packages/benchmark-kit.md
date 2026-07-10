# Benchmark Kit (`@memofs/benchmark-kit`)

`@memofs/benchmark-kit` is a reusable testing framework that provides benchmarks, runners, statistical analysis, and markdown reporters to measure the throughput, latency, and quality of MemoFS adapters.

---

## Installation

::: code-group

```sh [npm]
npm install -D @memofs/benchmark-kit
```

```sh [pnpm]
pnpm add -D @memofs/benchmark-kit
```

```sh [yarn]
yarn add -D @memofs/benchmark-kit
```

```sh [bun]
bun add -d @memofs/benchmark-kit
```

:::

> [!NOTE]
> Requires **Node.js >= 22**.

---

## Core Components

### 1. `BenchmarkSuite`
Groups benchmarks under test. Each benchmark corresponds to a target (such as an embedder or reranker) and a list of workload tasks.

```ts
import { BenchmarkSuite } from "@memofs/benchmark-kit";

const suite = new BenchmarkSuite("embedder-benchmarks")
  .setIterations(5);
```

### 2. `BenchmarkRunner`
Orchestrates execution of the workloads, handles warmup iterations, and aggregates latencies.

```ts
import { BenchmarkRunner } from "@memofs/benchmark-kit";

const runner = new BenchmarkRunner({
  warmupIterations: 1,
  timeout: 60000,
});
const results = await runner.runSuite(suite);
```

### 3. Built-In Workloads
Provides preset workloads for common MemoFS interfaces:
- `createEmbedderWorkloads(embedder)`: Measures vector computing performance.
- `createRerankWorkloads(reranker)`: Measures reranking performance.
- `createRecallWorkloads(recallStore)`: Measures upsert and query latency.
- `createMemoryStoreWorkloads(memoryStore)`: Measures file read/write throughput.

---

## Complete Example

Compare the latency of OpenAI vs. Voyage AI embedders:

```ts
import { BenchmarkSuite, BenchmarkRunner, MarkdownReporter } from "@memofs/benchmark-kit";
import { createEmbedderWorkloads } from "@memofs/benchmark-kit/workloads";
import { createOpenAIEmbedder } from "@memofs/adapter-openai";
import { createVoyageEmbedder } from "@memofs/adapter-voyage";

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
