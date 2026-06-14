# TekMemo Workspace Runbook

Welcome to the `@tekbreed/oss` workspace runbook. This document provides an operational and architectural overview of the monorepo, its layout, internal module structure, development guidelines, and commands.

---

## Workspace Overview

The TekBreed OSS repository is structured as a **pnpm monorepo** containing:
1. **Public Package**: `@tekbreed/tekmemo` (located in [packages/tekmemo](file:///Users/codingsimba/Desktop/projects/oss/packages/tekmemo)) — the unified file-first memory runtime.
2. **Docs App**: `apps/docs` — the VitePress-based documentation site.
3. **Tooling**: `@repo/*` packages in [tooling](file:///Users/codingsimba/Desktop/projects/oss/tooling) — private workspace support for builds, tests, and configuration.

### Workspace Layout

```txt
tekbreed-oss/
├── apps/
│   └── docs/                  # VitePress docs site
├── packages/
│   ├── tekmemo/               # Unified TekMemo source package
│   │   ├── src/               # Main source tree (all modules)
│   │   └── tests/             # Workspace tests (unit, integration, contracts)
│   ├── tekcode-cli/           # Future TekCode placeholder
│   └── tekcode-desktop/       # Future TekCode placeholder
├── tooling/                   # Private `@repo/*` workspace tooling
│   ├── test-utils/            # Contract tests, fakes, and fixtures
│   ├── tsdown-config/         # Shared build configurations
│   └── typescript-config/     # Shared TypeScript config base
├── docs/                      # General repository and operational notes
├── projects/                  # Architectural notes and plans
└── scripts/                   # Repository maintenance scripts
```

---

## Module Map (`packages/tekmemo/src/`)

All TekMemo capabilities live as **internal modules** under `packages/tekmemo/src/` and are re-exported from the package root: [index.ts](file:///Users/codingsimba/Desktop/projects/oss/packages/tekmemo/src/index.ts). There are **no public subpath imports** or separate adapter packages.

| Module | Description |
| :--- | :--- |
| **`core`** | Fundamental constants, schemas, interfaces, default templates, validation, errors, and memory store contracts. |
| **`fs`** | Local filesystem storage implementation (`NodeFsMemoryStore`), safe paths, directories, atomic writes, and missing-file behavior. |
| **`openai`** | OpenAI client and embeddings adapter (`OpenAIEmbedder`). |
| **`voyageai`** | VoyageAI client and embeddings adapter (`VoyageEmbedder`). |
| **`upstash-vector`**| Upstash Vector integration (`UpstashRecallStore`). |
| **`recall`** | Vector recall abstractions, cosine similarity metrics, and filter evaluations. |
| **`rerank`** | Reranking interfaces and deterministic fallback rerankers. |
| **`rerank-voyage`** | VoyageAI-backed reranking adapter (`VoyageReranker`). |
| **`agentfs`** | AgentFS workspace client and remote adapter capabilities. |
| **`graph`** | Graph-structured memory contracts and utilities. |
| **`ai-sdk`** | Vercel AI SDK utility integrations (tools, system prompts, structures). |
| **`cli`** | Local memory CLI commands (`init`, `search`, `inspect`, `edit`, `agent`). |
| **`mcp-server`** | Model Context Protocol (MCP) server boundary for exposing memory tools to agents. |
| **`cloud-client`** | Connection client for TekMemo Cloud API (without SaaS business logic). |
| **`benchmark-kit`** | Performance benchmarking kit and test runners. |
| **`testing`** | Shared test-only fixtures and mock implementations. |

---

## Canonical Local Protocol

By default, TekMemo writes its file-first structure under a `.tekmemo` directory at the project root:

```txt
.tekmemo/
├── manifest.json              # Version, capabilities, and schema configuration
├── memory/
│   ├── core.md                # System prompt instructions and global core memory
│   └── notes.md               # User-appended timestamped notes
├── events/
│   ├── memory-events.jsonl    # Log of all mutating operations and events
│   └── conversations.jsonl    # Active chat history logs
├── indexes/
│   └── chunks.jsonl           # Document text chunks mapped to IDs and sources
├── graph/
│   ├── nodes.jsonl            # Graph memory vertices
│   └── edges.jsonl            # Graph memory relationships
└── snapshots/
    └── snapshots.jsonl        # Incremental snapshot log
```

---

## Workspace Commands

All operations should be initiated from the repository root:

```bash
# Clean install all dependencies
pnpm install

# Build the packages and modules
pnpm build

# Run TypeScript checks across the workspace
pnpm typecheck

# Run tests
pnpm test

# Format code and check style rules
pnpm format-and-lint

# Automatically fix format/lint errors
pnpm format-and-lint:fix

# Validate package settings
pnpm lint:package

# Launch the docs site local dev server
pnpm docs:dev

# Build the docs site for production
pnpm docs:build

# Validate workspace settings
pnpm validate:workspace
```

---

## Style & Safety Rules

1. **Exports Consolidation**: All public APIs must be re-exported through [packages/tekmemo/src/index.ts](file:///Users/codingsimba/Desktop/projects/oss/packages/tekmemo/src/index.ts). Subpath imports are prohibited.
2. **Typing Standards**: Always use TypeScript strict mode. Prefer `unknown` for unchecked outer boundaries. Avoid using `any` unless explicitly justified by comments.
3. **Style and Formatting**: Use Biome for formatting (uses tabs and double quotes). Do not install Prettier.
4. **SaaS Boundary**: Do not add billing, tenancy, user dashboards, or encrypted BYOK storage to the open-source repository. Keep cloud features strictly bounded to client transport APIs (`@tekbreed/tekmemo/cloud`).
5. **Credentials Security**: Do not hardcode or commit keys, secrets, `.env` configs, or cloud credentials. Pass security tokens down from host applications at runtime.
