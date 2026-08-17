# Core Memory

This file stores durable, high-signal memory for the current agent/project.

## Identity

- **Project**: MemoFS
- **Description**: File-first memory runtime for AI agents — versioned, portable, zero-database local execution with cloud synchronization.
- **Monorepo Structure**: pnpm workspace with `@memofs/*` for public packages and `@repo/*` for internal build/test tooling.

## Stable Facts

- **Single Source of Truth**: All project knowledge lives in MemoFS (`.memofs/` canonical structure and MemoFS MCP tools).
- **Core Memory Architecture**: 11 canonical files under `.memofs/` (manifest, memory, events, indexes, graph, snapshots, connectors).
- **Local Decision & Ticket Layer (No GitHub Issues)**: All ADRs, specifications, decisions, and execution tickets are tracked **100% locally** in the gitignored `docs/` directory:
  - `docs/adr/` — Local Architecture Decision Records (`0001-...`, `0028-...`)
  - `docs/architecture/spec-*.md` — Local feature specifications
  - `docs/architecture/tickets-*.md` — Local tracer-bullet execution tickets (checkbox task lists and blocker trees)
  - `docs/architecture/decisions.md` — Living design session log (Q1–Q33, K1–K5)
  - `docs/architecture/s3-execution-plan.md` — Canonical build worklist
  - `docs/CONTEXT.md` — Working glossary and code contracts index
- **Documentation Versioning**: Versioning is anchored to the latest major release line (`v1.3.0-beta.2` / `v1.x` at root `/`). Major versions like `v2.0.0` only appear when formally released.
- **Documentation Multi-Language (i18n)**: Actively supports English (`en-US`, root), Simplified Chinese (`zh-CN`, `/zh/`), Japanese (`ja-JP`, `/ja/`), and Spanish (`es-ES`, `/es/`).
- **Link Auditing**: All markdown documentation must pass `pnpm --filter @memofs/docs check` with zero broken links.
- **Working Glossary**: If a task is not simple and relates to understanding the existing codebase, start with `docs/CONTEXT.md`.

## Preferences

- **Facts Over Assumptions**: ALWAYS answer questions based on verified facts, not assumptions or past knowledge. Conduct thorough research if required.
- **Audience Balance (50/50)**: Always balance content, documentation, and framing 50/50 between **users of AI agents** (running agents day-to-day via MCP or IDE lifecycle hooks) and **builders of AI agents** (building agents, frameworks, and applications with `@memofs/core` or `@memofs/server`).
- **Positioning & Terminology (AI Agents, not just Coding Agents)**: MemoFS is a file-first memory runtime for **AI agents** in general, not exclusively coding agents. Always refer to **AI agents** (never narrow the scope to "AI coding agents" unless referring to a specific coding agent tool/integration).
- **Tooling & Review Skills**:
  - Always use the `technical-writer` skill when writing package READMEs and user-facing documentation.
  - Always use the `code-review` skill to review plan implementation after completing a plan.
  - Always use the `security-reviewer` skill to review code for security vulnerabilities after code review.
- **Code Style & Formatting**: All formatting goes through Biome (Prettier is removed).
- **Build Configurations**: Do not copy-paste tsdown options into new packages — import `pkgConfig` from `@repo/tsdown`.

## Constraints

- **Documentation Multi-Language Synchronization (i18n)**: Whenever English documentation (`apps/docs/**/*.md`) is created, modified, or deleted, you **MUST** synchronously update or create the corresponding localized documentation in all active languages (`zh/` for Simplified Chinese, `ja/` for Japanese, and `es/` for Spanish), and run `pnpm --filter @memofs/docs check` to ensure zero broken links and strict link audit compliance.
- **⚠️ Never Track Internal Docs in Git**: The following paths are gitignored (`.gitignore`) and must never be `git add`-ed (including `git add -f`):
  - `docs/adr/` — ADRs (internal architecture decisions)
  - `docs/architecture/` — decisions log, locked specs, execution plan, tickets, archive
  - `docs/CONTEXT.md` — the working glossary
  These are local-only working artifacts. Never link to these paths from public/tracked files (READMEs, CONTRIBUTING, GOVERNANCE, package READMEs, `examples/`, `apps/docs/`) — a public reader will hit a 404.
