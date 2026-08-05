---
title: "How to use MemoFS with opencode"
date: "2026-07-28"
estimatedMinutes: 3
---

# Overview

opencode is the third hooks-native target memofs supports — but with an important difference from Claude Code and Codex: opencode's plugin can't inject context directly into the model. It only handles the cloud pull and session bookkeeping. Recall still works, just through the agent calling MCP tools itself rather than hook output appearing in context automatically.

## Prerequisites

- Node.js v22+

## Quick Start

### Step 1: Initialize project memory

```bash
cd /path/to/your/project
npx @memofs/cli init
```

### Step 2: Generate the full opencode setup

```bash
npx @memofs/cli generate agent opencode --project-name "Your project name"
```

Produces:

- **`AGENTS.md`** — rules file. Because opencode can't auto-inject, this file keeps the "call `memofs.context` yourself" instruction rather than claiming context loads automatically.
- **`.agents/rules/git-conventions.md`**
- **`.opencode/plugins/memofs.js`** — handles the cloud pull, a session-start compliance marker, and an end-of-session status toast (no context injection)
- **`opencode.json`** — the MCP server entry (project-local by default)

### Step 3: Restart and verify

Restart opencode. Since there's no auto-injection, confirm the agent is actually calling the MCP tool rather than assuming it's active:

- Ask directly: *"Call your memofs context tool and tell me what's in project memory."*
- Look for the compliance toast at session end.

If the agent doesn't reach for the tool on its own, double check `AGENTS.md` landed correctly — it's the only thing telling opencode's model that the tool exists and when to use it.

## Notes

- `-f`/`--force` replaces a prior memofs plugin entry; without it, existing config is preserved.

## Next Steps

- [Semantic search](/packages/adapters/transformers).
- [Team memory sync](/packages/mcp/hybrid-mode).