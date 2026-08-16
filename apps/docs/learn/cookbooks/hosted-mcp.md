---
title: "How to connect agents to Hosted MemoFS MCP Endpoints"
date: "2026-08-04"
estimatedMinutes: 3
description: "Connect AI coding agents to MemoFS Cloud Hosted MCP Endpoint over HTTPS with API key authentication."
---

# How to connect agents to Hosted MemoFS MCP Endpoints

This cookbook guides you through connecting any MCP client (Claude Code, Cursor, Codex, Windsurf, Zed) to a **remote, hosted MemoFS MCP endpoint** provided by MemoFS Cloud or a self-hosted server.

## Why Use Hosted MCP?

* **Zero Local Files**: Ideal for hosted agent runners, cloud containers, or machines without local git checkouts.
* **Shared Brain**: Multiple developers and automated CI pipelines connect to the exact same live memory state.
* **Streamlined Setup**: Connect with a single URL and API token.

## Step 1: Obtain Endpoint & API Key

From your [MemoFS Cloud Dashboard](https://memofs.dev) (or your self-hosted server), grab your project credentials:

* **Endpoint URL**: `https://api.memofs.dev/v1/mcp`
* **API Key**: `memo_live_xxxxxxxxxxxxxxxx`

## Step 2: Configure Your MCP Client

Configure your agent's MCP settings using the SSE or Streamable HTTP transport:

::: code-group

```json [Claude Code (.mcp.json)]
{
  "mcpServers": {
    "memofs": {
      "command": "npx",
      "args": ["-y", "@memofs/mcp-server"],
      "env": {
        "MEMOFS_CLOUD_URL": "https://api.memofs.dev/v1",
        "MEMOFS_API_KEY": "memo_live_xxxxxxxxxxxxxxxx",
        "MEMOFS_PROJECT_ID": "proj_myproject"
      }
    }
  }
}
```

```json [Cursor (.cursor/mcp.json)]
{
  "mcpServers": {
    "memofs": {
      "command": "npx",
      "args": ["-y", "@memofs/mcp-server"],
      "env": {
        "MEMOFS_CLOUD_URL": "https://api.memofs.dev/v1",
        "MEMOFS_API_KEY": "memo_live_xxxxxxxxxxxxxxxx",
        "MEMOFS_PROJECT_ID": "proj_myproject"
      }
    }
  }
}
```

```toml [Codex (~/.codex/config.toml)]
[mcp_servers.memofs]
command = "npx"
args = ["-y", "@memofs/mcp-server"]
[mcp_servers.memofs.env]
MEMOFS_CLOUD_URL = "https://api.memofs.dev/v1"
MEMOFS_API_KEY = "memo_live_xxxxxxxxxxxxxxxx"
MEMOFS_PROJECT_ID = "proj_myproject"
```

:::

## Step 3: Verify the Remote Connection

Restart your agent and trigger a test query:

```bash
# Ask your agent:
"What memory is currently recorded on MemoFS Cloud?"
```

The agent will query the hosted MCP endpoint, fetch the remote memory context, and display it seamlessly.

## Related Resources

* [Hosted MCP Endpoint Guide](/mcp/hosted-mcp-endpoint)
* [Hybrid Mode & Team Sync](/mcp/hybrid-mode)
* [MemoFS Server Self-Hosting](/server/)
