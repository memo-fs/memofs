---
title: Changelog
description: All notable changes to MemoFS packages, newest first.
sidebar: false
pageClass: changelog-page
---

# Changelog

All notable changes to MemoFS packages are documented here, newest first.
This project follows [semantic versioning](https://semver.org/).

<NewsletterSignup event="changelog" title="Get release notes by email" description="Be the first to know when a new version ships." />

## v1.0.0-beta.2 — 2026-07-10
**First public beta**

### Core (`@memofs/core`)

#### Added
- Provider-neutral memory runtime (`MemoFS` client) with file-first architecture
- AgentFS virtual filesystem for project memory files
- Hybrid recall (BM25 + fuzzy + vector channels) with pluggable embedders, rerankers, and recall stores
- Durable graph memory (nodes + edges) with versioned snapshots
- `MemoryEmbedder` / `Reranker` / `RecallStore` / `Extractor` / `LlmClient` / `MemoryStore` provider contracts
- Local `NodeFsMemoryStore` behind the `@memofs/core/node-fs` subpath export
- In-memory `InMemoryMemoryStore` for tests and ephemeral use

### CLI (`memofs`)

#### Added
- `memofs init` — initialize a `.memofs/` workspace in the current directory
- `memofs remember` — persist durable decisions, constraints, goals, preferences, and notes
- `memofs recall` — semantic + lexical hybrid search over memory
- `memofs context` — build task-ready memory context (core + recall + recent + notes)
- `memofs inspect` — show current memory state
- `memofs consolidate` — graph consolidation pass (merge duplicates, retire superseded facts)
- `memofs sync` — push/pull `.memofs/` files to MemoFS Cloud (hybrid mode)
- Global flags: `--root`, `--runtime`, `--cloud-url`, `--api-key`, `--workspace-id`, `--project-id`, `--timeout-ms`, `--json`, `--verbose`, `--quiet`, `--no-color`

### MCP Server (`@memofs/mcp-server`)

#### Added
- 4 memory tools: `memofs.context`, `memofs.recall`, `memofs.remember`, `memofs.consolidate`
- 6 AgentFS session tools: `memofs_agent_session_{start,read,write,append,extract,complete}`
- 9 MCP resources: `memofs://health`, `memofs://context`, `memofs://memory/{core,notes,recent}`, `memofs://graph/{nodes,edges}`, `memofs://agent-sessions/{id}/context/core`, `memofs://agent-sessions/{id}/output/durable-memory`
- Runtime flags: `--runtime`, `--root`, `--project-id`, `--cloud-url`, `--api-key`, `--read-only`, `--allow-writes`
- Environment-variable support: `MEMOFS_RUNTIME`, `MEMOFS_ROOT`, `MEMOFS_CLOUD_URL`, `MEMOFS_API_KEY`, `MEMOFS_PROJECT_ID`, `MEMOFS_WORKSPACE_ID`, `MEMOFS_LOCAL_EMBEDDINGS`, `MEMOFS_MCP_READ_ONLY`

### Server (`@memofs/server`)

#### Added
- Self-hostable, provider-neutral hosted-memory server (Node binary + Worker subpath)
- `createHostedRuntime()` factory with pluggable `store` (required) and optional `embedder`, `reranker`, `extractor`, `llmClient`
- Deterministic defaults for every intelligence slot (lexical-only recall, token-overlap reranker, rule-based extractor, regex/deterministic LLM strategist)
- `memofs-server` binary with `MEMOFS_SERVER_TOKEN` / `MEMOFS_SERVER_REQUIRE_AUTH` bearer auth
- JSON-RPC 2.0 over HTTP (`POST /` or `POST /rpc`)

### Adapters

#### Added
- `@memofs/adapter-openai` — OpenAI embedder (`text-embedding-3-small`, `-large`, `-ada-002`)
- `@memofs/adapter-voyage` — Voyage AI embedder + reranker (no separate SDK dependency)
- `@memofs/adapter-transformers` — local Transformers.js (ONNX) embedder with no API key or cloud
- `@memofs/adapter-r2` — Cloudflare R2 blob storage adapter
- `@memofs/adapter-turso` — Turso/libSQL metadata store adapter
- `@memofs/adapter-workers-ai` — Cloudflare Workers AI frontier extractor
- `@memofs/adapter-ai-sdk` — Vercel AI SDK runtime bridge, tool definitions, and context builders

### Connectors (`@memofs/connectors`)

#### Added
- Local-only ingestion framework for external sources (GitHub, Notion, …)
- `SecretResolver` for runtime token resolution (tokens never written to disk)
- `runConnectors()` runner that emits through the local engine with the connector-write discipline (`source: "connector"`, content-derived `id`, stable `sourceRefs[0].sourceId`)

### Shared utilities

#### Added
- `@memofs/json-rpc` — dependency-free JSON-RPC 2.0 protocol primitives (types, parsers, validation, response helpers)
- `@memofs/testing` — contract tests, fakes, and fixtures for adapter authors
- `@memofs/benchmark-kit` — benchmarks, runners, statistical analysis, and markdown reporters
