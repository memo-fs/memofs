# `@tekmemo/rerank`

<p align="center">
  <a href="https://www.npmjs.com/package/@tekmemo/rerank"><img src="https://img.shields.io/npm/v/@tekmemo%2Frerank?label=@tekmemo/rerank&style=for-the-badge" alt="npm version" /></a> &nbsp; 
  <a href="https://github.com/tekbreed/tekmemo"><img src="https://img.shields.io/badge/status-alpha-orange?style=for-the-badge" alt="Status: Alpha" /></a> &nbsp; 
  <a href="https://www.npmjs.com/package/@tekmemo/rerank"><img src="https://img.shields.io/npm/dm/@tekmemo%2Frerank?style=for-the-badge" alt="npm downloads" /></a> &nbsp; 
  <a href="https://github.com/tekbreed/tekmemo/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/tekbreed/tekmemo/ci.yml?branch=main&style=for-the-badge&label=CI" alt="CI" /></a> &nbsp; 
  <a href="https://docs.memo.tekbreed.com/"><img src="https://img.shields.io/badge/docs-online-blue?style=for-the-badge" alt="Docs" /></a> &nbsp; 
  <a href="../../LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg?style=for-the-badge" alt="MIT License" /></a>
</p>

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

## License

MIT.
