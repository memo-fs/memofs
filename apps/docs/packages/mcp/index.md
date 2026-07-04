# Model Context Protocol (MCP) Server

`@tekmemo/mcp-server` allows AI coding agents (such as Claude Desktop, Cursor, and Zed) to securely interact with TekMemo memory layers using standard Model Context Protocol (MCP) tools.

---

## Installation & Integration

AI clients spawn the MCP server as a background process communicating via standard input/output (stdio).

### 1. Claude Desktop Setup
Add the server definition to your `claude_desktop_config.json` configuration file:

```json
{
  "mcpServers": {
    "tekmemo": {
      "command": "npx",
      "args": [
        "-y",
        "@tekmemo/mcp-server",
        "--runtime", "local",
        "--root", "/absolute/path/to/your/project"
      ]
    }
  }
}
```

### 2. Cursor Setup
1. Go to **Settings** > **Features** > **MCP**.
2. Click **+ Add New MCP Server**.
3. Configure the fields:
   - **Name:** `tekmemo`
   - **Type:** `command`
   - **Command:** `npx -y @tekmemo/mcp-server --runtime local --root /path/to/project`

---

## Command Flags

Customize the server instantiation using standard flags:

| Flag | Default | Description |
|---|---|---|
| `--root <dir>` | Current directory | The absolute path to the project root containing `.tekmemo/`. |
| `--runtime <mode>`| `"local"` | Core runtime mode: `local`, `hybrid`, or `memory`. |
| `--read-only` | `false` | Disables mutating tools (e.g. `write_memory`, `snapshot_create`). |
| `--cloud-key <key>`| `undefined` | The remote API key override. |

---

## Exposed MCP Tools

The server dynamically exposes tools based on the runtime configuration:

### Core Tools
- **`read_memory`**: Fetches markdown contents of `core` or `notes`.
- **`write_memory`**: Appends or modifies markdown contents.
- **`recall_query`**: Triggers semantic and lexical hybrid search context queries.

### Snapshot Tools
- **`snapshot_create`**: Checkpoints the current workspace.
- **`snapshot_restore`**: Rolls back memory files to a specific version.

### Sync Tools (Hybrid Mode Only)
- **`sync_push`**: Sends local modifications to the remote cloud replica.
- **`sync_pull`**: Fetches and merges remote replica modifications.
