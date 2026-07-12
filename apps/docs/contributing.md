---
title: Contributing
description: How to contribute to MemoFS
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
pnpm build
pnpm test
```

## Development workflow

1. Create a branch from `main`:

```bash
git checkout -b feat/my-feature main
```

2. Make your changes in the relevant package under `packages/`.

3. Run checks before committing:

```bash
pnpm typecheck
pnpm test
pnpm lint
```

4. Commit using [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(core): add memory compaction
fix(cli): handle missing config gracefully
docs: update API reference
```

5. Open a PR against `main`. The PR template will guide you through the checklist.

## Where to help

- **Good first issues**: [View on GitHub](https://github.com/memo-fs/memofs/conissues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22)
- **Documentation**: Improving guides, fixing typos, adding examples
- **Tests**: Adding test coverage for edge cases
- **Adapters**: Building new embedding or storage adapters

## Project structure

```
packages/
  core/          # Memory runtime
  cli/           # Command line interface
  server/        # Server deployment
  mcp/           # MCP server
  connectors/    # Connector framework
  adapters/      # Provider adapters (OpenAI, Voyage, etc.)
  testing/       # Test utilities
  benchmark-kit/ # Performance benchmarks
```

## Package boundaries

Public `@memofs/*` packages must not contain:

- Cloud billing or tenant routing
- Proprietary service calls
- Secrets or API keys

Keep packages provider-neutral and cloud-optional.

## Need help?

- Open a [discussion](https://github.com/memo-fs/memofs/discussions) for questions
- Check the [roadmap](https://docs.memofs.dev/roadmap) for planned work
- Read the [architecture docs](https://docs.memofs.dev/packages/core/concepts) for design context
