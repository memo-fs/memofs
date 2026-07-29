---
title: "How to use MemoFS with Kilo Code in 5 minutes"
date: "2026-07-28"
estimatedMinutes: 5
---

# Overview

Kilo Code is an AI coding agent (successor to Roo Code) that uses **`kilo.jsonc`** for configuration and supports Model Context Protocol (MCP) servers.

Because Kilo Code relies on rules and MCP tools to interact with project memory, this cookbook walks through generating your rules file and registering the MemoFS MCP server.

## Prerequisites

- Node.js v22+
- Kilo Code CLI (`kilo`) or the Kilo Code VS Code extension

---

## Setup Instructions (5 Minutes)

### Step 1: Initialize project memory

Run the initializer in your project root:

```bash
cd /path/to/your/project
npx @memofs/cli init
```

### Step 2: Create a rules file

Generate `AGENTS.md` for your workspace:

```bash
npx @memofs/cli generate agent-rules agents --project-name "Your project name"
```

To ensure Kilo Code loads your memory rules, add an `instructions` entry in your project's **`kilo.jsonc`** (or `./.kilo/kilo.jsonc`):

```jsonc
{
  "instructions": ["AGENTS.md"]
}
```

### Step 3: Register the MCP server

You can register the MemoFS MCP server using the CLI, editing `kilo.jsonc`, or via the IDE settings:

#### Method A: Using `kilo.jsonc` (Recommended)

Add the `memofs` server definition under the `mcp` key in your project's `kilo.jsonc` (or global `~/.config/kilo/kilo.jsonc`):

```jsonc
{
  "mcp": {
    "memofs": {
      "type": "local",
      "command": ["npx", "-y", "@memofs/mcp-server"],
      "enabled": true
    }
  }
}
```

#### Method B: Using the CLI

Run the interactive MCP setup wizard:

```bash
kilo mcp add memofs
```

When prompted, set:
- **Command**: `npx`
- **Args**: `-y @memofs/mcp-server`

#### Method C: Using the Kilo Code UI

In VS Code:
1. Open Kilo Code Settings (gear icon).
2. Navigate to **Agent Behaviour** → **MCP Servers**.
3. Click **Add Server** and enter the `npx -y @memofs/mcp-server` command.

---

## Step 4: Verify Setup

Run the following command to inspect registered MCP servers:

```bash
kilo mcp list
```

Confirm `memofs` shows as connected, then ask Kilo Code:

> *"Check project memory using MemoFS."*

Verify that Kilo Code invokes the `memofs` MCP tools to inspect memory.