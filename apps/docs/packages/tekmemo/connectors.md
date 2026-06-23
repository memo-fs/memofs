# Connectors

Connectors ingest external sources — GitHub issues, Notion pages, anything — into your project's `.tekmemo/` as durable memory. They run **locally** through the same engine that serves your agent, so ingested context becomes recallable, inspectable, and version-controlled alongside your own notes.

Connectors are the bridge between "the things your team writes in other tools" and "the memory your agent reads every session." File an architecture decision in a GitHub issue, run a connector, and your agent can recall it next session without you re-explaining it.

## How connectors fit

::: tip TL;DR
Connectors run **locally**, never in the cloud. They fetch external content and write it through the normal `Tekmemo` write path with a special discipline: a content-derived id (no timestamps in the hash) so re-ingesting unchanged content is a no-op. Tokens never touch disk or the sync replica — only an opaque `secretRef` rides in `.tekmemo/connectors.json`.
:::

A connector is **not** a background daemon. Execution happens only while your local runtime is alive — you run it explicitly with the CLI or programmatically. There is no server-side cron in v1.

```text
 external source (GitHub, Notion, …)
            │  fetch + normalize
            ▼
   Connector.ingest() ──► ConnectorRecord[]
            │  runner applies write discipline
            ▼
      Tekmemo.writeMemory()  ──►  .tekmemo/notes.md + events
            │
            ▼
      recall / context / graph  (connector notes are first-class)
```

The connector only **fetches and normalizes**. The runner — the framework in `@tekbreed/tekmemo-connectors` — handles deduplication and the write discipline that keeps re-ingestion idempotent. This split keeps each connector small and testable.

## Install

The connector framework ships as its own package:

```bash
npm install @tekbreed/tekmemo @tekbreed/tekmemo-cli @tekbreed/tekmemo-connectors
```

The CLI (`@tekbreed/tekmemo-cli`) gives you `tekmemo connectors add / remove / list / run`. The framework package (`@tekbreed/tekmemo-connectors`) is what the CLI drives under the hood, and what you import directly for programmatic use.

## Built-in connectors

Two connectors ship in the box, registered by default:

| Type | Source | What it ingests | `sourceMapping` |
| --- | --- | --- | --- |
| `github` | A GitHub repository (GraphQL API) | Issues, PRs, and discussions | `{ repository: "owner/repo", kinds?: ["issues"\|"prs"\|"discussions"], limit?: number }` |
| `notion` | A Notion workspace | Pages from a database/workspace | notion-specific source mapping |

Both honor the same `Connector` contract, so they behave identically from the runner's perspective — the only difference is what they fetch and how you scope them via `sourceMapping`.

## Configure a connector

Connector configuration lives in **`.tekmemo/connectors.json`** — the 11th canonical sync unit. Every device that syncs your `.tekmemo/` sees the same connector setup.

::: code-group

```bash [CLI]
# Add a GitHub connector. Note: --secret-ref, never the token itself.
npx tekmemo connectors add \
  --type github \
  --id github-main \
  --secret-ref ss_github_main \
  --source-mapping '{"repository":"owner/repo","kinds":["issues","prs"]}'

npx tekmemo connectors list
npx tekmemo connectors run
```

```json [.tekmemo/connectors.json]
{
  "connectors": [
    {
      "id": "github-main",
      "type": "github",
      "enabled": true,
      "schedule": "0 */6 * * *",
      "sourceMapping": {
        "repository": "owner/repo",
        "kinds": ["issues", "prs"]
      },
      "secretRef": "ss_github_main"
    }
  ]
}
```

:::

### The connector config row

Each row in `connectors.json` is a `ConnectorConfig`:

