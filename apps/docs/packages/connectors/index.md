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

## See Also

- [Core Client API](/packages/core/client/)
- [Configuration](/packages/core/configuration)
- [CLI Connectors Commands](/packages/cli/connectors)