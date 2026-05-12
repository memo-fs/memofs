# `@tekmemo/rerank`

[![npm](https://img.shields.io/npm/v/@tekmemo/rerank?label=npm)](https://www.npmjs.com/package/@tekmemo%2Frerank)
[![npm downloads](https://img.shields.io/npm/dm/@tekmemo/rerank)](https://www.npmjs.com/package/@tekmemo%2Frerank)
[![CI](https://github.com/tekbreed/tekmemo/actions/workflows/ci.yml/badge.svg)](https://github.com/tekbreed/tekmemo/actions/workflows/ci.yml)
[![Docs](https://img.shields.io/badge/docs-online-blue)](https://docs.memo.tekbreed.com/)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](../../LICENSE)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue.svg)

## Purpose

**Rerank contracts.** Provider-neutral reranking contracts, utilities, and test helpers.

## Install

```bash
npm install @tekmemo/rerank
```

## Quick start

```ts
import type { Reranker } from "@tekmemo/rerank";

const reranker: Reranker = createYourReranker();
const ranked = await reranker.rerank({ query: "auth", documents });
```

## Boundary

This package owns its package-level contract only. It does not own TekMemo Cloud billing, dashboards, tenancy, hosted database storage, or provider secrets unless explicitly stated by its package name.

For hosted memory, use `@tekmemo/cloud-client`. For local file-backed memory, use `tekmemo` with `@tekmemo/fs`. For MCP tools, use `@tekmemo/mcp-server`.

## Scripts

```bash
pnpm --filter @tekmemo/rerank typecheck
pnpm --filter @tekmemo/rerank test:run
pnpm --filter @tekmemo/rerank build
pnpm --filter @tekmemo/rerank lint:package
```

## Docs

- Package docs: https://docs.memo.tekbreed.com/packages/
- Examples: https://docs.memo.tekbreed.com/examples/
- Repository: https://github.com/tekbreed/tekmemo

## Publishing metadata

- npm package: `@tekmemo/rerank`
- publish visibility: public
- runtime format: dual ESM/CJS
- ESM output: `dist/**/*.mjs` + `dist/**/*.d.mts`
- CJS output: `dist/**/*.cjs` + `dist/**/*.d.cts`
- package contents: `dist` and `README.md`
- package boundary: hosted cloud calls must go through `@tekmemo/cloud-client` unless this package is `@tekmemo/cloud-client` itself.


## Publish readiness

Before publishing this package, run:

```bash
pnpm --filter @tekmemo/rerank release:check
```

The package-level check builds `dist/`, runs TypeScript and tests, runs `publint`, and performs `npm pack --dry-run`. Publish from CI with Changesets and npm trusted publishing/provenance after the root release preflight passes.

## License

MIT.
