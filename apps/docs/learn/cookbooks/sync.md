---
title: "How to synchronize team memory with Hybrid Mode"
date: "2026-08-05"
estimatedMinutes: 4
description: "Synchronize .memofs/ directory across workstations, laptops, and CI/CD runners using MemoFS Cloud."
---

# How to synchronize team memory with Hybrid Mode

**Hybrid Mode** gives you the best of both worlds: local file speeds with automatic cloud synchronization. When any developer's agent records a decision, it syncs to MemoFS Cloud so teammates and CI runners stay updated immediately.

## Architecture

* **Local Reads/Writes**: Reads and writes go directly to `.memofs/` markdown and JSON files for instant zero-latency feedback.
* **Background Replication**: Incremental delta events are dispatched asynchronously to your MemoFS Cloud project.

## Step 1: Configure Project for Hybrid Mode

Update `.memofs/config.json` in your repository root:

```json
{
  "$schema": "https://docs.memofs.dev/schema/config.json",
  "runtime": "hybrid",
  "root": ".",
  "projectId": "proj_team_app",
  "cloud": {
    "baseUrl": "https://api.memofs.dev/v1",
    "projectId": "proj_team_app"
  }
}
```

Commit this file to git so all contributors share the same project pairing.

## Step 2: Set Developer API Keys

Each team member sets their personal or team API key in their environment:

```bash
export MEMOFS_API_KEY="memo_live_xxxxxxxxxxxxxxxx"
```

Or passes it inside their local `.mcp.json`:

```json
{
  "mcpServers": {
    "memofs": {
      "command": "npx",
      "args": ["-y", "@memofs/mcp-server"],
      "env": {
        "MEMOFS_API_KEY": "memo_live_xxxxxxxxxxxxxxxx"
      }
    }
  }
}
```

## Step 3: Trigger Sync

Manual pull and push commands are available via CLI:

```bash
# Push local memories to cloud
npx @memofs/cli cloud push

# Pull newest memories recorded by teammates
npx @memofs/cli cloud pull

# Check sync status
npx @memofs/cli cloud status
```

## Step 4: Automatic Sync in Agent Workflows

When using Claude Code or Cursor, the MCP server automatically handles bidirectional synchronization in the background before and after agent tasks.

## Related Resources

* [Hybrid Mode Deep Dive](/mcp/hybrid-mode)
* [Cloud CLI Commands](/cli/cloud)
* [Configuration File Specification](/core/configuration)
