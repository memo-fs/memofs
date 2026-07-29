---
title: "How to use MemoFS with Windsurf / Cascade in 4 minutes"
date: "2026-07-28"
estimatedMinutes: 4
---

# Before you start

Cognition (Devin's maker) folded Windsurf into Devin Desktop — the Cascade agent and its config live on unchanged, just under new ownership. Everything below is confirmed current against Devin's own docs, not just legacy Windsurf docs.

## Overview

Cascade (in Windsurf / Devin Desktop) natively reads `AGENTS.md`. You can generate your workspace rules file directly using `npx @memofs/cli generate agent-rules agents` and register the MemoFS MCP server in your Cascade configuration.

## Setup (4 Minutes)

### Step 1: Initialize project memory

```bash
cd /path/to/your/project
npx @memofs/cli init
```

### Step 2: Generate the rules file

```bash
npx @memofs/cli generate agent-rules agents --project-name "Your project name"
```

Cascade picks up `AGENTS.md` automatically.

### Step 3: Register the MCP server

Config lives at `~/.codeium/windsurf/mcp_config.json` (macOS/Linux) or `%USERPROFILE%\.codeium\windsurf\mcp_config.json` (Windows) — **global only, no project-scoped copy**, so every workspace on the machine shares this file:

```json
{
  "mcpServers": {
    "memofs": {
      "command": "npx",
      "args": ["-y", "@memofs/mcp-server", "--root", "/path/to/your/project"]
    }
  }
}
```

Include `--root` explicitly since the config is global — without it, the server won't know which project's memory to load if you work across multiple memofs projects on the same machine. Or use the UI: Cascade panel → MCPs icon → **View raw config**.

### Step 4: Verify

Check the MCPs icon in the Cascade panel for a connected status on `memofs`. Ask Cascade to check project memory.

## Notes

- Cascade caps total exposed MCP tools at 100 across all connected servers — worth knowing if you're already running several.
- No hooks — `AGENTS.md` does the work of telling Cascade when to reach for memory.

## Next Steps

- [Semantic search](/packages/adapters/transformers).
- [Team memory sync](/packages/mcp/hybrid-mode).