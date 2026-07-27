---
title: "Syncing Notion Databases & Pages into MemoFS"
date: "2026-07-27"
estimatedMinutes: 8
---

## Overview

Ingest your team's **Notion workspaces, documentation databases, and product specs** into MemoFS memory. By connecting Notion to MemoFS, AI agents (Codex, Claude Code, Cursor) automatically retrieve PRDs, architecture guidelines, and roadmap specs during code editing.

This step-by-step tutorial details configuring `.memofs/connectors.json`, setting up Notion internal integrations, and executing ingestion in both **Local Mode** and **Hybrid Mode**.

![Screenshot Placeholder: Diagram showing Notion REST API ingesting pages into local .memofs store and replicating to Cloud]

---

## Connector Modes Overview

Notion ingestion executes via the MemoFS local connector framework. The connector queries Notion's REST API (`Notion-Version: 2022-06-28`), normalizes pages into `ConnectorRecord` objects, and writes deduplicated notes to `.memofs/notes.md`.

| Feature | Local Mode | Hybrid / Cloud Mode |
|---------|------------|---------------------|
| **Execution** | Local developer environment | Local machine / CI pipeline |
| **Secrets** | Stored in local `.memofs/secrets.json` | Resolved via Cloud API (`CloudSecretResolver`) |
| **Ingestion Target** | Local `.memofs/` store | Local `.memofs/` store + Cloud sync |
| **Use Case** | Single developer / local sandbox | Team sync & managed cloud projects |

---

## Prerequisites

- **Node.js**: `v22.0.0` or later
- **Notion Integration Token**: Internal integration token (`secret_...` or `ntn_...`) created in Notion Integrations Settings.
- **Shared Notion Page/Database**: Target database or root page shared with your integration.
- Reference: [Connectors Framework Guide](https://docs.memofs.dev/packages/connectors/)

---

## Step 1: Create Notion Integration Token

1. Go to [Notion My Integrations](https://www.notion.so/my-integrations).
2. Click **New Integration**, name it `MemoFS Memory Connector`, and select your workspace.
3. Copy the **Internal Integration Secret** (`ntn_...` or `secret_...`).
4. In Notion, open your target database or document page, click `...` -> **Connections**, and add `MemoFS Memory Connector`.

![Screenshot Placeholder: Notion UI showing integration creation and page connection settings]

---

## Step 2: Configure `.memofs/connectors.json`

Add the Notion connector definition to `.memofs/connectors.json`:

```json
{
  "connectors": [
    {
      "id": "notion-docs",
      "type": "notion",
      "enabled": true,
      "schedule": "@hourly",
      "sourceMapping": {
        "databaseId": "32charHexDatabaseIdHere",
        "limit": 50
      },
      "secretRef": "ss_notion_token"
    }
  ]
}
```

### Source Mapping Configuration
- `databaseId` (string): 32-character hex Notion database ID.
- `searchQuery` (string, optional): Workspace search query if not targeting a specific database ID.
- `limit` (number): Max pages to fetch (default: 50).

---

## Step 3: Mode 1 — Local Mode Setup

In **Local Mode**, tokens are saved locally in `.memofs/secrets.json` (gitignored) and resolved via `EnvSecretResolver`.

### 1. Set Secret in `.memofs/secrets.json`

```json
{
  "ss_notion_token": "ntn_1234567890abcdef"
}
```

### 2. Execute Local Ingestion Script

```ts
import { MemoFS } from "@memofs/core";
import { createNodeFsMemoryStore } from "@memofs/core/node-fs";
import { runConnectors, EnvSecretResolver } from "@memofs/connectors";

async function runNotionLocal() {
  const store = createNodeFsMemoryStore({ rootDir: "./.memofs" });
  const memo = new MemoFS({ store, projectId: "my-notion-project" });

  const result = await runConnectors({
    rootDir: "./.memofs",
    memo,
    secretResolver: new EnvSecretResolver({ rootDir: "./.memofs" }),
  });

  console.log("Newly written notes:", result.written);
  console.log("Skipped unchanged notes:", result.skipped);
}

runNotionLocal();
```

### 3. Run via MemoFS CLI

```bash
# Register secret locally
npx @memofs/cli connectors secret set ss_notion_token ntn_1234567890abcdef

# Run ingestion
npx @memofs/cli connectors run
```

![Screenshot Placeholder: Terminal window showing Notion connector ingesting database pages]

---

## Step 4: Mode 2 — Hybrid / Hosted Mode Setup

In **Hybrid Mode**, connector settings sync across developer machines while integration tokens are stored securely in MemoFS Cloud.

```
.memofs/connectors.json (Synced config)
            │
            ▼
Local Runner (Local Engine Execution)
            │
            ├──► Resolves Token from Cloud Vault (CloudSecretResolver)
            ├──► Queries Notion REST API -> Normalizes page blocks
            └──► Writes local notes -> Replicates to MemoFS Cloud
```

### 1. Set Cloud Secret

```bash
npx @memofs/cli cloud login
npx @memofs/cli cloud secret set --project my-project-id ss_notion_token ntn_1234567890abcdef
```

### 2. Execute Hybrid Ingestion

```ts
import { MemoFS } from "@memofs/core";
import { createNodeFsMemoryStore } from "@memofs/core/node-fs";
import { runConnectors, CloudSecretResolver } from "@memofs/connectors";

async function runNotionHybrid() {
  const store = createNodeFsMemoryStore({ rootDir: "./.memofs" });
  const memo = new MemoFS({ store, projectId: "my-project-id" });

  const secretResolver = new CloudSecretResolver({
    projectId: "my-project-id",
    apiKey: process.env.MEMOFS_CLOUD_API_KEY!,
  });

  const result = await runConnectors({
    rootDir: "./.memofs",
    memo,
    secretResolver,
  });

  console.log("Hybrid Notion Ingestion Result:", result);
}

runNotionHybrid();
```

![Screenshot Placeholder: Dashboard interface displaying Notion sync status and note counts]

---

## Step 5: Verification & Best Practices

Verify that Notion pages have been indexed into local memory:

```bash
# Inspect note entries
npx @memofs/cli inspect

# Search for ingested Notion content
npx @memofs/cli search "Product Requirements"
```

### Key Guarantees
- **Deduplication**: Re-running ingestion on unmodified Notion pages produces zero duplicate entries.
- **Source Attribute**: All notes are tagged with `source: "connector"`.

---

## Related Documentation & Resources

- [Connectors Package API Reference](https://docs.memofs.dev/api/connectors)
- [CLI Reference Guide](https://docs.memofs.dev/packages/cli/)
- [Core Memory Engine](https://docs.memofs.dev/packages/core/)
