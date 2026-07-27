---
title: "Team Sharing & Automated Connector Workflows"
date: "2026-07-27"
estimatedMinutes: 7
---

## Overview

Scale repository memory across engineering teams. With MemoFS Team Sharing and automated Connectors, memory recorded by one developer or ingested from Notion and GitHub automatically grounds AI coding agents across your entire team.

This cookbook covers inviting team members, configuring organization-level connectors, and establishing shared memory workflows.

![Screenshot Placeholder: Diagram displaying team members sharing a central MemoFS memory store fed by Notion and GitHub]

---

## Why Team Memory Matters

- **End Repetitive Onboarding**: New developers and agents immediately inherit all past architecture decisions and bug fixes.
- **Unified Knowledge Source**: Ingest Notion PRDs and GitHub PR discussions into a single memory graph.
- **Role-Based Access Control**: Manage read/write access keys for human developers, CI runners, and automated agent tools.

---

## Prerequisites

- **MemoFS Account**: Active Teams or Enterprise organization
- **MemoFS CLI**: Installed (`npm install -g @memofs/cli`)
- **Admin Access**: Permissions to add team members and create project connectors
- Reference: [MemoFS Connectors Guide](https://docs.memofs.dev/packages/connectors/)

---

## Step 1: Create Organization & Invite Members

1. Log in to your MemoFS Cloud account:
   ```bash
   npx @memofs/cli cloud login
   ```
2. Open the **MemoFS Cloud Dashboard** and navigate to **Organization Settings -> Members**.
3. Click **Invite Member** and enter team member email addresses.
4. Assign roles (`Owner`, `Member`, or `Read-Only CI`).

![Screenshot Placeholder: MemoFS Cloud Dashboard team management page with pending invites]

---

## Step 2: Configure Organization-Wide Connectors

Set up automated ingestion from GitHub and Notion so all team members receive updated context automatically.

### 1. Configure `.memofs/connectors.json`
Commit `.memofs/connectors.json` to your repository:

```json
{
  "connectors": [
    {
      "id": "team-github",
      "type": "github",
      "enabled": true,
      "schedule": "@hourly",
      "sourceMapping": {
        "repository": "acme-corp/core-api",
        "kinds": ["issues", "prs", "discussions"]
      },
      "secretRef": "ss_org_github"
    },
    {
      "id": "team-notion",
      "type": "notion",
      "enabled": true,
      "schedule": "@hourly",
      "sourceMapping": {
        "databaseId": "0123456789abcdef0123456789abcdef"
      },
      "secretRef": "ss_org_notion"
    }
  ]
}
```

### 2. Store Organization Secrets in Cloud Vault

```bash
npx @memofs/cli cloud secret set --project core-api ss_org_github ghp_orgTokenHere
npx @memofs/cli cloud secret set --project core-api ss_org_notion ntn_orgTokenHere
```

![Screenshot Placeholder: Cloud secret management page displaying active secret references]

---

## Step 3: Shared Team Workflow in Action

Once configured, team members pull shared memory during daily development:

```bash
# Pull team memory updates before starting tasks
npx @memofs/cli cloud pull
```

### How Team Agents Benefit
- **Developer A** records an architectural change:
  > *"We switched our rate limiter from Redis to Cloudflare KV."*
- **Developer B** asks their agent (Codex / Cursor / Claude Code):
  > *"How should I implement rate limiting for the new endpoint?"*
- **Developer B's Agent** retrieves Developer A's note via `memofs.context` and uses Cloudflare KV.

---

## Video Walkthrough

Watch team memory sharing and automated connectors in action:

[Watch on YouTube](https://youtube.com/watch?v=DAKnynuGyy4)

---

## Related Documentation & Resources

- [Connectors Framework Guide](https://docs.memofs.dev/packages/connectors/)
- [MemoFS Cloud Management Docs](https://docs.memofs.dev/packages/cli/cloud)
- [Multi-Agent Collaboration Reference](https://docs.memofs.dev/packages/core/concepts)