- **⚠️ Do Not Add ADR or Ticket Numbers to Public Code/Docs**: Never cite internal doc/ticket numbers (no `ADR-0022`, `ticket #68`, `Batch-6 default #3`, `§B4`). Reference the *behavior or contract* directly (e.g., "drift detection", "5-minute TTL with manifest persistence", "code anchoring").
- **Never Commit Gitignored Files or Secrets**: Before any `git add` or `git commit`, run `git status` and verify every staged file is tracked. Do not commit secrets, API keys, tokens, or `.env` files.
- **No `console.log` in Production Code**: Use structured logging or remove debugging statements before committing.
- **No Unvetted Dependencies**: Do not add new npm dependencies without evaluating if an existing workspace package already covers the need.
- **No Package Scope Violations**: Do not use `@repo/` for public OSS packages — that scope is strictly reserved for internal monorepo tooling.
- **No Unnecessary Full Builds**: Do not run `pnpm build` during a code-editing session unless explicitly validating production correctness.

## Architecture Patterns

- **DRY & SSOT Everywhere**: Enforce Single Source of Truth and Don't-Repeat-Yourself across the **entire workspace**. Do not duplicate knowledge, logic, constants, or copy that already lives elsewhere — extract to a shared module, type, or constant and import it.
- **Three Unified Runtime Modes**:
  - *Local Mode*: Direct filesystem I/O in `.memofs/`, offline-first, zero network latency.
  - *Hybrid Mode*: Local speed with automatic asynchronous two-phase replication to MemoFS Cloud.
  - *Managed Mode*: Memory as an API via hosted MCP endpoint or cloud API without local files.
- **Subpath Package Boundaries (`@memofs/core`)**:
  - `@memofs/core`: Edge/Workers/universal entry (no `node:fs` dependencies).
  - `@memofs/core/node-fs`: Node.js-only entry (`createNodeMemoFs`, `NodeFsMemoryStore`).
  - `@memofs/core/cloud-client`: Two-phase replication client for MemoFS Cloud.
- **Progressive Context Disclosure**: `memofs.context()` enforces token budgeting and section expansion cursors to eliminate LLM prompt bloat.
- **Code Anchoring & Drift Detection**: Memories anchor to code paths and SHA-256 hashes (`AnchorRef`). When underlying code changes, relevance decays deterministically.
- **Durability Classification**:
  - `durable`: High-signal decisions and facts written to `notes.md` and indexed in BM25/vector recall and the knowledge graph.
  - `transient`: Working scratchpad notes written to `notes.md` and audit events, but excluded from recall/graph indices.

## Local Documentation & Planning Layer

- **Domain Glossary**: Single-context — `docs/CONTEXT.md` + `docs/adr/` shared by all monorepo packages.
- **Specs & Tickets**: Local `docs/architecture/spec-*.md` and `docs/architecture/tickets-*.md` files are the live planning and execution tracking contracts for development sessions.

## Workspace Rules

- [Monorepo structure](./.agents/rules/monorepo-structure.md)
- [Package naming](./.agents/rules/package-naming.md)
- [Package boundaries](./.agents/rules/package-boundaries.md)
- [Package build rules](./.agents/rules/package-build-rules.md)
- [Adding new package](./.agents/rules/adding-new-package.md)
- [Code style](./.agents/rules/code-style.md)
- [TypeScript rules](./.agents/rules/typescript-rules.md)
- [Technology stack](./.agents/rules/technology-stack.md)
- [Development commands](./.agents/rules/development-commands.md)
- [Git conventions](./.agents/rules/git-conventions.md)
- [Testing](./.agents/rules/testing.md)
- [Testing requirements](./.agents/rules/testing-requirements.md)
- [Core concepts](./.agents/rules/core-concepts.md)
