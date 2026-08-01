---
title: Introduction
description: What MemoFS is, and which doc to read first depending on what you're building.
# sidebar: false
---

# Introduction

MemoFS is a **file-first memory runtime for AI agents**. Instead of a database or a vector store, memory lives as plain Markdown and JSONL files under a `.memofs/` directory in your project — versioned, diffable, and committed alongside your code.

Everything in these docs branches off one question: **how are you using MemoFS?**

## Which path fits you?

### I use a coding agent day-to-day
Claude Code, Cursor, Codex, Copilot, and others can all read and write MemoFS memory automatically once configured — most agents are set up in under 5 minutes.

→ **[Find your agent in Cookbooks](/learn/cookbooks/)**

### I'm building an agent or app and want memory as a library
Import `@memofs/core` directly. Same API whether memory lives in local files, MemoFS Cloud, or both.

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