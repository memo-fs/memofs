# Packages

TekMemo is a package ecosystem. Each package has a narrow boundary.

| Package | Purpose |
| --- | --- |
| [`tekmemo`](./tekmemo) | Core memory contracts and runtime helpers. |
| [`@tekmemo/fs`](./fs) | Safe local `.tekmemo/` filesystem adapter. |
| [`@tekmemo/agentfs`](./agentfs) | Agent-oriented filesystem helpers. |
| [`@tekmemo/graph`](./graph) | Graph memory contracts and local graph behavior. |
| [`@tekmemo/cloud-client`](./cloud-client) | TekMemo Cloud API transport and runtime helpers. |
| [`@tekmemo/cli`](./cli) | Command-line tooling for local, cloud, and hybrid memory. |
| [`@tekmemo/mcp-server`](./mcp) | MCP server boundary for agent tools. |
| [`@tekmemo/ai-sdk`](./ai-sdk) | Vercel AI SDK tool helpers. |
| [`@tekmemo/adapters`](./adapters) | Convenience subpath reexports for AI SDK, cloud, provider, vector, and rerank adapters. |
| [`@tekmemo/server`](./server) | Hono-based self-host memory server package. |
| [`@tekmemo/recall`](./recall) | Recall contracts and local recall helpers. |
| [`@tekmemo/upstash-vector`](./vector-adapters) | Upstash Vector integration. |
| [`@tekmemo/rerank`](./rerank) | Rerank contracts. |
| [`@tekmemo/rerank-voyage`](./rerank) | VoyageAI reranking adapter. |
| [`@tekmemo/openai`](./provider-adapters) | OpenAI provider adapter. |
| [`@tekmemo/voyageai`](./provider-adapters) | VoyageAI provider adapter. |
| [`@tekmemo/benchmark-kit`](./benchmark-kit) | Benchmark fixtures and runners. |

## Rule

Low-level packages do not call TekMemo Cloud directly. Cloud transport belongs to `@tekmemo/cloud-client`.
