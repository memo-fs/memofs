# MemoFS Benchmarks

Private benchmark workspace for MemoFS release validation.

## Commands

```bash
pnpm benchmark:smoke
pnpm benchmark:release
pnpm benchmark:full
```

Smoke and release benchmarks are deterministic and local-only. Full benchmarks
are the place for larger datasets and provider-backed runs as those adapters
gain stable benchmark fixtures.
