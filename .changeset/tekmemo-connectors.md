---
"@tekbreed/tekmemo": minor
"@tekbreed/tekmemo-connectors": minor
---

# Connector framework + GitHub reference connector (Q1–Q3, Q6, Q7, Q10 / ADR 0002)

New package **`@tekbreed/tekmemo-connectors`** — the local connector framework.
Connectors ingest external sources (GitHub, Notion, …) into `.tekmemo/` through
the **local** engine; the cloud only replicates the resulting files. This is the
`git`/GitHub-Actions model locked by ADR 0002: the *config* is synced, the
*credential* is fetched live, the *work* happens on your machine. GitHub ships as
the reference connector; Notion is a follow-up.

## What's new

### `@tekbreed/tekmemo-connectors` (new package)

- **Provider-neutral `Connector` interface** — one plugin per source, mirroring
  the embedder/extractor adapter pattern (Q10). Adding a connector = writing a
  new adapter, not refactoring the framework.
- **`runConnectors({ rootDir, memo, secretResolver })`** — the runner. Reads
  `.tekmemo/connectors.json`, resolves each connector's `secretRef` to a token
  via the injected `SecretResolver`, fetches + normalizes records, dedupes by
  content-derived id, and writes new notes through the host's `Tekmemo`
  instance. A single connector error never aborts the run.
- **Config reader + validator** — `readConnectorsFile`, `validateConnectorsFile`,
  `selectConnectors`. Missing file degrades gracefully (no connectors run).
  A row carrying a leaked `token`/`apiKey`/`secret` field is **rejected** —
  tokens never ride in the file replica (the `secrets.ts` guardrail intent).
- **Injectable `SecretResolver`** with two built-ins:
  - `EnvSecretResolver` — the dev/local fallback. Reads `.tekmemo/secrets.json`
    (a separate, gitignored, non-synced file). Production wires a
    `CloudSecretResolver` against the locked `GET .../connectors/:id/secret`
    endpoint when the cloud app ships.
  - `StaticSecretResolver` — for tests / programmatic embedding.
  - Tokens live in memory only and are never written to disk or logged.
- **GitHub connector** (`GitHubConnector`, `type: "github"`) — the reference
  implementation. GraphQL against `api.github.com/graphql`; ingests issues,
  PRs, and discussions; cursor pagination; rate-limit errors surfaced as
  `GitHubRateLimitError`. `sourceMapping.repository` (`"owner/repo"`) is
  required; `kinds` and `limit` are optional. No SDK — runtime `fetch` (Node 22).
- **`ConnectorRegistry`** + `createConnectorRegistry` — the Q10 extensibility
  point. Third-party connectors register via `registry.register(new MyConnector())`.

### The connector-write discipline (Q3 / ADR 0002)

Every connector-emitted note is written with three guarantees, enforced by the
runner:

| Field | Value | Why |
|-------|-------|-----|
| `source` | `"connector"` | Discriminates connector content inside `notes.md` (no new region). |
| `sourceRefs[0].sourceId` | stable external id (`"issue:42"`) | The provenance pointer. |
| `id` | `conn_<sha256(externalId:content)[:16]>` | Content-derived, **no wall-clock** → re-ingesting identical content reproduces identical bytes → the sync manifest reports "no change". |

### `@tekbreed/tekmemo` (core, minor)

- **`WriteMemoryInput.id`** (optional) — a caller-supplied stable memory id.
  When set, the strategy uses it verbatim instead of computing the default
  `mem_<wall-clock:content>` hash. This is the Q3 hook connectors use to pass
  content-derived ids. Honored by the local, memory, and hybrid strategies
  (hybrid delegates to local). Omitting `id` preserves the historical behavior —
  backward compatible.

## What's unchanged

- **`notes.md` stays append-only** — connector notes land in the same region as
  agent notes, distinguished by `source: "connector"` (no new canonical region;
  Q3 rejected `.tekmemo/sources/`).
- **The cloud** is still a file replica, never an engine. No cloud endpoint is
  added in this build — the `secretRef` resolver is injectable so production can
  wire the locked `GET .../connectors/:id/secret` when the cloud app ships.
- **`InMemoryMemoryStore`** is unaffected (the `MemoryStore` interface is
  unchanged; the optional `id` is additive).
- **The single-writer lock** (Q28) holds: the runner accepts the host's `Tekmemo`
  instance and never constructs its own on a root it doesn't own.

## What's not here yet (v1 deferrals)

- **Notion connector** — follow-up (mechanical once the framework is proven).
- **CLI `tekmemo connectors {add|remove|list|run}`** — follow-up in
  `packages/tekmemo-cli` (depends on this package).
- **Cloud `GET .../connectors/:id/secret` resolver** — ships when the cloud app does.
- **Schedule enforcement** — `schedule` is stored but not acted on; execution
  happens only while the local runtime is alive (CLI / MCP session / daemon).

## Why

Q1–Q3/Q6/Q7/Q10 are the connector decisions locked across sessions 1–3. This
package is the largest remaining local-OSS piece of the v1 build — it unblocks
the CLI connector commands, the docs "Connectors" page, and the product's v1
differentiator (local execution per Q1). ADR 0002 already covers the
architecture; this is its implementation. No new ADR needed (the
provider-neutral `Connector` interface is an elaboration of ADR 0002's
extensibility, not a new decision).
