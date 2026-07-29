---
title: "How to use MemoFS with JetBrains Junie in 5 minutes"
date: "2026-07-28"
estimatedMinutes: 5
---

# Overview

JetBrains Junie (IntelliJ, PyCharm, WebStorm, GoLand) supports project guidelines and MCP tools. You can generate your `AGENTS.md` rules file directly with `npx @memofs/cli generate agent-rules agents` and register the MemoFS MCP server in Junie's MCP Settings.

## Setup (5 Minutes)

### Step 1: Initialize project memory

```bash
cd /path/to/your/project
npx @memofs/cli init
```

### Step 2: Create a rules file

```bash
npx @memofs/cli generate agent-rules agents --project-name "Your project name"
```

Junie's guidelines convention has shifted across versions — check current Junie docs for the exact filename it auto-loads, and copy the generated `AGENTS.md` body there.

### Step 3: Register the MCP server

Project-level: `.junie/mcp/mcp.json`. Global: `~/.junie/mcp.json`.

```json
{
  "mcpServers": {
    "memofs": {
      "command": "npx",
      "args": ["-y", "@memofs/mcp-server"]
    }
  }
}
```

Or through the IDE: **Settings → Tools → Junie → MCP Settings → Add**. On the CLI, use the guided path instead — run `/mcp` inside a Junie CLI session, which launches the MCP Installation Assistant and can add the server for you from a registry entry.

### Step 4: Verify

`/mcp` (Junie CLI) or the MCP Settings panel (IDE) should list `memofs` as connected. Ask Junie to check project memory.

## Notes

- No hooks in the IDE plugin — no auto-priming, no compliance summary. `AGENTS.md`/guidelines content is doing all the work.

## Next Steps

- [Semantic search](/packages/adapters/transformers).
- [Team memory sync](/packages/mcp/hybrid-mode).