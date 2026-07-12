<div align="center">

<img src="./assets/images/logo.svg" alt="MemoFS Logo" width="120" />

# MemoFS

Open-source, file-first memory for AI applications and agents.

</div>

<p align="center">
  <a href="https://www.npmjs.com/package/@memofs/core"><img src="https://img.shields.io/npm/v/%40memofs%2Fcore?label=%40memofs%2Fcore&style=for-the-badge" alt="npm version" /></a> &nbsp;
  <a href="https://github.com/memo-fs/memofs"><img src="https://img.shields.io/badge/status-beta-blue?style=for-the-badge" alt="Project status: Beta" /></a> &nbsp;
  <a href="https://github.com/memo-fs/memofs/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/memo-fs/memofs/ci.yml?branch=main&style=for-the-badge&label=CI" alt="CI status" /></a> &nbsp;
  <a href="https://docs.memofs.dev/"><img src="https://img.shields.io/badge/docs-online-blue?style=for-the-badge" alt="Docs" /></a> &nbsp;
  <a href="./LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg?style=for-the-badge" alt="MIT License" /></a>
</p>

---

## What is MemoFS?

**File-first memory for AI applications and agents.** Store, recall, and synchronize memory using plain files on disk — local-first by default, with optional cloud sync.

Most AI memory systems are database-first, vendor-locked, hard to inspect, and hard to version. MemoFS inverts that: your agent's memory lives as Markdown and JSONL under a `.memofs/` directory you can `cat`, `git diff`, and roll back.

```text
.memofs/
├── config.json       # Workspace settings and engine routing
├── manifest.json     # Asset registry tracking and hashes
├── memory/
│   ├── core.md       # Durable, project-wide facts (Markdown)
│   └── notes.md      # Timestamped notes and logs (Markdown)
├── events/
│   └── conversations.jsonl # Chronological interactions for recall
├── graph/
│   ├── nodes.jsonl   # Entities extracted from memory
│   └── edges.jsonl   # Relational connections
└── snapshots/
    └── snap_123.json # Versioned restore checkpoints
```

---

## Quick Start

Reach first success in under a minute. No API keys, no database setup, no cloud required.

```bash
npm install @memofs/core
```

```ts
import { MemoFS } from "@memofs/core";
import { createNodeFsMemoryStore } from "@memofs/core/node-fs";

// Initialize a Node.js filesystem-backed memory store
const store = createNodeFsMemoryStore({
  rootDir: "./.memofs",
});

// Create the unified client
const memo = new MemoFS({
  store,
  projectId: "my-app",
  mode: "local",
});

// Read project-wide core memory (core.md)
const core = await memo.read({ kind: "core" });
console.log(core.content);

// Record a durable note (notes.md)
await memo.write({
  kind: "notes",
  content: "User prefers TypeScript with ESM modules.",
});

// Recall works offline (lexical BM25 + fuzzy matching) with zero config
const hits = await memo.recall({
  query: "TypeScript configuration",
});
```

To upgrade to semantic/vector search, plug in an embedder adapter like OpenAI (`@memofs/adapter-openai`) or Voyage AI (`@memofs/adapter-voyage`). For **zero-API-key local vector search**, enable the ONNX embedder (`@memofs/adapter-transformers`) to run embeddings completely in-process.

To connect your coding agent (Cursor, Claude Code, etc.), use the stdio-compatible [@memofs/mcp-server](packages/mcp-server).

---

## Architecture

```text
Your App / Agent / MCP client
        │
        ▼
    MemoFS   (local-first runtime)
      ├─ .read() / .write() / .recall()
      ├─ .snapshot.create() / .restore()
      ├─ AgentFS  (lease-locking & virtual paths)
      └─ .sync *  (Cloud sync pushes and pulls)

   read() / write() / recall() — core client methods
        │
        ▼
   .memofs/   (plain files on disk)
     ├─ memory/core.md      ├─ memory/notes.md
     ├─ events/*.jsonl      ├─ graph/{nodes,edges}.jsonl
     └─ snapshots/  manifest.json
        │   git-friendly, inspectable, versionable
        ▼   (optional)
   MemoFS Cloud
```

The runtime resolves configuration from constructor options → env vars → `.memofs/config.json`.
Three runtime modes are supported: **`local`** (filesystem-only, default), **`hybrid`** (local + cloud sync with read/write policies), and **`memory`** (in-memory volatile, ideal for tests).

