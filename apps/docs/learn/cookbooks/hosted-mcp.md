---
title: "Hosted MCP & HTTP Endpoints for CI Runners & Serverless Agents"
date: "2026-07-27"
estimatedMinutes: 7
---

## Overview

Connect cloud agents, CI runners, and serverless runtimes to MemoFS memory over secure **HTTPS and Hosted MCP endpoints**. With hosted endpoints, cloud agents (such as GitHub Actions, Vercel AI workers, or AWS Lambda agents) ground themselves in repository memory without requiring local file checkouts or SQLite binaries.

This guide walks through generating read-only API keys, configuring hosted MCP server endpoints over SSE/HTTP, and querying memory from CI pipelines.

![Screenshot Placeholder: Diagram showing GitHub Actions runner querying MemoFS Hosted MCP endpoint over HTTPS]

---

## Why Hosted MCP Endpoints?

- **Zero-Checkout Footprint**: Agents query memory via HTTP JSON-RPC/SSE without checking out local `.memofs/` binary stores.
- **Granular API Keys**: Issue read-only tokens (`mfs_ro_...`) for public CI pipelines so runners ground in memory without write permissions.
- **Serverless Ready**: Connect Vercel Edge Functions, Cloudflare Workers, and Lambda functions to persistent memory in milliseconds.

---

## Prerequisites

- **MemoFS Cloud Account**: Active project on MemoFS Cloud
- **MemoFS CLI**: Installed (`npm install -g @memofs/cli`)
- Reference: [Hosted MCP Endpoint Documentation](https://docs.memofs.dev/packages/mcp/hosted-mcp-endpoint)

---

## Step 1: Generate Hosted API Keys

Generate a read-only or read-write API key for your project:

```bash
# Generate read-only key for CI / serverless agents
npx @memofs/cli cloud keys create --project my-project-id --role read-only --name "ci-github-actions"
```

### Output Example
```
Key Name: ci-github-actions
Role: read-only
API Key: mfs_ro_7f8a9b0c1d2e3f4a5b6c7d8e9f0a
Endpoint: https://api.memofs.dev/v1/projects/my-project-id/mcp
```

> [!CAUTION]
> Store `mfs_ro_...` tokens in environment secrets (e.g. GitHub Repository Secrets). Never commit raw API keys to public repositories.

---

## Step 2: Configure Hosted MCP in Agents

### Option A: Standard MCP Config over HTTP/SSE
Configure agent environments (Cursor, Claude Code, OpenCode) to use the hosted endpoint:

```json
{
  "mcpServers": {
    "memofs-hosted": {
      "url": "https://api.memofs.dev/v1/projects/my-project-id/mcp",
      "headers": {
        "Authorization": "Bearer mfs_ro_7f8a9b0c1d2e3f4a5b6c7d8e9f0a"
      }
    }
  }
}
```

### Option B: HTTP JSON-RPC Direct Call
For serverless functions or simple cURL scripts:

```bash
curl -X POST https://api.memofs.dev/v1/projects/my-project-id/jsonrpc \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer mfs_ro_7f8a9b0c1d2e3f4a5b6c7d8e9f0a" \
  -d '{
    "jsonrpc": "2.0",
    "method": "memofs.context",
    "params": { "query": "auth subsystem architecture" },
    "id": 1
  }'
```

![Screenshot Placeholder: Insomnia/Postman showing HTTP JSON-RPC response from MemoFS Hosted Endpoint]

---

## Step 3: Integrating with GitHub Actions CI

Wire an automated PR review agent in GitHub Actions (`.github/workflows/ai-review.yml`):

```yaml
name: AI Code Review with MemoFS Grounding

on:
  pull_request:
    types: [opened, synchronize]

jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Code
        uses: actions/checkout@v4

      - name: Run Claude Code Action with MemoFS
        uses: anthropic/claude-code-action@v1
        env:
          MEMOFS_ENDPOINT: https://api.memofs.dev/v1/projects/${{ secrets.MEMOFS_PROJECT_ID }}/mcp
          MEMOFS_API_KEY: ${{ secrets.MEMOFS_RO_KEY }}
        with:
          prompt: "Review this PR diff against our MemoFS project rules and architecture notes."
```

![Screenshot Placeholder: GitHub Actions workflow log executing PR review with MemoFS context]

---

## Video Walkthrough

Watch the demonstration of hosted MCP and HTTP endpoints in action:



---

## Related Documentation & Resources

- [Hosted MCP Endpoint Specification](https://docs.memofs.dev/packages/mcp/hosted-mcp-endpoint)
- [HTTP API Reference Guide](https://docs.memofs.dev/packages/server/http-api)
- [Serverless Deployment Guide](https://docs.memofs.dev/packages/server/)
