# MCP resources

The TekMemo MCP server exposes memory and agent session data as MCP resources, accessible via `tekmemo://` URIs. Resources are read-only and can be fetched by any MCP client (Claude Desktop, Cursor, VS Code, custom hosts).

## Resource table

| URI | Name | MIME | Description |
| --- | --- | --- | --- |
| `tekmemo://health` | TekMemo MCP Health | `application/json` | Runtime health, version, and capability summary |
| `tekmemo://context` | TekMemo Agent Context | `application/json` | Task-ready context block |
| `tekmemo://memory/core` | TekMemo Core Memory | `text/markdown` | Stable project/workspace core memory |
| `tekmemo://memory/notes` | TekMemo Notes Memory | `text/markdown` | Working notes and observations |
| `tekmemo://memory/recent` | TekMemo Recent Events | `application/json` | Recent memory events |
| `tekmemo://graph/nodes` | TekMemo Graph Nodes | `application/json` | Paginated graph nodes |
| `tekmemo://graph/edges` | TekMemo Graph Edges | `application/json` | Paginated graph edges |
| `tekmemo://agent-sessions/{sessionId}/context/core` | Agent Session Core Context | `text/markdown` | Core context for a session |
| `tekmemo://agent-sessions/{sessionId}/output/durable-memory` | Agent Session Durable Memory | `text/markdown` | Candidate durable memory for a session |

## URI reference

### `tekmemo://health`

Returns runtime health, mode, version, and available capabilities.

**Query parameters:** None

### `tekmemo://context`

Returns a task-ready memory context block.

**Query parameters:**

| Parameter | Type | Description |
| --- | --- | --- |
| `query` | string | Task or query to prioritize context (default: `"current task"`) |
| `workspaceId` | string | Optional workspace ID |
| `projectId` | string | Optional project ID |
| `limit` | number | Max recall results (default: 25, max: 100) |
| `maxBytes` | number | Max response bytes (default: 64000, max: 262144) |

### `tekmemo://memory/core`

Returns the stable core memory document.

**Query parameters:**

| Parameter | Type | Description |
| --- | --- | --- |
| `workspaceId` | string | Optional workspace ID |
| `projectId` | string | Optional project ID |

### `tekmemo://memory/notes`

Returns the working notes memory document.

**Query parameters:**

| Parameter | Type | Description |
| --- | --- | --- |
| `workspaceId` | string | Optional workspace ID |
| `projectId` | string | Optional project ID |

### `tekmemo://memory/recent`

Returns recent memory events.

**Query parameters:**

| Parameter | Type | Description |
| --- | --- | --- |
| `workspaceId` | string | Optional workspace ID |
| `projectId` | string | Optional project ID |
| `limit` | number | Max events (default: 25, max: 100) |

### `tekmemo://graph/nodes`

Returns a paginated view of graph memory nodes.

**Query parameters:**

| Parameter | Type | Description |
| --- | --- | --- |
| `workspaceId` | string | Optional workspace ID |
| `cursor` | string | Pagination cursor |
| `limit` | number | Page size (default: 25, max: 100) |

### `tekmemo://graph/edges`

Returns a paginated view of graph memory edges.

**Query parameters:**

| Parameter | Type | Description |
| --- | --- | --- |
| `workspaceId` | string | Optional workspace ID |
| `cursor` | string | Pagination cursor |
| `limit` | number | Page size (default: 25, max: 100) |

### `tekmemo://agent-sessions/{sessionId}/context/core`

Returns the core context file for an active agent session.

**Path parameter:** `sessionId` — The session identifier.

**Query parameters:** None

### `tekmemo://agent-sessions/{sessionId}/output/durable-memory`

Returns candidate durable memory output from an active agent session.

**Path parameter:** `sessionId` — The session identifier.

**Query parameters:** None

## Resource availability by runtime mode

Not all resources are available in every runtime mode:

| Resource | Memory | Local | Cloud | Hybrid |
| --- | --- | --- | --- | --- |
| `tekmemo://health` | Yes | Yes | Yes | Yes |
| `tekmemo://context` | No | Yes | Yes | Yes |
| `tekmemo://memory/core` | No | Yes | Yes | Yes |
| `tekmemo://memory/notes` | No | Yes | Yes | Yes |
| `tekmemo://memory/recent` | No | Yes | Yes | Yes |
| `tekmemo://graph/nodes` | Yes | Yes | — | Yes |
| `tekmemo://graph/edges` | Yes | Yes | — | Yes |
| `tekmemo://agent-sessions/*` | No | Yes | — | Yes |

## Example usage

```bash
# Fetch health via curl (requires MCP host to expose HTTP)
curl http://localhost:3100/resource?uri=tekmemo%3A%2F%2Fhealth

# In any MCP client, access resources directly:
# tekmemo://memory/core
# tekmemo://memory/notes?workspaceId=ws_abc&projectId=proj_123
# tekmemo://memory/recent?limit=50
# tekmemo://graph/nodes?cursor=abc123&limit=25
```
