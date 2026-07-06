---
title: "Introducing Memo FS: File-first Memory for AI Agents"
description: The launch of Memo FS — a memory layer built for AI agents that need durable, queryable context across sessions.
date: 2026-01-15
author: Christopher S. Aondona
tags: [product, launch, memory, ai-agents]
blog: post
sidebar: false
outline: deep
---

Today we're launching **Memo FS** — a memory layer designed specifically for AI agents that need durable, queryable context across sessions.

## The Problem

AI agents today suffer from amnesia. Every conversation starts from zero. Context windows help, but they're:

- **Expensive** — paying for tokens you've already processed
- **Limited** — hard caps on how much fits
- **Fragile** — one context overflow loses everything
- **Opaque** — no way to inspect, search, or curate what the agent "knows"

## The Solution

Memo FS gives agents a **persistent memory layer** with:

| Capability | What It Means |
|------------|---------------|
| **Core Memory** | Stable project briefing — facts the agent must know every time |
| **Notes Memory** | Durable records — decisions, constraints, preferences, summaries |
| **Recall** | Semantic retrieval over indexed memory fragments |
| **Graph Memory** | Entities, relationships, and semantic connections |
| **Cloud Sync** | Multi-device, multi-agent shared memory with conflict resolution |
| **Vector Search** | Semantic recall across all memory types |
| **Reranking** | Precision filtering with deterministic fallback |

## Quick Start

Install Memo FS:

```bash
npm install @memofs/core
```

```ts
import { Tekmemo } from "@memofs/core";
import { createNodeFsMemoryStore } from "@memofs/core/node-fs";

const memo = new Tekmemo({
  store: createNodeFsMemoryStore({ rootDir: "./.memofs" }),
  projectId: "my-app",
});

// Read durable, project-wide facts (lives in memory/core.md)
const core = await memo.read({ kind: "core" });
console.log(core.content);

// Record a durable note (appended to memory/notes.md)
await memo.write({
  content: "User prefers dark mode with high contrast.",
  kind: "preference",
});

// Recall relevant context for an agent — works offline, no API keys
const hits = await memo.recall({ query: "What does the user prefer for UI?" });
```

## What's Next

- **Visual memory inspector** — Browse and edit memory in the browser
- **Team workspaces** — Shared memory with access controls
- **Memory analytics** — Understand what your agents actually remember
- **More vector adapters** — Pinecone, Weaviate, support

## Get Started

- [Installation Guide](/packages/cli/)
- [Architecture Overview](/packages/core/concepts)
- [API Reference](/api/)

---

*Have questions? [Open a discussion](https://github.com/christophersesugh/memofs/discussions) or [file an issue](https://github.com/christophersesugh/memofs/issues).*
