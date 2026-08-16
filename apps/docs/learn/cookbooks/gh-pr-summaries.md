---
title: "How to automate Pull Request memory extraction in GitHub Actions"
date: "2026-08-07"
estimatedMinutes: 4
description: "Automate GitHub pull request memory delta summaries and commit tracking with MemoFS Cloud."
---

# How to automate Pull Request memory extraction in GitHub Actions

This cookbook shows you how to run MemoFS in GitHub Actions CI to extract decisions and architectural changes from merged pull requests, automatically updating your project's durable memory.

## Why Automate Memory in CI?

* **No Manual Note-Taking**: New architectural decisions merged in PR descriptions or comments are indexed automatically.
* **Continuous Knowledge Base**: Project memory updates as your codebase evolves.
* **Zero Drift**: AI coding agents on any workstation always start sessions with the latest master-branch knowledge.

## GitHub Actions Workflow Example

Create `.github/workflows/memofs-pr-sync.yml`:

```yaml
name: MemoFS PR Memory Ingestion

on:
  pull_request:
    types: [closed]
    branches: [main]

jobs:
  extract-memory:
    if: github.event.pull_request.merged == true
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22

      - name: Extract PR Memory to MemoFS
        env:
          MEMOFS_API_KEY: ${{ secrets.MEMOFS_API_KEY }}
          PR_TITLE: ${{ github.event.pull_request.title }}
          PR_BODY: ${{ github.event.pull_request.body }}
          PR_NUMBER: ${{ github.event.pull_request.number }}
        run: |
          npx @memofs/cli remember \
            "PR #${PR_NUMBER} (${PR_TITLE}): ${PR_BODY}" \
            --kind decision \
            --source "github-pr-${PR_NUMBER}"

      - name: Sync Memory to MemoFS Cloud
        if: env.MEMOFS_API_KEY != ''
        run: |
          npx @memofs/cli cloud push
```

## Reviewing Ingested CI Memories

Developers can verify the PR facts locally on their next pull:

```bash
npx @memofs/cli recall "PR #102 database migration"
```

## Related Resources

* [CLI Memory Commands](/cli/memory)
* [GitHub Connector Guide](./github-connector.md)
* [Team Memory Sync](./sync.md)
