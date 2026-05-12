# `@tekmemo/mcp-server`

The Model Context Protocol (MCP) server for TekMemo. This package exposes your project's memory as a set of tools, resources, and prompts that coding agents can use directly.

## Install

```bash
npm install -D @tekmemo/mcp-server
```

## How it works

The MCP server acts as a standard bridge. When an agent (like Claude Code or Cursor) connects via standard I/O (stdio), the server exposes the following capabilities:

- **Tools:** `read_core`, `add_note`, `search_memory`, `list_notes`, `get_graph_neighbors`.
- **Resources:** Direct access to `core.md` and `notes.md` via URI.
- **Prompts:** Pre-defined system instructions for grounding the agent in the project's memory.

## Runtime Modes

The server can be configured to run in different modes depending on where your memory is stored:

| Mode | Command | Description |
| --- | --- | --- |
| **Local** | `tekmemo-mcp --runtime local` | Reads and writes directly to a local `.tekmemo/` folder. |
| **Cloud** | `tekmemo-mcp --runtime cloud` | Delegates all operations to the TekMemo Cloud API. |
| **In-Memory**| `tekmemo-mcp --runtime in-memory` | A volatile store used for testing or ephemeral sessions. |

## Running the server

### Local mode
Expose the current directory's memory:

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

## Integration

To add TekMemo to an MCP-compatible IDE or tool, add the following to your configuration:

```json
{
  "mcpServers": {
    "tekmemo": {
      "command": "npx",
      "args": ["-y", "@tekmemo/mcp-server", "--runtime", "local", "--root", "/path/to/project"]
    }
  }
}
```
