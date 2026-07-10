# Connectors Framework

`@memofs/connectors` provides a local ingestion framework to load external data sources (GitHub issues, Notion databases, etc.) into MemoFS memory.

Following the file-first architecture, connectors execute strictly on the local machine. Only the resulting memory files are synced to the cloud — API tokens and secrets never leave your local environment.

---

## How It Works

```
.memofs/connectors.json ──► runConnectors() ──► .memofs/notes.md (+ indexes)
 (config, no tokens)          (local engine)      (source: "connector")
```

1. **Configuration:** Stored in `.memofs/connectors.json` — one of MemoFS's 11 canonical sync units. Each connector row carries an opaque `secretRef`, never the token.
2. **Secret Resolution:** Tokens are fetched at runtime via a `SecretResolver`. They are held only in memory and never written to disk.
3. **Connector Execution:** Each connector fetches its source, normalizes items into `ConnectorRecord`s, and the runner writes them through the local engine with the connector-write discipline.
4. **Sync:** The resulting files sync back to the cloud like any other memory file.

### The connector-write discipline

Every connector-emitted note is written with three guarantees:

| Field | Value | Why |
|-------|-------|-----|
| `source` | `"connector"` | Discriminates connector content from human-authored notes inside `notes.md` (no new region). |
| `sourceRefs[0].sourceId` | stable external id (`"issue:42"`) | The dedup key — re-ingest skips already-seen items. |
| `id` | `conn_<sha256(externalId:content)[:16]>` | Content-derived, no wall-clock. Re-ingesting identical content reproduces identical bytes → the sync manifest reports "no change" → no phantom conflict, no needless upload. |

---

## Installation

::: code-group

```sh [npm]
npm install @memofs/connectors @memofs/core
```

```sh [pnpm]
pnpm add @memofs/connectors @memofs/core
```

```sh [yarn]
yarn add @memofs/connectors @memofs/core
```

```sh [bun]
bun add @memofs/connectors @memofs/core
```

:::

> [!NOTE]
> Requires **Node.js >= 22**.

---

## Quick Start

```ts
import { MemoFS } from "@memofs/core";
import { createNodeFsMemoryStore } from "@memofs/core/node-fs";
import { runConnectors, EnvSecretResolver } from "@memofs/connectors";

const store = createNodeFsMemoryStore({ rootDir: "./.memofs" });
const memo = new MemoFS({ store, projectId: "my-app" });

const result = await runConnectors({
  rootDir: "./.memofs",
  memo,
  secretResolver: new EnvSecretResolver({ rootDir: "./.memofs" }),
});

console.log(result.written); // ["conn_...", ...] — newly ingested note ids
console.log(result.skipped); // ["issue:42", ...] — already ingested (dedup)
console.log(result.errors);  // per-connector recoverable errors
```

---

## Workspace Configuration (`connectors.json`)

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

The schema (`{ id, type, enabled, schedule, sourceMapping, secretRef }`) is locked. A row carrying a `token`/`secret`/`apiKey` field is rejected — tokens never ride in the file replica.

---

## Secret Resolution

Tokens are resolved at runtime through an injected `SecretResolver`. The token lives in memory only and is never written to disk.

### `EnvSecretResolver` (dev/local fallback)

Reads `.memofs/secrets.json` — a separate, gitignored, non-synced file:

```json
{ "ss_abc123": "ghp_..." }
```

```ts
import { EnvSecretResolver } from "@memofs/connectors";

const resolver = new EnvSecretResolver({ rootDir: "./.memofs" });
```

### `StaticSecretResolver` (tests/programmatic)

Backed by an in-memory map — useful for tests and programmatic embedding where the host already holds the tokens:

```ts
import { StaticSecretResolver } from "@memofs/connectors";

const resolver = new StaticSecretResolver({ ss_abc123: "test-token" });
```

### `CloudSecretResolver` (production)

