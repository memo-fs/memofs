# Package Boundaries

Understanding how TekMemo packages relate to each other helps you maintain clean architecture and import patterns.

## The Core Package (`@tekbreed/tekmemo`)

The core package defines the protocol contracts, schemas, document types, events, and validation logic. It also contains:
- Filesystem storage (`createNodeFsMemoryStore`)
- Graph memory engine
- Vector recall contracts and Upstash Vector adapter
- Provider embedders (OpenAI, VoyageAI) and rerankers
- AI SDK tool helpers

It contains no standalone CLI or MCP server binaries. All programmatic API access is imported from `@tekbreed/tekmemo`.

## CLI Package (`@tekbreed/tekmemo-cli`)

A standalone package providing the `tekmemo` binary. It parses command-line input and executes memory commands. It depends on `@tekbreed/tekmemo` for core memory operations and local storage management.

## MCP Server Package (`@tekbreed/tekmemo-mcp-server`)

A standalone package providing the `tekmemo-mcp` binary. It runs a Model Context Protocol server exposing TekMemo capabilities as tools and resources to coding agents and AI applications. It depends on `@tekbreed/tekmemo` for the underlying memory logic.

## Safety & Secrets

- Monorepo packages accept credentials from host applications/runtimes and never store secrets or private keys in the code or `.tekmemo/` files.
- Private SaaS concerns (billing, tenancy, internally encrypted store, INTERNAL admin dashboard) do not belong in the open-source packages.
