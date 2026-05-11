# TekMemo MCP Architecture

`@tekmemo/mcp-server` is the agent-facing doorway into TekMemo memory.

It should not be the memory engine.

```txt
Claude Code / Codex / OpenClaw / MCP client
        ↓
@tekmemo/mcp-server
        ↓
runtime adapter
        ↓
local .tekmemo/ OR TekMemo Cloud OR hybrid
```

## Layers

```txt
MCP protocol layer
- JSON-RPC handling
- initialize / ping
- tools/list / tools/call
- resources/list / resources/read
- prompts/list / prompts/get

TekMemo MCP layer
- tool definitions
- resource definitions
- validation
- authorization
- limits
- timeout conversion

Runtime layer
- local runtime
- cloud runtime
- hybrid runtime
- in-memory runtime
```

## Runtime responsibilities

| Runtime | Responsibility |
| --- | --- |
| local | Use `tekmemo` + `@tekmemo/fs` to read/write `.tekmemo/` |
| cloud | Call `@tekmemo/cloud-client` methods |
| hybrid | Combine local and cloud runtimes without owning sync conflicts |
| memory | Deterministic test/demo runtime |

## Cloud-client boundary

MCP should never scatter raw `fetch('/api/v1/...')` calls.

Cloud API access belongs in `@tekmemo/cloud-client`.

```txt
MCP tool call
  → cloud runtime
  → @tekmemo/cloud-client
  → TekMemo Cloud API
```
