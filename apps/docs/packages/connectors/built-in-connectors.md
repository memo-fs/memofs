# Built-in Connectors

| Connector | `type` | Source | Status |
|---|---|---|---|
| **GitHub** | `"github"` | Issues, PRs, discussions (GraphQL API) | ✅ |
| **Notion** | `"notion"` | Pages from a database or workspace search (REST API) | ✅ |

Both built-in connectors fetch all their pages for a run before returning anything to the framework. That means a fetch failure partway through pagination — a rate limit, a network blip, an auth error — aborts that connector's **entire pass**: items from pages fetched earlier in the same call are not written, and the failure is recorded once in `result.errors`. This is safe to retry (see the tip under [The Connector-Write Discipline](#the-connector-write-discipline) above) — it just means one failed run yields zero writes for that connector, not partial credit.

## GitHub

Ingests a repository's issues, PRs, and discussions using GitHub's GraphQL API.

**`sourceMapping` options:**

| Field | Type | Default | Description |
|---|---|---|---|
| `repository` | `string` | — (required) | `"owner/repo"` |
| `kinds` | `string[]` | `["issues", "prs", "discussions"]` | Which node types to ingest |
| `limit` | `number` | `50` | Max items per kind (per-page cost control) |

The token is a fine-grained PAT or OAuth token with read access to the repository. GitHub returns both `403` and `429` for rate limiting, and the connector treats both as throttling; a `401` is treated separately as an invalid/missing token. Rate-limit errors are surfaced in `result.errors` (no retry/backoff in v1).

## Notion

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

## See Also

- [Core Client API](/packages/core/client/)
- [Configuration](/packages/core/configuration)
- [CLI Connectors Commands](/packages/cli/connectors)