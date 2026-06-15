# Model Context Protocol (MCP)

The `@tekbreed/tekmemo-mcp-server` package exposes TekMemo memory to MCP-compatible tools such as Claude Code, Cursor, and other agent clients.

## Installation

```bash
npm install -D @tekbreed/tekmemo-mcp-server
```

## Running the server

The MCP server runs locally via stdio. The binary is `tekmemo-mcp`.

### Local mode

Expose memory stored in a local `.tekmemo/` folder:

```bash
tekmemo-mcp --runtime local --root .
```

### Cloud mode

Expose memory hosted on TekMemo Cloud:

```bash
tekmemo-mcp \
  --runtime cloud \
  --cloud-url https://memo.tekbreed.com/api/v1 \
  --api-key "$TEKMEMO_API_KEY" \
  --project-id proj_123
```

## Tools

The MCP server exposes the following tools to your coding agent:

### Core memory tools
| Tool | Purpose |
| --- | --- |
| `tekmemo.health` | Check runtime health, mode, and capabilities. |
| `tekmemo.context` | Build task-ready memory context (core + notes + recall). |
| `tekmemo.recall` | Search TekMemo memory for relevant context. |
| `tekmemo.remember` | Add a user-approved durable memory item. |
| `tekmemo.read_core_memory` | Read stable core memory. |
| `tekmemo.read_notes_memory` | Read notes memory. |
| `tekmemo.list_recent_memories` | List recent memory events. |
| `tekmemo.validate` | Validate memory health and report warnings/errors. |
| `tekmemo.snapshot` | Create a memory snapshot before major changes. |
| `tekmemo.update_core_memory` | Replace stable core memory (high-impact). |

### Sync tools (cloud/hybrid)
| Tool | Purpose |
| --- | --- |
| `tekmemo.sync_status` | Read project sync status. |
| `tekmemo.sync_pull` | Pull accepted memory sync events. |
| `tekmemo.sync_push` | Push local memory sync events. |
| `tekmemo.sync_resolve_conflict` | Resolve sync conflicts. |

### Graph tools
| Tool | Purpose |
| --- | --- |
| `tekmemo.graph_upsert_nodes` | Create or update graph nodes. |
| `tekmemo.graph_upsert_edges` | Create or update graph edges. |
| `tekmemo.graph_neighbors` | Find neighbors around a node. |
| `tekmemo.graph_path` | Find path between two nodes. |
| `tekmemo.graph_list_nodes` | List graph nodes with pagination. |
| `tekmemo.graph_create_node` | Create a graph node. |
| `tekmemo.graph_list_edges` | List graph edges with pagination. |
| `tekmemo.graph_create_edge` | Create a graph edge. |

### AgentFS session tools
| Tool | Purpose |
| --- | --- |
| `tekmemo_agent_session_start` | Create AgentFS session workspace. |
| `tekmemo_agent_session_read` | Read a session file. |
| `tekmemo_agent_session_write` | Write a session file. |
| `tekmemo_agent_session_append` | Append to a session file. |
| `tekmemo_agent_session_extract` | Extract memory from session. |
| `tekmemo_agent_session_complete` | Complete and checkpoint session. |

### Cloud management tools
| Tool | Purpose |
| --- | --- |
| `tekmemo.readiness` | Check TekMemo Cloud production readiness. |
| `tekmemo.context_compose` | Compose full context via cloud API. |
| `tekmemo.extraction_run` | Run graph extraction. |
| `tekmemo.extraction_jobs` | List extraction jobs. |
| `tekmemo.evals_run` | Run context quality evaluations. |
| `tekmemo.benchmarks_run` | Run context benchmarks. |
| `tekmemo.exports_create` | Create memory export archive. |
| `tekmemo.exports_download` | Get download URL for export. |
| `tekmemo.snapshots_create` | Create memory snapshot. |
| `tekmemo.snapshots_download` | Get download URL for snapshot. |
| `tekmemo.providers_list` | List provider credentials. |
| `tekmemo.providers_create` | Create provider credential. |
| `tekmemo.providers_test` | Test provider credential. |



## Configuration

To add TekMemo to an MCP-compatible client, add it to your configuration file (e.g., `claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "tekmemo": {
      "command": "npx",
      "args": ["-y", "@tekbreed/tekmemo-mcp-server", "--runtime", "local", "--root", "/path/to/project"]
    }
  }
}
```

## How it works

The MCP server acts as a bridge between your coding agent and TekMemo memory. In **local mode**, it reads and writes directly to your `.tekmemo/` folder. In **cloud mode**, it connects to the TekMemo Cloud API using the core client. The binary runs as a local stdio subprocess.