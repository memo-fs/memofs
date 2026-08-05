---
title: "How to use MemoFS with Google Antigravity"
date: "2026-07-28"
estimatedMinutes: 4
---

# Overview

Google Antigravity is Google's AI-first development platform, available as **Antigravity IDE** (in-editor AI experience) and **Antigravity CLI (`agy`)** (terminal interface).

Antigravity automatically discovers project-scoped rules, skills, and MCP configurations inside the `.agents/` folder. This cookbook guides you through setting up MemoFS with Antigravity IDE and Antigravity CLI.

## How Antigravity Handles Rules & MCP

- **Rules**: Antigravity loads project rules from `AGENTS.md` and `.agents/rules/` (legacy `GEMINI.md` files are also supported for backwards compatibility).
- **MCP Servers in Antigravity IDE**: Workspace-local MCP servers are configured in **`.agents/mcp_settings.json`**.
- **MCP Servers in Antigravity CLI**: Global or profile-based MCP servers are registered using the `agy mcp add` command or stored in `~/.gemini/antigravity-cli/settings.json`.

---

## Setup Instructions

### Step 1: Initialize project memory

Run the initializer in your project root:

```bash
cd /path/to/your/project
npx @memofs/cli init
```

### Step 2: Generate agent rules

Generate the rules file for your workspace:

```bash
npx @memofs/cli generate agent-rules gemini --project-name "Your project name"
```

> **Note:** If `AGENTS.md` is present in your project root, Antigravity loads it automatically. You can also link or copy rules into `AGENTS.md` and `.agents/rules/`.

### Step 3: Register the MCP Server

Depending on whether you are using **Antigravity IDE** or **Antigravity CLI**, follow the appropriate method below:

#### Option A: Antigravity IDE (Project-Local Configuration)

Add the MemoFS MCP server definition to **`.agents/mcp_settings.json`** in your project root:

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

If `.agents/mcp_settings.json` does not exist yet, create it with the above content.

#### Option B: Antigravity CLI (`agy`)

Register the MCP server directly via the CLI:

```bash
agy mcp add memofs -- npx -y @memofs/mcp-server
```

*Alternatively, run `agy config --edit` to edit your global CLI MCP profile.*

---

## Step 4: Verify Setup

### In Antigravity IDE:
1. Open the sidebar chat panel in your IDE.
2. Ask the agent: *"Check project memory using MemoFS."*
3. Verify that the agent invokes the `memofs` MCP tools.

### In Antigravity CLI (`agy`):
1. Run `agy inspect` to verify active MCP tools and skills.
2. Confirm `memofs` is listed under active MCP servers.

## Next Steps

- [Semantic search](/packages/adapters/transformers).
- [Team memory sync](/packages/mcp/hybrid-mode).