# TekMemo

<p align="center">
  <img src="./assets/architecture.svg" alt="TekMemo Architecture" width="100%" />
</p>

[![npm](https://img.shields.io/npm/v/tekmemo?label=tekmemo)](https://www.npmjs.com/package/tekmemo)
[![CI](https://github.com/tekbreed/tekmemo/actions/workflows/ci.yml/badge.svg)](https://github.com/tekbreed/tekmemo/actions/workflows/ci.yml)
[![Docs](https://img.shields.io/badge/docs-online-blue)](https://docs.memo.tekbreed.com/)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![PRs welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](./CONTRIBUTING.md)
[![Sponsor](https://img.shields.io/badge/sponsor-GitHub%20Sponsors-ff69b4)](https://github.com/sponsors/christophersesugh)

**Inspectable, file-first memory infrastructure for AI apps, agents, coding tools, and MCP clients.**

TekMemo is an open-source memory layer for AI software. It gives apps and agents a structured way to store durable memory, inspect what was saved, recall context for a task, sync local and cloud memory, expose memory through MCP, and integrate with the Vercel AI SDK.

TekMemo is deliberately **file-first**. Local memory starts in a readable `.tekmemo/` directory, then can be indexed, synced, queried, benchmarked, or exposed through cloud/client adapters.

```txt
.tekmemo/
├── manifest.json
├── memory/
│   ├── core.md
│   └── notes.md
├── events/
│   └── memory-events.jsonl
├── indexes/
│   └── chunks.jsonl
├── graph/
│   ├── nodes.jsonl
│   └── edges.jsonl
└── snapshots/
    └── snapshots.jsonl
```

## Install

For local file-backed memory:

```bash
pnpm add tekmemo @tekmemo/fs
```

For the CLI:

```bash
pnpm add -D @tekmemo/cli
pnpm exec tekmemo init
pnpm exec tekmemo remember "Use local-first memory for development" --kind decision
pnpm exec tekmemo context --query "current task" --json
```

For MCP:

```bash
pnpm add @tekmemo/mcp-server @tekmemo/cloud-client tekmemo @tekmemo/fs
```

For Vercel AI SDK tools:

```bash
pnpm add @tekmemo/ai-sdk ai tekmemo @tekmemo/fs
```

For the adapters convenience package:

```bash
pnpm add @tekmemo/adapters
# Then import implementation APIs from subpaths, for example:
# @tekmemo/adapters/ai-sdk
# @tekmemo/adapters/voyageai
```

## AI SDK quick start

```ts
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { createNodeFsMemoryStore } from "@tekmemo/fs";
import {
  buildRuntimeMemoryContext,
  buildRuntimeMemoryToolDefinition,
  createLocalAiSdkRuntime,
} from "@tekmemo/adapters/ai-sdk";

const workspace = createNodeFsMemoryStore({
  rootDir: process.cwd(),
  createRoot: true,
  missingFileBehavior: "empty",
});

const access = {
  projectId: "my-project",
  userId: "user_123",
  conversationId: "thread_456",
};

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
  tools: { memory: buildRuntimeMemoryToolDefinition({ runtime, access, allowWrites: true }) },
});

console.log(result.text);
```

## Package map

| Package | Purpose |
| --- | --- |
| `tekmemo` | Core memory contracts, records, source refs, chunks, and `.tekmemo/` protocol helpers. |
| `@tekmemo/fs` | Node filesystem adapter for local `.tekmemo/` memory. |
| `@tekmemo/graph` | Graph-memory primitives: nodes, edges, relationships, and traversal contracts. |
| `@tekmemo/cloud-client` | Project-scoped TekMemo Cloud API client. Used by CLI, MCP, AI SDK, and custom apps. |
| `@tekmemo/cli` | Local, cloud, and hybrid command-line workflows. |
| `@tekmemo/mcp-server` | MCP server/runtime adapter exposing TekMemo tools, resources, and prompts. |
| `@tekmemo/ai-sdk` | Vercel AI SDK tool bridge for reading and writing memory. |
| `@tekmemo/adapters` | Convenience subpath reexports for AgentFS, AI SDK, cloud, provider, vector, and rerank adapters. |
| `@tekmemo/server` | Hono-based self-host memory server package for Node, Docker, and Cloudflare wrappers. |
| `@tekmemo/recall` | Provider-neutral recall contracts. |
| `@tekmemo/upstash-vector` | Upstash Vector recall adapter. |
| `@tekmemo/rerank` | Provider-neutral reranking contracts. |
| `@tekmemo/rerank-voyage` | Voyage AI reranking adapter. |
| `@tekmemo/voyageai` | Voyage AI embedding adapter. |
| `@tekmemo/openai` | OpenAI embedding adapter. |
| `@tekmemo/benchmark-kit` | Benchmark runner and performance test helpers. |

## Adapter imports

`tekmemo` stays solo and provider-neutral. Applications can either install direct adapter packages or use `@tekmemo/adapters` as a convenience entrypoint. Implementation APIs are exposed through subpaths so the root package does not load optional peer dependencies.

```ts
import { buildRuntimeMemoryToolDefinition } from "@tekmemo/adapters/ai-sdk";
import { createTekMemoAgentSession } from "@tekmemo/adapters/agentfs";
import { createVoyageEmbedder } from "@tekmemo/adapters/voyageai";
import { createOpenAIEmbedder } from "@tekmemo/adapters/openai";
import { createUpstashRecallStore } from "@tekmemo/adapters/upstash-vector";
import { createVoyageReranker } from "@tekmemo/adapters/rerank-voyage";
import { createTekMemoCloudClient } from "@tekmemo/adapters/cloud-client";
```

## Runtime choices

| Runtime | Use it when |
| --- | --- |
| Local | You want inspectable `.tekmemo/` files and no hosted dependency. |
| Cloud | You want hosted project memory, API keys, sync, and team/cloud workflows. |
| Hybrid | You want local files plus cloud recall/sync. |
| MCP | You want Claude Code, Codex, Cursor, OpenCode-style tools, or other MCP clients to use TekMemo memory. |
| AI SDK | You want `generateText`, `streamText`, or agent workflows to use scoped TekMemo memory. |
| Self-host Node | You want a portable Hono memory server for Dockerfile hosts such as Railway, Fly.io, Render, Coolify, or VPS deployments. |
| Docker Compose | You want local/private-server packaging with API, worker, Postgres/pgvector, and MinIO. |

## Repository structure

```txt
tekmemo/
├── apps/
│   ├── docs/                  # Developer docs app
│   ├── self-host-node/        # Portable Node self-host runtime
│   ├── self-host-docker/      # Docker Compose packaging
│   └── self-host-cloudflare/  # Cloudflare Workers wrapper
├── benchmarks/                # Benchmark suites and release gates
├── examples/                  # Runnable integration examples
├── packages/                  # Published packages and internal workspace packages
├── .github/                   # CI, docs deploy, release, and benchmark workflows
├── package.json
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
└── turbo.json
```

## Self-host memory server

TekMemo self-hosting is built around `@tekmemo/server`, not the full TekMemo Cloud SaaS app. The current Node/Docker baseline uses Hono, Postgres, a Postgres-backed queue, and S3-compatible object storage. Docker Compose packages the same Node runtime with Postgres/pgvector and MinIO.

```bash
cp apps/self-host-docker/.env.example apps/self-host-docker/.env
docker compose -f apps/self-host-docker/docker-compose.yml up --build
```

Railway/Fly/Render-style hosts should deploy `apps/self-host-node/Dockerfile` directly and run the API and worker as separate processes from the same image.

## Developer docs

The VitePress docs app in `apps/docs` is developer-facing only. Marketing pages, blog, changelog, tutorials/demos, pricing, compare, legal, and cloud-product pages belong in the TekMemo Cloud app/CMS.

```bash
pnpm install
pnpm docs:dev
pnpm docs:build
```

## Examples

The `examples/` folder contains beginner-readable examples for:

- local-only memory
- graph memory
- CLI workflows
- MCP local/cloud/hybrid setup
- `@tekmemo/cloud-client`
- AI SDK tools
- Next.js
- React Router
- Express
- Hono
- Cloudflare Workers
- TanStack Start-style routing
- Node HTTP
- Fastify
- NestJS
- Astro
- SvelteKit
- Nuxt
- Vite React

## Workspace commands

```bash
pnpm check
pnpm typecheck
pnpm test
pnpm build
pnpm lint:package
pnpm docs:build
pnpm validate:workspace
```

## Release readiness

Before publishing packages, run:

```bash
pnpm install --frozen-lockfile
pnpm validate:workspace
pnpm release:package-check
pnpm release:dry-run
pnpm docs:build
```

Public packages include package-level release checks:

```bash
pnpm --filter @tekmemo/cloud-client release:check
pnpm --filter @tekmemo/mcp-server release:check
pnpm --filter @tekmemo/cli release:check
pnpm --filter @tekmemo/ai-sdk release:check
pnpm --filter @tekmemo/adapters release:check
```

Publish from CI using Changesets and npm trusted publishing/provenance. Do not publish from an unverified local build unless you are doing an emergency manual release and have inspected the tarballs.

## Repository boundaries

This OSS repo owns packages, examples, benchmarks, and developer docs.

TekMemo Cloud owns hosted dashboards, billing, pricing pages, legal pages, blog/changelog/tutorial CMS content, connector installs, hosted sync, observability, and managed API deployment.

## License

MIT.

See [`SELF_HOSTING.md`](./SELF_HOSTING.md) for the current self-host server architecture.
