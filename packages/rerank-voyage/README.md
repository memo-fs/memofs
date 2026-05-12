# `@tekmemo/rerank-voyage`

[![npm](https://img.shields.io/npm/v/@tekmemo/rerank-voyage?label=npm)](https://www.npmjs.com/package/@tekmemo%2Frerank-voyage)
[![npm downloads](https://img.shields.io/npm/dm/@tekmemo/rerank-voyage)](https://www.npmjs.com/package/@tekmemo%2Frerank-voyage)
[![CI](https://github.com/tekbreed/tekmemo/actions/workflows/ci.yml/badge.svg)](https://github.com/tekbreed/tekmemo/actions/workflows/ci.yml)
[![Docs](https://img.shields.io/badge/docs-online-blue)](https://docs.memo.tekbreed.com/)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](../../LICENSE)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue.svg)

## Purpose

**Voyage reranker.** Voyage AI reranking adapter implementing TekMemo rerank contracts.

## Install

```bash
npm install @tekmemo/rerank-voyage
```

## Quick start

```ts
import { createVoyageReranker } from "@tekmemo/rerank-voyage";

const reranker = createVoyageReranker({ apiKey: process.env.VOYAGE_API_KEY! });
```

## Boundary

This package owns its package-level contract only. It does not own TekMemo Cloud billing, dashboards, tenancy, hosted database storage, or provider secrets unless explicitly stated by its package name.

For hosted memory, use `@tekmemo/cloud-client`. For local file-backed memory, use `tekmemo` with `@tekmemo/fs`. For MCP tools, use `@tekmemo/mcp-server`.

## Scripts

```bash
pnpm --filter @tekmemo/rerank-voyage typecheck
pnpm --filter @tekmemo/rerank-voyage test:run
pnpm --filter @tekmemo/rerank-voyage build
pnpm --filter @tekmemo/rerank-voyage lint:package
```

## Docs

- Package docs: https://docs.memo.tekbreed.com/packages/
- Examples: https://docs.memo.tekbreed.com/examples/
- Repository: https://github.com/tekbreed/tekmemo

## Publishing metadata

- npm package: `@tekmemo/rerank-voyage`
- publish visibility: public
- runtime format: dual ESM/CJS
- ESM output: `dist/**/*.mjs` + `dist/**/*.d.mts`
- CJS output: `dist/**/*.cjs` + `dist/**/*.d.cts`
- package contents: `dist` and `README.md`
- package boundary: hosted cloud calls must go through `@tekmemo/cloud-client` unless this package is `@tekmemo/cloud-client` itself.


## Publish readiness

Before publishing this package, run:

```bash
pnpm --filter @tekmemo/rerank-voyage release:check
```

The package-level check builds `dist/`, runs TypeScript and tests, runs `publint`, and performs `npm pack --dry-run`. Publish from CI with Changesets and npm trusted publishing/provenance after the root release preflight passes.

## License

MIT.
