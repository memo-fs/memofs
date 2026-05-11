# MCP Cloud Client Wiring

This package is now wired to `@tekmemo/cloud-client`.

## Boundary

`@tekmemo/mcp-server` does not construct raw TekMemo Cloud URLs directly. It creates or accepts a typed `TekMemoCloudClient` and delegates all cloud work to that client.

```txt
MCP client
  → @tekmemo/mcp-server
  → @tekmemo/cloud-client
  → TekMemo Cloud API
```

## Runtime modes

- `local`: uses `tekmemo` + `@tekmemo/fs` against local `.tekmemo/` files.
- `cloud`: uses `@tekmemo/cloud-client` with a Cloud API key.
- `hybrid`: composes local runtime and cloud runtime.
- `memory`: in-memory test/demo runtime.

## Binary examples

Cloud:

```bash
TEKMEMO_API_KEY="tk_live_..." \
TEKMEMO_CLOUD_URL="https://memo.tekbreed.com/api/v1" \
tekmemo-mcp --runtime cloud --workspace-id ws_123 --project-id proj_123
```

Hybrid:

```bash
TEKMEMO_API_KEY="tk_live_..." \
TEKMEMO_CLOUD_URL="https://memo.tekbreed.com/api/v1" \
tekmemo-mcp \
  --runtime hybrid \
  --root . \
  --workspace-id ws_123 \
  --project-id proj_123 \
  --read-policy local-first \
  --write-policy local-first
```

## Environment variables

```txt
TEKMEMO_RUNTIME=cloud | hybrid | local | memory
TEKMEMO_ROOT=.
TEKMEMO_CLOUD_URL=https://memo.tekbreed.com/api/v1
TEKMEMO_API_URL=https://memo.tekbreed.com/api/v1
TEKMEMO_API_KEY=tk_live_...
TEKMEMO_WORKSPACE_ID=ws_123
TEKMEMO_PROJECT_ID=proj_123
TEKMEMO_CLOUD_TIMEOUT_MS=30000
TEKMEMO_MCP_READ_ONLY=true | false
```

## Programmatic cloud runtime

```ts
import { createTekMemoCloudClient } from "@tekmemo/cloud-client";
import {
  createCloudTekMemoMcpRuntime,
  createTekMemoMcpProtocolServer,
} from "@tekmemo/mcp-server";

const client = createTekMemoCloudClient({
  baseUrl: process.env.TEKMEMO_CLOUD_URL!,
  apiKey: process.env.TEKMEMO_API_KEY!,
  defaultWorkspaceId: process.env.TEKMEMO_WORKSPACE_ID,
  defaultProjectId: process.env.TEKMEMO_PROJECT_ID,
});

const runtime = createCloudTekMemoMcpRuntime({
  client,
  projectId: process.env.TEKMEMO_PROJECT_ID!,
});
const server = createTekMemoMcpProtocolServer({ runtime });
```

## What changed

- `@tekmemo/mcp-server` now depends on `@tekmemo/cloud-client`.
- The cloud runtime type is now the real `TekMemoCloudClient` interface.
- The runtime factory can create a cloud client from environment variables or explicit options.
- The binary now supports `--runtime cloud` and `--runtime hybrid` directly.
- Cloud/hybrid examples now use `createTekMemoCloudClient` instead of fake client seams.

## What stays out of MCP

MCP still does not own:

- API key hashing
- billing
- tenancy enforcement internals
- database queries
- dashboard auth
- webhook handling
- Cloud API route implementation

Those remain in TekMemo Cloud. The public contract lives in `@tekmemo/cloud-client`.

## Current project-scoped cloud contract

`@tekmemo/mcp-server` now consumes the aligned project-scoped API through `@tekmemo/cloud-client`:

```txt
GET  /api/v1/projects/:projectId/memory/core
PUT  /api/v1/projects/:projectId/memory/core
GET  /api/v1/projects/:projectId/memory/notes
POST /api/v1/projects/:projectId/memory/notes
POST /api/v1/projects/:projectId/recall/query
POST /api/v1/projects/:projectId/recall/index
POST /api/v1/projects/:projectId/sync/push
POST /api/v1/projects/:projectId/sync/pull
GET  /api/v1/projects/:projectId/sync/status
POST /api/v1/projects/:projectId/sync/conflicts/:conflictId/resolve
```

It does not call stale unscoped `/context`, `/memories`, `/recall`, or `/graph` routes.

Graph tools remain present in the MCP surface but cloud runtime returns a clear not-available error until the cloud app installs and wires `@tekmemo/graph`.

Cloud snapshots are also intentionally unavailable until the R2 snapshots/exports milestone.

