---
title: Contributing
description: How to contribute to MemoFS
sidebar: false
---

# Contributing

MemoFS is open source and contributions are welcome. This page covers the essentials. For the full guide, see [CONTRIBUTING.md](https://github.com/memo-fs/memofs/blob/main/CONTRIBUTING.md) in the repository.

## Prerequisites

- Node.js >= 22
- pnpm >= 9

Enable Corepack first:

```bash
corepack enable
corepack prepare pnpm@9 --activate
```

## Quick start

```bash
git clone https://github.com/memo-fs/memofs.git
cd memofs
pnpm install
pnpm validate:workspace
```

## Development workflow

### 1. Create a branch from `main`:

```bash
git checkout -b feat/my-feature main
```

### 2. Make your changes in the relevant package under `packages/`.

### 3. Validate workspace before committing:

```bash
pnpm validate:workspace
```

### 4. Commit using [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(core): add memory compaction
fix(cli): handle missing config gracefully
docs: update API reference
```

### 5. Open a PR against `main`. The PR template will guide you through the checklist.

## Where to help

- **Good first issues**: [View on GitHub](https://github.com/memo-fs/memofs/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22)
- **Documentation**: Improving guides, fixing typos, adding examples
- **Tests**: Adding test coverage for edge cases
- **Adapters**: Building new embedding or storage adapters

## Project structure

```
packages/
  core/           # Memory runtime
  cli/            # Command line interface
  server/         # Server deployment
  mcp-server/     # MCP server
  connectors/     # Connector framework
  adapter-*/      # Provider adapters (OpenAI, Voyage, R2, Turso, etc.)
  json-rpc/       # JSON-RPC 2.0 primitives
  testing/        # Test utilities
  benchmark-kit/  # Performance benchmarks
```

## Package boundaries

Public `@memofs/*` packages must not contain:

- Cloud billing or tenant routing
- Proprietary service calls
- Secrets or API keys

Keep packages provider-neutral and cloud-optional.

## Need help?

- Open a [discussion](https://github.com/memo-fs/memofs/discussions) for questions
- Check the [roadmap](./roadmap) for planned work
- Read the [architecture docs](/packages/core/concepts) for design context
