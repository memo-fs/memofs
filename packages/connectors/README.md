<p align="center">
  <a href="https://www.npmjs.com/package/@tekbreed/tekmemo-connectors"><img src="https://img.shields.io/npm/v/%40tekbreed%2Ftekmemo-connectors?label=%40tekbreed%2Ftekmemo-connectors&style=for-the-badge" alt="npm version" /></a> &nbsp;
  <a href="https://github.com/tekbreed/tekmemo"><img src="https://img.shields.io/badge/status-alpha-orange?style=for-the-badge" alt="Status: Alpha" /></a> &nbsp;
  <a href="https://www.npmjs.com/package/@tekbreed/tekmemo-connectors"><img src="https://img.shields.io/npm/dm/%40tekbreed%2Ftekmemo-connectors?style=for-the-badge" alt="npm downloads" /></a> &nbsp;
  <a href="https://github.com/tekbreed/tekmemo/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/tekbreed/tekmemo/ci.yml?branch=main&style=for-the-badge&label=CI" alt="CI" /></a> &nbsp;
  <a href="https://docs.memo.tekbreed.com/packages/tekmemo/"><img src="https://img.shields.io/badge/docs-online-blue?style=for-the-badge" alt="Docs" /></a> &nbsp;
  <a href="https://github.com/tekbreed/tekmemo/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg?style=for-the-badge" alt="MIT License" /></a>
</p>

# `@tekbreed/tekmemo-connectors`

## What is this?

