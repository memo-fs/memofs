---
title: "@memofs/benchmark-kit"
description: "Benchmarking framework, statistical analysis, preset workload factories, and markdown reporters for MemoFS."
---

# Benchmark Kit (`@memofs/benchmark-kit`)

`@memofs/benchmark-kit` is a specialized performance benchmarking and profiling framework for MemoFS. It provides **reusable workload factories**, an **iterative test runner with warmup cycles and concurrency controls**, **rigorous statistical aggregation (percentiles, throughput, error rates)**, **SLA threshold gates**, and **Markdown/JSON reporters**.

## Installation

Install `@memofs/benchmark-kit` as a development dependency:

::: code-group

```sh [pnpm]
pnpm add -D @memofs/benchmark-kit
```

```sh [npm]
npm install -D @memofs/benchmark-kit
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

## Subpath Exports

`@memofs/benchmark-kit` is split into three modular subpaths:

| Subpath | Description |
|---|---|
| **`@memofs/benchmark-kit`** | Root entry point containing `BenchmarkRunner`, `createBenchmarkSuite`, statistical engine, threshold validators, clock abstractions, and reporters. |
| **`@memofs/benchmark-kit/workloads`** | Preset workload factories for embedders, rerankers, recall vector stores, and filesystem stores. |
| **`@memofs/benchmark-kit/fakes`** | Re-exported in-memory fake adapters for baseline benchmarking calibration. |

## Core Architecture

```
┌────────────────────────────────────────────────────────┐
│                     BenchmarkSuite                     │
│               (Named collection of cases)              │
├────────────────────────────────────────────────────────┤
│  BenchmarkCase 1        BenchmarkCase 2       ...      │
│  • warmupIterations     • iterations                   │
│  • concurrency          • timeoutMs                    │
│  • setup / teardown     • run / validate               │
├────────────────────────────────────────────────────────┤
│                     BenchmarkRunner                    │
│  • Concurrency scheduler • Clock measurement (now)     │
│  • Warmup execution      • Error capture & stats       │
├────────────────────────────────────────────────────────┤
│                  BenchmarkSuiteResult                  │
│  • Min / Max / Mean / Median / P50 / P90 / P95 / P99   │
│  • Error rate & Throughput/sec                         │
├────────────────────────────────────────────────────────┤
│               Reporters & Threshold Gates              │
│  • markdownBenchmarkReport   • jsonBenchmarkReport     │
│  • evaluateBenchmarkThresholds (CI/CD Quality Gates)   │
└────────────────────────────────────────────────────────┘
```

## 1. Defining Benchmark Cases & Suites

A `BenchmarkCase` encapsulates an operation to measure over a configurable number of iterations:

```ts
import {
  createBenchmarkSuite,
  type BenchmarkCase,
  type BenchmarkSuite,
} from "@memofs/benchmark-kit";

// Define a benchmark case
const memoryWriteCase: BenchmarkCase = {
  name: "memory-store/write",
  description: "Measures 10KB memory write operations",
  iterations: 50,
  warmupIterations: 5,
  concurrency: 2,
  timeoutMs: 5000,
  run: async (ctx) => {
    // Operation under measurement
    await store.write(`.memofs/tmp/test-${ctx.iteration}.md`, payload);
  },
};

// Create a validated suite
const suite: BenchmarkSuite = createBenchmarkSuite({
  name: "storage-benchmarks",
  description: "I/O performance across storage backends",
  cases: [memoryWriteCase],
});
```

## 2. Executing Suites (`BenchmarkRunner`)

`BenchmarkRunner` orchestrates warmup runs, concurrent workers, timeout tracking, and latency collection:

```ts
import { BenchmarkRunner } from "@memofs/benchmark-kit";

const runner = new BenchmarkRunner({
  failFast: false,       // Continue running remaining cases if one fails
  captureErrors: true,   // Record error details instead of crashing
});

const suiteResult = await runner.runSuite(suite);

