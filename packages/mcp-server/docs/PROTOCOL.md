# MCP Protocol Notes

`@tekmemo/mcp-server` targets MCP server behavior for tools, resources, and prompts.

## Supported protocol versions

- `2025-11-25`
- `2025-06-18`
- `2025-03-26`
- `2024-11-05`

If the client requests an unknown version, the server responds with the latest supported version.

## JSON-RPC handling

Handled methods:

- `initialize`
- `ping`
- `tools/list`
- `tools/call`
- `resources/list`
- `resources/read`
- `prompts/list`
- `prompts/get`
- `logging/setLevel`

Handled notifications:

- `notifications/initialized`
- `notifications/cancelled`
- `notifications/progress`

## Tool-level vs protocol-level errors

Invalid tool arguments return tool-level errors:

```json
{
  "isError": true,
  "content": [{ "type": "text", "text": "MCP_VALIDATION_ERROR: ..." }]
}
```

Malformed JSON-RPC requests return protocol errors.

This is intentional. Tool-level errors are visible to the model and can be corrected. Protocol-level errors are for broken client/server messages.

## Standard TekMemo tools

- `tekmemo.health`
- `tekmemo.context`
- `tekmemo.recall`
- `tekmemo.remember`
- `tekmemo.read_core_memory`
- `tekmemo.read_notes_memory`
- `tekmemo.list_recent_memories`
- `tekmemo.validate`
- `tekmemo.snapshot`
- `tekmemo.update_core_memory`
- `tekmemo.sync_status`
- `tekmemo.sync_pull`
- `tekmemo.sync_push`
- `tekmemo.sync_resolve_conflict`
- `tekmemo.graph_upsert_nodes`
- `tekmemo.graph_upsert_edges`
- `tekmemo.graph_neighbors`
- `tekmemo.graph_path`

`tekmemo.write_note` remains as a legacy alias for `tekmemo.remember`.

## Pagination

List methods support opaque cursors:

```json
{
  "cursor": "..."
}
```

Cursors encode an offset and namespace, so a tools cursor cannot be reused for resources or prompts.

## Transport

The built-in transport is newline-delimited stdio for local MCP clients.

Remote Streamable HTTP should be implemented in the host app with the official MCP SDK or runtime-specific MCP middleware, because production HTTP deployments require host validation, CORS policy, session storage, and deployment-specific security controls.


## Cloud runtime alignment

Cloud and hybrid runtime modes consume TekMemo Cloud through `@tekmemo/cloud-client`. The current source-of-truth cloud API is project-scoped under `/api/v1/projects/:projectId/...`, and the canonical envelope is `{ data, meta }` / `{ error, meta }`.

MCP does not construct raw cloud URLs and does not own cloud database, billing, BYOK, webhook, or provider-secret behavior. It only validates MCP tool input and delegates to the selected runtime.