---

## Packages

MemoFS is structured as a monorepo containing 15 published public packages under the `@memofs/` scope (with the unscoped `memofs` CLI).

### Core Engine & Servers

| Package | Purpose |
| --- | --- |
| [`@memofs/core`](packages/core) | Core runtime, virtual AgentFS, graph engine, and hybrid recall router. |
| [`@memofs/cli`](packages/cli) | CLI tool for local and cloud memory workflows (`npx memofs`). |
| [`@memofs/server`](packages/server) | Self-hostable, OSS-deployable memory server for Node and Workers. |
| [`@memofs/mcp-server`](packages/mcp-server) | Model Context Protocol server exposing memory tools to AI agents. |
| [`@memofs/connectors`](packages/connectors) | Local ingestion framework plugins (Notion, GitHub). |
| [`@memofs/json-rpc`](packages/json-rpc) | Message schemas and validation for JSON-RPC 2.0. |

### Providers & Adapters

| Package | Purpose |
| --- | --- |
| [`@memofs/adapter-ai-sdk`](packages/adapter-ai-sdk) | Vercel AI SDK integration, runtime bridges, and tool definitions. |
| [`@memofs/adapter-openai`](packages/adapter-openai) | OpenAI embeddings adapter. |
| [`@memofs/adapter-voyage`](packages/adapter-voyage) | Voyage AI embedder and reranker adapter. |
| [`@memofs/adapter-transformers`](packages/adapter-transformers) | ONNX local embedder (Transformers.js) for zero-API-key hybrid recall. |
| [`@memofs/adapter-workers-ai`](packages/adapter-workers-ai) | Cloudflare Workers AI graph extractor adapter. |
| [`@memofs/adapter-r2`](packages/adapter-r2) | Cloudflare R2 Blob storage adapter. |
| [`@memofs/adapter-turso`](packages/adapter-turso) | Turso / libSQL metadata store adapter. |

### Development Tooling

| Package | Purpose |
| --- | --- |
| [`@memofs/testing`](packages/testing) | Shared contract tests, mocks, fakes, and fixtures. |
| [`@memofs/benchmark-kit`](packages/benchmark-kit) | Benchmark workloads and runners. |

---

## Open Source vs. MemoFS Cloud

The **core runtime is open source** (MIT) and fully functional locally. You do not need a cloud account to run MemoFS.

**MemoFS Cloud** acts as a secure replica layer on top of your local files, enabling memory sync across multiple machines.

| Feature | Open source (this repo) | MemoFS Cloud |
| --- | --- | --- |
| Local file-first memory | ✅ | ✅ |
| CLI + stdio MCP server | ✅ | ✅ |
| All adapters (OpenAI, Voyage, etc.) | ✅ | ✅ |
| Hosted sync (keep memory in sync) | ✅ client | ✅ hosted |
| Hosted managed MCP endpoint | — | ✅ available |
| Team Workspaces & Access Control | — | Planned |
| Managed-runtime (Recall/Graph host) | — | Roadmap |

[Join the Cloud waitlist →](https://memofs.dev)

---

## Repository Structure

```text
memofs/
├── apps/
│   ├── docs/         # VitePress documentation (docs.memofs.dev)
│   └── cloud/        # MemoFS Cloud dashboard (Cloudflare Worker app)
├── packages/         # 15 published @memofs/* packages
├── tooling/          # Private @repo/* workspace build packages
├── benchmarks/       # Workspace benchmarking suite
├── examples/         # Runnable examples
└── package.json
```

---

## Workspace Commands

Run these command tasks from the repository root:

```bash
# Install all dependencies
pnpm install

# Build all packages and applications
pnpm build

# Run TypeScript compilation checks
pnpm typecheck

# Run unit tests across all packages
pnpm test

# Run code style checks (Biome)
pnpm format-and-lint

# Fix linting and formatting issues automatically
pnpm format-and-lint:fix

# Build documentation locally
pnpm docs:build
```

---

## Contributing

See [`CONTRIBUTING.md`](./CONTRIBUTING.md) for details on formatting, testing, and pull requests.
For roadmap targets, see [`ROADMAP.md`](./ROADMAP.md).

For security reports, refer to [`SECURITY.md`](./SECURITY.md) — **do not** open public issues for security vulnerabilities.

---

## License

MIT. See [`LICENSE`](./LICENSE).
