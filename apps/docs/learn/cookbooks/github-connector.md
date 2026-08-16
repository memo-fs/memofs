---
title: "How to ingest GitHub Issues & PRs into MemoFS"
date: "2026-08-01"
estimatedMinutes: 4
description: "Ingest GitHub issues, pull requests, and discussions into local MemoFS memory with the GitHub connector."
---

# How to ingest GitHub Issues & PRs into MemoFS

This cookbook demonstrates how to configure the GitHub connector to automatically ingest pull requests, issues, and discussions from your GitHub repositories into `.memofs/` memory so your AI agents understand past discussions and resolved bugs.

## Prerequisites

- **Node.js**: `>= 22.0.0`
- GitHub Personal Access Token (classic or fine-grained PAT) with repository read permissions.

## Step 1: Store your GitHub Token

MemoFS keeps credentials out of `connectors.json` by referencing tokens through opaque `secretRef` keys.

In your project root, add your token to `.memofs/secrets.json`:

```json
{
  "gh_pat": "ghp_yourPersonalAccessTokenGoesHere"
}
```

> [!TIP]
> Ensure `.memofs/secrets.json` is added to your `.gitignore` so secrets are never committed to version control.

## Step 2: Configure the GitHub Connector

Add the GitHub connector using the CLI:

```bash
npx @memofs/cli connectors add \
  --id github-repo \
  --type github \
  --secret-ref gh_pat \
  --source-mapping '{"repository":"my-org/my-repo","kinds":["issues","prs","discussions"],"limit":50}'
```

This writes a safe descriptor to `.memofs/connectors.json`:

```json
{
  "connectors": [
    {
      "id": "github-repo",
      "type": "github",
      "enabled": true,
      "sourceMapping": {
        "repository": "my-org/my-repo",
        "kinds": ["issues", "prs", "discussions"],
        "limit": 50
      },
      "secretRef": "gh_pat"
    }
  ]
}
```

## Step 3: Run Ingestion

Execute the connector to fetch and index GitHub data into memory:

```bash
npx @memofs/cli connectors run --type github
```

Output:
```
✓ Connectors run complete (50 written, 0 skipped)
Connectors run summary:
- ran: github-repo
- written: 50
- skipped (already ingested): 0
```

## Step 4: Verify in Agent Recall

Ask your agent a question regarding an issue or PR:

```bash
npx @memofs/cli recall "Why was the JWT auth middleware rewritten in PR #42?"
```

Your agent will retrieve the exact discussion and decision points extracted directly from GitHub.

## Related Resources

* [Built-in Connectors Reference](/connectors/built-in-connectors)
* [Connectors CLI Guide](/cli/connectors)
* [Custom Connectors Framework](/connectors/custom-connectors)

