# TekMemo Cloud Client API Contract

This document is the package-side contract for `@tekmemo/cloud-client`.

## Base URL

Hosted:

```txt
https://memo.tekbreed.com/api/v1
```

Self-hosted:

```txt
https://memory.company.com/api/v1
```

The client also allows localhost HTTP URLs for self-hosted development.

## Authentication

Protected endpoints use:

```txt
Authorization: Bearer tk_live_...
```

`GET /health` and `GET /readiness` do not require an API key.

## Canonical envelope

Success:

```json
{
  "data": {},
  "meta": {
    "requestId": "req_123"
  }
}
```

Error:

```json
{
  "error": {
    "code": "unauthorized",
    "message": "API key is invalid or expired.",
    "details": {}
  },
  "meta": {
    "requestId": "req_123"
  }
}
```

The older `{ ok, data }` shape is accepted only when `acceptLegacyEnvelope` is enabled. It is not canonical.

## Routes

### Health endpoints

```txt
GET  /api/v1/health
GET  /api/v1/readiness
```

### Memory endpoints

```txt
GET  /api/v1/projects/:projectId/memory/core
PUT  /api/v1/projects/:projectId/memory/core
GET  /api/v1/projects/:projectId/memory/notes
POST /api/v1/projects/:projectId/memory/notes
```

### Context Composer endpoint

```txt
POST /api/v1/projects/:projectId/context/compose
```

### Recall endpoints

```txt
POST /api/v1/projects/:projectId/recall/query
POST /api/v1/projects/:projectId/recall/index
```

### Graph Memory endpoints

```txt
GET  /api/v1/projects/:projectId/graph/nodes
POST /api/v1/projects/:projectId/graph/nodes
GET  /api/v1/projects/:projectId/graph/edges
POST /api/v1/projects/:projectId/graph/edges
POST /api/v1/projects/:projectId/graph/neighbors
POST /api/v1/projects/:projectId/graph/path
```

### Extraction endpoints

```txt
POST /api/v1/projects/:projectId/extraction/run
GET  /api/v1/projects/:projectId/extraction/jobs
```

### Evaluations & Benchmarks endpoints

```txt
POST /api/v1/projects/:projectId/evals/run
POST /api/v1/projects/:projectId/benchmarks/run
```

### Sync endpoints

```txt
POST /api/v1/projects/:projectId/sync/push
POST /api/v1/projects/:projectId/sync/pull
GET  /api/v1/projects/:projectId/sync/status
POST /api/v1/projects/:projectId/sync/conflicts/:conflictId/resolve
```

### Archive/Export endpoints

```txt
POST /api/v1/projects/:projectId/exports
GET  /api/v1/projects/:projectId/exports/:exportId/download
POST /api/v1/projects/:projectId/snapshots
GET  /api/v1/projects/:projectId/snapshots/:snapshotId/download
```

### Provider/BYOK endpoints

```txt
GET  /api/v1/projects/:projectId/providers
POST /api/v1/projects/:projectId/providers
POST /api/v1/projects/:projectId/providers/:credentialId/test
```

## Scopes expected by server

```txt
memory:read
memory:write
memory:recall
memory:index
memory:export
graph:read
graph:write
providers:read
providers:write
```

The client does not enforce scopes locally. The cloud server is the source of truth for authorization.

## Runtime behavior

This package owns cloud and hybrid runtime helpers:

```ts
createCloudTekMemoRuntime(...)
createHybridTekMemoRuntime(...)
```

There is no separate `@tekmemo/runtime` package in the current aligned architecture.