console.log(`Completed in ${suiteResult.totalDurationMs.toFixed(2)}ms`);
for (const caseResult of suiteResult.cases) {
  console.log(`[${caseResult.name}] Mean: ${caseResult.stats.meanMs.toFixed(2)}ms, P95: ${caseResult.stats.p95Ms.toFixed(2)}ms`);
}
```

## 3. Built-In Workload Factories (`@memofs/benchmark-kit/workloads`)

Pre-built workloads let you benchmark custom adapters in one line:

```ts
import {
  createEmbedderWorkloads,
  createRerankWorkloads,
  createRecallWorkloads,
  createMemoryStoreWorkloads,
} from "@memofs/benchmark-kit/workloads";
```

### Embedder Workload (`createEmbedderWorkloads`)

Measures batch and single-text vector computation latency:

```ts
import { createEmbedderWorkloads } from "@memofs/benchmark-kit/workloads";

const embedderCase = createEmbedderWorkloads({
  name: "openai-text-3-small",
  embedder: myOpenAiEmbedder,
  texts: ["What is the primary architecture of MemoFS?", "How does drift detection work?"],
  iterations: 30,
  warmupIterations: 3,
  concurrency: 2,
});
```

### Reranker Workload (`createRerankWorkloads`)

Measures document scoring and rank-ordering throughput:

```ts
import { createRerankWorkloads } from "@memofs/benchmark-kit/workloads";

const rerankCase = createRerankWorkloads({
  name: "cohere-rerank-v3",
  reranker: myCohereReranker,
  query: "How to configure cloud file replication",
  documents: [
    { id: "doc-1", text: "Cloud sync uses two-phase push with sha256." },
    { id: "doc-2", text: "Embeddings are calculated locally via ONNX." },
    { id: "doc-3", text: "Graph consolidation retires superseded facts." },
  ],
  topK: 2,
  iterations: 25,
  warmupIterations: 2,
});
```

### Recall Store Workload (`createRecallWorkloads`)

Generates both upsert and top-K vector query benchmark cases:

```ts
import { createRecallWorkloads } from "@memofs/benchmark-kit/workloads";

const { upsert: upsertCase, query: queryCase } = createRecallWorkloads({
  name: "turso-vector-store",
  store: myTursoRecallStore,
  documents: [
    { id: "chunk-1", text: "Doc 1", embedding: [0.1, 0.2, 0.3], metadata: { type: "core" } },
    { id: "chunk-2", text: "Doc 2", embedding: [0.4, 0.5, 0.6], metadata: { type: "notes" } },
  ],
  query: {
    embedding: [0.1, 0.2, 0.3],
    topK: 5,
    filter: { type: "core" },
  },
  iterations: 40,
  warmupIterations: 5,
});
```

### Memory Store Workload (`createMemoryStoreWorkloads`)

Generates both write and read throughput benchmark cases:

```ts
import { createMemoryStoreWorkloads } from "@memofs/benchmark-kit/workloads";

const { write: writeCase, read: readCase } = createMemoryStoreWorkloads({
  name: "r2-memory-store",
  store: myR2Store,
  path: ".memofs/memory/notes.md",
  writePayload: "# Long-term memory notes\n...".repeat(50),
  readPayload: "# Long-term memory notes\n...".repeat(50),
  iterations: 50,
  warmupIterations: 5,
});
```

## 4. Statistical Metrics (`BenchmarkCaseStats`)

For every benchmark case, the kit computes comprehensive statistical metrics:

| Metric | Property | Description |
|---|---|---|
| **Sample Count** | `stats.count` | Total number of measured iterations (excluding warmups). |
| **Successes / Failures** | `stats.successes`, `stats.failures` | Number of successful and failed iterations. |
| **Error Rate** | `stats.errorRate` | Ratio of failed iterations (`failures / count`). |
| **Minimum / Maximum** | `stats.minMs`, `stats.maxMs` | Fastest and slowest measured iteration duration. |
| **Mean (Average)** | `stats.meanMs` | Arithmetic mean iteration duration. |
| **Median (P50)** | `stats.medianMs` / `stats.p50Ms` | 50th percentile (half of requests were faster). |
| **P90 / P95 / P99** | `stats.p90Ms`, `stats.p95Ms`, `stats.p99Ms` | 90th, 95th, and 99th tail latency percentiles. |
| **Throughput** | `stats.throughputPerSecond` | Completed operations per second (`count / totalDurationSec`). |

## 5. Automated SLA Thresholds & CI/CD Gates

Enforce latency SLAs and prevent performance regressions in CI pipelines using `evaluateBenchmarkThresholds`:

```ts
import { evaluateBenchmarkThresholds, type BenchmarkThresholds } from "@memofs/benchmark-kit";

