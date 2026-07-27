---
title: "Initializing MemoFS with Cursor IDE"
date: "2026-07-27"
estimatedMinutes: 6
---

## Overview

Equip **Cursor IDE** (Composer & Chat) with persistent repository memory that lives in your workspace. When using MemoFS inside Cursor, Composer grounds its refactoring, feature generation, and inline code suggestions in your team's documented architecture rules and past memory notes.

This recipe demonstrates how to set up `.cursor/mcp.json` and configure `.cursor/rules/memofs.mdc` with `alwaysApply: true` so Cursor automatically queries MemoFS during every session.

![Screenshot Placeholder: Cursor Composer active in VS Code interface with MemoFS MCP tools loaded]

---

## Why MemoFS for Cursor?

- **Always-On Context**: `.cursor/rules/memofs.mdc` with `alwaysApply: true` guarantees Cursor checks MemoFS memory on every query.
- **Native MCP Tools**: Exposes `memofs.context`, `memofs.recall`, and `memofs.remember` directly inside Cursor Chat and Composer.
- **Cross-Developer Memory**: Memory notes live in `.memofs/` inside git, keeping all developers on your team aligned.

---

## Prerequisites

- **Cursor IDE**: Latest version installed
- **Node.js**: `v22.0.0` or later
- **MemoFS CLI**: Installed globally or via `npx @memofs/cli`
- Reference: [MemoFS Model Context Protocol (MCP) Guide](https://docs.memofs.dev/packages/mcp/)

---

## Step 1: Initialize `.memofs/` Store

Open your project in Cursor, open the integrated terminal (`Ctrl+\`` or `Cmd+\``), and initialize MemoFS:

```bash
npx @memofs/cli init
```

This sets up local indexing files and note stores under `.memofs/`.

![Screenshot Placeholder: Cursor integrated terminal running memofs init command]

---

## Step 2: Configure `.cursor/mcp.json`

Cursor connects to local tools via MCP configuration stored in `.cursor/mcp.json`. Create or update `.cursor/mcp.json` in your project root:

```json
{
  "mcpServers": {
    "memofs": {
      "command": "npx",
      "args": ["-y", "@memofs/cli", "mcp"]
    }
  }
}
```

Or run the CLI generator:

```bash
npx @memofs/cli generate mcp-config cursor --scope project
```

![Screenshot Placeholder: Cursor MCP settings page showing green active connection for memofs server]

---

## Step 3: Create `.cursor/rules/memofs.mdc` Rule

To make Cursor automatically invoke MemoFS without requiring manual prompts, create `.cursor/rules/memofs.mdc` with `alwaysApply: true`:

```markdown
---
description: MemoFS Repository Memory Protocol
globs: *
alwaysApply: true
---

# MemoFS Memory Protocol

This workspace uses MemoFS for repo memory.

## Instructions

1. **Before writing code**: Invoke `memofs.context` with your task goal to load core memory notes, constraints, and past decisions.
2. **When researching**: Use `memofs.recall` to search for specific decisions or architectural rules.
3. **After major changes**: Call `memofs.remember` to record new architecture decisions, refactoring lessons, or API changes.
```

Or generate this rule file automatically:

```bash
npx @memofs/cli generate agent-rules cursor
```

![Screenshot Placeholder: .cursor/rules/memofs.mdc file open in Cursor editor]

---

## Step 4: Test in Cursor Composer

Open Cursor Composer (`Cmd+I` or `Ctrl+I`) or Chat (`Cmd+L` or `Ctrl+L`) and issue a task prompt:

> "Refactor the database connection module to support connection pooling."

### Expected Behavior
1. Cursor reads `.cursor/rules/memofs.mdc`.
2. Cursor invokes `memofs.context` via MCP.
3. Cursor grounds its code generation in existing project memory and notes.

![Screenshot Placeholder: Cursor Composer window showing call to memofs.context and generated code]

---

## Step 5: Verification & Best Practices

Verify that your store state is healthy:

```bash
npx @memofs/cli status
```

### Best Practices for Cursor + MemoFS
- **Keep `alwaysApply: true`**: Ensures Cursor never skips memory lookup when generating complex multi-file edits.
- **Use `memofs.remember` in chat**: Prompt Cursor: *"Save this database schema decision to MemoFS memory."*
- **Commit `.cursor/rules/` and `.memofs/`**: Shared git repository memory keeps team members in sync.

---

## Related Documentation & Resources

- [MemoFS MCP Server Documentation](https://docs.memofs.dev/packages/mcp/)
- [CLI Generate Command Reference](https://docs.memofs.dev/packages/cli/generate)
- [Core Runtime Concepts](https://docs.memofs.dev/packages/core/concepts)
