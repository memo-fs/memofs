# Core concepts

## Core memory

Core memory is the stable project briefing. It should contain the facts an AI assistant should know every time it works in the project.

## Notes memory

Notes are durable records such as decisions, constraints, preferences, references, summaries, and general notes.

## Events

Events record changes over time. They make sync, audit, and agent workflows easier to inspect.

## Recall

Recall turns memory into searchable context. Local recall can be keyword-based. Cloud or provider-backed recall can use vector search and reranking.

## Graph memory

Graph memory stores entities and relationships. It helps answer questions like “what depends on this?” or “how are these two decisions connected?”

## Context package

A context package is the structured payload sent to an AI model or tool. It can combine core memory, notes, recall results, graph context, and source metadata.

## Package architecture

TekMemo is published as a family of packages:

| Package | Purpose |
| --- | --- |
| `@tekbreed/tekmemo` | Core runtime — filesystem store, graph memory, recall, and cloud client |
| `@tekbreed/tekmemo-cli` | CLI for local, cloud, and hybrid memory operations |
| `@tekbreed/tekmemo-mcp-server` | Self-hosted MCP (stdio) server for IDE/agent integration |
| `@tekbreed/tekmemo-connectors` | Connector framework — ingest external sources (GitHub, Notion, …) into `.tekmemo/` |
| `@tekbreed/tekmemo-adapter-ai-sdk` | Vercel AI SDK adapter — memory tool, runtime bridge, and context builders |
| `@tekbreed/tekmemo-adapter-openai` | OpenAI embedding provider adapter |
| `@tekbreed/tekmemo-adapter-voyage` | Voyage AI embedding and reranking adapter |
| `@tekbreed/tekmemo-adapter-transformers` | Local, zero-API-key embedding adapter |
| `@tekbreed/tekmemo-benchmark-kit` | Benchmark kit, workloads, and runners |
| `@tekbreed/tekmemo-testing` | Shared contract tests, fixtures, and fakes (internal/contributor use) |

For application code, import the [`Tekmemo`](/packages/tekmemo/client) class from `@tekbreed/tekmemo`. See the [API Reference](/api/tekmemo/) page for the full module listing.

## Glossary

| Term | Meaning |
| --- | --- |
| **Agent session** | A temporary coding workspace managed by AgentFS, tracking the lifecycle of an agent's task. |
| **Cloud client** | The cloud client module of `@tekbreed/tekmemo`, handling API transport and auth. |
| **Context package** | A structured payload combining core memory, notes, recall results, and graph data to be sent to an AI model. |
| **Core memory** | The stable project briefing (`core.md`). Contains facts the agent must know every time it starts working. |
| **Graph memory** | Nodes (entities, concepts, files) and edges (relationships) that help tools answer architectural questions. |
| **Hybrid runtime** | A runtime mode that combines local and cloud, routing every read and write through read/write policies (`local-first`, `cloud-first`, `local-only`). |
| **MCP** | Model Context Protocol. An open standard used to expose TekMemo memory to IDEs and agents. Available as a hosted cloud-only endpoint (`https://mcp.memo.tekbreed.com/`) or a self-hosted stdio server (`@tekbreed/tekmemo-mcp-server`) for local/cloud/hybrid memory. |
| **Note** | A durable memory record (e.g., a decision, constraint, or summary) saved to `notes.md`. |
| **Recall** | The process of retrieving relevant memory for a query. Can use keywords (local) or embeddings (cloud/provider). |
| **Snapshot** | A point-in-time backup bundle of project memory, used for rollbacks or migrations. |
| **Sync** | The mechanism of resolving memory state between the local `.tekmemo/` filesystem and the TekMemo Cloud database. |
