---
"@tekbreed/tekmemo-mcp-server": major
---

# Collapse the MCP tool surface from 25 → 10 (ADR 0009 Component 1)

The model-facing tool surface is now two namespaces and ten tools, down from
twenty-five. This is the surface collapse mandated by ADR 0009 Component 1.
Capabilities are **preserved** — every demoted operation already exists as a
runtime method on `TekMemoMcpRuntime`. Only the model-facing tool wrappers were
removed.

## The 4 memory verbs (the entire memory lifecycle the model drives)

- `tekmemo.context` — task briefing (the Q23 strategist lives here)
- `tekmemo.recall` — semantic + lexical search
- `tekmemo.remember` — write a durable fact (the Q22 write gate lives here)
- `tekmemo.consolidate` — merge duplicate entities, retire superseded facts

## The 6 AgentFS session tools (a separate axis — scratch filesystem, not memory)

- `tekmemo_agent_session_{start,read,write,append,extract,complete}` — unchanged

## Removed tools

**Folded into `tekmemo.context`** (its `includeCore` / `includeNotes` /
`includeRecent` flags already cover these — no behavior loss):

- `tekmemo.read_core_memory`
- `tekmemo.read_notes_memory`
- `tekmemo.list_recent_memories`

**Demoted to runtime methods** (call `runtime.<method>()` imperatively — these
were always developer/host operations, not model decisions):

- `tekmemo.graph_upsert_nodes` → `runtime.upsertGraphNodes()`
- `tekmemo.graph_upsert_edges` → `runtime.upsertGraphEdges()`
- `tekmemo.graph_neighbors` → `runtime.graphNeighbors()`
- `tekmemo.graph_path` → `runtime.graphPath()`
- `tekmemo.sync_status` → `runtime.syncStatus()`
- `tekmemo.sync_pull` → `runtime.syncPull()`
- `tekmemo.sync_push` → `runtime.syncPush()`
- `tekmemo.health` → `runtime.health()` (the one always-required method)
- `tekmemo.readiness` → `runtime.readiness()`
- `tekmemo.validate` → `runtime.validate()`
- `tekmemo.snapshot` → `runtime.createSnapshot()`
- `tekmemo.update_core_memory` → `runtime.updateCoreMemory()`

## Migration

- **MCP clients** (Claude, Cursor, etc.): no action needed for the 4 verbs or
  6 session tools. If a client was calling a removed tool, it now gets a clean
  `MCP_VALIDATION_ERROR: Unknown tool` and should use the equivalent: a read
  (core/notes/recent) via `tekmemo.context`, a graph/sync/op via the host or
  the in-process runtime adapter.
- **In-process adapter users** (`@tekbreed/tekmemo-adapter-ai-sdk` and the
  `TekMemoMemoryRuntime` contract): unaffected — the runtime interface is
  unchanged. Demoted methods were always available there.
- **The runtime contract (`TekMemoMcpRuntime`) is unchanged.** No method was
  removed from the interface; only the MCP tool wrappers around them were.

## Why

Per ADR 0009: "25 verbs the model can't choose among is worse than 4 verbs each
doing maximum work." MCP is pull-only — every coding-agent host loads the
server and invokes tools *when it decides to*. For a pull-only channel, the
tool surface *is* the intelligence surface. The 4-verb discipline forces the
intelligence (strategist, write gate, consolidation) to live *inside* the verbs
rather than requiring the model to orchestrate 25 tools correctly.
