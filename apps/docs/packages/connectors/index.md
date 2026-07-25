# Connectors Framework

`@memofs/connectors` provides a local ingestion framework to load external data sources (GitHub issues, Notion databases, etc.) into MemoFS memory.

Following the file-first architecture, connectors execute strictly on the local machine. Only the resulting memory files are synced to the cloud — API tokens and secrets never leave your local environment.

## How It Works

1. **Configuration:** Stored in `.memofs/connectors.json` — one of MemoFS's 11 canonical sync units. Each connector row carries an opaque `secretRef`, never the token.
2. **Secret Resolution:** Tokens are fetched at runtime via a `SecretResolver`. They are held only in memory and never written to disk.
3. **Connector Execution:** Each connector fetches its source, normalizes items into `ConnectorRecord`s, and the runner writes them through the local engine with the connector-write discipline.
4. **Sync:** The resulting files sync back to the cloud like any other memory file.

### The Connector-Write Discipline

Every connector-emitted note is written with three guarantees:

| Field | Value | Why |
|---|---|---|
| `source` | `"connector"` | Discriminates connector content from human-authored notes inside `notes.md` (no new region). |
| `sourceRefs[0].sourceId` | stable external id (`"issue:42"`) | The dedup key — re-ingest skips already-seen items. |
| `id` | `conn_<sha256(externalId:content)[:16]>` | Content-derived, no wall-clock. Re-ingesting identical content reproduces identical bytes → the sync manifest reports "no change" → no phantom conflict, no needless upload. |

> [!TIP]
> Because the id is derived only from `externalId` + `content`, a run that fails partway through (see [Built-in Connectors](#built-in-connectors) below) is always safe to retry: nothing is double-written, and nothing is silently lost — the next successful run reproduces the same ids for unchanged items and writes only what's genuinely new.

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

## Quick Start

```ts
import { MemoFS } from "@memofs/core";
import { createNodeFsMemoryStore } from "@memofs/core/node-fs";
import { runConnectors, EnvSecretResolver } from "@memofs/connectors";

const store = createNodeFsMemoryStore({ rootDir: "." });
const memo = new MemoFS({ store, projectId: "my-app" });

const result = await runConnectors({
  rootDir: ".",
  memo,
  secretResolver: new EnvSecretResolver({ rootDir: "." }),
});

console.log(result.written); // ["conn_...", ...] — newly ingested note ids
console.log(result.skipped); // ["issue:42", ...] — already ingested (dedup)
console.log(result.errors);  // per-connector recoverable errors
console.log(result.ran);     // ["github-main", ...] — connector ids that ran this pass
```

## Workspace Configuration (`connectors.json`)

```json
{
  "connectors": [
    {
      "id": "github-main",
      "type": "github",
      "enabled": true,
      "schedule": "@hourly",
      "sourceMapping": { "repository": "owner/repo", "kinds": ["issues", "prs", "discussions"] },
      "secretRef": "ss_abc123"
    }
  ]
}
```

The schema (`{ id, type, enabled, schedule, sourceMapping, secretRef }`) is locked. A row carrying a `token`/`secret`/`apiKey` field is rejected — tokens never ride in the file replica.

### Config Validation Guardrails

`connectors.json` is validated as a whole before it's trusted, and the checks are broader than the top-level schema above. Two independent layers run against the **entire file**, including inside `sourceMapping`:

1. **Forbidden field names.** Any connector row containing an exact `token`, `secret`, `apiKey`, `apikey`, or `access_token` key is rejected outright.
2. **Recursive key/value scan.** Every key at every nesting depth is checked, case-insensitively, for the *substrings* `token`, `secret`, `apikey`, `api_key`, or `password` — the only exemption is a key that lowercases to exactly `secretref`. Independently, every string value anywhere in the file is checked against known token shapes (GitHub `ghp_…`/`gho_…`/etc., Notion `secret_…`, MemoFS `tm_…`, JWTs, and Stripe `sk_`/`pk_`/`rk_live|test_…`). A match on either check rejects the **whole file**, not just the offending row.

> [!WARNING]
> The substring check means a perfectly innocent `sourceMapping` field can trip this — for example `maxTokens` or `tokenLimit` both contain `"token"`. Avoid those words anywhere in a connector row, including nested `sourceMapping` keys, or the file will fail to load with a `ConnectorConfigError`. This applies whether you edit `connectors.json` by hand or add a connector via `memofs connectors add --source-mapping '<json>'` — the same validation runs either way. See the [CLI Connectors Commands](/packages/cli/connectors) page for the command-line side of this.

## Secret Resolution

Tokens are resolved at runtime through an injected `SecretResolver`. The token lives in memory only and is never written to disk.

### `EnvSecretResolver` (dev/local fallback)

Reads `.memofs/secrets.json` — a separate, gitignored, non-synced file:

```json
{ "ss_abc123": "ghp_..." }
```

```ts
import { EnvSecretResolver } from "@memofs/connectors";

const resolver = new EnvSecretResolver({ rootDir: "." });
```

> [!NOTE]
> Despite the name, `EnvSecretResolver` does not read OS environment variables — it reads the JSON file above. Treat "Env" here as shorthand for "the default local/dev environment," not `process.env`.

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
  cloudBaseUrl: "https://memofs.dev/api/v1",
});
```

Calls `GET {cloudBaseUrl}/projects/:projectId/connectors/secret?ref=:secretRef` with the configured Bearer API key. The `cloudBaseUrl` is the cloud API root — the same value the cloud client uses.

> [!NOTE]
> `memofs connectors run` on the CLI picks this resolver automatically whenever the project has cloud credentials configured, falling back to `EnvSecretResolver` otherwise — you don't need to wire either resolver by hand for CLI use. See [CLI Connectors Commands](/packages/cli/connectors).

### Custom Resolver

Implement the `SecretResolver` interface to wire any backend (a vault, a password manager, etc.):

```ts
import type { SecretResolver } from "@memofs/connectors";

