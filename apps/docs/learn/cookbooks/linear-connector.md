---
title: "How to ingest Linear Issues & Specs into MemoFS"
date: "2026-08-03"
estimatedMinutes: 5
description: "Ingest Linear issues, project roadmaps, and cycle updates into MemoFS memory files using a custom connector."
---

# How to ingest Linear Issues & Specs into MemoFS

This cookbook demonstrates how to build and execute a custom **Linear connector** to synchronize Linear issues, projects, and cycles into MemoFS, so agents in Cursor, Claude Code, or Codex have direct context on active sprints, feature tickets, and bug reports.

## Prerequisites

- **Node.js**: `>= 22.0.0`
- Linear Personal API Key (`lin_api_...`)
- `@memofs/connectors` and `@memofs/core` installed in your project.

## Step 1: Store Linear Secret

Store your Linear API key in `.memofs/secrets.json`:

```json
{
  "linear_key": "lin_api_yourLinearApiKeyHere"
}
```

> [!TIP]
> Add `.memofs/secrets.json` to your `.gitignore` so API keys are never checked into version control.

## Step 2: Configure `.memofs/connectors.json`

Add the Linear connector configuration via the CLI:

```bash
npx @memofs/cli connectors add \
  --id team-linear \
  --type linear \
  --secret-ref linear_key \
  --source-mapping '{"teamKey":"ENG","limit":50}'
```

This writes a configuration row to `.memofs/connectors.json`:

```json
{
  "connectors": [
    {
      "id": "team-linear",
      "type": "linear",
      "enabled": true,
      "sourceMapping": {
        "teamKey": "ENG",
        "limit": 50
      },
      "secretRef": "linear_key"
    }
  ]
}
```

## Step 3: Implement the Custom Linear Connector

Implement the `Connector` interface to query Linear's GraphQL API:

```ts
// linear-connector.ts
import type {
  Connector,
  ConnectorIngestContext,
  ConnectorRecord,
} from "@memofs/connectors";

export class LinearConnector implements Connector {
  readonly type = "linear";
  readonly displayName = "Linear";

  async ingest(ctx: ConnectorIngestContext): Promise<readonly ConnectorRecord[]> {
    const mapping = (ctx.config.sourceMapping ?? {}) as {
      teamKey?: string;
      limit?: number;
    };

    const response = await fetch("https://api.linear.app/graphql", {
      method: "POST",
      headers: {
        Authorization: ctx.token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: `
          query($filter: IssueFilter, $first: Int!) {
            issues(filter: $filter, first: $first) {
              nodes {
                id
                identifier
                title
                description
                url
                createdAt
                state { name }
                team { key }
              }
            }
          }
        `,
        variables: {
          first: mapping.limit ?? 50,
          filter: mapping.teamKey ? { team: { key: { eq: mapping.teamKey } } } : {},
        },
      }),
      signal: ctx.signal,
    });

    if (!response.ok) {
      throw new Error(`Linear API request failed: ${response.status} ${response.statusText}`);
    }

    const payload = await response.json();
    const issues = payload.data?.issues?.nodes ?? [];

    return issues.map((issue: any): ConnectorRecord => {
      const description = (issue.description ?? "").slice(0, 4000);
      const content = [
        `# [${issue.identifier}] ${issue.title}`,
        "",
        description,
        "",
        `Source: ${issue.url}`,
      ].join("\n");

      return {
        externalId: `linear:${issue.identifier}`,
        title: `[${issue.identifier}] ${issue.title}`,
        content,
        url: issue.url,
        occurredAt: issue.createdAt,
        metadata: {
          team: issue.team?.key,
          state: issue.state?.name,
          identifier: issue.identifier,
        },
      };
    });
  }
}
```

## Step 4: Run Ingestion

Execute the runner with your custom connector registered:

::: code-group

```ts [createNodeMemoFs (Recommended)]
// run-sync.ts
import { createNodeMemoFs } from "@memofs/core/node-fs";
import {
  createConnectorRegistry,
  runConnectors,
  EnvSecretResolver,
} from "@memofs/connectors";
import { LinearConnector } from "./linear-connector";

const rootDir = ".";
const memo = createNodeMemoFs({ rootDir });

// Seed registry with Linear connector
const registry = createConnectorRegistry([new LinearConnector()]);

const result = await runConnectors({
  rootDir,
  memo,
  secretResolver: new EnvSecretResolver({ rootDir }),
  connectorRegistry: registry,
  onlyType: "linear",
});

console.log(`Ingested ${result.written.length} Linear issues.`);
```

```ts [MemoFS Class]
// run-sync.ts
import { MemoFS } from "@memofs/core";
import { createNodeFsMemoryStore } from "@memofs/core/node-fs";
import {
  createConnectorRegistry,
  runConnectors,
  EnvSecretResolver,
} from "@memofs/connectors";
import { LinearConnector } from "./linear-connector";

const rootDir = ".";
const store = createNodeFsMemoryStore({ rootDir });
const memo = new MemoFS({ store, projectId: "my-app", mode: "local" });

// Seed registry with Linear connector
const registry = createConnectorRegistry([new LinearConnector()]);

const result = await runConnectors({
  rootDir,
  memo,
  secretResolver: new EnvSecretResolver({ rootDir }),
  connectorRegistry: registry,
  onlyType: "linear",
});

console.log(`Ingested ${result.written.length} Linear issues.`);
```

:::

## Step 5: Verify in Agent Recall

Ask your agent a question regarding an active Linear ticket:

```bash
npx @memofs/cli recall "ENG-142 checkout refactor requirements"
```

## Related Resources

* [Connectors Framework](/connectors/)
* [Writing Custom Connectors](/connectors/custom-connectors)
* [Connectors CLI Commands](/cli/connectors)
* [MCP Server Integration](/mcp/)

