# Generate agent rules

After you initialize memory with `tekmemo init`, the next step in a new project is to tell your coding agents how to use it. `tekmemo generate agent-rules` emits the per-platform instructions file (`AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, `.github/copilot-instructions.md`, or `.cursor/rules/tekmemo.mdc`) that enforces the TekMemo workflow — load context, recall, remember.

The generated file is **behavioral only**: it contains rules and pointers, never project facts. Facts live in TekMemo memory and are injected at runtime via `tekmemo.context`. This keeps the instructions file short (capped at 50 lines) and stops it from going stale.

## Usage

```bash
npx tekmemo generate agent-rules <target> [--project-name <name>] [--force]
```

List every supported target and where its MCP config lives:

```bash
npx tekmemo generate agent-rules --list
```

## Targets

Each target writes a different file at a platform-specific path and appends a **target-aware pointer** to where that platform stores its MCP server config — so an agent reading the file knows exactly where to register the TekMemo MCP server.

| Target | File written | MCP config location |
| --- | --- | --- |
| `agents` | `AGENTS.md` | `~/.codex/config.toml` (global, stdio-only) |
| `claude` | `CLAUDE.md` | `.mcp.json` (project) |
| `gemini` | `GEMINI.md` | `.gemini/settings.json` (project) |
| `copilot` | `.github/copilot-instructions.md` | `.vscode/mcp.json` (project) |
| `cursor` | `.cursor/rules/tekmemo.mdc` | `.cursor/mcp.json` (project) |

`cursor` is the one target that requires frontmatter (`description`, `globs`, `alwaysApply`); the others are plain Markdown. The generator handles this automatically.

Target aliases are case-insensitive and accept the filename form, so `agents`, `AGENTS`, `agents.md`, and `AGENTS.md` all resolve to the `agents` target.

## Options

| Option | Description |
| --- | --- |
| `<target>` | One of `agents` \| `claude` \| `gemini` \| `copilot` \| `cursor`. Omit with `--list`. |
| `--project-name <name>` | Project name in the generated header. Defaults to the directory basename. |
| `-f, --force` | Overwrite an existing instructions file. Without it, the command refuses to clobber a hand-edited `AGENTS.md` / `CLAUDE.md`. |
| `--list` | Print the supported targets and their MCP config paths instead of generating. |

## What the generated file enforces

The body is identical across targets (only the frontmatter and MCP pointer differ). It directs the agent to, on every task:

1. **Load context** — call `tekmemo.context` with the task description.
2. **Look up details** — use `tekmemo.recall` for specific lookups.
3. **Adhere to memory** — follow the constraints, decisions, and references returned.
4. **Persist new facts** — store discovered facts/decisions via `tekmemo.remember`.

It also includes the default pointers — `.agents/rules` for workspace rules and `~/.agents/skills/` for global skills — so the agent knows where supporting material lives.

## Running it for every agent you use

A repo often has more than one agent platform. Generate once per target:

```bash
npx tekmemo generate agent-rules agents      # OpenAI Codex
npx tekmemo generate agent-rules claude      # Claude Code
npx tekmemo generate agent-rules cursor      # Cursor
```

Each writes its own file, so they coexist without conflict. Commit them so every contributor's agents start with the same TekMemo workflow.

## Adding TekMemo to an existing project

You can start using TekMemo at any point — the project doesn't need to be new. The flow is the same two commands:

```bash
npx tekmemo init                          # creates .tekmemo/ (the memory store)
npx tekmemo generate agent-rules claude   # writes the agent bootstrap file
```

`init` is additive: it only creates the `.tekmemo/` directory and its canonical files. It does not touch your source, your existing `CLAUDE.md`, or any other agent config. `generate agent-rules` will **refuse to overwrite** a hand-edited instructions file unless you pass `--force`, so an existing `AGENTS.md` / `CLAUDE.md` is safe — re-run with `--force` only when you want to replace it with the TekMemo bootstrap.

### Copy-paste minimal templates

If you'd rather hand-write the file (or your platform isn't a `generate` target), here is the entire directive. It is deliberately short — the TekMemo workflow is four steps:

```md
# TekMemo Memory (REQUIRED)

This repo uses TekMemo as its single source of truth for project knowledge.
At the **start of every task**, agents MUST:

1. **Load context** — call the TekMemo `context` tool (e.g. `tekmemo.context`) with the task description.
2. **Look up details** — use the TekMemo `recall` tool (e.g. `tekmemo.recall`) for specific lookups.
3. **Adhere to memory** — follow constraints, decisions, and references returned.
4. **Persist new facts** — store discovered facts/decisions via the TekMemo `remember` tool (e.g. `tekmemo.remember`).

Project facts live in TekMemo memory, not in this file. This file is behavioral only.
```

That block is all an agent needs. Drop it into whichever file your platform reads (see the table in [Targets](#targets)), then back it with `tekmemo init` + the MCP server, and you're done.

## Keeping the file under 50 lines

The generator caps the instructions file at **50 lines** on purpose: this file is read on every task, so a bloated file slows every turn and goes stale. The 50-line budget is for *behavioral* TekMemo rules only — the four-step workflow, a few hard constraints, and pointers. **Project facts do not belong here at all**; they go in TekMemo memory (via `tekmemo.remember`), where they're recallable, version-controlled, and don't bloat the prompt.

When your existing `AGENTS.md` / `CLAUDE.md` has accumulated lint, conventions, and domain rules that push it past 50 lines, **relocate** the non-TekMemo rules rather than keeping them inline. Where they go depends on the platform — each has a recognized "extra rules" location the generator already points at:

| Platform | Primary file (≤50 lines) | Where overflow rules relocate |
| --- | --- | --- |
| Codex | `AGENTS.md` | `.agents/rules/*.md` (workspace rules) + `~/.agents/skills/` (global) |
| Claude Code | `CLAUDE.md` | `.agents/rules/*.md` (shared) or `.claude/` files |
| Gemini CLI | `GEMINI.md` | `.agents/rules/*.md` |
| GitHub Copilot | `.github/copilot-instructions.md` | `.agents/rules/*.md` |
| Cursor | `.cursor/rules/tekmemo.mdc` | more `.cursor/rules/*.mdc` files (each with its own `globs`/`alwaysApply` frontmatter) |

The TekMemo convention (used in this very repo) is **`.agents/rules/*.md`** — one Markdown file per topic (`code-style.md`, `git-conventions.md`, `package-boundaries.md`, …). Agents that support the `.agents/` convention discover them automatically; the generated instructions file already carries a pointer to `./.agents/rules` and `~/.agents/skills/` so the agent knows to look there.

::: tip Rule of thumb
If a line isn't a TekMemo workflow step or a hard "never do X" constraint, it probably belongs in `.agents/rules/<topic>.md` (or TekMemo memory if it's a *fact* about the project). Keep the bootstrap file scannable.
:::

The generator enforces the cap at emit time: if your `rules`/`pointers` would push the file over 50 lines it throws a clear error telling you to trim — a signal to move content out, not to raise the limit.

## See also

- [Getting started](../tekmemo/getting-started.md) — the full first-project walkthrough, including this step.
- [Agent workflow](./agent-workflow.md) — the `agent start` / `extract` / `complete` commands for AgentFS-backed sessions.
- [Local commands](./local-commands.md) — the rest of the local CLI surface.
