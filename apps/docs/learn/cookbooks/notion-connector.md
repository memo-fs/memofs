---
title: "How to ingest Notion Pages into MemoFS"
date: "2026-08-02"
estimatedMinutes: 4
description: "Ingest Notion workspace pages and databases into structured MemoFS markdown memory files."
---

# How to ingest Notion Pages into MemoFS

This cookbook shows you how to connect your team's Notion workspace or project database to MemoFS, enabling AI agents to recall architecture specifications, product requirements, and knowledge docs written in Notion.

## Prerequisites

- **Node.js**: `>= 22.0.0`
- Notion Internal Integration Token (`ntn_...` or `secret_...`)
- Notion Database ID or Page ID shared with your integration.

## Step 1: Add Notion Secret

Store your Notion integration token in `.memofs/secrets.json`:

```json
{
  "notion_token": "ntn_yourNotionIntegrationToken"
}
```

> [!TIP]
> Ensure `.memofs/secrets.json` is added to your `.gitignore` so secrets are never committed to version control.

## Step 2: Configure the Notion Connector

Register the Notion connector using the CLI. You can specify a `databaseId` or a `searchQuery`:

```bash
npx @memofs/cli connectors add \
  --id team-notion \
  --type notion \
  --secret-ref notion_token \
  --source-mapping '{"databaseId":"32characterDatabaseIdHere","limit":50}'
```

Or for full-workspace keyword search ingestion:

```bash
npx @memofs/cli connectors add \
  --id team-notion \
  --type notion \
  --secret-ref notion_token \
  --source-mapping '{"searchQuery":"Architecture Spec","limit":25}'
```

## Step 3: Run Ingestion

Ingest pages into local memory:

```bash
npx @memofs/cli connectors run --type notion
```

Output:
```
✓ Connectors run complete (25 written, 0 skipped)
Connectors run summary:
- ran: team-notion
- written: 25
- skipped (already ingested): 0
```

## Step 4: Verify Recall

Test retrieval of the Notion documentation:

```bash
npx @memofs/cli recall "What is the data retention policy for user uploads?"
```

## Related Resources

* [Built-in Connectors Reference](/connectors/built-in-connectors)
* [Connectors CLI Commands](/cli/connectors)
* [Core Concepts & Memory Layers](/core/concepts)