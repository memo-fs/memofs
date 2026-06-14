# MCP tools

The TekMemo MCP server exposes 50+ tools across several categories. All tools are prefixed with `tekmemo.` (or `tekmemo_agent_` for AgentFS session tools).

## Core memory tools

| Tool | Safety | Purpose |
| --- | --- | --- |
| `tekmemo.health` | read | Check runtime health, mode, and available capabilities. |
| `tekmemo.context` | read | Build task-ready memory context (core + notes + recall). |
| `tekmemo.recall` | read | Search TekMemo memory for relevant context. |
| `tekmemo.remember` | write | Add a user-approved durable memory item. |
| `tekmemo.read_core_memory` | read | Read stable TekMemo core memory. |
| `tekmemo.read_notes_memory` | read | Read TekMemo notes memory. |
| `tekmemo.list_recent_memories` | read | List recent TekMemo memory events. |
| `tekmemo.validate` | read | Validate TekMemo memory health and report warnings/errors. |
| `tekmemo.snapshot` | write | Create a memory snapshot before major agentic changes. |
| `tekmemo.update_core_memory` | write | Replace stable core memory (high-impact, requires approval). |

## Sync tools (cloud/hybrid runtimes)

| Tool | Safety | Purpose |
| --- | --- | --- |
| `tekmemo.sync_status` | read | Read project sync status from TekMemo Cloud. |
| `tekmemo.sync_pull` | read | Pull accepted memory sync events from cloud. |
| `tekmemo.sync_push` | write | Push local memory sync events to cloud. |
| `tekmemo.sync_resolve_conflict` | write | Resolve a cloud sync conflict. |

## Graph tools

| Tool | Safety | Purpose |
| --- | --- | --- |
| `tekmemo.graph_upsert_nodes` | write | Create or update graph nodes (batch). |
| `tekmemo.graph_upsert_edges` | write | Create or update graph edges (batch). |
| `tekmemo.graph_neighbors` | read | Find neighbors around a node with direction/weight controls. |
| `tekmemo.graph_path` | read | Find a graph path between two nodes. |
| `tekmemo.graph_list_nodes` | read | List graph nodes with pagination and status filters. |
| `tekmemo.graph_create_node` | write | Create or update a single graph node. |
| `tekmemo.graph_list_edges` | read | List graph edges with pagination and status filters. |
| `tekmemo.graph_create_edge` | write | Create or update a single graph edge. |

## AgentFS session tools

| Tool | Safety | Purpose |
| --- | --- | --- |
| `tekmemo_agent_session_start` | write | Create AgentFS session workspace for coding agents. |
| `tekmemo_agent_session_read` | read | Read a session file. |
| `tekmemo_agent_session_write` | write | Write an allowed working/ or output/ file in session. |
| `tekmemo_agent_session_append` | write | Append to an allowed session file. |
| `tekmemo_agent_session_extract` | read | Extract memory from an AgentFS session. |
| `tekmemo_agent_session_complete` | write | Complete, checkpoint, and persist durable memory. |

## Cloud management tools

| Tool | Safety | Purpose |
| --- | --- | --- |
| `tekmemo.readiness` | read | Check TekMemo Cloud production readiness. |
| `tekmemo.context_compose` | read | Compose full context via cloud API (core, recall, graph). |
| `tekmemo.extraction_run` | write | Run graph extraction for the project. |
| `tekmemo.extraction_jobs` | read | List graph extraction jobs. |
| `tekmemo.evals_run` | read | Run context quality evaluations. |
| `tekmemo.benchmarks_run` | read | Run context benchmarks. |
| `tekmemo.exports_create` | write | Create a memory export archive. |
| `tekmemo.exports_download` | read | Get download URL for an export archive. |
| `tekmemo.snapshots_create` | write | Create a memory snapshot. |
| `tekmemo.snapshots_download` | read | Get download URL for a snapshot archive. |
| `tekmemo.providers_list` | read | List provider credentials. |
| `tekmemo.providers_create` | write | Create a provider credential. |
| `tekmemo.providers_test` | read | Test a provider credential. |

## Legacy alias

| Tool | Safety | Purpose |
| --- | --- | --- |
| `tekmemo.write_note` | write | Backward-compatible alias for `tekmemo.remember`. |

## Safety annotations

Each tool carries a `safety` label:
- **read** — Read-only, safe to call without user approval
- **write** — Mutates memory, should require explicit user authorization

The server also supports a global `--read-only` flag that blocks all write tools.