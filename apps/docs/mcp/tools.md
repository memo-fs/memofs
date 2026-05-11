# MCP tools

Primary tools:

| Tool | Purpose |
| --- | --- |
| `tekmemo.health` | Check runtime health. |
| `tekmemo.context` | Build task context. |
| `tekmemo.recall` | Search memory. |
| `tekmemo.remember` | Store durable memory. |
| `tekmemo.read_core_memory` | Read core memory. |
| `tekmemo.read_notes_memory` | Read notes. |
| `tekmemo.list_recent_memories` | List recent memory records. |
| `tekmemo.validate` | Validate the memory protocol. |
| `tekmemo.snapshot` | Create a snapshot. |
| `tekmemo.update_core_memory` | Replace core memory. |
| `tekmemo.sync_status` | Read sync state. |
| `tekmemo.sync_pull` | Pull sync events. |
| `tekmemo.sync_push` | Push sync events. |
| `tekmemo.sync_resolve_conflict` | Resolve sync conflicts. |

Graph tools:

| Tool | Purpose |
| --- | --- |
| `tekmemo.graph_upsert_nodes` | Add or update graph nodes. |
| `tekmemo.graph_upsert_edges` | Add or update graph edges. |
| `tekmemo.graph_neighbors` | Find neighbors. |
| `tekmemo.graph_path` | Find a path. |

Cloud and hybrid graph tools delegate through `@tekmemo/cloud-client` to TekMemo Cloud graph APIs.
