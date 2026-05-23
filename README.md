<div align="center">

<p align="center">
  <img src="./assets/architecture.svg" alt="TekMemo Architecture" width="100%" />
</p>

<h1>TekMemo — Layered Memory Runtime for AI Apps and Agents</h1>

<p>Inspectable, file-first memory infrastructure for AI apps, agents, coding tools, and MCP clients.<br/>Store durable memory, recall context, sync across runtimes, and expose memory through MCP or the Vercel AI SDK.</p>

<p align="center">
  <a href="https://www.npmjs.com/package/tekmemo"><img src="https://img.shields.io/npm/v/tekmemo?label=tekmemo&style=for-the-badge" alt="npm version" /></a> &nbsp; 
  <a href="https://github.com/tekbreed/tekmemo"><img src="https://img.shields.io/badge/status-alpha-orange?style=for-the-badge" alt="Project status: Alpha" /></a> &nbsp; 
  <a href="https://github.com/tekbreed/tekmemo/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/tekbreed/tekmemo/ci.yml?branch=main&style=for-the-badge&label=CI" alt="CI status" /></a> &nbsp; 
  <a href="https://docs.memo.tekbreed.com/"><img src="https://img.shields.io/badge/docs-online-blue?style=for-the-badge" alt="Docs" /></a> &nbsp; 
  <a href="./LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg?style=for-the-badge" alt="MIT License" /></a> &nbsp; 
  <a href="./CONTRIBUTING.md"><img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=for-the-badge" alt="PRs welcome" /></a> &nbsp; 
  <a href="https://github.com/sponsors/christophersesugh"><img src="https://img.shields.io/badge/sponsor-GitHub%20Sponsors-ff69b4?style=for-the-badge" alt="Sponsor" /></a>
</p>

<p align="center">
  <strong>
    <a href="https://docs.memo.tekbreed.com/quickstart">Quickstart</a> ·
    <a href="https://docs.memo.tekbreed.com/">Docs</a> ·
    <a href="https://docs.memo.tekbreed.com/faq">FAQ</a> ·
    <a href="./SECURITY.md">Security</a> ·
    <a href="./CONTRIBUTING.md">Contributing</a>
  </strong>
</p>

</div>

---

## Table of Contents

