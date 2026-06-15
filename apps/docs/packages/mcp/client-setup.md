# MCP client setup

Add the TekMemo MCP server to your coding agent's MCP config. Choose local mode for file-first memory or cloud mode for TekMemo Cloud memory.

The binary name is `tekmemo-mcp` (from the `@tekbreed/tekmemo-mcp-server` package).

## Claude Code

Claude Code relies on a global or project-level configuration and is configured directly through the terminal.

**Via CLI:**
Run the following command to add the TekMemo MCP server (for STDIO transport):
```bash
claude mcp add tekmemo -- npx -y @tekbreed/tekmemo-mcp-server --runtime local --root .
```

**Via Config:**
You can also define them manually in your global `~/.config/claude/config.json` file:
```json
{
  "mcpServers": {
    "tekmemo": {
      "command": "npx",
      "args": ["-y", "@tekbreed/tekmemo-mcp-server", "--runtime", "local", "--root", "."]
    }
  }
}
```
*Note: For cloud mode, add the `--runtime cloud` flag and pass your `TEKMEMO_CLOUD_URL` and `TEKMEMO_API_KEY` into the `env` object.*

Restart Claude Code after adding the config.

## Claude Desktop

Claude Desktop (Pro or Free tier) uses a global `claude_desktop_config.json` file.

**Config Locations:**
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\\Claude\\claude_desktop_config.json`

Open this file in your editor and add your servers under the `mcpServers` key, defining the command, args, and any env variables:
```json
{
  "mcpServers": {
    "tekmemo": {
      "command": "npx",
      "args": ["-y", "@tekbreed/tekmemo-mcp-server", "--runtime", "local", "--root", "/absolute/path/to/project"]
    }
  }
}
```
Restart the app to apply.

## Codex

Codex reads configuration via a `config.toml` file (usually located in `~/.codex/config.toml`) or via its desktop GUI settings.

**Via CLI:**
```bash
codex mcp add tekmemo -- npx -y @tekbreed/tekmemo-mcp-server --runtime local --root .
```

**Via File:**
Manually structure your `config.toml` using `[mcp_servers.<server-name>]` tables to specify commands, args, and headers:
```toml
[mcp_servers.tekmemo]
command = "npx"
args = ["-y", "@tekbreed/tekmemo-mcp-server", "--runtime", "local", "--root", "."]
```

Prompt it with `use the tekmemo tools` to start querying memory.

## OpenCode

OpenCode makes MCP integration highly accessible through commands in the CLI and a project-specific JSON file.

**Via CLI:**
Use the command `open code mcp add` and follow the interactive prompts to define the server name (`tekmemo`) and transport type.

**Via File:**
You can also define your servers directly in a `open_code.json` file placed in your project's root folder:
```json
{
  "mcpServers": {
    "tekmemo": {
      "command": "npx",
      "args": ["-y", "@tekbreed/tekmemo-mcp-server", "--runtime", "local", "--root", "."]
    }
  }
}
```

OpenCode tools from MCP servers are available automatically. Prompt with `use the tekmemo tool to recall project decisions`.

## Cursor

Cursor has built-in MCP functionality. You can set them up directly in the IDE.

1. Go to **Settings > Features > MCP**.
2. Click **+ Add new MCP server**.
3. Select whether it is a **STDIO** or SSE/HTTP connection.
4. Input the execution command: `npx -y @tekbreed/tekmemo-mcp-server --runtime local --root .`
5. Save and restart Cursor's agent panel.

## Antigravity IDE

Antigravity utilizes a graphical dashboard to make MCP setup as seamless as clicking through menus.

1. Open the MCP store via the `...` dropdown located at the top of the editor's agent panel.
2. Click **Manage MCP Servers**.
3. Select **View raw config** to directly edit the `mcp_config.json` file with your server arrays:
```json
{
  "mcpServers": {
    "tekmemo": {
      "command": "npx",
      "args": ["-y", "@tekbreed/tekmemo-mcp-server", "--runtime", "local", "--root", "."]
    }
  }
}
```

## Other MCP clients

Most MCP clients follow the same `mcpServers` JSON pattern. The config file path varies:

| Client | Config file |
| --- | --- |
| Continue | `~/.continue/config.json` |
| Cline | `.cline/mcp_settings.json` |
| Windsurf | `.windsurf/mcp.json` |
| Zed | `~/.config/zed/mcp.json` or `Cmd+,` → MCP |
| GitHub Copilot | `.github/copilot-instructions.md` or VS Code `settings.json` |

## Read-only mode

For untrusted clients or safety-first workflows, add `--read-only`:

```json
{
  "mcpServers": {
    "tekmemo": {
      "command": "npx",
      "args": ["-y", "@tekbreed/tekmemo-mcp-server", "--runtime", "local", "--root", ".", "--read-only"]
    }
  }
}
```

In read-only mode, all write tools (`tekmemo.remember`, `tekmemo.update_core_memory`, `tekmemo.snapshot`, etc.) are blocked. Read tools (`tekmemo.health`, `tekmemo.context`, `tekmemo.recall`, `tekmemo.read_core_memory`, etc.) remain available.

## Read policy

Control where reads come from with `--read-policy`:

| Value | Behavior |
| --- | --- |
| `local-first` | Try local, fall back to cloud |
| `cloud-first` | Try cloud, fall back to local |
| `local-only` | Only local `.tekmemo/` |
| `cloud-only` | Only TekMemo Cloud API |

```json
{
  "mcpServers": {
    "tekmemo": {
      "command": "npx",
      "args": ["-y", "@tekbreed/tekmemo-mcp-server", "--runtime", "hybrid", "--root", ".", "--read-policy", "local-first"]
    }
  }
}
```

## Write policy

Control where writes go with `--write-policy`:

| Value | Behavior |
| --- | --- |
| `local-first` | Write local first, then cloud |
| `cloud-first` | Write cloud first, then local |
| `local-only` | Only write to local |
| `cloud-only` | Only write to cloud |

```json
{
  "mcpServers": {
    "tekmemo": {
      "command": "npx",
      "args": ["-y", "@tekbreed/tekmemo-mcp-server", "--runtime", "hybrid", "--root", ".", "--write-policy", "local-first"]
    }
  }
}
```