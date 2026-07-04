# `@tekmemo/core`

<p align="center">
  <a href="https://www.npmjs.com/package/@tekmemo/core"><img src="https://img.shields.io/npm/v/%40tekmemo%2Fcore?label=%40tekmemo%2Fcore&style=for-the-badge" alt="npm version" /></a> &nbsp;
  <a href="https://github.com/tekbreed/tekmemo"><img src="https://img.shields.io/badge/status-alpha-orange?style=for-the-badge" alt="Status: Alpha" /></a> &nbsp;
  <a href="https://www.npmjs.com/package/@tekmemo/core"><img src="https://img.shields.io/npm/dm/%40tekmemo%2Fcore?style=for-the-badge" alt="npm downloads" /></a> &nbsp;
  <a href="https://github.com/tekbreed/tekmemo/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/tekbreed/tekmemo/ci.yml?branch=main&style=for-the-badge&label=CI" alt="CI" /></a> &nbsp;
  <a href="https://docs.memo.tekbreed.com/"><img src="https://img.shields.io/badge/docs-online-blue?style=for-the-badge" alt="Docs" /></a> &nbsp;
  <a href="https://github.com/tekbreed/tekmemo/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg?style=for-the-badge" alt="MIT License" /></a>
</p>

TekMemo core memory runtime and provider-neutral contracts for AI apps and agents.

## What is this?

**Unified core memory runtime.** Core memory contracts, records, chunks, source references, manifest validation, local protocol helpers, and provider-neutral runtime primitives — the `Tekmemo` client, hybrid recall (BM25 + fuzzy + vector channel via file-based and in-memory stores), graph, snapshots, sync, and the provider-neutral `MemoryEmbedder` / `Reranker` / `RecallStore` contracts that adapters (OpenAI, Voyage, Transformers) implement.

## Installation

```bash
npm install @tekmemo/core
```

## Quick Start

Initialize memory in your project and read the core memory:

```ts
import { bootstrapMemoryStore, readCoreMemory } from "@tekmemo/core";

// Initialize the store in a given directory
const store = await bootstrapMemoryStore({
  rootDir: "./.tekmemo",
});

// Use the store with core helpers
const core = await readCoreMemory(store);
console.log(core.content);
```

## Configuration and Usage

The `@tekmemo/core` package is designed to be highly modular. You can import only the specific adapters and utilities you need.

- **Filesystem Store**: `import { createNodeFsMemoryStore } from "@tekmemo/core"`
- **Agent Sandbox**: `import { createTekMemoAgentSession } from "@tekmemo/core"`
- **Graph Memory**: `import { createInMemoryGraphStore } from "@tekmemo/core"`
- **Recall Stores**: `import { createFsRecallStore, createInMemoryRecallStore } from "@tekmemo/core"`
- **Provider Adapters**: `import { createOpenAIEmbedder } from "@tekmemo/core"`

For a complete breakdown of configuration options, interfaces, and architecture, see our [Full Documentation](https://docs.memo.tekbreed.com/api/tekmemo/).

## Boundary

This package owns the TekMemo core contracts, memory store adapters, and runtime primitives. It does not own private SaaS concerns such as billing, tenancy, hosted dashboards, encrypted BYOK storage, or internal admin tooling. All public API capabilities are consolidated and exported directly from the root namespace of `@tekmemo/core`.

## Contributing

See our central [Contributing Guide](../../CONTRIBUTING.md) and development scripts for details on formatting, linting, and testing within the monorepo.

## License

MIT
