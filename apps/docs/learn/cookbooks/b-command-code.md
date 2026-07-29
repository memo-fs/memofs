---
title: "How to use MemoFS with Command Code in 6 minutes"
date: "2026-07-28"
estimatedMinutes: 6
---

# Overview

Command Code (`cmd`) natively reads `AGENTS.md` and supports `SessionStart`/`Stop` hooks for context injection alongside MCP servers. You can generate your workspace rules file directly using `npx @memofs/cli generate agent-rules agents` and register the MemoFS MCP server via `cmd mcp add`.

## Prerequisites

- Node.js v22+
- Command Code installed: `npm i -g command-code` (binary is `cmd`; on Windows it's `cmdc`, since `cmd` is the Windows shell)

## Fast path: reuse the Codex output

If you're comfortable generating a Codex config as an intermediate step:

```bash
cd /path/to/your/project
npx @memofs/cli init
npx @memofs/cli generate agent codex --scope local
```

Then inside a Command Code session:

```
/import codex
```

This pulls in MCP servers, skills, agents, custom commands, and memory from the `.codex/` config it finds — including the `memofs` MCP entry. Verify with `cmd mcp list`. **Note:** `/import` does not translate Codex's hooks — you still need Step 3 below for automatic context injection.

## From-scratch path

### Step 1: Initialize project memory

```bash
cd /path/to/your/project
npx @memofs/cli init
```

### Step 2: Rules file + MCP server

```bash
npx @memofs/cli generate agent-rules agents --project-name "Your project name"
```

Command Code reads `AGENTS.md` natively as project memory — no copying needed.

Register the MCP server at `project` scope, so it lands in `.mcp.json` and gets committed like the rest of this batch's setups:

```bash
cmd mcp add memofs --scope project -- npx -y @memofs/mcp-server
```

This writes to `.mcp.json`:

```json
{
  "mcpServers": {
    "memofs": {
      "transport": "stdio",
      "command": "npx",
      "args": ["-y", "@memofs/mcp-server"]
    }
  }
}
```

Verify with `cmd mcp list` or `cmd mcp get memofs`.

### Step 3: Wire up hooks for automatic context

Neither the fast path nor Step 2 gets you automatic injection — Command Code's hooks are configured separately under `.commandcode/settings.json`, and `/import` doesn't touch them. Two hooks cover the same "auto-load at start, summarize at end" pattern the native targets get:

**`.commandcode/settings.json`**

```json
{
  "hooks": {
    "SessionStart": [
      {
        "hooks": [
          { "type": "command", "command": "./.commandcode/hooks/memofs-context.sh" }
        ]
      }
    ],
    "Stop": [
      {
        "hooks": [
          { "type": "command", "command": "./.commandcode/hooks/memofs-summary.sh" }
        ]
      }
    ]
  }
}
```

**`.commandcode/hooks/memofs-context.sh`**

```bash
#!/usr/bin/env bash
set -euo pipefail

# Replace the line below with whatever memofs CLI command prints current
# project context as plain text — check the Memory Commands reference
# (docs.memofs.dev/packages/cli/memory) for the exact invocation, since
# this cookbook hasn't been verified against that specific command yet.
CONTEXT=$(npx @memofs/cli context 2>/dev/null || echo "memofs: no context available")

jq -n --arg ctx "$CONTEXT" '{
  hookSpecificOutput: {
    hookEventName: "SessionStart",
    additionalContext: $ctx
  }
}'
```

**`.commandcode/hooks/memofs-summary.sh`**

```bash
#!/usr/bin/env bash
set -euo pipefail
jq -n '{ systemMessage: "memofs: session memory recorded." }'
```

Make both executable:

```bash
chmod +x .commandcode/hooks/memofs-context.sh .commandcode/hooks/memofs-summary.sh
```

`SessionStart` here only injects `additionalContext` and a `systemMessage` — it never blocks, retries, or halts, so a slow or failing memofs call can't stop a session from opening.

### Step 4: Restart and verify

Restart with `cmd`. Confirm:

- `/mcp` shows `memofs` connected.
- A fresh session answers a question about something you stored earlier, without you repeating it — confirms `SessionStart` injection is actually working, not just configured.
- Run `cmd --debug` and tail `~/.commandcode/logs/command.log` if the hook doesn't seem to fire — it records every hook evaluation, including why one didn't run (plan mode skips hooks entirely, for instance).

## Notes

- MCP has three scopes (`local`, `project`, `user`) — `project` is what this cookbook uses so config is shared and version-controlled, matching how the other cookbooks in this set treat `.mcp.json`.
- Hooks only cover `PreToolUse`, `PostToolUse`, `Stop`, and `SessionStart` — there's no subagent-specific event the way Claude Code has `SubagentStart`.
- The `memofs-context.sh` placeholder is the one part of this cookbook that needs a real command swapped in before publishing — everything else here is verified against Command Code's current docs.

## Next Steps

- [Semantic search](/packages/adapters/transformers).
- [Team memory sync](/packages/mcp/hybrid-mode).