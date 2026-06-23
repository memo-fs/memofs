# MCP client setup

Add TekMemo to your coding agent. There are two ways — the **hosted server** (cloud-only, no local process) or the **self-hosted stdio server** (local/cloud/hybrid).

- **Hosted:** point the client at `https://mcp.memo.tekbreed.com/` with a bearer token. See [Hosted MCP](./hosted).
- **Stdio:** run `npx -y @tekbreed/tekmemo-mcp-server` as a subprocess. See [Runtime modes](./runtime-modes).

Most clients accept both an HTTP `url` and a stdio `command`. Pick the block that matches your path.

## Hosted server

### Claude Code

```bash
claude mcp add --transport http tekmemo https://mcp.memo.tekbreed.com/ \
  --header "Authorization: Bearer $TEKMEMO_MCP_BEARER_TOKEN"
```

Or in `~/.config/claude/config.json`:

```json
{
  "mcpServers": {
    "tekmemo": {
      "url": "https://mcp.memo.tekbreed.com/",
      "headers": {
        "Authorization": "Bearer <your TEKMEMO_MCP_BEARER_TOKEN>"
      }
    }
  }
}
```

### Claude Desktop

Add to `claude_desktop_config.json` (macOS: `~/Library/Application Support/Claude/`, Windows: `%APPDATA%\Claude\`):

```json
{
  "mcpServers": {
    "tekmemo": {
      "url": "https://mcp.memo.tekbreed.com/",
      "headers": {
        "Authorization": "Bearer <your TEKMEMO_MCP_BEARER_TOKEN>"
      }
    }
  }
}
```

### Cursor

1. Go to **Settings > Features > MCP**.
2. Click **+ Add new MCP server**.
3. Choose **HTTP / Streamable HTTP**.
4. URL: `https://mcp.memo.tekbreed.com/`
5. Add header `Authorization: Bearer <your TEKMEMO_MCP_BEARER_TOKEN>`.
6. Save and restart Cursor's agent panel.

### Codex

In `~/.codex/config.toml`:

```toml
[mcp_servers.tekmemo]
url = "https://mcp.memo.tekbreed.com/"
headers = { Authorization = "Bearer <your TEKMEMO_MCP_BEARER_TOKEN>" }
```

### OpenCode

In `open_code.json`:

```json
{
  "mcpServers": {
    "tekmemo": {
      "url": "https://mcp.memo.tekbreed.com/",
      "headers": {
        "Authorization": "Bearer <your TEKMEMO_MCP_BEARER_TOKEN>"
      }
    }
  }
}
```

## Self-hosted stdio server

The binary is `tekmemo-mcp` (from `@tekbreed/tekmemo-mcp-server`). Run it as a subprocess from your project root.

### Claude Code

```bash
claude mcp add tekmemo -- npx -y @tekbreed/tekmemo-mcp-server --runtime local --root .
```

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

For cloud mode, add `--runtime cloud` and pass `TEKMEMO_CLOUD_URL` + `TEKMEMO_API_KEY` in the `env` object.

### Claude Desktop

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

### Codex

```bash
codex mcp add tekmemo -- npx -y @tekbreed/tekmemo-mcp-server --runtime local --root .
```

```toml
[mcp_servers.tekmemo]
command = "npx"
args = ["-y", "@tekbreed/tekmemo-mcp-server", "--runtime", "local", "--root", "."]
```

### OpenCode

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

### Cursor

1. Go to **Settings > Features > MCP**.
2. Click **+ Add new MCP server**.
3. Select **STDIO**.
4. Command: `npx -y @tekbreed/tekmemo-mcp-server --runtime local --root .`
5. Save and restart.

## Other MCP clients

Most MCP clients follow the same patterns — either an HTTP `url` + `headers` block (hosted) or a `command` + `args` block (stdio). Config file locations:

| Client | Config file |
| --- | --- |
| Continue | `~/.continue/config.json` |
| Cline | `.cline/mcp_settings.json` |
| Windsurf | `.windsurf/mcp.json` |
| Zed | `~/.config/zed/mcp.json` or `Cmd+,` → MCP |
| Antigravity | MCP store → Manage MCP Servers → raw config |

## Read-only mode

For untrusted clients or safety-first workflows, block all write tools:

- **Hosted:** read-only is the default (`TEKMEMO_MCP_READ_ONLY=true`). Ask TekMemo to enable writes if needed.
- **Stdio:** add `--read-only` to the args.

In read-only mode, write tools (`tekmemo.remember`, `tekmemo.update_core_memory`, `tekmemo.snapshot`, `tekmemo.sync_push`, etc.) are blocked. Read tools (`tekmemo.health`, `tekmemo.context`, `tekmemo.recall`, `tekmemo.read_core_memory`, etc.) remain available.

## Read and write policies (stdio hybrid only)

When running the stdio server in `hybrid` mode, control where reads and writes go with `--read-policy` and `--write-policy`:

| Value | Behavior |
| --- | --- |
| `local-first` | Try local first, fall back to cloud |
| `cloud-first` | Try cloud first, fall back to local |
| `local-only` | Only local `.tekmemo/` |

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

These policies do not apply to the hosted server — it is cloud-only.
