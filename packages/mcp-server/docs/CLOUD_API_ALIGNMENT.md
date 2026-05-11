# MCP Cloud API Alignment

`@tekmemo/mcp-server` is aligned with the current TekMemo Cloud runbook.

## Source of truth

Cloud APIs are project-scoped:

```txt
/api/v1/projects/:projectId/...
```

Canonical envelopes are:

```json
{ "data": {}, "meta": { "requestId": "req_123" } }
```

and:

```json
{ "error": { "code": "unauthorized", "message": "..." }, "meta": { "requestId": "req_123" } }
```

The MCP package does not parse these envelopes directly. It delegates all cloud HTTP behavior to `@tekmemo/cloud-client`.

## Implemented cloud-backed MCP tools

These tools are backed by the corrected cloud client in cloud/hybrid mode:

```txt
tekmemo.health
tekmemo.context
tekmemo.recall
tekmemo.remember
tekmemo.read_core_memory
tekmemo.read_notes_memory
tekmemo.list_recent_memories
tekmemo.validate
tekmemo.update_core_memory
tekmemo.sync_status
tekmemo.sync_pull
tekmemo.sync_push
tekmemo.sync_resolve_conflict
```

## Explicitly not available in cloud mode yet

These surfaces intentionally return clear tool-level errors in cloud mode until the cloud app wires them:

```txt
tekmemo.snapshot
tekmemo.graph_upsert_nodes
tekmemo.graph_upsert_edges
tekmemo.graph_neighbors
tekmemo.graph_path
tekmemo://graph/nodes
tekmemo://graph/edges
```

Reason:

```txt
Cloud snapshots/exports depend on the R2 milestone.
Cloud graph depends on publishing/installing @tekmemo/graph and wiring D1 graph tables/routes.
```

Local and in-memory runtimes can still support local graph/snapshot behavior.

## Runtime factory behavior

Config precedence:

```txt
explicit factory options / binary flags
→ environment variables
→ .tekmemo/config.json
→ defaults
```

Relevant env vars:

```txt
TEKMEMO_RUNTIME
TEKMEMO_ROOT
TEKMEMO_CLOUD_URL
TEKMEMO_API_URL
TEKMEMO_API_KEY
TEKMEMO_WORKSPACE_ID
TEKMEMO_PROJECT_ID
TEKMEMO_READ_POLICY
TEKMEMO_WRITE_POLICY
TEKMEMO_CLOUD_TIMEOUT_MS
TEKMEMO_MCP_READ_ONLY
```

API key examples use the current cloud prefix:

```txt
tk_live_...
```
