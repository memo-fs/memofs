# `@tekmemo/cloud-client`

[![npm](https://img.shields.io/npm/v/@tekmemo/cloud-client?label=npm)](https://www.npmjs.com/package/@tekmemo%2Fcloud-client)
[![npm downloads](https://img.shields.io/npm/dm/@tekmemo/cloud-client)](https://www.npmjs.com/package/@tekmemo%2Fcloud-client)
[![CI](https://github.com/tekbreed/tekmemo/actions/workflows/ci.yml/badge.svg)](https://github.com/tekbreed/tekmemo/actions/workflows/ci.yml)
[![Docs](https://img.shields.io/badge/docs-online-blue)](https://docs.tekmemo.dev)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](../../LICENSE)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue.svg)

## Purpose

**Cloud client.** Project-scoped TekMemo Cloud API client used by CLI, MCP, AI SDK, and custom apps.

## Install

```bash
pnpm add @tekmemo/cloud-client
```

## Quick start

```ts
import { createTekMemoCloudClient } from "@tekmemo/cloud-client";

const client = createTekMemoCloudClient({
  baseUrl: "https://memo.tekbreed.com/api/v1",
  apiKey: process.env.TEKMEMO_API_KEY!,
  defaultProjectId: "proj_123",
});

const context = await client.context.compose({ query: "current task" });
```

## Boundary

This package owns its package-level contract only. It does not own TekMemo Cloud billing, dashboards, tenancy, hosted database storage, or provider secrets unless explicitly stated by its package name.

For hosted memory, use `@tekmemo/cloud-client`. For local file-backed memory, use `tekmemo` with `@tekmemo/fs`. For MCP tools, use `@tekmemo/mcp-server`.

## Scripts

```bash
pnpm --filter @tekmemo/cloud-client typecheck
pnpm --filter @tekmemo/cloud-client test:run
pnpm --filter @tekmemo/cloud-client build
pnpm --filter @tekmemo/cloud-client lint:package
```

## Docs

- Package docs: https://docs.tekmemo.dev/packages/
- Examples: https://docs.tekmemo.dev/examples/
- Repository: https://github.com/tekbreed/tekmemo

## Publishing metadata

- npm package: `@tekmemo/cloud-client`
- publish visibility: public
- runtime format: dual ESM/CJS
- ESM output: `dist/**/*.mjs` + `dist/**/*.d.mts`
- CJS output: `dist/**/*.cjs` + `dist/**/*.d.cts`
- package contents: `dist` and `README.md`
- package boundary: hosted cloud calls must go through `@tekmemo/cloud-client` unless this package is `@tekmemo/cloud-client` itself.


## Publish readiness

Before publishing this package, run:

```bash
pnpm --filter @tekmemo/cloud-client release:check
```

The package-level check builds `dist/`, runs TypeScript and tests, runs `publint`, and performs `npm pack --dry-run`. Publish from CI with Changesets and npm trusted publishing/provenance after the root release preflight passes.

## License

MIT.
