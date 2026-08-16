---
title: "How to use MemoFS with Gemini (CLI / Code Assist)"
date: "2026-07-28"
estimatedMinutes: 3
description: "Connect Google Gemini AI agents and SDKs to MemoFS persistent memory stores."
---

# ⚠️ Before you start: check which tool you're actually running

As of June 18, 2026, Gemini CLI stopped serving requests for Google AI Pro, Ultra, and free-tier users — Google replaced it with **Google Antigravity** (Antigravity IDE & Antigravity CLI `agy`). **If you are using Google Antigravity or `agy`, this cookbook's MCP step won't apply to you — use the [Antigravity cookbook](./antigravity.md) instead.**

This page covers memofs's official `gemini` generate target, which remains correct for:

- Enterprise Gemini Code Assist licenses (Gemini CLI access continues under those)
- Anyone still running a pre-cutover Gemini CLI install

## Overview

Gemini is a rules + MCP target, no hooks — same shape as Cursor and Copilot.

## Prerequisites

- Node.js v22+

## Quick Start (3 Minutes)

### Step 1: Initialize project memory

```bash
cd /path/to/your/project
npx @memofs/cli init
```

### Step 2: Generate the Gemini setup

```bash
npx @memofs/cli generate agent gemini --project-name "Your project name"
```

Produces:

- **`GEMINI.md`** — rules file
- **`.gemini/rules/git-conventions.md`**
- **`.gemini/settings.json`** — MCP server entry (project-local by default; `--scope global` writes `~/.gemini/settings.json` instead)

### Step 3: Record persistent project memory

```bash
npx @memofs/cli remember "Project uses VitePress for documentation" --kind note
```

This stores a durable note in `.memofs/memory/notes.md`.

### Step 4: Restart and verify

Restart Gemini CLI / Gemini Code Assist. No hooks means no auto-injection — confirm the agent is calling the tool:

- Prompt Gemini: *"Which docs framework does this project use?"*
- Or ask: *"Check your memofs project memory and tell me what's there."*

## Next Steps

If you've since migrated to Google Antigravity (IDE or CLI), go to the [Antigravity cookbook](./antigravity.md) — rules carry over, but MCP configuration uses `.agents/mcp_settings.json` (IDE) or `agy mcp add` (CLI).

- [Semantic search](/adapters/transformers).
- [Team memory sync](/mcp/hybrid-mode).