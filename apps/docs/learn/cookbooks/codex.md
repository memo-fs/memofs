---
title: "How to use MemoFS with Codex"
date: "2026-07-28"
estimatedMinutes: 3
---

# Overview

Connect MemoFS to OpenAI's Codex for persistent, file-based project memory — distributed the same way as Claude Code: hooks for automatic context injection, plus an MCP server for on-demand recall. There's one extra step Codex requires that Claude Code doesn't — see Step 3.

## Prerequisites

- Node.js v22+
- No install needed — `npx @memofs/cli` fetches on first run.

## Quick Start

### Step 1: Initialize project memory

```bash
cd /path/to/your/project
npx @memofs/cli init
```

### Step 2: Generate the full Codex setup

```bash
npx @memofs/cli generate agent codex --scope local --project-name "Your project name"
```

Produces:

- **`AGENTS.md`** — rules file (Codex's target is `agents`/`codex`, so this doubles as the cross-tool AGENTS.md standard file)
- **`.agents/rules/git-conventions.md`**
- **`.codex/hooks.json`** — `SessionStart`, `SubagentStart`, and `Stop` hooks
- **MCP config** — `--scope local` writes it to `.codex/config.toml`; omit the flag and Codex defaults to the global `~/.codex/config.toml` instead

### ⚠️ Step 3: Review the hooks before Codex will run them

This is the step people skip, then wonder why nothing is being injected. **Codex only loads project-local `.codex/` hooks once the project layer is trusted, and any new hook group needs an explicit review the first time it appears.** Inside a Codex CLI session in this project:

```
/hooks
```

Review and approve the memofs hook group. Until you do this, `SessionStart` won't fire and no context will be injected — Codex will run normally, just silently without memory, which looks like a bug rather than an unreviewed hook.

### Step 4: Restart and verify

Restart Codex. Ask it to recall something you stored in Step 1, or check for the end-of-session compliance summary in `systemMessage`.

## Notes

- Writes to `.codex/hooks.json` are merge-safe — existing hook groups are preserved; a prior memofs-owned group is replaced only with `-f`/`--force`.
- Re-injection after compaction goes through the same `SessionStart` `compact` matcher as Claude Code.
- If hooks still don't seem to run after approval, re-check `/hooks` — a project can lose "trusted" status (e.g. after certain config changes) and silently stop loading project-local hooks again.

## Next Steps

- [Semantic search](/packages/adapters/transformers).
- [Team memory sync](/packages/mcp/hybrid-mode).