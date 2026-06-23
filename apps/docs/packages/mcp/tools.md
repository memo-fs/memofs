# MCP tools

The TekMemo MCP server exposes a small, deliberate **model-facing surface: ten tools** across two namespaces (ADR 0009 Component 1). Everything else — graph/sync/health/snapshot/validation/core-memory-update — is a **developer runtime method** the host calls imperatively, not a tool the model invokes.

Keeping the model surface small is a security and correctness decision: the model only drives the memory lifecycle and its own agent session; housekeeping and infrastructure operations stay with the developer.

## Memory tools

These four verbs are the entire memory lifecycle the model drives. They are prefixed `tekmemo.`.

| Tool | Safety | Purpose |
| --- | --- | --- |
| `tekmemo.context` | read | Build task-ready memory context (core + notes + recall). **Required at the start of every task.** Supports a compact briefing with expandable sections, or a one-shot `detail: "full"` dump. |
| `tekmemo.recall` | read | Semantic + lexical memory search. Use proactively before answering, when unsure, or when a fact might already be known. |
| `tekmemo.remember` | write | Persist a durable fact (decision/constraint/goal/preference/reference/summary/note). Call this *without being asked* whenever you discover a durable fact. |
| `tekmemo.consolidate` | write | Run a consolidation pass over the local graph: merge duplicate entities and retire superseded facts. Nothing is deleted — only marked `deprecated`. Pass `apply: false` to preview. |

## AgentFS session tools

A separate axis from the memory store: a coding-agent scratch filesystem the model drives mid-work. Prefixed `tekmemo_agent_session_`.

| Tool | Safety | Purpose |
| --- | --- | --- |
| `tekmemo_agent_session_start` | write | Create an AgentFS-backed session workspace and return paths/resources. |
| `tekmemo_agent_session_read` | read | Read one session file. |
| `tekmemo_agent_session_write` | write | Write an allowed `working/` or `output/` session file. |
| `tekmemo_agent_session_append` | write | Append to an allowed `working/` or `output/` session file. |
| `tekmemo_agent_session_extract` | read | Extract summary, durable memory, follow-ups, errors, and changes from a session. |
| `tekmemo_agent_session_complete` | write | Extract, checkpoint, push, and optionally persist durable memory from a session. |

## Developer runtime methods (NOT model-facing tools)

Capabilities like health checks, snapshots, validation, core-memory edits, graph mutation, and cloud sync are **preserved** — they were only removed from the model-facing tool list. They live as methods on the `TekMemoMcpRuntime` interface (`@tekbreed/tekmemo-mcp-server`) and the `Tekmemo` class (`@tekbreed/tekmemo`), which the host/developer calls directly.

You will **not** find these as `tekmemo.*` tools. If an agent tries to call any of them, it will get "unknown tool."

| Capability | Where it lives now |
| --- | --- |
| Runtime health, mode, capabilities | `runtime.health()` |
| Read core / notes memory | `runtime.readCoreMemory()`, `runtime.readNotesMemory()` |
| List recent memory events | `runtime.listRecentMemories()` |
| Validate memory health | `runtime.validate()` |
| Create / restore snapshots | `runtime.createSnapshot()` |
| Replace core memory | `runtime.updateCoreMemory()` |
| Graph nodes/edges (upsert, list, neighbors, path) | `runtime.upsertGraphNodes()`, `runtime.upsertGraphEdges()`, `runtime.listGraphNodes()`, `runtime.listGraphEdges()`, `runtime.graphNeighbors()`, `runtime.graphPath()` |
| Cloud sync (push/pull/status) | `runtime.syncPush()`, `runtime.syncPull()`, `runtime.syncStatus()` |

For the CLI equivalents of these developer operations, see [Local commands](../cli/local-commands.md) and [Cloud commands](../cli/cloud-commands.md).

## Safety annotations

Every tool carries a `safety` label:

- **read** — Read-only, safe to call without explicit user approval.
- **write** — Mutates memory or session state; the host should require explicit authorization.

The server supports a global **read-only mode** (`readOnly: true` in `TekMemoMcpOptions`) that blocks every write tool. Hosts can also install a fine-grained `authorize()` callback that inspects each call (`operation`, `safety`, `arguments`) before it runs — this is where per-tool gating lives.
