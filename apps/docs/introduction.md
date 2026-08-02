---
title: Introduction
description: What MemoFS is, and which doc to read first depending on what you're building.
# sidebar: false
---

# Introduction

MemoFS is a **file-first memory runtime for AI agents**, designed equally for two paths: developers **using coding agents** day-to-day, and developers **building AI agents**.

Everything in these docs branches off one question: **how are you using MemoFS?**

## Which path fits you?

### 1. I'm using coding agents day-to-day
Claude Code, Cursor, Codex, Copilot, and opencode can all read and write MemoFS memory automatically via MCP or lifecycle hooks — setup takes under 5 minutes.

→ **[Find your agent in Cookbooks](/learn/cookbooks/)** · **[MCP Server Overview](/packages/mcp/)**

### 2. I'm building AI agents & applications
Import `@memofs/core` or `@memofs/server` directly to equip custom agents with a lightweight, file-first, zero-database memory runtime.

→ **[`@memofs/core` overview](/packages/core/)** · **[API reference](/api/core)**

### I want to self-host the server
Run the MemoFS server yourself — on Node.js or Cloudflare Workers — instead of using the hosted Cloud offering.

→ **[Self-hosting overview](/packages/server/)**

### I just want the hosted version, no infrastructure
MemoFS Cloud gives you a managed MCP endpoint and team workspaces without running anything yourself.

→ **[MemoFS Cloud](https://memofs.dev)**

## The mental model, in three points

1. **Memory is files, not a database.** Core facts, notes, conversation history, recall indexes, and a knowledge graph all live under `.memofs/` as Markdown/JSONL — see [Core Concepts](/packages/core/concepts).
2. **Every capability has a deterministic fallback.** Retrieval, graph extraction, and reranking all work with zero API keys out of the box (BM25 + rule-based parsing); adding an LLM/embedding adapter upgrades them — see [Configure Intelligence](/configure/intelligence).
3. **Distribution matches the agent.** Agents with lifecycle hooks (Claude Code, Codex, opencode) get memory injected automatically; everything else connects over MCP — see [MCP overview](/packages/mcp/).

## Quick install

::: code-group

```sh [npm]
npm install -D @memofs/cli
npx memofs init
```

```sh [pnpm]
pnpm add -D @memofs/cli
pnpm memofs init
```

```sh [bun]
bun add -d @memofs/cli
bunx memofs init
```

:::

This creates `.memofs/` in your project. From here, jump to whichever path above matches what you're building. Full flag reference: [CLI overview](/packages/cli/).