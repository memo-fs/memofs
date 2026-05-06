# `@tekmemo/benchmark-kit`

[![npm](https://img.shields.io/npm/v/%40tekmemo%2Fbenchmark-kit?label=npm)](https://www.npmjs.com/package/@tekmemo/benchmark-kit)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![Types](https://img.shields.io/badge/types-included-blue)](./dist/index.d.mts)
[![CI](https://github.com/tekbreed/tekmemo/actions/workflows/ci.yml/badge.svg)](https://github.com/tekbreed/tekmemo/actions/workflows/ci.yml)
[![Status](https://img.shields.io/badge/status-experimental-yellow)](../../README.md)

Provider-neutral benchmarking toolkit for TekMemo packages and adapters.

This package helps benchmark:

- memory stores
- embedder adapters
- recall stores
- rerankers
- package-level workflows
- future provider adapters

It does **not** own production product behavior. It only measures it.

## Install

```bash
pnpm add -D @tekmemo/benchmark-kit
```

## Basic usage

```ts
import {
  BenchmarkRunner,
  createBenchmarkSuite,
  markdownBenchmarkReport
} from "@tekmemo/benchmark-kit";

const suite = createBenchmarkSuite({
  name: "local-memory",
  cases: [
    {
      name: "write-core-memory",
      iterations: 100,
      warmupIterations: 10,
      async run() {
        await store.write("memory/core.md", "# Core Memory");
      }
    }
  ]
});

const runner = new BenchmarkRunner();
const result = await runner.runSuite(suite);

console.log(markdownBenchmarkReport(result));
```

## Recall benchmark

```ts
import { createRecallQueryBenchmarkCase } from "@tekmemo/benchmark-kit";

const benchmarkCase = createRecallQueryBenchmarkCase({
  name: "upstash-query-top-10",
  store,
  query,
  iterations: 100,
  warmupIterations: 10
});
```

## Thresholds

```ts
import { evaluateBenchmarkThresholds } from "@tekmemo/benchmark-kit";

const verdict = evaluateBenchmarkThresholds(result, {
  maxP95Ms: 200,
  maxErrorRate: 0.01
});
```

## Package boundary

This package owns:

- benchmark runner
- latency measurement
- throughput calculation
- error-rate calculation
- threshold evaluation
- JSON/Markdown reporters
- fake targets for tests
- provider-neutral benchmark helpers

It does not own:

- `.tekmemo/` protocol
- vector recall implementation
- embeddings implementation
- reranking implementation
- cloud quotas
- billing
