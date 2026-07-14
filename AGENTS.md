# Memofs — Agent Rules

This file is the bootstrap for agents working in this repo. **All project knowledge lives in MemoFS** — use MCP tools, not this file.

## MemoFS Memory (REQUIRED)

This repo uses MemoFS as its single source of truth for project knowledge.
At the **start of every task**, agents MUST:

1. **Load context** — call the MemoFS `context` tool (e.g. `memofs.context`) with the task description to load core memory, notes, and recall.
2. **Look up details** — use the MemoFS `recall` tool (e.g. `memofs.recall`) for specific lookups when context is insufficient.
3. **Adhere to memory** — follow constraints, decisions, and references returned.
4. **Persist new facts** — store discovered facts/decisions via the MemoFS `remember` tool (e.g. `memofs.remember`).

## Behavioral Rules

- **Do not** add new npm dependencies without evaluating if an existing package already covers the need
- **Do not** use `console.log` in production code — use structured logging or remove it
- **Do not** commit secrets, API keys, or environment values — use `.env` files that are gitignored
- **Do not** run `pnpm build` during a code-editing session unless you are explicitly validating production correctness
- **Do not** add `prettier` — it has been removed; all formatting goes through Biome
- **Do not** use `@repo/` for public OSS packages — that scope is for internal tooling only
- **Do not** copy-paste tsdown options into new packages — import `pkgConfig` from `@repo/tsdown` instead
- **DRY & SSOT everywhere**: Enforce Single Source of Truth and Don't-Repeat-Yourself across the **entire workspace**. Do not duplicate knowledge, logic, constants, or copy that already lives elsewhere — extract to a shared module, type, or constant and import it.
- **Always use** the `technical-writer` skill when writing package READMEs and user facing documentation.
- **Never commit gitignored files.** Before any `git add` or `git commit`, run `git status` and verify every staged file is tracked. If a file is gitignored (check `.gitignore`), it must never be committed — not even with `git add -f`. When in doubt, `git check-ignore <path>` tells you if a path is ignored.

## General Rules

- **⚠️ Always use** the `code-review` skill to review your plan implementation after completing the plan (all checkboxes are checked).
- **⚠️ Always use** the `security-reviewer` skill to review code for security vulnerabilities after code review.
- **⚠️ Avoid** adding ADR and WF related namings to code documentation, and avoid pointing to ADRs and WFs in code documentation. ADRs and WFs are for internal team reference and not for public documentation. Use ADRs and WFs only for internal team reference and not for public documentation.
- **⚠️ Never track internal docs or the cloud app in git.** The following paths are gitignored (`.gitignore`) and must never be `git add`-ed (including `git add -f`):
  - `docs/adr/` — ADRs (internal architecture decisions)
  - `docs/architecture/` — decisions log, locked specs, execution plan, archive
  - `docs/CONTEXT.md` — the working glossary
  - `apps/cloud/` — the cloud app (the SaaS; does not exist in this OSS repo — lives in the private `memofs-cloud` repo)
  
  These are local-only working artifacts. If a file in one of these paths is already tracked, untrack it with `git rm --cached <path>` (keeps the file on disk). Never link to these paths from public/tracked files (READMEs, CONTRIBUTING, GOVERNANCE, package READMEs, `examples/`, `apps/docs/`) — a public reader will hit a 404.

## Pointers

- Workspace rules: [.agents/rules](./.agents/rules)
  - [monorepo-structure.md](./.agents/rules/monorepo-structure.md): The official directory structure of the MemoFS monorepo.
  - [package-naming.md](./.agents/rules/package-naming.md): Scope conventions (`@memofs` vs `@repo`) and package naming requirements.
  - [package-boundaries.md](./.agents/rules/package-boundaries.md): Rules governing imports and dependencies between different packages and zones (core vs optional).
  - [package-build-rules.md](./.agents/rules/package-build-rules.md): Guidelines for building packages with `tsdown` and standard export maps.
  - [adding-new-package.md](./.agents/rules/adding-new-package.md): Checklist/steps for adding a new package to the monorepo.
  - [code-style.md](./.agents/rules/code-style.md): Biome formatting guidelines, tab indentation, double quotes, and JSDoc requirements.
  - [typescript-rules.md](./.agents/rules/typescript-rules.md): Coding rules for strict TS, ESM, and type exports.
  - [technology-stack.md](./.agents/rules/technology-stack.md): Tooling checklist (pnpm, Vitest, Node requirements, etc.).
  - [development-commands.md](./.agents/rules/development-commands.md): Crucial scripts to install, lint, test, and build.
  - [git-conventions.md](./.agents/rules/git-conventions.md): Conventions for branching and conventional commit formats.
  - [testing.md](./.agents/rules/testing.md) / [testing-requirements.md](./.agents/rules/testing-requirements.md): Unit testing instructions using Vitest.
  - [core-concepts.md](./.agents/rules/core-concepts.md): High-level architectural overview of MemoFS memory layers.
- Global skills: `~/.agents/skills/`
