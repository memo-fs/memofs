# `@memofs/benchmark-kit`

<p align="center">
  <a href="https://www.npmjs.com/package/@memofs/benchmark-kit"><img src="https://img.shields.io/npm/v/%40memofs%2Fbenchmark-kit?label=%40memofs%2Fbenchmark-kit&style=for-the-badge" alt="npm version" /></a> &nbsp;
  <a href="https://github.com/christophersesugh/memofs"><img src="https://img.shields.io/badge/status-alpha-orange?style=for-the-badge" alt="Status: Alpha" /></a> &nbsp;
  <a href="https://www.npmjs.com/package/@memofs/benchmark-kit"><img src="https://img.shields.io/npm/dm/%40memofs%2Fbenchmark-kit?style=for-the-badge" alt="npm downloads" /></a> &nbsp;
  <a href="https://github.com/christophersesugh/memofs/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/christophersesugh/memofs/ci.yml?branch=main&style=for-the-badge&label=CI" alt="CI" /></a> &nbsp;
  <a href="https://docs.memo.memofs.dev/"><img src="https://img.shields.io/badge/docs-online-blue?style=for-the-badge" alt="Docs" /></a> &nbsp;
  <a href="https://github.com/christophersesugh/memofs/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg?style=for-the-badge" alt="MIT License" /></a>
</p>

Reusable benchmark workloads, runners, and reporters for Memo FS.

## What is this?

**Benchmark kit, workloads, and runners for Memo FS.** Provides a standardized framework for measuring the performance of embedders, rerankers, memory stores, and recall stores across different providers and adapters.

## Installation

```bash
npm install @memofs/benchmark-kit
```

## Quick Start

```ts
import { BenchmarkSuite, BenchmarkRunner } from "@memofs/benchmark-kit";
import { createEmbedderWorkloads } from "@memofs/benchmark-kit/workloads";

const suite = new BenchmarkSuite("embedder-comparison");

const openaiEmbedder = createOpenAIEmbedder({ apiKey: "...", model: "text-embedding-3-large" });
const voyageEmbedder = createVoyageEmbedder({ apiKey: "...", model: "voyage-3-large" });

suite
 .benchmark("openai-text-embedding-3-large", createEmbedderWorkloads(openaiEmbedder))
 .benchmark("voyage-voyage-3-large", createEmbedderWorkloads(voyageEmbedder));

const runner = new BenchmarkRunner();
const results = await runner.runSuite(suite);
```

## Core Components

### BenchmarkSuite

A `BenchmarkSuite` groups related benchmarks together. Each benchmark maps to a named target (embedder, reranker, store) with workloads to execute.

```ts
import { BenchmarkSuite } from "@memofs/benchmark-kit";

const suite = new BenchmarkSuite("my-suite")
 .benchmark("target-a", [...workloads])
 .benchmark("target-b", [...workloads])
 .setIterations(10);
```

### BenchmarkRunner

The runner executes all benchmark workloads and collects results. It handles warmup, timing, and error aggregation.

```ts
import { BenchmarkRunner } from "@memofs/benchmark-kit";

const runner = new BenchmarkRunner({
 iterations: 10,
 warmupIterations: 2,
 timeout: 60000,
});

const results = await runner.runSuite(suite);
```

### Built-in Workloads

Pre-built workloads for common Memo FS operations:

- **`createEmbedderWorkloads(embedder)`** — Measures embedding latency and throughput
- **`createRerankWorkloads(reranker)`** — Measures reranking latency and quality
- **`createRecallWorkloads(recallStore)`** — Measures upsert and query latency
- **`createMemoryStoreWorkloads(memoryStore)`** — Measures read/write throughput

```ts
import {
 createEmbedderWorkloads,
 createRerankWorkloads,
 createRecallWorkloads,
 createMemoryStoreWorkloads,
} from "@memofs/benchmark-kit/workloads";
```

### Statistics

Built-in statistical analysis for benchmark results:

```ts
import { Stats } from "@memofs/benchmark-kit";

const stats = Stats.fromLatencies([15.2, 14.8, 16.1, 15.5, 15.9]);

console.log(stats.mean); // ~15.5ms
console.log(stats.p50); // 15.5ms
console.log(stats.p95); // 16.1ms
console.log(stats.p99); // 16.1ms
console.log(stats.stdDev); // ~0.5ms
```

### Thresholds

Define pass/fail criteria for benchmarks:

```ts
import { Threshold } from "@memofs/benchmark-kit";

const thresholds = [
 Threshold.latency("p50", { max: 50 }), // p50 under 50ms
 Threshold.latency("p95", { max: 200 }), // p95 under 200ms
 Threshold.throughput({ min: 100 }), // at least 100 ops/sec
 Threshold.errorRate({ max: 0.01 }), // under 1% errors
];
```

### Reporters

Output results in multiple formats:

```ts
import { JSONReporter, MarkdownReporter } from "@memofs/benchmark-kit";

const jsonReport = JSONReporter.report(results);
const mdReport = await MarkdownReporter.report(results, {
 includeCharts: true,
 outputPath: "./benchmarks/results.md",
});
```

## Custom Workloads

```ts
import { defineWorkload } from "@memofs/benchmark-kit/workloads";

const myWorkload = defineWorkload({
 name: "custom-load",
 setup: async ({ target }) => {
 // Prepare test data
 },
 run: async ({ target, state }) => {
 // Execute the operation to measure
 const start = performance.now();
 await target.someOperation(state.data);
 return performance.now() - start;
 },
 teardown: async ({ target, state }) => {
 // Clean up
 },
});
```

## Seeded Random

Deterministic data generation for reproducible benchmarks:

```ts
import { SeededRandom } from "@memofs/benchmark-kit";

const rng = new SeededRandom(42);
const texts = rng.sample(textCorpus, 100); // Always the same 100 texts
```

## Full Example

```ts
import { BenchmarkSuite, BenchmarkRunner, MarkdownReporter } from "@memofs/benchmark-kit";
import { createEmbedderWorkloads } from "@memofs/benchmark-kit/workloads";
import { createOpenAIEmbedder } from "@memofs/adapter-openai";
import { createVoyageEmbedder } from "@memofs/adapter-voyage";

const embedders = {
 openai: createOpenAIEmbedder({ apiKey: process.env.OPENAI_API_KEY!, model: "text-embedding-3-large" }),
 voyage: createVoyageEmbedder({ apiKey: process.env.VOYAGE_API_KEY!, model: "voyage-3-large" }),
};

const suite = new BenchmarkSuite("embedder-benchmarks")
 .setIterations(5);

for (const [name, embedder] of Object.entries(embedders)) {
 suite.benchmark(name, createEmbedderWorkloads(embedder));
}

const runner = new BenchmarkRunner({
 warmupIterations: 1,
 timeout: 120000,
});

const results = await runner.runSuite(suite);
const report = await MarkdownReporter.report(results, {
 outputPath: "./benchmarks/embedder-results.md",
});

console.log(report);
```

## Boundary

This package owns the benchmark framework, workloads, runners, statistics, threshold validators, and reporters. It does not own the provider adapters being benchmarked, Memo FS core contracts, or CI/CD infrastructure.

## Contributing

See our central [Contributing Guide](../../CONTRIBUTING.md) and development scripts for details on formatting, linting, and testing within the monorepo.

## License

MIT
