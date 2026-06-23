---
"@tekbreed/tekmemo-connectors": minor
---

# Notion connector (Q10)

The Notion connector is now a built-in, shipping alongside GitHub. Both v1
connectors from decision Q10 are delivered.

## What's new

- **`NotionConnector`** (`type: "notion"`) — ingests Notion pages from a
  database (`POST /v1/databases/:id/query`) or a workspace search
  (`POST /v1/search`) via the Notion v1 REST API. Cursor pagination via
  `start_cursor`; rate-limit errors (403/429) surfaced as `NotionRateLimitError`.
  No SDK — runtime `fetch` (Node 22). The `Notion-Version: 2022-06-28` header is
  set automatically.
- **`sourceMapping`**: either `databaseId` (32-char hex, hyphenated or not) or
  `searchQuery` (free-text workspace search), plus an optional `limit`
  (default 50).
- **Registered in the default registry** — `createConnectorRegistry()` now seeds
  both GitHub and Notion; a config row with `type: "notion"` resolves without
  extra wiring.
- **Token**: a Notion internal integration token with the target database/page
  shared to the integration. Resolved via the injected `SecretResolver` like
  all connectors — never written to disk.

## What's unchanged

- The Q3 connector-write discipline (`source: "connector"`, stable
  `sourceRefs[0].sourceId`, content-derived `id`) applies to Notion notes
  identically — the runner handles it; the connector only fetches + normalizes.
- The `Connector` interface, runner, config reader, and secret resolver are
  unchanged.
- GitHub connector is unchanged.

## What's still deferred

- **CLI `tekmemo connectors {add|remove|list|run}`** — follow-up in
  `packages/tekmemo-cli`.
- **Cloud `GET .../connectors/:id/secret` resolver** — ships when the cloud app does.
- **Linear** — connector #3 (first post-launch addition, Q10).
- **Block-content body fetch** — the Notion `/query` and `/search` endpoints
  don't return block bodies, so the note body is empty in v1 (title + URL only).
  A future enhancement can fetch blocks via `GET /v1/blocks/:id/children`.
