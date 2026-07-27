---
title: "How to use MemoFS with Claude Code in 3 minutes"
date: "2026-07-27"
estimatedMinutes: 3
---

## Overview

This cookbook demonstrates how to use [MemoFS](https://docs.memofs.dev/) with Claude Code (CLI) and Claude Desktop for a seamless agentic memory experience.

## Prerequisites

- **Node.js**: `v22.0.0` or later
- **MemoFS CLI**: `npm i -g @memofs/cli`

---

## Quick Start (3 Minutes)



### Step 1: Initialize Project Memory

From your project root, initialize MemoFS:

```bash
cd /path/to/your/project
npx memofs init
```
This generates your project ID and initializes the local memory engine (`.memofs/`).

### Step 2: Generate Agent Configs

Run the MemoFS CLI `generate agent` command to prepare your project for Claude:

```bash
npx @memofs/cli generate agent claude --project-name "Your project name"
```

This instantly creates:
1. **`CLAUDE.md`**: Project rules file that points Claude to MemoFS.
2. **`.claude/rules/`**: Directory for custom rules (e.g., git conventions).
3. **`.claude/settings.json`**: Pre-configured session hooks to automatically load memory.
4. **`.mcp.json`**: Project-specific MCP server config.

*Note: You can safely modify `.memofs/memory/core.md` (which acts as the single source of truth for your durable project knowledge) and `CLAUDE.md` to add custom team rules.*

### Step 3: Connect to Claude

- **Claude Code (CLI)**: Claude Code automatically detects `.mcp.json` and `CLAUDE.md`. Just restart Claude Code and it's ready!
- **Claude Desktop**: Copy the contents of `.mcp.json` into your `claude_desktop_config.json` file, then restart the app.

---

## Next Steps

### 🧠 Enhancing Retrieval Intelligence

MemoFS features a 4-role intelligence model. By default, it uses a **deterministic local fallback** (BM25 lexical search) to run entirely local without external models.

To upgrade your `MemoryEmbedder` and enable true semantic search using local embeddings:

1. Install the adapter:
   ```bash
   npm i -D @memofs/adapter-transformers
   ```
2. Update `.memofs/config.json` to enable local embeddings:
   ```json
   {
     "runtime": "local",
     "root": ".",
     "recall": {
       "localEmbeddings": true,
       "engine": "auto"
     }
   }
   ```

### ☁️ Hybrid Mode for Team Sync

If you are working with a team, you can enable **Hybrid Mode** to seamlessly sync project knowledge across developers via [MemoFS Cloud](https://memofs.dev). 

Update `.memofs/config.json`:
```json
{
  "runtime": "hybrid",
  "cloud": {
    "baseUrl": "https://memofs.dev/api/v1",
    "projectId": "Your-Project-ID"
  }
}
```

Then, add your Cloud API key to the `env` section in your `.mcp.json` file:

```json
{
  "mcpServers": {
    "memofs": {
      "command": "npx",
      "args": ["-y", "@memofs/mcp-server"],
      "env": {
        "MEMOFS_API_KEY": "your-cloud-api-key"
      }
    }
  }
}
```

For deeper dives into cloud integrations, see the [Hosted MCP Cookbook](./hosted-mcp.md) or the [Team Sync Cookbook](./team.md).

---

## Related Resources

- [MemoFS MCP Server Docs](https://docs.memofs.dev/packages/mcp/)
- [MemoFS CLI Guide](https://docs.memofs.dev/packages/cli/)
