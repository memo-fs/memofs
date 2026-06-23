# API Reference

The primary API for TekMemo is the [`Tekmemo`](./tekmemo) class. Construct one client, pick a runtime mode, and access all memory operations through its namespaces.

```ts
import { Tekmemo } from "@tekbreed/tekmemo";

const memo = new Tekmemo({ rootDir: "./.tekmemo", projectId: "my-app" });
await memo.core.read();
await memo.notes.record({ content: "Ship feature X", kind: "decision" });
const hits = await memo.recall("architecture decisions");
```

## Packages

### Core

| Package | Purpose |
| --- | --- |
| **`@tekbreed/tekmemo`** | The core memory runtime — memory primitives, filesystem/graph storage, recall, cloud client, AI SDK helpers, and the unified `Tekmemo` client. |

### Distribution

| Package | Purpose |
| --- | --- |
| **`@tekbreed/tekmemo-cli`** | Command-line interface for managing local, cloud, and hybrid memory workflows. |
| **`@tekbreed/tekmemo-mcp-server`** | Model Context Protocol server for exposing TekMemo memory to coding agents and AI applications. |

### Provider Adapters

Standalone packages that implement embedder, reranker, or vector store interfaces from the core.

| Package | Purpose |
| --- | --- |
| **`@tekbreed/tekmemo-adapter-openai`** | OpenAI embedder adapter. |
| **`@tekbreed/tekmemo-adapter-voyage`** | Voyage AI embedder and reranker adapter. |

### Tooling

| Package | Purpose |
| --- | --- |
| **`@tekbreed/tekmemo-benchmark-kit`** | Benchmark runners and testing utilities. |
| **`@tekbreed/tekmemo-testing`** | Shared contract tests, fixtures, fakes, and Vitest helpers. |

## Imports

Everything is available from the root entrypoint:

```ts
import { Tekmemo, createNodeFsMemoryStore, ... } from "@tekbreed/tekmemo";
```

The cloud client also has a dedicated subpath for tree-shaking:

```ts
import {
  createTekMemoCloudClient,
  createTekMemoCloudClientFromEnv,
  createProjectScopedClient,
  isTekMemoCloudError,
} from "@tekbreed/tekmemo/cloud-client";
```

## Integrations

| Integration | Purpose | Detail Link |
| --- | --- | --- |
| **AI SDK** | Expose TekMemo memory as Vercel AI SDK tools in `generateText`, `streamText`, and agent workflows. | [`AI SDK`](./ai-sdk) |
| **Cloud Client** | Project-scoped HTTP client for TekMemo Cloud API with typed errors and envelope unwrapping. | [`Cloud Client`](./cloud-client) |

## Modules

The `Tekmemo` class is a façade over these building blocks. Most users only need the class, but the individual modules are exported for advanced use cases and custom adapters.

| Module | Purpose | Detail Link |
| --- | --- | --- |
| **Core Primitives** | Memory types, document helpers, events, validation, and file path conventions. | [`Core Primitives`](./core) |
| **Filesystem Store** | Local filesystem storage adapter (`createNodeFsMemoryStore`). | [`Filesystem Store`](./fs) |
| **Agent Filesystem** | Sandbox and session protection for coding agents. | [`Agent Filesystem`](./agentfs) |
| **Graph Memory** | Entities and relationships indexing and tracking. | [`Graph Memory`](./graph) |
| **Recall** | Base retrieval contracts and memory queries. | [`Recall`](./recall) |
| **Reranking** | Reranking contracts and deterministic fallback. | [`Reranking`](./rerank) |
| **Benchmark Kit** | Benchmark runners and testing utilities. | [`Benchmark Kit`](./benchmark-kit) |

> **Note:** Provider adapters (OpenAI, VoyageAI) are now standalone packages. See the [Provider Adapters](#provider-adapters) section above.
