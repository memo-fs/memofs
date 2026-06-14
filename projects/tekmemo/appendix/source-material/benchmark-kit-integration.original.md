# How to Add This Benchmark Kit to the TekMemo Repo

## 1. Copy folders

Copy these into the TekMemo monorepo root:

```txt
apps/benchmarks
packages/benchmark-kit
TEKMEMO_BENCHMARKING_AND_PRODUCTION_TESTING.md
```

## 2. Update workspace config

Make sure `pnpm-workspace.yaml` includes:

```yaml
packages:
  - apps/*
  - packages/*
```

## 3. Add root scripts

Add these to root `package.json`:

```json
{
  "scripts": {
    "bench:recall": "pnpm --filter @tekbreed/tekmemo-benchmarks bench:recall",
    "bench:all": "pnpm --filter @tekbreed/tekmemo-benchmarks bench:all",
    "test:benchmark-kit": "pnpm --filter @tekbreed/tekmemo/benchmark-kit test"
  }
}
```

## 4. Install

```sh
pnpm install
```

## 5. Run

```sh
pnpm bench:recall
pnpm bench:all
pnpm test:benchmark-kit
```

## 6. Replace the baseline retriever over time

The included keyword retriever is a deterministic baseline. Keep it forever as a free baseline.

Then add these benchmark runners when each package is ready:

```txt
@tekbreed/tekmemo-upstash vector recall runner
@tekbreed/tekmemo/openai embedding smoke runner
@tekbreed/tekmemo-voyage embedding smoke runner
@tekbreed/tekmemo/rerank reranker runner
@tekbreed/tekmemo/graph graph-expansion runner
@tekbreed/tekmemo-cloud-sync sync benchmark runner
```

## 7. CI recommendation

Run these on every PR:

```sh
pnpm typecheck
pnpm test:benchmark-kit
pnpm bench:recall
```

Run real-provider smoke tests only manually or nightly.

