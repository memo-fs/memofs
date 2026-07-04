# API Reference Overview

Welcome to the TekMemo API Reference documentation.

TekMemo's application programming interfaces are structured around modular, scoped npm packages.

## Core Packages

- **[`@tekmemo/core`](./core)**: The central memory runtime, virtual AgentFS, graph engine, and hybrid recall router.
- **[`@tekmemo/server`](./server)**: The hosted, self-deployable server wrapping the memory engine behind a JSON-RPC 2.0 API.
- **[`@tekmemo/mcp-server`](./mcp-server)**: Exposes memory-control tools to AI agents using the Model Context Protocol.
- **[`@tekmemo/connectors`](./connectors)**: Local ingestion plug-in framework for loading third-party sources (e.g. GitHub, Notion).

## Developer Utilities

- **`@tekmemo/json-rpc`**: Validation schemas and types for the JSON-RPC 2.0 protocol.
- **`@tekmemo/testing`**: Reusable contract tests, mock fakes, and test fixtures.
- **`@tekmemo/benchmark-kit`**: Workloads and statistical runners to profile memory components.
