# {{projectName}} — Agent Rules

This file is the bootstrap for agents working in this repo. **All project knowledge lives in MemoFS** — use MCP tools, not this file.

## MemoFS Memory (REQUIRED)

This repo uses MemoFS as its single source of truth for project knowledge.
{{hooksNote}}
At the **start of every task**, and throughout it, agents MUST:

1. **Load context** — {{stepOneText}}.
2. **Look up details** — use the MemoFS `recall` tool (e.g. `memofs.recall`) for specific lookups when context is insufficient.
3. **Adhere to memory** — follow constraints, decisions, and references returned.
4. **Persist new facts** — store discovered facts/decisions via the MemoFS `remember` tool (e.g. `memofs.remember`).

This file contains only behavioral rules and pointers — no project facts.
{{rules}}
## Workspace Rules

- [Git conventions](./{{rulesDir}}/git-conventions.md)

## Pointers

- Global skills: `~/.agents/skills/`
- {{mcpLabel}}: `{{mcpPath}}`
