## Benchmark policy

TekMemo uses tiered benchmarks.

Smoke benchmarks run in CI and before package publishing. They are deterministic, local-only, and designed to catch obvious regressions in storage, chunking, recall, and context packing.

Full benchmarks run manually or on a scheduled workflow. They may use larger datasets, real embedding providers, vector stores, and rerankers. Full benchmark reports are uploaded as CI artifacts and reviewed before major releases, but they are not required for every pull request.

A package should not be published if smoke benchmarks fail. Full benchmark regressions should be reviewed before publishing major memory, recall, storage, or provider-adapter changes.

## Workspace layout

TekMemo keeps benchmark infrastructure in two places:

- `packages/tekmemo/src/benchmark-kit` provides the reusable runner, reporters, threshold checks, and workload helpers.
- `benchmarks` is the private workspace package that owns TekMemo-specific suites, thresholds, reports, and release scripts.

Generated output is written to `benchmark-results/` and ignored by Git.

## Commands

```bash
pnpm benchmark:smoke
pnpm benchmark:release
pnpm benchmark:full
pnpm release:check
```

`pnpm release:check` runs formatting, type checks, tests, builds, package validation, and release benchmarks before package publishing.

## Current coverage

The current benchmark workspace includes:

- smoke memory I/O, chunking, fake recall, and fake rerank checks.
- release package export resolution, filesystem lifecycle, recall query, and deterministic rerank checks.
- full local scale checks for larger deterministic chunking and in-memory recall.

Provider-backed full benchmarks are intentionally scaffolded but not yet treated as release blockers. They should be expanded when OpenAI, Voyage, and Upstash benchmark datasets and secrets are ready.

## Public claims

Do not publish performance claims without including:

- benchmark mode and command.
- dataset size and shape.
- provider and model, when applicable.
- Node.js and operating system versions.
- whether results are smoke, release, or full benchmarks.
