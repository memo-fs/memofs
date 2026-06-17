# AGENTS.md - TekBreed OSS

This file is the source of truth for agents working in this repo.

## What This Repository Is

`@tekbreed/tekbreed-oss` is the TekBreed open-source monorepo.

TekMemo is the first product family. It is published as three main packages:

```txt
@tekbreed/tekmemo            # Core memory runtime
@tekbreed/tekmemo-cli        # CLI distribution
@tekbreed/tekmemo-mcp-server # Model Context Protocol server
```
## What Agents Should Avoid

- **Do not** add new npm dependencies without evaluating if an existing package already covers the need
- **Do not** use `console.log` in production code — use structured logging or remove it
- **Do not** commit secrets, API keys, or environment values — use `.env` files that are gitignored
- **Do not** run `pnpm build` during a code-editing session unless you are explicitly validating production correctness
- **Do not** add `prettier` — it has been removed; all formatting goes through Biome
- **Do not** use `@repo/` for public OSS packages — that scope is for internal tooling (`utils`, `tsdown-config`, `typescript-config`) only
- **Do not** copy-paste tsdown options into new packages — import `pkgConfig` from `@repo/tsdown-config` instead

## Verification & Workspace Rules

- **DRY & SSOT**: DRY (Don't Repeat Yourself) and SSOT (Single Source of Truth) principles MUST be ensured throughout the workspace.
- **Global Skills**: Global/workspace-wide skills and reference guidelines are stored in `~/.agents/skills/`.
- **Workspace rules**
  - **Rules directory**: All workspace rules that are not in this file are located in [.agents/rules](./.agents/rules)
  - **Check** [Adding new package](./.agents/rules/adding-new-package.md) for instructions on how to add a new package.
  - **Check** [CI and GitHub actions](./.agents/rules/ci-github-actions.md) for workspace CI and github actions.
  - **Check** [Code style](./.agents/rules/code-style.md) for workspace code style.
  - **Check** [Git conventions](./.agents/rules/git-conventions.md) for workspace git conventions.
  - **Check** [Core concepts](./.agents/rules/core-concepts.md) for tekmemo core memory concepts.
  - **Check** [Development Commands](./.agents/rules/development-commands.md) for workspace development CLI commands.
  - **Check** [Git conventions](./.agents/rules/git-conventions.md) for workspace commit message style and rules.
  - **Check** [Monorepo structure](./.agents/rules/monorepo-structure.md) for workspace monorepo structure.
  - **Check** [Package boundaries](./.agents/rules/package-boundaries.md) for workspace package boundaries.
  - **Check** [Package build rules](./.agents/rules/package-build-rules.md) for workspace package build rules.
  - **Check** [Technology stack](./.agents/rules/technology-stack.md) for workspace technology stack.
  - **Check** [Testing requirements](./.agents/rules/testing-requirements.md) for workspace testing requirements.
  - **Check** [Testing](./.agents/rules/testing.md) for workspace testing.
  - **Check** [Typescript rules](./.agents/rules/typescript-rules.md) for workspace typescript rules.

## Repository Standards

1. Keep root docs aligned with TekBreed OSS as the umbrella.
2. Keep TekMemo documented as modular packages with clear entrypoints.
3. Keep exports consolidated and clean.

