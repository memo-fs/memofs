# AGENTS.md - TekMemo

This file is the bootstrap for agents working in this repo.
**All project knowledge lives in TekMemo** — use MCP tools, not this file.

## TekMemo Memory (REQUIRED)

This repo uses TekMemo as its single source of truth for project knowledge.
At the **start of every task**, agents MUST:

1. **Load context** — Search your available tools for TekMemo context/memory tools (e.g. `context`, `recall`, `read_core_memory`, `read_notes_memory`) and call the appropriate one with the task description.
2. **Look up details** — If the initial context is insufficient, use TekMemo recall/search tools to find specific domain knowledge.
3. **Adhere to memory** — Follow any constraints, decisions, and references returned by TekMemo.
4. **Persist new facts** — When new facts, decisions, or constraints are discovered during work, store them via TekMemo remember/write tools so future agents benefit.

TekMemo is the **single source of truth** for project identity, architecture, constraints, and decisions.
This file contains only behavioral rules and pointers — no project facts.

## Behavioral Rules

- **Do not** add new npm dependencies without evaluating if an existing package already covers the need
- **Do not** use `console.log` in production code — use structured logging or remove it
- **Do not** commit secrets, API keys, or environment values — use `.env` files that are gitignored
- **Do not** run `pnpm build` during a code-editing session unless you are explicitly validating production correctness
- **Do not** add `prettier` — it has been removed; all formatting goes through Biome
- **Do not** use `@repo/` for public OSS packages — that scope is for internal tooling only
- **Do not** copy-paste tsdown options into new packages — import `pkgConfig` from `@repo/tsdown` instead
- **Do not** create a second `Tekmemo`/`NodeFsMemoryStore` instance on the same `.tekmemo/` root — the local contract is single-process (Q28); a second writer gets a `LockHeldError`. Call `dispose()` to release before handing the root to another process, or pass `lock: false` only when an external coordinator serializes access
- **Connector discipline (ADR 0002)**: connectors run locally; connector ingest writes notes with `source: "connector"`, a stable `sourceRefs[0].sourceId` (the external id), and a content-derived `id` with **no wall-clock** in the hashed bytes (`connectorNoteId` in `@tekbreed/tekmemo-connectors`). Tokens never touch disk or the file replica — only the opaque `secretRef` lives in `.tekmemo/connectors.json`; resolve tokens at run time via the injected `SecretResolver` and keep them in memory only. `.tekmemo/secrets.json` is a dev-only fallback, gitignored, never synced
- **DRY & SSOT**: Do not duplicate knowledge in this file that already exists in TekMemo memory

## Pointers

- Workspace rules: [.agents/rules](./.agents/rules)
- Global skills: `~/.agents/skills/`
- MCP config: `opencode.json`

