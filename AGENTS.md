# MemoFS — Agent Guidelines

MemoFS is the open-source, file-first memory runtime for AI agents.

## Monorepo Architecture

- **Package Manager & Monorepo**: `pnpm` workspace with Turborepo.
- **Package Scopes**:
  - `@memofs/*`: Public, published packages (`packages/*`).
  - `@repo/*`: Private internal tooling and build configs (`tooling/*`).
- **Core Runtime & Entrypoints (`@memofs/core`)**:
  - Universal/Edge entrypoint: `@memofs/core` (no Node.js-specific dependencies).
  - Node.js filesystem entrypoint: `@memofs/core/node-fs`.
  - Cloud replication client: `@memofs/core/cloud-client`.
- **Tooling Stack**: TypeScript, Biome for formatting and linting, tsdown / rolldown for builds, Vitest for testing.

## Core Behavioral Principles

- **Positioning & Terminology**: MemoFS is a file-first memory runtime for **AI agents in general** (not exclusively coding agents). Always balance framing 50/50 between **users of AI agents** (running agents day-to-day via MCP or lifecycle hooks) and **builders of AI agents** (building agents and frameworks with `@memofs/core` or `@memofs/server`).
- **Facts Over Assumptions**: Always inspect source code and verify contracts directly. Do not rely on unverified assumptions.
- **Package Boundaries**: Strictly preserve package isolation. Do not import private `@repo/*` packages into public `@memofs/*` distributions.
- **Code Style & Modularity**: Keep source and test files cohesive and modular (target `<= 500 LOC` per file). Use structured logging rather than raw `console.log` in library code.
- **Build Configurations**: Reuse shared build configs from `@repo/tsdown` (`pkgConfig`) rather than duplicating build flags.
- **Clean Git Hygiene**: Never commit secrets, API keys, `.env` files, or gitignored runtime data.

## Workspace Rules

- [Monorepo structure](./.agents/rules/monorepo-structure.md)
- [Package naming](./.agents/rules/package-naming.md)
- [Package boundaries](./.agents/rules/package-boundaries.md)
- [Package build rules](./.agents/rules/package-build-rules.md)
- [Adding a new package](./.agents/rules/adding-new-package.md)
- [Code style](./.agents/rules/code-style.md)
- [TypeScript rules](./.agents/rules/typescript-rules.md)
- [Technology stack](./.agents/rules/technology-stack.md)
- [Development commands](./.agents/rules/development-commands.md)
- [Git conventions](./.agents/rules/git-conventions.md)
- [Testing](./.agents/rules/testing.md)
- [Testing requirements](./.agents/rules/testing-requirements.md)
- [Core concepts](./.agents/rules/core-concepts.md)

