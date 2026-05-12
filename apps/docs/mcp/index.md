# Model Context Protocol (MCP)

`@tekmemo/mcp-server` exposes TekMemo memory to MCP-compatible tools such as Claude Code, Cursor, and other agent clients.

## Install

```bash
npm install -D @tekmemo/mcp-server
```

## Running the server

The MCP server can run in several modes depending on where your memory is stored.

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

| Tool | Purpose |
| --- | --- |
| `read_core` | Reads the stable project briefing (`core.md`). |
| `add_note` | Appends a new durable note to `notes.md`. |
| `search_memory` | Performs a recall search (keyword or vector). |
| `list_notes` | Lists recent durable notes with pagination. |
| `get_graph_neighbors`| Traverses the graph to find related architectural entities. |

## Configuration

To add TekMemo to an MCP-compatible client, add it to your configuration file (e.g., `claude_desktop_config.json`):

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

## How it works

The MCP server acts as a bridge between your coding agent and TekMemo memory. In **local mode**, it reads and writes directly to your `.tekmemo/` folder. In **cloud mode**, it connects to the TekMemo Cloud API through `@tekmemo/cloud-client`.
