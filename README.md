# TekMemo

**File-first memory infrastructure for AI apps and agents.**

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![npm](https://img.shields.io/npm/v/tekmemo?label=npm)](https://www.npmjs.com/package/tekmemo)
[![CI](https://github.com/tekbreed/tekmemo/actions/workflows/ci.yml/badge.svg)](https://github.com/tekbreed/tekmemo/actions/workflows/ci.yml)
[![Docs](https://github.com/tekbreed/tekmemo/actions/workflows/deploy-docs.yml/badge.svg)](https://github.com/tekbreed/tekmemo/actions/workflows/deploy-docs.yml)
[![Sponsor](https://img.shields.io/badge/sponsor-GitHub%20Sponsors-ff69b4)](https://github.com/sponsors/christophersesugh)
[![PRs welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](./CONTRIBUTING.md)

TekMemo is an open-source memory runtime for AI applications. It gives agents, chat apps, coding tools, copilots, workflow systems, and developer platforms a structured way to store, organize, recall, sync, and inspect long-lived context.

TekMemo is built around a simple idea:

> AI apps should not depend only on short chat history. They need durable, inspectable, portable memory.

TekMemo provides the open-source packages for that memory layer.

TekMemo Cloud is a separate hosted product that adds team workspaces, hosted sync, MCP access, production observability, billing, usage controls, and managed infrastructure.

---

## What TekMemo solves

Most AI apps lose useful context because memory is scattered across:

- chat history
- local files
- vector databases
- logs
- prompts
- user preferences
- project documents
- embeddings
- tool calls
- disconnected app-specific storage

TekMemo gives you a consistent memory layer for these concerns.

It helps you answer questions like:

- What should this AI assistant remember?
- Where is memory stored?
- How is memory recalled?
- Which source produced this memory?
- Can I inspect or export it?
- Can I sync it?
- Can another agent or MCP client use it?
- Can I evaluate whether recall is working?

---

## Core idea

TekMemo is **file-first**.

That means memory can be represented as structured, portable files before it is pushed into vector stores, cloud systems, or external tools.

A typical local memory workspace may look like this:

```txt
.tekmemo/
├── manifest.json
├── memory/
│   ├── core.md
│   └── notes.md
├── events/
│   ├── memory-events.jsonl
│   └── conversations.jsonl
├── indexes/
│   └── chunks.jsonl
├── graph/
│   ├── nodes.jsonl
│   └── edges.jsonl
└── snapshots/
    └── snapshots.jsonl
```

Behind the scenes, this makes TekMemo:

- portable
- inspectable
- testable
- source-controlled when needed
- local-first when needed
- cloud-syncable later
- easier to debug than hidden memory stores

---

## Sponsor TekMemo

TekMemo is open-source memory infrastructure for AI apps and agents.

If TekMemo helps your work, you can support ongoing development, maintenance, documentation, benchmarks, examples, and new integrations through GitHub Sponsors.

[💖 Sponsor TekMemo](https://github.com/sponsors/christophersesugh)

Sponsorship helps fund:

- package maintenance
- documentation
- examples
- benchmarks
- provider integrations
- MCP support
- memory tooling
- open-source issue triage

---

## Repository status

TekMemo is under active development.

The public OSS repository contains the open-source runtime, adapters, docs, examples, and package infrastructure.

The private TekMemo Cloud repository contains hosted cloud functionality such as:

- tenant routing
- billing
- usage enforcement
- encrypted BYOK storage
- hosted dashboards
- internal admin tooling
- managed cloud APIs

This repo intentionally does **not** contain private TekMemo Cloud implementation details.

---

## Packages

### Core runtime

| Package            | Purpose                                                                          |
| ------------------ | -------------------------------------------------------------------------------- |
| `tekmemo`          | Core memory contracts, records, chunks, source refs, and `.tekmemo/` conventions |
| `@tekmemo/fs`      | Local filesystem-backed memory store                                             |
| `@tekmemo/agentfs` | AgentFS/Turso AgentFS-backed memory store and sync hooks                         |
| `@tekmemo/ai-sdk`  | AI SDK tool definitions and memory tool bridge                                   |

### Embeddings

| Package             | Purpose                    |
| ------------------- | -------------------------- |
| `@tekmemo/voyageai` | Voyage AI embedding adapter |
| `@tekmemo/openai`   | OpenAI embedding adapter    |

### Vector recall

| Package                   | Purpose                                  |
| ------------------------- | ---------------------------------------- |
| `@tekmemo/recall`         | Provider-neutral vector recall contracts |
| `@tekmemo/upstash-vector` | Upstash Vector recall adapter            |

### Reranking

| Package                  | Purpose                              |
| ------------------------ | ------------------------------------ |
| `@tekmemo/rerank`        | Provider-neutral reranking contracts |
| `@tekmemo/rerank-voyage` | Voyage reranking adapter             |

### Advanced memory and ingestion

| Package                  | Purpose                                             |
| ------------------------ | --------------------------------------------------- |
| `@tekmemo/benchmark-kit` | Benchmark runner and reproducible performance tests |
| `@repo/test-utils`       | Testing utilities for TekMemo packages              |

---

## Repository structure

```txt
tekmemo/
├── apps/
│   ├── docs/
│   └── slides/
│
├── packages/
│   ├── tekmemo/                # Core memory model, types, and utilities
│   ├── ai-sdk/                 # Vercel AI SDK integration
│   ├── fs/                     # Local filesystem adapter
│   ├── agentfs/                # AgentFS adapter
│   ├── openai/                 # OpenAI embedding adapter
│   ├── upstash-vector/         # Upstash Vector adapter
│   ├── voyageai/               # Voyage AI embedding adapter
│   ├── recall/                 # Semantic recall memory
│   ├── rerank/                 # Provider-neutral reranking
│   ├── rerank-voyage/          # Voyage reranking adapter
│   ├── benchmark-kit/          # Benchmarking tools
│   ├── test-utils/             # Testing utilities
│   ├── tsdown-config/          # Shared tsdown config (internal)
│   ├── typescript-config/      # Shared tsconfig bases (internal)
│   └── utils/                  # Shared utility helpers (internal)
│
├── benchmarks/                 # Private benchmark suites and release gates
├── examples/                   # Runnable example projects
│
├── .github/
├── README.md
├── CONTRIBUTING.md
├── SECURITY.md
├── CODE_OF_CONDUCT.md
├── LICENSE
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
└── biome.json
```

---

## Requirements

Use the following versions or newer:

```txt
Node.js >= 22
pnpm >= 9
```

Recommended:

```bash
corepack enable
corepack prepare pnpm@9 --activate
```

---

## Getting started

Clone the repository:

```bash
git clone https://github.com/tekmemo/tekmemo.git
cd tekmemo
```

Install dependencies:

```bash
pnpm install
```

Build all packages:

```bash
pnpm build
```

Run tests:

```bash
pnpm test
```

Run type checks:

```bash
pnpm typecheck
```

Run lint/checks:

```bash
pnpm format-and-lint
```

Start the docs app:

```bash
pnpm --filter docs dev
```

Start the slides app:

```bash
pnpm --filter slides dev
```

---

## Common commands

```bash
pnpm build
```

Build all packages and apps.

```bash
pnpm test
```

Run all tests.

```bash
pnpm typecheck
```

Run TypeScript checks.

```bash
pnpm format-and-lint
```

Run formatting and lint checks.

```bash
pnpm format-and-lint:fix
```

Auto-fix formatting and lint issues.

---

## Basic usage

Install the core package:

```bash
pnpm add tekmemo
```

Install a local filesystem store:

```bash
pnpm add @tekmemo/fs
```

Install recall packages:

```bash
pnpm add @tekmemo/recall @tekmemo/upstash-vector @tekmemo/openai
```

Example:

```ts
import {
	bootstrapMemoryStore,
	readCoreMemory,
	writeCoreMemory,
} from "tekmemo";
import { createNodeFsMemoryStore } from "@tekmemo/fs";

const store = createNodeFsMemoryStore({
	rootDir: ".tekmemo",
});

await bootstrapMemoryStore(store, { projectId: "local-app" });

await writeCoreMemory(
	store,
	"# Core Memory\n\n- TekMemo provides file-first memory for AI apps and agents.\n",
);

const coreMemory = await readCoreMemory(store);
```

---

## Design principles

TekMemo packages follow these principles:

### 1. File-first

Memory should be inspectable and portable.

### 2. Provider-neutral

Core packages should not depend on a specific AI provider, vector database, cloud vendor, or hosted service.

### 3. Adapter-driven

External systems should be integrated through adapters.

### 4. BYOK-friendly

Provider adapters should allow users to bring their own keys.

### 5. Cloud-optional

Open-source packages must work without TekMemo Cloud.

### 6. Testable with fake clients

Adapters should support fake clients, mock transports, and deterministic tests.

### 7. Clear package boundaries

Each package should own one concern.

### 8. Production safety

Packages should handle malformed input, unsafe metadata, cancellation, timeouts, retries, limits, and edge cases.

---

## Package boundary rules

A package should not reach into unrelated concerns.

For example:

```txt
tekmemo
  owns core memory contracts and records

@tekmemo/fs
  owns filesystem-backed storage

@tekmemo/recall
  owns provider-neutral recall contracts

@tekmemo/upstash-vector
  owns Upstash Vector adapter
```

A package should not silently own:

- billing
- tenancy
- usage limits
- hosted API keys
- dashboards
- private cloud deployment logic
- admin tooling

Those belong outside this public OSS repo.

---

## Documentation

Public docs are hosted at:

```txt
yet to be determined
```

The docs app lives in:

```txt
apps/docs
```

Slides live in:

```txt
apps/slides
```

Public architecture docs live in:

```txt
apps/docs/architecture/
```

---

## Examples

Examples live in:

```txt
examples/
```

Current runnable examples include:

```txt
local-only
```

Each example should be runnable and should explain what it demonstrates.

---

## Releases

TekMemo uses Changesets for package versioning.

Before publishing, make sure:

```bash
pnpm release:check
```

all pass.

---

## Contributing

Contributions are welcome.

Please read:

[CONTRIBUTING](./CONTRIBUTING.md)

[CODE_OF_CONDUCT](./CODE_OF_CONDUCT.md)

[SECURITY](./SECURITY.md)

before opening issues or pull requests.

---

## Security

Please do not report security issues through public GitHub issues.

See [SECURITY.md](./SECURITY.md) for responsible disclosure instructions.

---

## License

[MIT License](./LICENSE)
