# `@memofs/core`

<p align="center">
  <a href="https://www.npmjs.com/package/@memofs/core"><img src="https://img.shields.io/npm/v/%40memofs%2Fcore?label=%40memofs%2Fcore&style=for-the-badge" alt="npm version" /></a> &nbsp;
  <a href="https://github.com/christophersesugh/memofs"><img src="https://img.shields.io/badge/status-alpha-orange?style=for-the-badge" alt="Status: Alpha" /></a> &nbsp;
  <a href="https://www.npmjs.com/package/@memofs/core"><img src="https://img.shields.io/npm/dm/%40memofs%2Fcore?style=for-the-badge" alt="npm downloads" /></a> &nbsp;
  <a href="https://github.com/christophersesugh/memofs/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/christophersesugh/memofs/ci.yml?branch=main&style=for-the-badge&label=CI" alt="CI" /></a> &nbsp;
  <a href="https://docs.memo.memofs.dev/"><img src="https://img.shields.io/badge/docs-online-blue?style=for-the-badge" alt="Docs" /></a> &nbsp;
  <a href="https://github.com/christophersesugh/memofs/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg?style=for-the-badge" alt="MIT License" /></a>
</p>

Memo FS core memory runtime and provider-neutral contracts for AI apps and agents.

## What is this?

**Unified core memory runtime.** Core memory contracts, records, chunks, source references, manifest validation, local protocol helpers, and provider-neutral runtime primitives — the `Memofs` client, hybrid recall (BM25 + fuzzy + vector channel via file-based and in-memory stores), graph, snapshots, sync, and the provider-neutral `MemoryEmbedder` / `Reranker` / `RecallStore` contracts that adapters (OpenAI, Voyage, Transformers) implement.

## Installation

```bash
npm install @memofs/core
```

## Quick Start

Initialize memory in your project and read the core memory:

```ts
import { bootstrapMemoryStore, readCoreMemory } from "@memofs/core";

// Initialize the store in a given directory
const store = await bootstrapMemoryStore({
  rootDir: "./`.memofs`",
});

// Use the store with core helpers
const core = await readCoreMemory(store);
console.log(core.content);
```

## Configuration and Usage

The `@memofs/core` package is designed to be highly modular. You can import only the specific adapters and utilities you need.

- **Filesystem Store**: `import { createNodeFsMemoryStore } from "@memofs/core"`
- **Agent Sandbox**: `import { createMemofsAgentSession } from "@memofs/core"`
- **Graph Memory**: `import { createInMemoryGraphStore } from "@memofs/core"`
- **Recall Stores**: `import { createFsRecallStore, createInMemoryRecallStore } from "@memofs/core"`
- **Provider Adapters**: `import { createOpenAIEmbedder } from "@memofs/core"`

For a complete breakdown of configuration options, interfaces, and architecture, see our [Full Documentation](https://docs.memo.memofs.dev/api/memofs/).

## Boundary

This package owns the Memo FS core contracts, memory store adapters, and runtime primitives. It does not own private SaaS concerns such as billing, tenancy, hosted dashboards, encrypted BYOK storage, or internal admin tooling. All public API capabilities are consolidated and exported directly from the root namespace of `@memofs/core`.

## Contributing

See our central [Contributing Guide](../../CONTRIBUTING.md) and development scripts for details on formatting, linting, and testing within the monorepo.

## License

MIT
