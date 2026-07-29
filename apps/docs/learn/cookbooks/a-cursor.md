---
title: "How to use MemoFS with Cursor in 3 minutes"
date: "2026-07-28"
estimatedMinutes: 3
---

# Overview

Cursor is a rules-plus-MCP target, not a hooks target — Cursor's hooks are observational (no session-start event, no way to inject context), so `generate agent cursor` sets up rules + MCP instead of a partial hooks setup. Memory works entirely through the rules file telling Cursor's agent to call MCP tools at the start of a task.

## Prerequisites

- Node.js v22+

## Quick Start

### Step 1: Initialize project memory

```bash
cd /path/to/your/project
npx @memofs/cli init
```

### Step 2: Generate the Cursor setup

```bash
npx @memofs/cli generate agent cursor --project-name "Your project name"
```

Produces:

- **`.cursor/rules/memofs.mdc`** — rules file, instructing Cursor to call MemoFS MCP tools to recall and persist facts (no hooks exist to do this automatically)
- **`.cursor/rules/git-conventions.md`**
- **`.cursor/mcp.json`** — MCP server entry (project-local by default; pass `--scope global` for `~/.cursor/mcp.json` instead)

*Cursor never gets a hooks file from this command — that's by design, not a partial setup.*

### Step 3: Restart and verify

Restart Cursor. Since nothing auto-injects, verify the agent is actively reaching for memory:

- Start a task and check whether it calls a memofs tool before writing code.
- Or ask directly: *"What's in your memofs project memory right now?"*

If it's not reaching for the tool, check that `.cursor/rules/memofs.mdc` is present and not excluded by a broader rules-ignore pattern.

## Next Steps

- [Semantic search](/packages/adapters/transformers).
- [Team memory sync](/packages/mcp/hybrid-mode).