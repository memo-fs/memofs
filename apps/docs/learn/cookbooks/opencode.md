---
title: "Initializing MemoFS with OpenCode"
date: "2026-07-27"
estimatedMinutes: 5
---

## Overview

Connect **OpenCode** — the open-source AI agent framework — to MemoFS for persistent, local-first repository memory. OpenCode agents configured with MemoFS maintain historical context across code editing sessions, preventing repetitive explanations and maintaining strict architectural boundaries.

This step-by-step cookbook guides you through setting up MemoFS, generating agent rules, and registering the MemoFS MCP server in `opencode.json`.

![Screenshot Placeholder: OpenCode interface displaying MemoFS MCP tool registration and active session memory]

---

## Why MemoFS for OpenCode?

- **Open Standards**: Fully open-source local memory stack built on JSON-RPC, Markdown, and MCP.
- **Unified Tooling**: Seamlessly exposes `memofs.context`, `memofs.recall`, and `memofs.remember` as native OpenCode tools.
- **Git-Native Sync**: Store all knowledge inside `.memofs/` without depending on external proprietary SaaS databases.

---

## Prerequisites

- **Node.js**: `v22.0.0` or higher
- **OpenCode CLI / Desktop**: Installed
- **MemoFS CLI**: Installed globally or executable via `npx @memofs/cli`
- Reference: [MemoFS CLI Reference](https://docs.memofs.dev/packages/cli/)

---

## Step 1: Initialize `.memofs/` Workspace

Navigate to your OpenCode project directory and run `memofs init`:

```bash
cd /path/to/your/opencode-project
npx @memofs/cli init
```

This initializes `.memofs/` containing local SQLite/libSQL index stores, vector embeddings, and `.memofs/notes.md`.

![Screenshot Placeholder: Terminal showing memofs init output in an OpenCode project]

---

## Step 2: Configure `opencode.json`

OpenCode manages tool connections and MCP servers via `opencode.json` in the root of your workspace. Add the `memofs` server definition under `mcpServers`:

```json
{
  "$schema": "https://opencode.ai/schema.json",
  "mcpServers": {
    "memofs": {
      "command": "npx",
      "args": ["-y", "@memofs/cli", "mcp"],
      "enabled": true
    }
  }
}
```

Alternatively, run the MemoFS generator to update your `opencode.json` automatically:

```bash
npx @memofs/cli generate mcp-config opencode --scope project
```

![Screenshot Placeholder: opencode.json config file with active memofs mcpServer block]

---

## Step 3: Add OpenCode Agent Rules

Generate the OpenCode agent rules pointer file (`AGENTS.md` or `opencode.json` rules section):

```bash
npx @memofs/cli generate agent-rules opencode
```

This updates your OpenCode system configuration with the required MemoFS memory protocol:

```json
{
  "instructions": [
    "At session start, execute `memofs.context` with your prompt goal to load repository context.",
    "Use `memofs.recall` when looking up past decisions or architectural details.",
    "Persist major discoveries, refactoring rules, and bug fixes using `memofs.remember`."
  ]
}
```

---

## Step 4: Run OpenCode Agent & Verify Memory

Launch OpenCode in your workspace:

```bash
opencode run "Analyze the auth subsystem and summarize our security constraints"
```

### Verification Steps
1. **Tool Invocation**: Observe OpenCode invoking `memofs.context` at task start.
2. **Memory Persistence**: Ask OpenCode: `"Remember that all API handlers must validate request headers with Zod."`
3. **Inspect Output**: Run `npx @memofs/cli inspect` to verify the note was written to `.memofs/notes.md`.

![Screenshot Placeholder: OpenCode agent execution log showing memofs.context call and note insertion]

---

## Troubleshooting & Best Practices

| Issue | Cause | Solution |
|-------|-------|----------|
| `opencode: MCP server 'memofs' timeout` | First-time `npx` package fetch delay | Pre-install `@memofs/cli` globally via `npm install -g @memofs/cli`. |
| Memory not persisting across restarts | `.memofs/` path permission issue | Ensure your user account has write permissions to `.memofs/`. |

---

## Related Documentation & Resources

- [OpenCode Integration Overview](https://docs.memofs.dev/packages/mcp/)
- [MemoFS CLI Reference](https://docs.memofs.dev/packages/cli/)
- [Core Memory Engine Concepts](https://docs.memofs.dev/packages/core/concepts)
