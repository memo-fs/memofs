# Cloud API routes

Cloud routes are project-scoped.

```txt
GET  /api/v1/health
GET  /api/v1/readiness

GET  /api/v1/projects/:projectId/memory/core
PUT  /api/v1/projects/:projectId/memory/core
GET  /api/v1/projects/:projectId/memory/notes
POST /api/v1/projects/:projectId/memory/notes

POST /api/v1/projects/:projectId/context/compose
POST /api/v1/projects/:projectId/recall/query
POST /api/v1/projects/:projectId/recall/index

GET  /api/v1/projects/:projectId/graph/nodes
POST /api/v1/projects/:projectId/graph/nodes
GET  /api/v1/projects/:projectId/graph/edges
POST /api/v1/projects/:projectId/graph/edges
POST /api/v1/projects/:projectId/graph/neighbors
POST /api/v1/projects/:projectId/graph/path

POST /api/v1/projects/:projectId/extraction/run
GET  /api/v1/projects/:projectId/extraction/jobs
POST /api/v1/projects/:projectId/evals/run
POST /api/v1/projects/:projectId/benchmarks/run

POST /api/v1/projects/:projectId/sync/push
POST /api/v1/projects/:projectId/sync/pull
GET  /api/v1/projects/:projectId/sync/status
POST /api/v1/projects/:projectId/sync/conflicts/:conflictId/resolve

POST /api/v1/projects/:projectId/exports
GET  /api/v1/projects/:projectId/exports/:exportId/download
POST /api/v1/projects/:projectId/snapshots
GET  /api/v1/projects/:projectId/snapshots/:snapshotId/download

GET  /api/v1/projects/:projectId/providers
POST /api/v1/projects/:projectId/providers
POST /api/v1/projects/:projectId/providers/:credentialId/test
```
