<div align="center">

<img src="./assets/images/logo.svg" alt="TekMemo Logo" width="120" />

# TekMemo

Open-source file-first memory for AI applications and agents.

</div>

<p>
  <a href="https://www.npmjs.com/package/@tekbreed/tekmemo"><img src="https://img.shields.io/npm/v/@tekbreed%2Ftekmemo?label=@tekbreed/tekmemo&style=for-the-badge" alt="npm version" /></a> &nbsp;
  <a href="https://github.com/tekbreed/tekmemo"><img src="https://img.shields.io/badge/status-alpha-orange?style=for-the-badge" alt="Project status: Alpha" /></a> &nbsp;
  <a href="https://github.com/tekbreed/tekmemo/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/tekbreed/tekmemo/ci.yml?branch=main&style=for-the-badge&label=CI" alt="CI status" /></a> &nbsp;
  <a href="https://docs.memo.tekbreed.com/"><img src="https://img.shields.io/badge/docs-online-blue?style=for-the-badge" alt="Docs" /></a> &nbsp;
  <a href="./LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg?style=for-the-badge" alt="MIT License" /></a>
</p>

---

## What is TekMemo?

**File-first memory for AI applications and agents.** Store, recall, and
synchronize memory using plain files on disk — local-first by default, with
optional cloud sync.

Most AI memory systems are database-first, vendor-locked, hard to inspect, and
hard to version. TekMemo inverts that: your agent's memory lives as Markdown and
JSONL under a `.tekmemo/` directory you can `cat`, `git diff`, and roll back.

```text
.tekmemo/
├── memory/
│   ├── core.md           # durable, project-wide facts (Markdown)
│   └── notes.md          # timestamped notes (Markdown)
├── events/
│   └── memory-events.jsonl
├── graph/
│   ├── nodes.jsonl
│   └── edges.jsonl
├── snapshots/
└── manifest.json
```

## Quick start

Reach first success in under a minute. No API keys, no database, no cloud.

```bash
npm install @tekbreed/tekmemo
```

```ts
import { Tekmemo } from "@tekbreed/tekmemo";

const memo = new Tekmemo({ rootDir: "./.tekmemo", projectId: "my-app" });

// Read project-wide core memory
await memo.core.read();

// Record a durable note
await memo.notes.record({ content: "User prefers TypeScript." });

// Recall works offline (lexical BM25 + fuzzy matching) with no embedder configured
const hits = await memo.recall("TypeScript");
```

For semantic/vector recall, plug in an embedder adapter
([`@tekbreed/tekmemo-adapter-openai`](packages/tekmemo-adapter-openai) or
[`-voyage`](packages/tekmemo-adapter-voyage)). For **zero-API-key hybrid
recall**, enable the local ONNX embedder
([`-transformers`](packages/tekmemo-adapter-transformers)) — it runs in-process,
no cloud. For a coding agent (Cursor, Claude Code, etc.), use the
[MCP server](packages/tekmemo-mcp-server).

## Architecture

```text
Your App / Agent / MCP client
        │
        ▼
   Tekmemo   (local-first runtime)
     ├─ .core / .notes / .conversations
     ├─ .graph   ├─ .rerank   ├─ .agentfs
     ├─ .snapshots
     └─ .sync *  (cloud/hybrid only)

   recall() / context() / writeMemory() — query-time + write methods on Tekmemo
        │
        ▼
   .tekmemo/   (plain files on disk)
     ├─ memory/core.md      ├─ memory/notes.md
     ├─ events/*.jsonl      ├─ graph/{nodes,edges}.jsonl
     └─ snapshots/  manifest.json
        │   git-friendly, inspectable, versionable
        ▼   (optional)
   TekMemo Cloud
```

The runtime resolves its mode from constructor args → env vars →
`.tekmemo/config.json`. Three modes: **`local`** (filesystem, default),
**`hybrid`** (local + cloud sync with read/write policies), and **`memory`**
(volatile, for tests). **TekMemo Cloud is reached via the sync client and the
hosted MCP endpoint** — not a runtime mode.

## Packages

TekMemo ships as focused packages under the `@tekbreed/` scope.

