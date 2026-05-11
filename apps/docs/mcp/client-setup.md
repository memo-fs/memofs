# MCP client setup

Add the TekMemo MCP server to your coding agent's MCP config. Choose local mode for file-first memory or cloud mode for TekMemo Cloud memory.

## Claude Code

Create or edit `.claude/mcp.json` in your project root (or `~/.claude/mcp.json` for global):

### Local memory

```json
{
  "mcpServers": {
    "tekmemo": {
      "command": "npx",
      "args": ["-y", "@tekmemo/mcp-server", "--runtime", "local", "--root", "."]
    }
  }
}
```

### Cloud memory

```json
{
  "mcpServers": {
    "tekmemo": {
      "command": "npx",
      "args": ["-y", "@tekmemo/mcp-server", "--runtime", "cloud"],
      "env": {
        "TEKMEMO_CLOUD_URL": "https://memo.tekbreed.com/api/v1",
        "TEKMEMO_API_KEY": "tk_live_...",
        "TEKMEMO_PROJECT_ID": "proj_..."
      }
    }
  }
}
```

Restart Claude Code after adding the config.

## Codex (OpenAI)

Create or edit `.codex/mcp.json` in your project root:

### Local memory

```json
{
  "mcpServers": {
    "tekmemo": {
      "command": "npx",
      "args": ["-y", "@tekmemo/mcp-server", "--runtime", "local", "--root", "."]
    }
  }
}
```

### Cloud memory

```json
{
  "mcpServers": {
    "tekmemo": {
      "command": "npx",
      "args": ["-y", "@tekmemo/mcp-server", "--runtime", "cloud"],
      "env": {
        "TEKMEMO_CLOUD_URL": "https://memo.tekbreed.com/api/v1",
        "TEKMEMO_API_KEY": "tk_live_...",
        "TEKMEMO_PROJECT_ID": "proj_..."
      }
    }
  }
}
```

Codex auto-discovers tools. Prompt it with `use the tekmemo tools` to start querying memory.

## OpenCode

Add to `opencode.json` in your project root:

### Local memory

```json
{
  "mcp": {
    "tekmemo": {
      "type": "local",
      "command": ["npx", "-y", "@tekmemo/mcp-server", "--runtime", "local", "--root", "."],
      "enabled": true
    }
  }
}
```

### Cloud memory

```json
{
  "mcp": {
    "tekmemo": {
      "type": "local",
      "command": ["npx", "-y", "@tekmemo/mcp-server", "--runtime", "cloud"],
      "enabled": true,
      "environment": {
        "TEKMEMO_CLOUD_URL": "https://memo.tekbreed.com/api/v1",
        "TEKMEMO_API_KEY": "tk_live_...",
        "TEKMEMO_PROJECT_ID": "proj_..."
      }
    }
  }
}
```

OpenCode tools from MCP servers are available automatically. Prompt with `use the tekmemo tool to recall project decisions`.

### Per-agent gating

To enable TekMemo only for specific agents while keeping it disabled globally:

```json
{
  "mcp": {
    "tekmemo": {
      "type": "local",
      "command": ["npx", "-y", "@tekmemo/mcp-server", "--runtime", "local", "--root", "."],
      "enabled": true
    }
  },
  "tools": {
    "tekmemo_*": false
  },
  "agent": {
    "my-agent": {
      "tools": {
        "tekmemo_*": true
      }
    }
  }
}
```

## Cursor

Create or edit `.cursor/mcp.json` in your project root:

### Local memory

```json
{
  "mcpServers": {
    "tekmemo": {
      "command": "npx",
      "args": ["-y", "@tekmemo/mcp-server", "--runtime", "local", "--root", "."]
    }
  }
}
```

### Cloud memory

```json
{
  "mcpServers": {
    "tekmemo": {
      "command": "npx",
      "args": ["-y", "@tekmemo/mcp-server", "--runtime", "cloud"],
      "env": {
        "TEKMEMO_CLOUD_URL": "https://memo.tekbreed.com/api/v1",
        "TEKMEMO_API_KEY": "tk_live_...",
        "TEKMEMO_PROJECT_ID": "proj_..."
      }
    }
  }
}
```

Restart Cursor's agent panel after adding the config.

## Other MCP clients

Most MCP clients follow the same `mcpServers` JSON pattern. The config file path varies:

| Client | Config file |
| --- | --- |
| Continue | `~/.continue/config.json` |
| Cline | `.cline/mcp_settings.json` |
| Windsurf | `.windsurf/mcp.json` |
| Zed | `~/.config/zed/mcp.json` or `Cmd+,` → MCP |
| GitHub Copilot | `.github/copilot-instructions.md` or VS Code `settings.json` |

Use the same JSON as Claude Code or Codex above, adjusting only the file path.

## Read-only mode

For untrusted clients or safety-first workflows, add `--read-only`:

```json
{
  "mcpServers": {
    "tekmemo": {
      "command": "npx",
      "args": ["-y", "@tekmemo/mcp-server", "--runtime", "local", "--root", ".", "--read-only"]
    }
  }
}
```

In read-only mode, all write tools (`memory_write`, `memory_append`, `memory_snapshot`, etc.) are blocked. Read tools (`memory_read`, `memory_search`, `context_compose`) remain available.

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
      "args": ["-y", "@tekmemo/mcp-server", "--runtime", "hybrid", "--root", ".", "--read-policy", "local-first"]
    }
  }
}
```
