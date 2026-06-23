# Package Boundaries

Understanding how TekMemo packages relate to each other helps you maintain clean architecture and import patterns.

## The Core Package (`@tekbreed/tekmemo`)

The core package defines the protocol contracts, schemas, document types, events, and validation logic. It also contains:
- The unified [`Tekmemo`](../client) client and its runtime strategies (`local`, `hybrid`, `memory`)
- Cloud client (`createTekMemoCloudClient`) and cloud runtime helpers
- Filesystem storage (`createNodeFsMemoryStore`)
- Graph memory engine
- Vector recall contracts
- AI SDK tool helpers
- Core error hierarchy (`TekMemoError` and subclasses)
- Reranking contracts and deterministic fallback

It contains no standalone CLI or MCP server binaries, no provider-specific embedder implementations, and no external vector store adapters. All programmatic API access is imported from `@tekbreed/tekmemo`.

## Provider Adapter Packages

Provider adapters are standalone packages that implement embedder, reranker, and vector store interfaces defined in the core package. They depend on `@tekbreed/tekmemo` for contracts and types.

| Package | Purpose |
| --- | --- |
| **`@tekbreed/tekmemo-adapter-openai`** | OpenAI embedder adapter. |
| **`@tekbreed/tekmemo-adapter-voyage`** | Voyage AI embedder and reranker adapter. |

Each adapter is optional — install only the ones you need.

## CLI Package (`@tekbreed/tekmemo-cli`)

A standalone package providing the `tekmemo` binary. It parses command-line input and executes memory commands. It depends on `@tekbreed/tekmemo` for core memory operations and local storage management.

## MCP Server Package (`@tekbreed/tekmemo-mcp-server`)

A standalone package providing the `tekmemo-mcp` binary. It runs a Model Context Protocol server exposing TekMemo capabilities as tools and resources to coding agents and AI applications. It depends on `@tekbreed/tekmemo` for the underlying memory logic.

## Tooling Packages

| Package | Purpose |
| --- | --- |
| **`@tekbreed/tekmemo-benchmark-kit`** | Benchmark runners and testing utilities for TekMemo performance evaluation. |
| **`@tekbreed/tekmemo-testing`** | Shared contract tests, fixtures, fakes, and Vitest helpers for TekMemo packages. |

## Dependency Flow

```
@tekbreed/tekmemo (core contracts, client, runtime)
├── @tekbreed/tekmemo-adapter-openai
├── @tekbreed/tekmemo-adapter-voyage
├── @tekbreed/tekmemo-cli
├── @tekbreed/tekmemo-mcp-server
├── @tekbreed/tekmemo-benchmark-kit
└── @tekbreed/tekmemo-testing

Provider adapters and tooling packages depend on the core.
The core never depends on its consumers.
```

## Safety & Secrets

- Monorepo packages accept credentials from host applications/runtimes and never store secrets or private keys in the code or `.tekmemo/` files.
- Private SaaS concerns (billing, tenancy, internally encrypted store, INTERNAL admin dashboard) do not belong in the open-source packages.
