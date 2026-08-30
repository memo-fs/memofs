# MemoFS Benchmarks

Private benchmark workspace for MemoFS release validation and performance regression tracking.

## Benchmark Policy

MemoFS uses tiered benchmarks:

- **Smoke benchmarks** run in CI and before package publishing. They are deterministic, local-only, and designed to catch regressions in storage, chunking, recall, and context packing.
- **Release benchmarks** validate package export resolution, filesystem lifecycle, recall query, and deterministic rerank checks.
- **Full benchmarks** run manually or on a scheduled workflow. They may use larger datasets, real embedding providers, vector stores, and rerankers.

A package should not be published if smoke benchmarks fail.

## Workspace Layout

MemoFS keeps benchmark infrastructure in two places:

- `packages/benchmark-kit` provides the reusable runner, reporters, threshold checks, and workload helpers.
- `benchmarks` is the private workspace package that owns MemoFS-specific suites, thresholds, reports, and release scripts.

Generated output is written to `benchmark-results/` (gitignored).

## Commands

```bash
pnpm benchmark:smoke
pnpm benchmark:release
pnpm benchmark:full
pnpm benchmark:compare
```

## Public Claims

Do not publish performance claims without including:
- Benchmark mode and command.
- Dataset size and shape.
- Provider and model, when applicable.
- Node.js and operating system versions.
- Whether results are smoke, release, or full benchmarks.

