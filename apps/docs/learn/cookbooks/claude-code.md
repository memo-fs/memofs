---
title: "How to use MemoFS with Claude Code"
date: "2026-07-27"
estimatedMinutes: 3
---

# Overview

This cookbook shows you how to connect MemoFS to Claude Code so your project has persistent, file-based memory across sessions — no database, no vector store, just Markdown/JSONL under `.memofs/`. The setup commands below run in a terminal, but the resulting config works everywhere Claude Code runs: terminal, IDE extensions, or the desktop app.

## Prerequisites

- **Node.js**: `v22.0.0` or later
- No install needed — `npx` fetches `@memofs/cli` on first run. 
(Optional: `npm i -g @memofs/cli` if you'll run it often and want to skip the npx fetch delay.)

## Quick Start

### Step 1: Initialize Project Memory

From your project root:

```bash
cd /path/to/your/project
npx @memofs/cli init
```

This generates a project ID and initializes the local memory engine.

You'll need that Project ID if you enable Hybrid Mode later — it's also always available in `.memofs/config.json`.

### Step 2: Generate Agent Configs

```bash
npx @memofs/cli generate agent claude --project-name "Your project name"
```

This creates:

1. **`CLAUDE.md`** — project rules file that points Claude to MemoFS.
2. **`.claude/rules/`** — directory for custom rules (e.g., git conventions).
3. **`.claude/settings.json`** — pre-configured session hooks that auto-load memory.
4. **`.mcp.json`** — project-specific MCP server config.

*You can safely edit `.memofs/memory/core.md` (the single source of truth for durable project knowledge) and `CLAUDE.md` to add your own team rules.*

### Step 3: Connect and Verify

Restart Claude Code — it auto-detects `.mcp.json` and `CLAUDE.md`.

Confirm the connection:

```
/mcp
```

You should see `memofs` listed as a connected server. To confirm memory actually persists across sessions, try:

1. In this session: *"Remember that we use pnpm for this project."*

or run `npx @memofs/cli remember "Use pnpm for this project."`

2. Start a **new** Claude Code session and ask: *"What package manager do we use?"*

If it answers correctly without you repeating yourself, memory is working end to end.

## Next Steps

### 🧠 Enable Semantic Search

By default, MemoFS retrieves memory using a **deterministic local fallback** — lexical/BM25 search — so it runs entirely offline with no external model calls.

To upgrade to semantic (embeddings-based) search using local models:

1. Install the adapter:
   ```bash
   npm i -D @memofs/adapter-transformers
   ```
2. Enable local embeddings in `.memofs/config.json`:
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

<!-- > **Note:** MemoFS Cloud availability varies by tier — check [memofs.dev](https://memofs.dev) for current access before sending readers through this section. -->

If you're working with a team, **Hybrid Mode** syncs project memory across developers via MemoFS Cloud.

Update `.memofs/config.json`:

```json
{
  "runtime": "hybrid",
  "cloud": {
    "baseUrl": "https://memofs.dev/api/v1",
    "projectId": "proj_xxxxxxxx"
  }
}
```
*(Use the Project ID from Step 1 or `.memofs/config.json`.)*

Then add your Cloud API key to `.mcp.json`:

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

For deeper dives, see the [Hosted MCP Cookbook](./hosted-mcp.md) or 
the [Team Sync Cookbook](./sync.md).

## Related Resources

- [MemoFS MCP Server Docs](/packages/mcp/)
- [MemoFS CLI Guide](/packages/cli/)