- [Why TekMemo?](#why-tekmemo)
- [Memory Layers](#memory-layers)
- [Install](#install)
- [Quick Start](#quick-start)
- [Runtime Choices](#runtime-choices)
- [Package Map](#package-map)
- [Adapter Imports](#adapter-imports)
- [Repository Structure](#repository-structure)
- [Self-Host Memory Server](#self-host-memory-server)
- [Developer Docs](#developer-docs)
- [Examples](#examples)
- [Workspace Commands](#workspace-commands)
- [Contributing](#contributing)
- [Security](#security)
- [License](#license)

---

## Why TekMemo?

AI apps forget. Every new conversation starts cold. Every agent session loses what happened before. Context windows are finite, and there's no standard way to persist what matters — decisions made, facts learned, work completed.

TekMemo is an open-source **layered memory runtime** for AI apps and agents. It gives any application a structured way to:

- **Store** durable memory across sessions, scoped by project, user, or conversation
- **Recall** relevant context from past interactions using semantic search
- **Inspect** exactly what was saved — memory lives in plain, human-readable files
- **Sync** local and cloud memory with no vendor lock-in
- **Expose** memory through MCP so Claude Code, Cursor, Codex, and other MCP clients can read and write it
- **Integrate** with the Vercel AI SDK through a single tool definition

TekMemo is deliberately **file-first**. Memory starts in a readable `.tekmemo/` directory on disk, then can be indexed, synced, queried, benchmarked, or exposed through cloud and client adapters. No database required to get started.

```txt
.tekmemo/
├── manifest.json          # Project metadata and sync state
├── memory/
│   ├── core.md            # Compact, always-relevant canonical truth
│   └── notes.md           # Durable notes, summaries, long-form archival
├── events/
│   └── memory-events.jsonl  # Ordered log of all memory operations
├── indexes/
│   └── chunks.jsonl       # Indexed fragments for semantic retrieval
├── graph/
│   ├── nodes.jsonl        # Graph memory nodes
│   └── edges.jsonl        # Graph memory edges
└── snapshots/
    └── snapshots.jsonl    # Versioned restore points
```

---

## Memory Layers

TekMemo organizes memory into five distinct layers. Every layer serves a purpose — they are designed to work together, not to be used in isolation.

| Layer | File | Purpose |
| --- | --- | --- |
| **Core Memory** | `core.md` | Compact, always-relevant canonical truth injected into every prompt |
| **Archival Memory** | `notes.md` | Durable notes, summaries, and long-form archival content |
| **Recall Memory** | `indexes/chunks.jsonl` | Indexed fragments retrieved via semantic similarity search |
| **Graph Memory** | `graph/nodes.jsonl` + `edges.jsonl` | Entity relationships and traversal for structured knowledge |
| **Restore Points** | `snapshots/snapshots.jsonl` | Versioned checkpoints for history and rollback |

Memory is **project-scoped**, **user-scoped**, or **session-scoped**. Scope is set at runtime — it never bleeds across boundaries.

---

## Install

### Local file-backed memory

```bash
pnpm add tekmemo @tekmemo/fs
```

### CLI

```bash
pnpm add -D @tekmemo/cli
pnpm exec tekmemo init
pnpm exec tekmemo remember "Use local-first memory for development" --kind decision
pnpm exec tekmemo context --query "current task" --json
```

### MCP server

```bash
pnpm add @tekmemo/mcp-server @tekmemo/cloud-client tekmemo @tekmemo/fs
```

### Vercel AI SDK tools

```bash
pnpm add @tekmemo/ai-sdk ai tekmemo @tekmemo/fs
```

### All adapters via convenience package

```bash
pnpm add @tekmemo/adapters
# Then import implementation APIs from subpaths:
# @tekmemo/adapters/ai-sdk
# @tekmemo/adapters/voyageai
# @tekmemo/adapters/agentfs
# @tekmemo/adapters/cloud-client
```

---

## Quick Start

### Vercel AI SDK

Add TekMemo memory to any `generateText` or `streamText` call in three steps:

```ts
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { createNodeFsMemoryStore } from "@tekmemo/fs";
import {
  buildRuntimeMemoryContext,
  buildRuntimeMemoryToolDefinition,
  createLocalAiSdkRuntime,
} from "@tekmemo/adapters/ai-sdk";

// 1. Create a local file-backed memory store
const workspace = createNodeFsMemoryStore({
  rootDir: process.cwd(),
  createRoot: true,
  missingFileBehavior: "empty",
});

// 2. Define who owns this memory (project + user + conversation)
const access = {
  projectId: "my-project",
  userId: "user_123",
  conversationId: "thread_456",
};

// 3. Build the runtime and inject memory into your AI call
const runtime = createLocalAiSdkRuntime({ workspace });
const { text: system } = await buildRuntimeMemoryContext({
  runtime,
  access,
  query: "current task",
  baseInstructions: "You are a helpful engineering assistant.",
});

const result = await generateText({
  model: openai("gpt-4.1-mini"),
  system,
  prompt: "Summarize the current implementation risks.",
  tools: {
    memory: buildRuntimeMemoryToolDefinition({ runtime, access, allowWrites: true }),
  },
});

console.log(result.text);
```

### MCP client (Claude Code, Cursor, Codex)

```ts
import { createNodeFsMemoryStore } from "@tekmemo/fs";
import { createTekMemoMcpServer } from "@tekmemo/mcp-server";

const workspace = createNodeFsMemoryStore({
  rootDir: process.cwd(),
  createRoot: true,
  missingFileBehavior: "empty",
});

const server = createTekMemoMcpServer({ workspace });
server.listen();
```

Then point your MCP client at the running server. TekMemo exposes `memory/read`, `memory/write`, `memory/recall`, and `memory/snapshot` as MCP tools and resources.

### Cloud (hybrid local + remote)

```ts
import { createTekMemoCloudClient } from "@tekmemo/adapters/cloud-client";
import { createLocalAiSdkRuntime } from "@tekmemo/adapters/ai-sdk";

const cloud = createTekMemoCloudClient({ apiKey: process.env.TEKMEMO_API_KEY });
const runtime = createLocalAiSdkRuntime({ workspace, cloud });
```

---

## Runtime Choices

| Runtime | Use it when |
| --- | --- |
| **Local** | You want inspectable `.tekmemo/` files and zero hosted dependency |
| **Cloud** | You want hosted project memory, API keys, sync, and team or cloud workflows |
| **Hybrid** | You want local files plus cloud recall and sync |
| **MCP** | You want Claude Code, Codex, Cursor, OpenCode, or other MCP clients to use TekMemo memory |
| **AI SDK** | You want `generateText`, `streamText`, or agent loops to use scoped TekMemo memory |
| **Self-host Node** | You want a portable Hono memory server for Dockerfile hosts such as Railway, Fly.io, Render, Coolify, or VPS deployments |
| **Docker Compose** | You want local or private-server packaging with API, worker, Postgres/pgvector, and MinIO |

---

## Package Map

| Package | Purpose |
| --- | --- |
| `tekmemo` | Core memory contracts, records, source refs, chunks, and `.tekmemo/` protocol helpers |
| `@tekmemo/fs` | Node filesystem adapter for local `.tekmemo/` memory |
| `@tekmemo/graph` | Graph-memory primitives: nodes, edges, relationships, and traversal contracts |
| `@tekmemo/cloud-client` | Project-scoped TekMemo Cloud API client — used by CLI, MCP, AI SDK, and custom apps |
| `@tekmemo/cli` | Local, cloud, and hybrid command-line workflows |
| `@tekmemo/mcp-server` | MCP server and runtime adapter exposing TekMemo tools, resources, and prompts |
| `@tekmemo/ai-sdk` | Vercel AI SDK tool bridge for reading and writing memory |
| `@tekmemo/adapters` | Convenience subpath re-exports for AgentFS, AI SDK, cloud, provider, vector, and rerank adapters |
| `@tekmemo/server` | Hono-based self-host memory server package for Node, Docker, and Cloudflare wrappers |
| `@tekmemo/recall` | Provider-neutral recall contracts |
| `@tekmemo/upstash-vector` | Upstash Vector recall adapter |
| `@tekmemo/rerank` | Provider-neutral reranking contracts |
| `@tekmemo/rerank-voyage` | Voyage AI reranking adapter |
| `@tekmemo/voyageai` | Voyage AI embedding adapter |
| `@tekmemo/openai` | OpenAI embedding adapter |
| `@tekmemo/agentfs` | AgentFS adapter |
| `@tekmemo/benchmark-kit` | Benchmark runner and performance test helpers |

---

## Adapter Imports

`tekmemo` stays provider-neutral. Applications can install direct adapter packages or use `@tekmemo/adapters` as a convenience entry point. Implementation APIs are exposed through subpaths so the root package never loads optional peer dependencies.

```ts
import { buildRuntimeMemoryToolDefinition } from "@tekmemo/adapters/ai-sdk";
import { createTekMemoAgentSession } from "@tekmemo/adapters/agentfs";
import { createVoyageEmbedder } from "@tekmemo/adapters/voyageai";
import { createOpenAIEmbedder } from "@tekmemo/adapters/openai";
import { createUpstashRecallStore } from "@tekmemo/adapters/upstash-vector";
import { createVoyageReranker } from "@tekmemo/adapters/rerank-voyage";
import { createTekMemoCloudClient } from "@tekmemo/adapters/cloud-client";
```

---

## Repository Structure

```txt
tekmemo/
├── apps/
│   ├── docs/                   # VitePress developer docs app
│   ├── slides/                 # TekMemo Slides — Slidev presentation app
│   ├── self-host-node/         # Portable Node self-host runtime
│   ├── self-host-docker/       # Docker Compose packaging
│   └── self-host-cloudflare/   # Cloudflare Workers wrapper
├── benchmarks/                 # Benchmark suites and release gates
├── examples/                   # Runnable integration examples
├── packages/                   # Published packages and internal workspace packages
│   ├── tekmemo/                # Core memory model, document types, patching
│   ├── ai-sdk/                 # @tekmemo/ai-sdk — Vercel AI SDK integration
│   ├── fs/                     # @tekmemo/fs — local filesystem adapter
│   ├── agentfs/                # @tekmemo/agentfs — AgentFS adapter
│   ├── graph/                  # @tekmemo/graph — graph memory primitives
│   ├── cli/                    # @tekmemo/cli — command-line interface
│   ├── mcp-server/             # @tekmemo/mcp-server — MCP server adapter
│   ├── cloud-client/           # @tekmemo/cloud-client — Cloud API client
│   ├── server/                 # @tekmemo/server — Hono-based self-host server
│   ├── adapters/               # @tekmemo/adapters — convenience re-exports
│   ├── openai/                 # @tekmemo/openai — OpenAI embedding adapter
│   ├── upstash-vector/         # @tekmemo/upstash-vector — Upstash vector adapter
│   ├── voyageai/               # @tekmemo/voyageai — Voyage AI embedding adapter
│   ├── recall/                 # @tekmemo/recall — semantic recall memory
│   ├── rerank/                 # @tekmemo/rerank — reranking adapter
│   ├── rerank-voyage/          # @tekmemo/rerank-voyage — Voyage reranking adapter
│   └── benchmark-kit/          # @tekmemo/benchmark-kit — benchmarking tools
├── .github/                    # CI, docs deploy, and release workflows
├── biome.json                  # Linting + formatting (Biome)
├── turbo.json                  # Turborepo pipeline config
└── pnpm-workspace.yaml         # PNPM workspace configuration
```

---

## Self-Host Memory Server

TekMemo self-hosting is built around `@tekmemo/server`, not the full TekMemo Cloud SaaS app. The current Node/Docker baseline uses Hono, Postgres, a Postgres-backed queue, and S3-compatible object storage. Docker Compose packages the same Node runtime with Postgres/pgvector and MinIO.

```bash
cp apps/self-host-docker/.env.example apps/self-host-docker/.env
docker compose -f apps/self-host-docker/docker-compose.yml up --build
```

Railway, Fly.io, and Render-style hosts should deploy `apps/self-host-node/Dockerfile` directly and run the API and worker as separate processes from the same image.

See [`SELF_HOSTING.md`](./SELF_HOSTING.md) for the full self-host architecture.

---

## Developer Docs

The VitePress docs app in `apps/docs` is developer-facing only. Marketing pages, blog, changelog, tutorials, pricing, and cloud-product pages belong in the TekMemo Cloud app.

```bash
pnpm install
pnpm docs:dev      # start local dev server
pnpm docs:build    # build for production
```

---

## Examples

The `examples/` directory contains beginner-readable integration examples:

| Category | Examples |
| --- | --- |
| **Core** | Local-only memory, graph memory, CLI workflows |
| **MCP** | Local, cloud, and hybrid MCP setup |
| **Cloud** | `@tekmemo/cloud-client` usage |
| **AI SDK** | `generateText` + `streamText` with memory tools |
| **Frameworks** | Next.js, React Router, Express, Hono, Fastify, NestJS, Astro, SvelteKit, Nuxt, Vite React, TanStack Start |
| **Runtimes** | Node HTTP, Cloudflare Workers |

---

## Workspace Commands

Run all commands from the repo root unless otherwise specified.

```bash
# Install dependencies
pnpm install

# Start all dev servers (via Turborepo)
pnpm dev

# Build all packages and apps
pnpm build

# Build and watch all packages (persistent)
pnpm build:watch

# Type-check everything
pnpm typecheck

# Format and lint (check only)
pnpm format-and-lint

# Format and lint (auto-fix safe changes)
pnpm format-and-lint:fix

# Run all unit tests (single pass)
pnpm test

# Run unit tests in watch mode
pnpm test:watch

# Validate package exports with publint
pnpm lint:package

# Build docs app
pnpm docs:build

# Validate entire workspace
pnpm validate:workspace
```

### Release readiness

Before publishing packages, run:

```bash
pnpm install --frozen-lockfile
pnpm validate:workspace
pnpm release:package-check
pnpm release:dry-run
pnpm docs:build
```

Publish from CI using Changesets and npm trusted publishing/provenance. Do not publish from an unverified local build unless doing an emergency manual release and you have inspected the tarballs.

---

## Contributing

TekMemo is open source and welcomes contributions. Read [`CONTRIBUTING.md`](./CONTRIBUTING.md) before opening a PR.

**Quick contribution rules:**
- Branch naming: `feat/<short-description>`, `fix/<short-description>`, `chore/<short-description>`
- Commit messages: imperative mood, present tense (`add memory patch utility`, not `added...`)
- Run `pnpm format-and-lint:fix` before committing
- Run `pnpm typecheck` before opening a PR
- Unit tests are mandatory for every new feature
- Do not commit secrets, API keys, or environment values — use `.env` files that are gitignored
- Do not add cloud-specific logic into OSS packages

See [`CODE_OF_CONDUCT.md`](./CODE_OF_CONDUCT.md) for community standards.

---

## Security

For security vulnerabilities, please read [`SECURITY.md`](./SECURITY.md) for responsible disclosure instructions. Do not open a public GitHub issue for security reports.

---

## Repository Boundaries

This OSS repo owns packages, examples, benchmarks, and developer docs.

TekMemo Cloud owns hosted dashboards, billing, pricing pages, legal pages, blog/changelog/tutorial CMS content, connector installs, hosted sync, observability, and managed API deployment.

---

## License

MIT. See [`LICENSE`](./LICENSE).