Fetches decrypted tokens from the MemoFS cloud API:

```ts
import { CloudSecretResolver } from "@memofs/connectors";

const resolver = new CloudSecretResolver({
  projectId: "my-project",
  apiKey: "tm_...",
  cloudBaseUrl: "https://memofs.dev",
});
```

Calls `GET /v1/projects/:projectId/connectors/secret?ref=:secretRef` with the configured Bearer API key.

### Custom resolver

Implement the `SecretResolver` interface to wire any backend (a vault, a password manager, etc.):

```ts
import type { SecretResolver } from "@memofs/connectors";

class VaultSecretResolver implements SecretResolver {
  async resolve(secretRef: string): Promise<string> {
    // fetch from your vault
  }
}
```

---

## Built-in Connectors

| Connector | `type` | Source | Status |
|-----------|--------|--------|--------|
| **GitHub** | `"github"` | Issues, PRs, discussions (GraphQL API) | Shipped |
| **Notion** | `"notion"` | Pages from a database or workspace search (REST API) | Shipped |

### GitHub

Ingests a repository's issues, PRs, and discussions using GitHub's GraphQL API.

**`sourceMapping` options:**

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `repository` | `string` | — (required) | `"owner/repo"` |
| `kinds` | `string[]` | `["issues", "prs", "discussions"]` | Which node types to ingest |
| `limit` | `number` | `50` | Max items per kind (per-page cost control) |

The token is a fine-grained PAT or OAuth token with read access to the repository. Rate-limit errors are surfaced in `result.errors` (no retry/backoff in v1).

### Notion

Ingests Notion pages from a database (`POST /v1/databases/:id/query`) or a workspace search (`POST /v1/search`) via the Notion v1 REST API.

**`sourceMapping` options:**

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `databaseId` | `string` | — | 32-char hex database id. Either this or `searchQuery` is required. |
| `searchQuery` | `string` | — | Free-text workspace search (fallback when no `databaseId`). |
| `limit` | `number` | `50` | Max pages to ingest (cost control). |

The token is a Notion internal integration token (`ntn_…` / `secret_…`) with the target database/page shared to the integration. The `Notion-Version: 2022-06-28` header is set automatically. Rate-limit errors (403/429) are surfaced in `result.errors` (no retry/backoff in v1).

---

## Writing a Custom Connector

```ts
import type { Connector, ConnectorRecord, ConnectorIngestContext } from "@memofs/connectors";

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

Register a custom connector via the registry:

```ts
import { createConnectorRegistry } from "@memofs/connectors";

const registry = createConnectorRegistry();
registry.register(new LinearConnector());

await runConnectors({ rootDir, memo, secretResolver, connectorRegistry: registry });
```

---

## API Reference

### `runConnectors(options)`

Runs all enabled connectors in `.memofs/connectors.json`.

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `rootDir` | `string` | Yes | The `.memofs/` parent directory |
| `memo` | `MemoFS` | Yes | The host's MemoFS instance (single-writer) |
| `secretResolver` | `SecretResolver` | Yes | Resolves `secretRef` → token at runtime |
| `connectorRegistry` | `ConnectorRegistry` | No | Custom registry (defaults to built-ins) |
| `signal` | `AbortSignal` | No | Abort signal for cancellation |

Returns `{ written, skipped, errors }`.

### `EnvSecretResolver`

Reads tokens from `.memofs/secrets.json` (dev/local fallback).

### `StaticSecretResolver`

In-memory map of `{ secretRef: token }` (tests/programmatic).

### `CloudSecretResolver`

Fetches tokens from the MemoFS cloud API (production).

### `createConnectorRegistry(extras?)`

Creates a registry seeded with the built-in connectors (GitHub + Notion), plus any extras.

---

## See Also

- [Core Client API](/packages/core/client)
- [Configuration](/packages/core/configuration)
- [CLI `memofs connectors`](/packages/cli/)
