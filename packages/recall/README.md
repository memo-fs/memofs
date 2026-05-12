# `@tekmemo/recall`

[![npm](https://img.shields.io/npm/v/@tekmemo/recall?label=npm)](https://www.npmjs.com/package/@tekmemo%2Frecall)
[![npm downloads](https://img.shields.io/npm/dm/@tekmemo/recall)](https://www.npmjs.com/package/@tekmemo%2Frecall)
[![CI](https://github.com/tekbreed/tekmemo/actions/workflows/ci.yml/badge.svg)](https://github.com/tekbreed/tekmemo/actions/workflows/ci.yml)
[![Docs](https://img.shields.io/badge/docs-online-blue)](https://docs.memo.tekbreed.com/)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](../../LICENSE)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue.svg)

## Purpose

**Recall contracts.** Provider-neutral vector recall contracts, document chunk contracts, and search result types.

## Install

```bash
npm install @tekmemo/recall
```

## Quick start

```ts
import type { RecallAdapter } from "@tekmemo/recall";

const adapter: RecallAdapter = createYourRecallAdapter();
const results = await adapter.query({ query: "billing webhooks", topK: 8 });
```

## Boundary

This package owns its package-level contract only. It does not own TekMemo Cloud billing, dashboards, tenancy, hosted database storage, or provider secrets unless explicitly stated by its package name.

For hosted memory, use `@tekmemo/cloud-client`. For local file-backed memory, use `tekmemo` with `@tekmemo/fs`. For MCP tools, use `@tekmemo/mcp-server`.

## Scripts

```bash
pnpm --filter @tekmemo/recall typecheck
pnpm --filter @tekmemo/recall test:run
pnpm --filter @tekmemo/recall build
pnpm --filter @tekmemo/recall lint:package
```

## Docs

- Package docs: https://docs.memo.tekbreed.com/packages/
- Examples: https://docs.memo.tekbreed.com/examples/
- Repository: https://github.com/tekbreed/tekmemo

## Publishing metadata

- npm package: `@tekmemo/recall`
- publish visibility: public
- runtime format: dual ESM/CJS
- ESM output: `dist/**/*.mjs` + `dist/**/*.d.mts`
- CJS output: `dist/**/*.cjs` + `dist/**/*.d.cts`
- package contents: `dist` and `README.md`
- package boundary: hosted cloud calls must go through `@tekmemo/cloud-client` unless this package is `@tekmemo/cloud-client` itself.


## Publish readiness

Before publishing this package, run:

```bash
pnpm --filter @tekmemo/recall release:check
```

The package-level check builds `dist/`, runs TypeScript and tests, runs `publint`, and performs `npm pack --dry-run`. Publish from CI with Changesets and npm trusted publishing/provenance after the root release preflight passes.

## License

MIT.