// Define strict SLAs
const thresholds: BenchmarkThresholds = {
  maxMeanMs: 50,                  // Mean duration must be <= 50ms
  maxP95Ms: 120,                  // 95% of calls must finish under 120ms
  maxP99Ms: 200,                  // 99% of calls must finish under 200ms
  maxErrorRate: 0.01,             // Error rate must not exceed 1%
  minThroughputPerSecond: 20,     // Must process at least 20 ops/sec
};

const evaluation = evaluateBenchmarkThresholds(suiteResult, thresholds);

if (!evaluation.ok) {
  console.error("❌ Performance regression detected!");
  for (const failure of evaluation.failures) {
    console.error(`- ${failure.caseName} failed ${failure.metric}: expected ${failure.expected}, got ${failure.actual}`);
  }
  process.exit(1);
} else {
  console.log("✅ All performance thresholds satisfied.");
}
```

## 6. Generating Reports

### Markdown Table Report (`markdownBenchmarkReport`)

Generates a formatted Markdown report table suitable for GitHub Actions step summaries, PR comments, or documentation:

```ts
import * as fs from "node:fs/promises";
import { markdownBenchmarkReport } from "@memofs/benchmark-kit";

const report = markdownBenchmarkReport(suiteResult);
console.log(report);

await fs.writeFile("./benchmark-results.md", report, "utf-8");
```

Example output:

```markdown
# Benchmark: storage-benchmarks

- Started: 2026-08-16T00:00:00.000Z
- Completed: 2026-08-16T00:00:02.500Z
- Total duration: 2500.00ms

| Case | Iterations | Success | Error rate | Mean | P50 | P95 | P99 | Throughput/sec |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| memory-store/write | 50 | 50 | 0.00% | 12.40ms | 10.80ms | 22.10ms | 35.00ms | 80.65 |
| memory-store/read | 50 | 50 | 0.00% | 4.20ms | 3.90ms | 6.50ms | 8.20ms | 238.10 |
```

### JSON Report (`jsonBenchmarkReport`)

Serializes raw results and iteration logs for long-term historical tracking:

```ts
import * as fs from "node:fs/promises";
import { jsonBenchmarkReport } from "@memofs/benchmark-kit";

const jsonOutput = jsonBenchmarkReport(suiteResult, 2);
await fs.writeFile("./benchmark-results.json", jsonOutput, "utf-8");
```

## Complete End-to-End Example

```ts
import {
  BenchmarkRunner,
  createBenchmarkSuite,
  markdownBenchmarkReport,
  evaluateBenchmarkThresholds,
} from "@memofs/benchmark-kit";
import {
  createEmbedderWorkloads,
  createRecallWorkloads,
} from "@memofs/benchmark-kit/workloads";
import { createFakeEmbedder, createFakeRecallStore } from "@memofs/testing/fakes";

// 1. Initialize targets
const embedder = createFakeEmbedder({ dimensions: 768 });
const store = createFakeRecallStore();

// 2. Build benchmark cases
const embedderCase = createEmbedderWorkloads({
  name: "embedder/batch",
  embedder,
  texts: ["Chunk A", "Chunk B", "Chunk C"],
  iterations: 20,
  warmupIterations: 2,
});

const { upsert: upsertCase, query: queryCase } = createRecallWorkloads({
  name: "recall/store",
  store,
  documents: [
    { id: "1", text: "A", embedding: [0.1, 0.2, 0.3], metadata: {} },
  ],
  query: { embedding: [0.1, 0.2, 0.3], topK: 3 },
  iterations: 20,
  warmupIterations: 2,
});

// 3. Assemble and run suite
const suite = createBenchmarkSuite({
  name: "adapter-performance-suite",
  cases: [embedderCase, upsertCase, queryCase],
});

const runner = new BenchmarkRunner();
const results = await runner.runSuite(suite);

// 4. Generate report and check thresholds
console.log(markdownBenchmarkReport(results));

const evaluation = evaluateBenchmarkThresholds(results, {
  maxP95Ms: 100,
  maxErrorRate: 0.0,
});

if (!evaluation.ok) {
  throw new Error("Benchmark SLA violated.");
}
```
