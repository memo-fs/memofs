# `@tekbreed/tekmemo`

<p align="center">
  <a href="https://www.npmjs.com/package/@tekbreed/tekmemo"><img src="https://img.shields.io/npm/v/%40tekbreed%2Ftekmemo?label=%40tekbreed%2Ftekmemo&style=for-the-badge" alt="npm version" /></a> &nbsp; 
  <a href="https://github.com/tekbreed/oss"><img src="https://img.shields.io/badge/status-alpha-orange?style=for-the-badge" alt="Status: Alpha" /></a> &nbsp; 
  <a href="https://www.npmjs.com/package/@tekbreed/tekmemo"><img src="https://img.shields.io/npm/dm/%40tekbreed%2Ftekmemo?style=for-the-badge" alt="npm downloads" /></a> &nbsp; 
  <a href="https://github.com/tekbreed/oss/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/tekbreed/oss/ci.yml?branch=main&style=for-the-badge&label=CI" alt="CI" /></a> &nbsp; 
  <a href="https://oss.tekbreed.com/tekmemo/"><img src="https://img.shields.io/badge/docs-online-blue?style=for-the-badge" alt="Docs" /></a> &nbsp; 
  <a href="../../LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg?style=for-the-badge" alt="MIT License" /></a>
</p>

## Purpose

**Unified core memory runtime.** Core memory contracts, records, chunks, source references, manifest validation, local protocol helpers, and provider-neutral runtime primitives. Consolidates file-based storage, embeddings (OpenAI, VoyageAI), vector store integration (Upstash Vector), and reranking providers into a single package.

## Install

```bash
npm install @tekbreed/tekmemo
```

## Quick start

```ts
import { bootstrapMemoryStore } from "@tekbreed/tekmemo";

const store = await bootstrapMemoryStore({
  rootDir: "./.tekmemo",
});
```

## Boundary

This package owns the TekMemo core contracts, memory store adapters, and runtime primitives. It does not own private SaaS concerns such as billing, tenancy, hosted dashboards, encrypted BYOK storage, or internal admin tooling. All public API capabilities are consolidated and exported directly from the root namespace of `@tekbreed/tekmemo`.

## License

MIT.
