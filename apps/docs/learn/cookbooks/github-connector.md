---
title: "Ingesting GitHub Issues, PRs & Discussions into MemoFS"
date: "2026-07-27"
estimatedMinutes: 8
---

## Overview

Automatically ingest **GitHub Issues, Pull Requests, and Discussions** into your repository's MemoFS memory store. By ingesting GitHub activity, coding agents (Codex, Claude Code, Cursor) automatically gain deep context on open bugs, historical PR discussions, and feature specifications.

This cookbook covers connector architecture, configuration in `.memofs/connectors.json`, and both **Local Mode** and **Hybrid Mode** execution paths.

![Screenshot Placeholder: Diagram showing GitHub GraphQL API ingesting issues into local .memofs store and replicating to Cloud]

---

## Connector Modes Overview

MemoFS connectors operate under a strict local-first discipline: the connector fetches external items, normalizes content, and writes deduplicated notes (`source: "connector"`) with stable IDs (`conn_<sha256>`).

| Feature | Local Mode | Hybrid / Cloud Mode |
|---------|------------|---------------------|
| **Execution** | Developer machine / local CLI | Local machine / CI runner |
| **Secret Storage** | Local `.memofs/secrets.json` (gitignored) | Resolved via Cloud API (`CloudSecretResolver`) |
| **Ingestion Target** | Local `.memofs/` store | Local `.memofs/` store + cloud sync replica |
| **Use Case** | Local development & offline workflows | Team sync, hosted CI, and managed projects |

---

## Prerequisites

- **Node.js**: `v22.0.0` or later
- **GitHub Personal Access Token (PAT)**: Fine-grained PAT with read access to Issues, PRs, and Discussions.
- **MemoFS Packages**: `@memofs/core` and `@memofs/connectors` installed.
- Reference: [Connectors Framework Guide](https://docs.memofs.dev/packages/connectors/)

---

## Step 1: Configure `.memofs/connectors.json`

Define your GitHub connector in `.memofs/connectors.json`. Notice that the config carries an opaque `secretRef` key — **never** raw tokens.

```json
{
  "connectors": [
    {
      "id": "github-main",
      "type": "github",
      "enabled": true,
      "schedule": "@hourly",
      "sourceMapping": {
        "repository": "owner/repo-name",
        "kinds": ["issues", "prs", "discussions"],
        "limit": 50
      },
      "secretRef": "ss_github_pat"
    }
  ]
}
```

### Source Mapping Options
- `repository` (string, required): Format `"owner/repo"`.
- `kinds` (array): `["issues", "prs", "discussions"]`.
- `limit` (number): Max items to fetch per sync run (default: 50).

---

## Step 2: Mode 1 — Local Mode Setup

In **Local Mode**, secrets live in `.memofs/secrets.json` (a local, gitignored file). The `EnvSecretResolver` resolves token references locally.

### 1. Add Token to `.memofs/secrets.json`
Create `.memofs/secrets.json` (ensure it is listed in `.gitignore`):

```json
{
  "ss_github_pat": "ghp_yourPersonalAccessTokenHere"
}
```

### 2. Run Connectors via TypeScript / Node.js

```ts
import { MemoFS } from "@memofs/core";
import { createNodeFsMemoryStore } from "@memofs/core/node-fs";
import { runConnectors, EnvSecretResolver } from "@memofs/connectors";

async function ingestGitHubLocal() {
  const store = createNodeFsMemoryStore({ rootDir: "./.memofs" });
  const memo = new MemoFS({ store, projectId: "my-github-app" });

  const result = await runConnectors({
    rootDir: "./.memofs",
    memo,
    secretResolver: new EnvSecretResolver({ rootDir: "./.memofs" }),
  });

  console.log("Newly ingested notes:", result.written);
  console.log("Skipped (already ingested):", result.skipped);
}

ingestGitHubLocal();
```

### 3. Run Connectors via MemoFS CLI

```bash
# Register secret locally
npx @memofs/cli connectors secret set ss_github_pat ghp_yourPersonalAccessTokenHere

# Run local connector ingestion
npx @memofs/cli connectors run
```

![Screenshot Placeholder: Terminal output showing GitHub connector fetching issues and emitting conn_ notes]

---

## Step 3: Mode 2 — Hybrid / Hosted Mode Setup

In **Hybrid Mode**, connector configurations are synced across teams, while secret tokens are stored securely in MemoFS Cloud and resolved dynamically during ingestion via `CloudSecretResolver`.

```
.memofs/connectors.json (Synced config)
            │
            ▼
Local Engine Execution (Your machine / CI)
            │
            ├──► Fetches Secret from Cloud API (ss_github_pat)
            ├──► Ingests GitHub API -> Normalizes ConnectorRecords
            └──► Writes local .memofs/ notes -> Replicates to MemoFS Cloud
```

### 1. Register Secret in Cloud Dashboard / CLI

```bash
# Authenticate with MemoFS Cloud
npx @memofs/cli cloud login

# Upload connector secret to cloud vault
npx @memofs/cli cloud secret set --project my-project-id ss_github_pat ghp_yourToken
```

### 2. Run Hybrid Ingestion Script

```ts
import { MemoFS } from "@memofs/core";
import { createNodeFsMemoryStore } from "@memofs/core/node-fs";
import { runConnectors, CloudSecretResolver } from "@memofs/connectors";

async function ingestGitHubHybrid() {
  const store = createNodeFsMemoryStore({ rootDir: "./.memofs" });
  const memo = new MemoFS({ store, projectId: "my-project-id" });

  // CloudSecretResolver fetches tokens on demand over HTTPS
  const secretResolver = new CloudSecretResolver({
    projectId: "my-project-id",
    apiKey: process.env.MEMOFS_CLOUD_API_KEY!,
  });

  const result = await runConnectors({
    rootDir: "./.memofs",
    memo,
    secretResolver,
  });

  console.log("Hybrid ingestion completed:", result);
}

ingestGitHubHybrid();
```

![Screenshot Placeholder: Cloud Dashboard showing GitHub connector status and ingested notes count]

---

## Step 4: Verification & Deduplication Discipline

MemoFS enforces content-derived stable IDs for all connector-written notes:

- **Source Discriminator**: `source: "connector"`
- **External ID Reference**: `sourceRefs[0].sourceId = "issue:42"`
- **Content Note ID**: `conn_<sha256(externalId:content)[:16]>`

Re-running the connector on unchanged content generates identical bytes, resulting in **zero duplicate uploads** or phantom git diffs.

```bash
# Verify store status and note count
npx @memofs/cli status

# Inspect written connector notes
npx @memofs/cli search "issue:42"
```

---

## Related Documentation & Resources

- [Connectors Package API Reference](https://docs.memofs.dev/api/connectors)
- [MemoFS CLI Connectors Command](https://docs.memofs.dev/packages/cli/connectors)
- [Core Write Path Discipline](https://docs.memofs.dev/packages/core/concepts)
