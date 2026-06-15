# Packages Overview

TekMemo is published as three main packages:

1. **`@tekbreed/tekmemo`**: The core memory runtime, providing memory primitives, filesystem/graph storage, vector recall, provider integrations, and evaluation/testing helpers.
2. **`@tekbreed/tekmemo-cli`**: The command-line interface for managing local, cloud, and hybrid memory workflows.
3. **`@tekbreed/tekmemo-mcp-server`**: The Model Context Protocol (MCP) server for exposing TekMemo memory to coding agents and AI applications.

---

## Core Runtime Modules (`@tekbreed/tekmemo`)

Inside `@tekbreed/tekmemo`, the runtime is organized into several modules. All helper functions, classes, and types are imported directly from the root entrypoint:

```ts
import { ... } from "@tekbreed/tekmemo";
```

| Module / Adapter | Purpose | Detail Link |
| --- | --- | --- |
| **Core Primitives** | Core structures, event ledgers, and note structures. | [`Core Primitives`](./tekmemo) |
| **Filesystem Store** | Local filesystem storage adapter (`createNodeFsMemoryStore`). | [`Filesystem Store`](./fs) |
| **Agent Filesystem** | Sandbox and session protection for coding agents. | [`Agent Filesystem`](./agentfs) |
| **Graph Memory** | Entities and relationships indexing and tracking. | [`Graph Memory`](./graph) |
| **Recall** | Base retrieval contracts and memory queries. | [`Recall`](./recall) |
| **Vector Adapters** | Implementations for vector stores (e.g. Upstash Vector). | [`Vector Adapters`](./vector-adapters) |
| **Provider Adapters** | Integrations for OpenAI and VoyageAI. | [`Provider Adapters`](./provider-adapters) |
| **Reranking** | Reranking contracts and VoyageAI adapter. | [`Reranking`](./rerank) |
| **AI SDK** | Helper tools and adapters for Vercel AI SDK. | [`AI SDK`](./ai-sdk) |
| **Cloud Client** | Connection and data syncing client for TekMemo Cloud API. | [`Cloud Client`](./cloud-client) |
| **Benchmark Kit** | Benchmark runners and testing utilities. | [`Benchmark Kit`](./benchmark-kit) |

---

## Standalone Distribution Packages

These packages provide runnable distributions or tools built on top of the core runtime.

| Package | Purpose | Detail Link |
| --- | --- | --- |
| **`@tekbreed/tekmemo-cli`** | Command-line tool for developer workflows. | [`CLI Guide`](/packages/cli/) |
| **`@tekbreed/tekmemo-mcp-server`** | Model Context Protocol server for AI apps and agents. | [`MCP Guide`](/packages/mcp/) |