| Package | Purpose |
| --- | --- |
| [`@tekbreed/tekmemo`](packages/tekmemo) | Core memory runtime — the `Tekmemo` client, file stores, recall, graph, snapshots, sync. |
| [`@tekbreed/tekmemo-cli`](packages/tekmemo-cli) | The `tekmemo` CLI for local + cloud memory operations. |
| [`@tekbreed/tekmemo-mcp-server`](packages/tekmemo-mcp-server) | Model Context Protocol server (stdio + HTTP) for coding agents. |
| [`@tekbreed/tekmemo-adapter-ai-sdk`](packages/tekmemo-adapter-ai-sdk) | Vercel AI SDK integration — the memory tool, runtime bridge, agent-session helpers. |
| [`@tekbreed/tekmemo-adapter-openai`](packages/tekmemo-adapter-openai) | OpenAI embeddings adapter. |
| [`@tekbreed/tekmemo-adapter-voyage`](packages/tekmemo-adapter-voyage) | Voyage AI embedder + reranker adapter. |
| [`@tekbreed/tekmemo-adapter-transformers`](packages/tekmemo-adapter-transformers) | Zero-config local ONNX embedder — hybrid recall with no API key, no cloud. |
| [`@tekbreed/tekmemo-benchmark-kit`](packages/tekmemo-benchmark-kit) | Benchmark workloads + runners. |
| [`@tekbreed/tekmemo-testing`](packages/tekmemo-testing) | Shared contract tests, fakes, and fixtures. |

```bash
# Core runtime
npm install @tekbreed/tekmemo

# CLI
npx @tekbreed/tekmemo-cli

# MCP server
npx @tekbreed/tekmemo-mcp-server
```

## Open source vs. TekMemo Cloud

The **core runtime is free and open source** (MIT) and usable today in public
beta: file-based memory, the CLI, the stdio MCP server, all adapters, and the
sync client. You can run TekMemo forever without ever talking to a cloud.

**TekMemo Cloud** adds hosted convenience on top of the *same* runtime — it
launches alongside the OSS 1.0. You do not need it to use TekMemo.

| | Open source (this repo) | TekMemo Cloud |
| --- | --- | --- |
| Local file-first memory | ✅ | ✅ |
| CLI + stdio MCP server | ✅ | ✅ |
| All adapters (OpenAI, Voyage, Transformers) | ✅ | ✅ |
| Hosted sync (keep memory in sync across devices) | ✅ client | ✅ hosted |
| Hosted managed MCP endpoint | — | ✅ available |
| Workspaces, observability, audit logs | — | Planned |
| Managed-runtime tier (hosted recall / graph / evals) | — | Roadmap (v1.x/v2) |

The conversion path is intentional: start local, add hosted sync when you need
it, move to team features later — without changing your code.
[Join the Cloud waitlist →](https://memo.tekbreed.com)

## Repository structure

```text
tekmemo/
├── apps/
│   ├── docs/                  # VitePress docs site (docs.memo.tekbreed.com)
│   └── cloud/                   # TekMemo Cloud — Hono API + React Router v8 dashboard (Cloudflare Worker target, per ADR 0005)
├── examples/                  # Runnable examples
├── packages/                  # 9 published @tekbreed/* packages
├── tooling/                   # private @repo/* workspace tooling
├── scripts/                   # repo maintenance scripts
├── biome.json
├── turbo.json
└── pnpm-workspace.yaml
```

## Workspace commands

Run from the repo root:

```bash
pnpm install
pnpm build
pnpm typecheck
pnpm test
pnpm format-and-lint
pnpm format-and-lint:fix
pnpm lint:package
pnpm docs:dev
pnpm docs:build
pnpm validate:workspace
```

## Contributing

Read [`CONTRIBUTING.md`](./CONTRIBUTING.md) before opening a PR. For direction,
see [`ROADMAP.md`](./ROADMAP.md) and [`GOOD_FIRST_ISSUES.md`](./GOOD_FIRST_ISSUES.md).

For security reports, read [`SECURITY.md`](./SECURITY.md) — **do not** open a
public GitHub issue for security vulnerabilities.

## License

MIT. See [`LICENSE`](./LICENSE).