**The local connector framework for TekMemo.** Connectors ingest external sources (GitHub, Notion, …) into `.tekmemo/` through the **local** engine. The cloud only replicates the resulting files — connectors never run server-side. This is the [`git`/GitHub-Actions model](https://github.com/tekbreed/tekmemo/blob/main/docs/adr/0002-connectors-run-locally.md): the *config* is synced, the *credential* is fetched live, the *work* happens on your machine.

Each source is a plugin implementing the provider-neutral `Connector` interface — the same adapter pattern TekMemo uses for embedders and extractors. Adding a connector later means writing a new adapter, not refactoring the framework.

## Installation

```bash
npm install @tekbreed/tekmemo-connectors @tekbreed/tekmemo
```

## Quick Start

```ts
import { Tekmemo } from "@tekbreed/tekmemo";
import { runConnectors, EnvSecretResolver } from "@tekbreed/tekmemo-connectors";

// The host owns the Tekmemo instance (single-writer per .tekmemo/ root).
const memo = new Tekmemo({ rootDir: "./.tekmemo", projectId: "my-app" });

const result = await runConnectors({
  rootDir: "./.tekmemo",
  memo,
  secretResolver: new EnvSecretResolver({ rootDir: "./.tekmemo" }),
});

console.log(result.written);  // ["conn_...", ...] — newly ingested note ids
console.log(result.skipped);  // ["issue:42", ...] — already ingested (dedup)
```

## How it works

```
.tekmemo/connectors.json   ──►  runConnectors()  ──►  .tekmemo/notes.md (+ derived indexes)
   (config, no tokens)            (local engine)        (source: "connector")
```

1. **Config** lives in `.tekmemo/connectors.json` — one of TekMemo's 11 canonical sync units. Each connector row carries an opaque `secretRef`, **never** the token.
2. **Secrets** are resolved at run time through an injected `SecretResolver`. The token lives in memory only and is never written to disk. The v1 dev fallback reads `.tekmemo/secrets.json` (a separate, gitignored, non-synced file); production wires a `CloudSecretResolver` against `GET /v1/projects/:projectId/connectors/:connectorId/secret` when the cloud app ships.
3. **Ingestion** runs locally: each connector fetches its source, normalizes items into `ConnectorRecord`s, and the runner writes them through the local engine with the connector-write discipline (see below).
4. **The resulting files** sync back to the cloud like any other memory file.

### The connector-write discipline (Q3 / ADR 0002)

Every connector-emitted note is written with three guarantees:

| Field | Value | Why |
|-------|-------|-----|
| `source` | `"connector"` | Discriminates connector content from human-authored notes inside `notes.md` (no new region). |
| `sourceRefs[0].sourceId` | stable external id (`"issue:42"`) | The dedup key — re-ingest skips already-seen items. |
| `id` | `conn_<sha256(externalId:content)[:16]>` | Content-derived, **no wall-clock**. Re-ingesting identical content reproduces identical bytes → the sync manifest reports "no change" → no phantom conflict, no needless upload. |

## `.tekmemo/connectors.json`

```json
{
  "connectors": [
    {
      "id": "github-main",
      "type": "github",
      "enabled": true,
      "schedule": "@hourly",
      "sourceMapping": { "repository": "owner/repo", "kinds": ["issues", "prs"] },
      "secretRef": "ss_abc123"
    }
  ]
}
```

The schema (`{ id, type, enabled, schedule, sourceMapping, secretRef }`) is locked by decision Q7. A row carrying a `token`/`secret`/`apiKey` field is rejected — tokens never ride in the file replica.

## Secret resolution

```ts
import { EnvSecretResolver, StaticSecretResolver } from "@tekbreed/tekmemo-connectors";

// Dev/local fallback: reads .tekmemo/secrets.json (gitignored, NOT synced)
// { "ss_abc123": "ghp_..." }
const resolver = new EnvSecretResolver({ rootDir: "./.tekmemo" });

// Tests / programmatic
const testResolver = new StaticSecretResolver({ ss_abc123: "test-token" });
```

Implement the `SecretResolver` interface to wire any backend (a cloud fetch, a vault, a password manager).

## Built-in connectors

| Connector | `type` | Source | Status |
|-----------|--------|--------|--------|
| **GitHub** | `"github"` | Issues, PRs, discussions (GraphQL API) | ✅ Shipped |
| **Notion** | `"notion"` | Pages from a database or workspace search (REST API) | ✅ Shipped |

### GitHub

```ts
import { GitHubConnector, createConnectorRegistry } from "@tekbreed/tekmemo-connectors";

// Default registry already includes GitHub; this is how you'd add a custom one.
const registry = createConnectorRegistry();
registry.register(new MyCustomConnector());

await runConnectors({ rootDir, memo, secretResolver, connectorRegistry: registry });
```

`sourceMapping` for GitHub:

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `repository` | `string` | **required** | `"owner/repo"` |
| `kinds` | `string[]` | `["issues", "prs", "discussions"]` | Which node types to ingest |
| `limit` | `number` | `50` | Max items per kind (per-page cost control) |

The token is a fine-grained PAT or OAuth token with read access to the repository. Rate-limit errors are surfaced in `result.errors` (no retry/backoff in v1).

### Notion

Ingests Notion pages from a database (`POST /v1/databases/:id/query`) or a workspace search (`POST /v1/search`) via the Notion v1 REST API.

`sourceMapping` for Notion:

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `databaseId` | `string` | — | 32-char hex database id (hyphenated or not). Either this or `searchQuery` is required. |
| `searchQuery` | `string` | — | Free-text workspace search (falls back when no `databaseId`). |
| `limit` | `number` | `50` | Max pages to ingest (cost control). |

The token is a Notion internal integration token (`ntn_…` / `secret_…`) with the target database/page shared to the integration. The `Notion-Version: 2022-06-28` header is set automatically. Rate-limit errors (403/429) are surfaced in `result.errors` (no retry/backoff in v1).

## Writing a connector

```ts
import { type Connector, type ConnectorRecord, type ConnectorIngestContext } from "@tekbreed/tekmemo-connectors";

class LinearConnector implements Connector {
  readonly type = "linear";
  readonly displayName = "Linear";

  async ingest(ctx: ConnectorIngestContext): Promise<ConnectorRecord[]> {
    const records = await fetchLinearIssues(ctx.token, ctx.config.sourceMapping);
    // The runner handles dedup + the write discipline; the connector just
    // returns normalized records.
    return records.map((issue) => ({
      externalId: `linear:${issue.id}`,
      title: issue.title,
      content: issue.description,
      url: issue.url,
      occurredAt: issue.createdAt,
      metadata: { team: issue.team, status: issue.state },
    }));
  }
}
```

## Boundary

This package owns the connector framework + the built-in connectors. It does **not** own the TekMemo core write path (`@tekbreed/tekmemo`), the MCP server, or the CLI command group. It depends on core for writes and accepts the host's `Tekmemo` instance (single-writer contract — see `AGENTS.md`).

## What's not here yet (v1 deferrals)

- **CLI `tekmemo connectors {add|remove|list|run}`** — lives in `packages/tekmemo-cli`; wires to this package.
- **Cloud `GET .../connectors/:id/secret` resolver** — ships when the cloud app does.
- **Schedule enforcement** — `schedule` is stored but not acted on; execution happens only while the local runtime is alive (CLI / MCP session / daemon).

## Contributing

See our central [Contributing Guide](../../CONTRIBUTING.md) and development scripts for details on formatting, linting, and testing within the monorepo.

## License

MIT