| Field | Type | Purpose |
| --- | --- | --- |
| `id` | `string` | Stable id for this connector instance within the project (e.g. `"github-main"`). |
| `type` | `string` | Matches a registered connector (e.g. `"github"`, `"notion"`). |
| `enabled` | `boolean` | Whether the runner includes this connector. |
| `schedule` | `string?` | Cron-ish hint (e.g. `"0 */6 * * *"`). **Stored but not enforced in v1** — execution happens only while the local runtime is alive. |
| `sourceMapping` | `object?` | Source-specific config, opaque to the framework (e.g. `{ repository: "owner/repo" }`). Forwarded verbatim to the connector's `ingest()`. |
| `secretRef` | `string` | **Opaque pointer** to a credential — never the token itself. Resolved at run time via a `SecretResolver`. |

The schema is **validated** on write. Files carrying token-leak fields (anything that looks like a raw credential) are rejected, so you can't accidentally commit a token by hand-editing this file.

## Where tokens live (and don't)

This is the security model, and it's worth reading once:

- **`.tekmemo/connectors.json` carries only an opaque `secretRef`** (e.g. `"ss_github_main"`). Never the token.
- **Tokens are resolved at run time** through an injected [`SecretResolver`](#secret-resolution), held in memory only, and never written to disk or logged.
- **`.tekmemo/secrets.json`** is a **dev-only fallback** resolver — a `{ "secretRef": "token" }` map. It is **gitignored** and **not a sync unit**, so it never leaves your machine. Add it to `.gitignore`.
- **Production** resolves `secretRef` against the locked cloud endpoint `GET /v1/projects/:projectId/connectors/:connectorId/secret` (shipped when TekMemo Cloud launches), or any resolver you inject — a vault, an env loader, etc.

Because tokens never ride in the file replica, syncing `.tekmemo/` across machines (or committing it to git) is safe. The connector setup travels with the project; the credentials stay where they belong.

## Run connectors

A run reads `connectors.json`, selects enabled connectors, resolves each secret, fetches, dedupes, and writes. A single connector failure is **recorded, not fatal** — the run continues with the next connector.

```bash
# Run every enabled connector
npx tekmemo connectors run

# Run only GitHub
npx tekmemo connectors run --only-type github

# Machine-readable output
npx tekmemo connectors run --json
```

A run reports three counts:

```text
Connectors run complete.
- ran: github-main, notion-docs
- written: 14
- skipped (already ingested): 42
- errors: 0
```

- **written** — new note ids written this run.
- **skipped** — external items already ingested on a prior run (dedup skips).
- **errors** — recoverable per-item/per-connector errors; non-zero → exit code 1.

### Why re-running is cheap: the write discipline

Connector notes are keyed by a **content-derived id** (`connectorNoteId`): a hash of `externalId` + `content` with **no wall-clock timestamp** in the hashed bytes. So re-ingesting identical external content reproduces the *exact same* id → identical bytes in `notes.md` → the sync manifest reports "no change" → no phantom conflict, no needless upload.

If the external item *changed* (an issue was edited), the hash changes → a new id → a new write. That's a genuine content change, and it surfaces correctly. The discipline works identically across local and hybrid modes because the id lives on the note, not the store.

## Programmatic use

The CLI wraps the framework. For custom tooling, schedulers, or embedding into another app, use it directly:

```ts
import { Tekmemo } from "@tekbreed/tekmemo";
import {
  EnvSecretResolver,
  runConnectors,
} from "@tekbreed/tekmemo-connectors";

// One Tekmemo instance per .tekmemo/ root (single-writer contract).
const memo = new Tekmemo({
  mode: "local",
  rootDir: "./.tekmemo",
  projectId: "my-app",
});

const result = await runConnectors({
  rootDir: "./.tekmemo",
  memo, // the runner reuses YOUR instance — never constructs its own
  secretResolver: new EnvSecretResolver({ rootDir: "./.tekmemo" }),
  // connectorRegistry defaults to built-ins (GitHub + Notion);
  // pass your own to include third-party connectors.
});

console.log(result.written.length, "notes written");
console.log(result.skipped.length, "already ingested");
```

::: warning Single-writer contract
The runner reuses the `Tekmemo` instance you pass in. It never constructs its own on the same `.tekmemo/` root — a second writer throws `LockHeldError`. If you need to hand the root to another process, call `memo.dispose()` first.
:::

### Secret resolution

The runner needs a `SecretResolver` to turn each `secretRef` into a live token. Three ship in the box:

| Resolver | Use case |
| --- | --- |
| `EnvSecretResolver` | Reads `.tekmemo/secrets.json` (gitignored, non-synced). The dev default the CLI uses. |
| `StaticSecretResolver` | An in-memory `{ secretRef: token }` map. For tests and hosts that already hold the tokens. |
| Your own `SecretResolver` | Implement `resolve(ref): Promise<string>`. The production seam against a vault or the cloud secret endpoint. |

```ts
import { StaticSecretResolver } from "@tekbreed/tekmemo-connectors";

const secretResolver = new StaticSecretResolver({
  ss_github_main: process.env.GITHUB_TOKEN!,
  ss_notion_docs: process.env.NOTION_TOKEN!,
});
```

## What gets written

Each ingested item becomes a normal note — a first-class memory, not a segregated bucket. The runner stamps it with the connector-write discipline so you can tell where it came from:

- `source: "connector"`
- `sourceRefs[0].sourceType: "connector"`
- `sourceRefs[0].sourceId: <externalId>` (e.g. `"issue:42"`)
- `sourceRefs[0].url: <provenance link>` (the GitHub/Notion URL, if available)
- `id: conn_<16 hex chars>` (content-derived, greppable)

Because it's a normal note, it shows up everywhere: `tekmemo recall`, `tekmemo context`, the graph, `notes.md`. You read it, edit it, or delete it the same way you would a note your agent wrote. Connector ingestion is just another write path.

## Write your own connector

A connector is one object implementing the `Connector` interface — fetch + normalize into `ConnectorRecord`s, return them. The runner does the rest.

```ts
import type {
  Connector,
  ConnectorIngestContext,
  ConnectorRecord,
} from "@tekbreed/tekmemo-connectors";

export class LinearConnector implements Connector {
  readonly type = "linear";
  readonly displayName = "Linear";

  async ingest(
    ctx: ConnectorIngestContext,
  ): Promise<readonly ConnectorRecord[]> {
    // ctx.token  — the resolved credential, in-memory only
    // ctx.config — the ConnectorConfig row from connectors.json
    // ctx.memo   — the host's Tekmemo instance (read-only use only)
    // ctx.signal — abort signal from the runner

    const items = await fetchLinearIssues(ctx.token, ctx.config.sourceMapping);
    return items.map((item) => ({
      externalId: `linear:${item.id}`, // stable across re-ingest
      title: item.title,
      content: item.description,
      url: item.url,
      occurredAt: item.createdAt,
      metadata: { team: item.team },
    }));
  }
}
```

Register it alongside the built-ins and run:

```ts
import {
  ConnectorRegistry,
  runConnectors,
} from "@tekbreed/tekmemo-connectors";
import { LinearConnector } from "./linear-connector";

const registry = new ConnectorRegistry([new LinearConnector()]);
// Add a row in connectors.json with "type": "linear", then:
await runConnectors({ rootDir: "./.tekmemo", memo, secretResolver, connectorRegistry: registry });
```

::: tip The contract
Return `ConnectorRecord`s — **don't write notes yourself**. The runner applies the write discipline (content-derived id, `source: "connector"`, dedup) in one place. Writing from inside a connector would bypass dedup and break idempotent re-ingestion.
:::

## Limitations in v1

- **No server-side scheduling.** The `schedule` field is stored but not enforced. Execution happens only when you (or a cron you own) invoke a run locally.
- **No `tekmemo-connectors` API reference page yet.** The package is part of the workspace; its types are documented inline above and in the package README. A dedicated `/api/tekmemo-connectors/` section will land when the API surface stabilizes.

## See also

- [The `Tekmemo` client](./client) — the write path connectors feed into.
- [File-first memory](./file-first-memory) — why connector notes are just notes.
- [Sync and events](./architecture/sync-events) — how `connectors.json` rides the file replica.
- ADR 0002 — *Connectors run locally*.
