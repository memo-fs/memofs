<p align="center">
  <img src="https://raw.githubusercontent.com/tekbreed/tekbreed-oss/main/assets/architecture.svg" alt="Memory Layer" />
</p>

# `@tekbreed/tekmemo`

<p align="center">
  <a href="https://www.npmjs.com/package/@tekbreed/tekmemo"><img src="https://img.shields.io/npm/v/%40tekbreed%2Ftekmemo?label=%40tekbreed%2Ftekmemo&style=for-the-badge" alt="npm version" /></a> &nbsp; 
  <a href="https://github.com/tekbreed/tekbreed-oss"><img src="https://img.shields.io/badge/status-alpha-orange?style=for-the-badge" alt="Status: Alpha" /></a> &nbsp; 
  <a href="https://www.npmjs.com/package/@tekbreed/tekmemo"><img src="https://img.shields.io/npm/dm/%40tekbreed%2Ftekmemo?style=for-the-badge" alt="npm downloads" /></a> &nbsp; 
  <a href="https://github.com/tekbreed/tekbreed-oss/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/tekbreed/tekbreed-oss/ci.yml?branch=main&style=for-the-badge&label=CI" alt="CI" /></a> &nbsp; 
  <a href="https://oss.tekbreed.com/tekmemo/"><img src="https://img.shields.io/badge/docs-online-blue?style=for-the-badge" alt="Docs" /></a> &nbsp; 
  <a href="https://github.com/tekbreed/tekbreed-oss/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg?style=for-the-badge" alt="MIT License" /></a>
</p>

## What is this?

**Unified core memory runtime.** Core memory contracts, records, chunks, source references, manifest validation, local protocol helpers, and provider-neutral runtime primitives. Consolidates file-based storage, embeddings (OpenAI, VoyageAI), vector store integration (Upstash Vector), and reranking providers into a single package.

## Installation

```bash
npm install @tekbreed/tekmemo
```

## Quick Start

Initialize memory in your project and read the core memory:

```ts
import { bootstrapMemoryStore, readCoreMemory } from "@tekbreed/tekmemo";

// Initialize the store in a given directory
const store = await bootstrapMemoryStore({
  rootDir: "./.tekmemo",
});

// Use the store with core helpers
const core = await readCoreMemory(store);
console.log(core.content);
```

## Configuration and Usage

The `@tekbreed/tekmemo` package is designed to be highly modular. You can import only the specific adapters and utilities you need.

- **Filesystem Store**: `import { createNodeFsMemoryStore } from "@tekbreed/tekmemo"`
- **Agent Sandbox**: `import { createTekMemoAgentSession } from "@tekbreed/tekmemo"`
- **Graph Memory**: `import { createInMemoryGraphStore } from "@tekbreed/tekmemo"`
- **Vector Adapters**: `import { createUpstashRecallStore } from "@tekbreed/tekmemo"`
- **Provider Adapters**: `import { createOpenAIEmbedder } from "@tekbreed/tekmemo"`

For a complete breakdown of configuration options, interfaces, and architecture, see our [Full Documentation](https://oss.tekbreed.com/api/tekmemo/).

## Boundary

This package owns the TekMemo core contracts, memory store adapters, and runtime primitives. It does not own private SaaS concerns such as billing, tenancy, hosted dashboards, encrypted BYOK storage, or internal admin tooling. All public API capabilities are consolidated and exported directly from the root namespace of `@tekbreed/tekmemo`.

## Contributing

See our central [Contributing Guide](../../CONTRIBUTING.md) and development scripts for details on formatting, linting, and testing within the monorepo.

## License

MIT
