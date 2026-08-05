---
title: "How to use MemoFS with GitHub Copilot"
date: "2026-07-28"
estimatedMinutes: 3
---

# Overview

Like Cursor, Copilot is rules + MCP only — no hook system exists for it, so there's no automatic session-start injection. Copilot reads its instructions file automatically; getting it to actually reach for memory depends on that file being explicit about when to call MemoFS tools.

## Prerequisites

- Node.js v22+

## Quick Start (3 Minutes)

### Step 1: Initialize project memory

```bash
cd /path/to/your/project
npx @memofs/cli init
```

### Step 2: Generate the Copilot setup

```bash
npx @memofs/cli generate agent copilot --project-name "Your project name"
```

Produces:

- **`.github/copilot-instructions.md`** — rules file
- **`.github/rules/git-conventions.md`**
- **`.vscode/mcp.json`** — MCP server entry. This is project-local only — Copilot's `generate mcp` target has no documented global scope, so there's no per-machine config to fall back on; every project needs its own `.vscode/mcp.json`.

### Step 3: Reload and verify

Reload the VS Code window (or restart if using Copilot in another surface). Copilot detects `.vscode/mcp.json` and shows a **Start** action for the `memofs` server — click it, since Copilot doesn't always auto-start MCP servers on file detection alone.

Verify:

- Check the tools indicator in the Copilot Chat panel — `memofs` should appear with its tools listed.
- Ask: *"Use the memofs tool to check what's in project memory."*

## Notes

- No hooks, no compliance summary — same shape as Cursor, just a different rules-file location and no global MCP scope.

## Next Steps

- [Semantic search](/packages/adapters/transformers).
- [Team memory sync](/packages/mcp/hybrid-mode).