class VaultSecretResolver implements SecretResolver {
  async resolve(secretRef: string): Promise<string> {
    // fetch from your vault
  }
}
```

## Built-in Connectors

| Connector | `type` | Source | Status |
|---|---|---|---|
| **GitHub** | `"github"` | Issues, PRs, discussions (GraphQL API) | ✅ |
| **Notion** | `"notion"` | Pages from a database or workspace search (REST API) | ✅ |

Both built-in connectors fetch all their pages for a run before returning anything to the framework. That means a fetch failure partway through pagination — a rate limit, a network blip, an auth error — aborts that connector's **entire pass**: items from pages fetched earlier in the same call are not written, and the failure is recorded once in `result.errors`. This is safe to retry (see the tip under [The Connector-Write Discipline](#the-connector-write-discipline) above) — it just means one failed run yields zero writes for that connector, not partial credit.

### GitHub

Ingests a repository's issues, PRs, and discussions using GitHub's GraphQL API.

**`sourceMapping` options:**

| Field | Type | Default | Description |
|---|---|---|---|
| `repository` | `string` | — (required) | `"owner/repo"` |
| `kinds` | `string[]` | `["issues", "prs", "discussions"]` | Which node types to ingest |
| `limit` | `number` | `50` | Max items per kind (per-page cost control) |

The token is a fine-grained PAT or OAuth token with read access to the repository. GitHub returns both `403` and `429` for rate limiting, and the connector treats both as throttling; a `401` is treated separately as an invalid/missing token. Rate-limit errors are surfaced in `result.errors` (no retry/backoff in v1).

### Notion

Ingests Notion pages from a database (`POST /v1/databases/:id/query`) or a workspace search (`POST /v1/search`) via the Notion v1 REST API.

**`sourceMapping` options:**

| Field | Type | Default | Description |
|---|---|---|---|
| `databaseId` | `string` | — | 32-char hex database id. Either this or `searchQuery` is required. |
| `searchQuery` | `string` | — | Free-text workspace search (fallback when no `databaseId`). |
| `limit` | `number` | `50` | Max pages to ingest (cost control). |

The token is a Notion internal integration token (`ntn_…` / `secret_…`) with the target database/page shared to the integration. The `Notion-Version: 2022-06-28` header is set automatically.

> [!WARNING]
> Unlike GitHub, Notion's `401`/`403` and `429` are **not** the same condition. A `429` is an actual rate limit. A `401` or `403` means the integration token is missing, expired, or revoked — or the target page/database was never shared with the integration — and is surfaced as a distinct authorization error, not throttling. Retrying a `401`/`403` on a timer won't help; fix the token or sharing settings instead. Both are recorded in `result.errors` (no retry/backoff in v1).

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

`ConnectorRegistry` also exposes `.get(type)`, `.has(type)`, and `.types()` if you need to inspect what's registered rather than just add to it.

## API Reference

### `runConnectors(options)`

Runs all enabled connectors in `.memofs/connectors.json`.

| Option | Type | Required | Description |
|---|---|---|---|
| `rootDir` | `string` | Yes | The `.memofs/` parent directory |
| `memo` | `MemoFS` | Yes | The host's MemoFS instance (single-writer) |
| `secretResolver` | `SecretResolver` | Yes | Resolves `secretRef` → token at runtime |
| `connectorRegistry` | `ConnectorRegistry` | No | Custom registry (defaults to built-ins) |
| `onlyType` | `string` | No | Run only connectors of this `type` — the same filter the CLI's `memofs connectors run --type <type>` uses |
| `signal` | `AbortSignal` | No | Abort signal for cancellation |

Returns a `RunConnectorsResult`: `{ written, skipped, errors, ran }`, where `ran` lists the connector `id`s that were attempted this pass (regardless of whether they wrote anything or errored) and the other three fields are aggregated across all of them.

### `EnvSecretResolver`

Reads tokens from `.memofs/secrets.json` (dev/local fallback). See the [naming note](#envsecretresolver-dev-local-fallback) above.

### `StaticSecretResolver`

In-memory map of `{ secretRef: token }` (tests/programmatic).

### `CloudSecretResolver`

Fetches tokens from the MemoFS cloud API (production).

### `createConnectorRegistry(extras?)`

Creates a registry seeded with the built-in connectors (GitHub + Notion), plus any extras.

### `connectorNoteId(record)`

Computes the deterministic `conn_<16 hex chars>` id for a `ConnectorRecord` without writing it — useful in tests that need to assert on an id, or in tooling that wants to check whether a given external item would be considered a duplicate.

### Error classes

All three are exported and carry a stable `.code` string, so you can branch on `.code` even across a boundary that loses the `instanceof` check (e.g. a worker or subprocess):

| Class | `.code` | Thrown when |
|---|---|---|
| `ConnectorConfigError` | `CONNECTOR_CONFIG_ERROR` | `connectors.json` is missing structure, has an invalid row, or trips a [validation guardrail](#config-validation-guardrails) |
| `ConnectorSecretError` | `CONNECTOR_SECRET_ERROR` | A `SecretResolver` can't resolve a `secretRef` (also exposes `.secretRef`) |
| `ConnectorError` | — | Base class both of the above extend; useful for a single `catch` |

### Reading and validating config directly

If you're building tooling around `connectors.json` rather than running ingestion, these are exported too:

| Export | Description |
|---|---|
| `readConnectorsFile(rootDir)` | Reads and validates `.memofs/connectors.json`; a missing file resolves to an empty set rather than throwing |
| `validateConnectorsFile(raw)` | Runs the same validation ([guardrails](#config-validation-guardrails) included) against an already-parsed value |
| `selectConnectors(file, { enabled?, type? })` | Filters a `ConnectorsFile` by enabled state and/or type — the same logic `runConnectors` and the CLI's `--type` use |
| `EMPTY_CONNECTORS_FILE` | A frozen `{ connectors: [] }` constant |

## See Also

- [Core Client API](/packages/core/client/)
- [Configuration](/packages/core/configuration)
- [CLI Connectors Commands](/packages/cli/connectors)