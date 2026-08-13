# Core Memory

This file stores durable, high-signal memory for the current agent/project.

## Identity
- Project: MemoFS

## Stable Facts

- **If the task is not simple and relates to understanding the existing codebase, always start with docs/CONTEXT.md**
- **⚠️ Always use** the `code-review` skill to review your plan implementation after completing the plan (all checkboxes are checked).
- **⚠️ Always use** the `security-reviewer` skill to review code for security vulnerabilities after code review.
- **⚠️ Do not** add ADR or WF/ticket namings to code documentation. This covers TSDoc/JSDoc on exported APIs and type fields, file-header comments, `describe`/`it` test names, and inline comments. Reference the *behavior or contract* (e.g. "drift detection", "5-minute TTL with manifest persistence", "code anchoring"), never the internal doc number (no `ADR-0022`, `ticket #68`, `Batch-6 default #3`, `§B4`, `ADR 0009 Component 4`). Rationale: ADRs/WFs/tickets live in gitignored paths (`docs/adr/`, `docs/architecture/`, `docs/CONTEXT.md`) that a public reader following such a citation would hit a 404; code docs (`packages/**/*.ts`, including tests) are tracked and public. If a future reader needs the design rationale, they find it via the git-ignored internal docs, not via a code comment that 404s.
- **⚠️ Never track internal docs in git.** The following paths are gitignored (`.gitignore`) and must never be `git add`-ed (including `git add -f`):
  - `docs/adr/` — ADRs (internal architecture decisions)
  - `docs/architecture/` — decisions log, locked specs, execution plan, archive
  - `docs/CONTEXT.md` — the working glossary
  
  These are local-only working artifacts. If a file in one of these paths is already tracked, untrack it with `git rm --cached <path>` (keeps the file on disk). Never link to these paths from public/tracked files (READMEs, CONTRIBUTING, GOVERNANCE, package READMEs, `examples/`, `apps/docs/`) — a public reader will hit a 404.

## Preferences

- **ALWAYS** answer questions base on facts, not assumptions or past knowledge, conduct a thorough research if required.
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
- **Do not** use code blocks or inline code in changelogs or summaries. Keep them concise and straightforward.

## Constraints

## Agent skills

### Issue tracker

GitHub Issues at `memo-fs/memofs` (via the `gh` CLI). Specs and tickets publish
as issues; ADRs cited by bare number, never as internal-path links. See
`docs/agents/issue-tracker.md`.

### Domain docs

Single-context — one `docs/CONTEXT.md` + one `docs/adr/` shared by all 14
packages. Local `docs/architecture/spec-*.md` + `tickets-*.md` are grilling
records (gitignored); GitHub Issues are the live contract. See
`docs/agents/domain.md`.

## Workspace Rules - **MUST follow**, no exceptions

- [Git conventions](./${rulesDir}/git-conventions.md)
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
