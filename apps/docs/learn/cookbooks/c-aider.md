---
title: "How to use MemoFS with Aider in 4 minutes"
date: "2026-07-28"
estimatedMinutes: 4
---

# This one's different: Aider has no MCP support

Every other cookbook in this set works the same way — a rules file plus an MCP server the agent calls on demand. Aider doesn't speak MCP at all, so there's no tool-calling recall and no way for Aider to write new facts back into memory mid-session. What you get instead is static, read-only context: memofs's memory file loads at the start of every Aider session, the same way Aider loads `CONVENTIONS.md`.

## Setup (4 Minutes)

### Step 1: Initialize project memory

```bash
cd /path/to/your/project
npx @memofs/cli init
```

### Step 2: Point Aider at your memory file

Add to `.aider.conf.yml` (project root):

```yaml
read:
  - .memofs/memory/core.md
```

`read:` files load as read-only context on every session and are prompt-cache-friendly — this is the same mechanism Aider uses for `CONVENTIONS.md`.

### Step 3: Verify

```bash
aider
```

Check the startup log for `.memofs/memory/core.md` in the list of read-only files added to the chat. Ask Aider a question that depends on something in that file.

## Keeping memory current

Since Aider can't call back into memofs, new facts have to get into `core.md` some other way: either edit it directly, or run the MemoFS CLI's memory commands from another terminal while you work (see the Memory Commands reference at `/packages/cli/memory`). There's no live sync mid-session — whatever's in the file when Aider starts is what it sees for that session.

## Notes

- A community Aider–MCP bridge exists but isn't part of Aider itself — treat it as experimental if you go looking for one, rather than something this cookbook can vouch for.

## Next Steps

- [Semantic search](/packages/adapters/transformers).
- [Team memory sync](/packages/mcp/hybrid-mode).