---
title: "How to use MemoFS with Amazon Q Developer in 5 minutes"
date: "2026-07-28"
estimatedMinutes: 5
---

# Overview

Amazon Q Developer supports project-level rules and MCP servers. You can generate your `AGENTS.md` rules file directly with `npx @memofs/cli generate agent-rules agents` and reference it in your Amazon Q custom agent context alongside the MemoFS MCP server.

## Setup (5 Minutes)

### Step 1: Initialize project memory

```bash
cd /path/to/your/project
npx @memofs/cli init
```

### Step 2: Wire up context

```bash
npx @memofs/cli generate agent-rules agents --project-name "Your project name"
```

Q's custom-agent config supports a `resources` field that can auto-include files as context — point it at the generated `AGENTS.md` in your agent's JSON config rather than relying on an implicit auto-load, since Q doesn't have one confirmed the way Claude Code or Cursor do.

### Step 3: Register the MCP server

Workspace: `.amazonq/mcp.json`. Global: `~/.aws/amazonq/mcp.json`.

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

Both files are optional and additive — if both exist, Q reads the union of the two.

### Step 4: Verify

```
/tools
```

inside a Q CLI session lists available tools, including MCP-provided ones — confirm `memofs`'s tools show up. Ask Q to check project memory directly.

## Notes

- No hooks, no compliance summary. This one is worth a documentation pass once you've actually tested it — the rules-file side is genuinely less settled than the other targets in this set.

## Next Steps

- [Semantic search](/packages/adapters/transformers).
- [Team memory sync](/packages/mcp/hybrid-mode).