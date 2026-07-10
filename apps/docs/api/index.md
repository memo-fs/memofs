# API Reference Overview

Welcome to the MemoFS API Reference documentation.

MemoFS's application programming interfaces are structured around modular, scoped npm packages.

## Core Packages

- **[`@memofs/core`](./core)**: The central memory runtime, virtual AgentFS, graph engine, and hybrid recall router.
- **[`@memofs/server`](./server)**: The hosted, self-deployable server wrapping the memory engine behind a JSON-RPC 2.0 API.
- **[`@memofs/mcp-server`](./mcp-server)**: Exposes memory-control tools to AI agents using the Model Context Protocol.
- **[`@memofs/connectors`](./connectors)**: Local ingestion plug-in framework for loading third-party sources (e.g. GitHub, Notion).

## Developer Utilities

- **`@memofs/json-rpc`**: Validation schemas and types for the JSON-RPC 2.0 protocol.
- **`@memofs/testing`**: Reusable contract tests, mock fakes, and test fixtures.
- **`@memofs/benchmark-kit`**: Workloads and statistical runners to profile memory components.
