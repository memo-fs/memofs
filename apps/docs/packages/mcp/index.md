# Model Context Protocol (MCP) Server

`@memofs/mcp-server` lets AI coding agents (Claude Code, Claude Desktop, Codex, Cursor, opencode, Gemini CLI, GitHub Copilot, Zed, and any other MCP client) securely read and write MemoFS memory through standard Model Context Protocol tools.

## Quick Setup (Recommended)

The MemoFS CLI writes the correct MCP config for your platform in one command — no hand-editing JSON:

```bash
memofs generate mcp claude                 # project .mcp.json
memofs generate mcp codex                  # ~/.codex/config.toml
memofs generate mcp cursor --scope global  # ~/.cursor/mcp.json
memofs generate mcp --list                 # all targets + paths
```

Or set up everything at once — rules file, hooks, and MCP config:

```bash
memofs generate agent claude
```

Writes are merge-safe: existing servers and settings are preserved, and a prior `memofs` entry is only replaced with `--force`. See the [CLI generate commands](/packages/cli/generate) for scopes and per-platform details.

The sections below cover manual configuration for when you can't (or don't want to) use the CLI.

## Installation

Most agents launch the server on demand via `npx` — no install required. To pin it as a project dependency instead:

::: code-group

```sh [npm]
npm install @memofs/mcp-server
```

```sh [pnpm]
pnpm add @memofs/mcp-server
```

```sh [yarn]
yarn add @memofs/mcp-server
```

```sh [bun]
bun add @memofs/mcp-server
```

```sh [deno]
deno install npm:@memofs/mcp-server
```

:::

> [!NOTE]
> The MCP server runs on **Node.js >= 22**. Ensure Node 22+ is available on the machine that hosts the agent (your dev laptop, a CI runner, or the agent's sandboxed runtime).

## Manual Integration

AI clients spawn the MCP server as a background process communicating over standard input/output (stdio).

Two conventions apply across all platforms:

- **Project-scoped configs** (committed to the repo) omit `--root` — the client launches the server with the project root as its working directory, keeping the config portable across machines.
- **Global / app-level configs** (in your home directory) include an absolute `--root` so the server knows which project's `.memofs/` to serve.

::: code-group

```json [Claude Code]
// Project: ./.mcp.json (committable — no --root needed)
// Global:  ~/.claude.json (add "--root", "/absolute/path/to/project" to args)
{
  "mcpServers": {
    "memofs": {
      "command": "npx",
      "args": ["-y", "@memofs/mcp-server"]
    }
  }
}
```

```json [Claude Desktop]
// macOS:   ~/Library/Application Support/Claude/claude_desktop_config.json
// Windows: %APPDATA%\Claude\claude_desktop_config.json
// Desktop has no project cwd, so --root is required.
{
  "mcpServers": {
    "memofs": {
      "command": "npx",
      "args": [
        "-y",
        "@memofs/mcp-server",
        "--root",
        "/absolute/path/to/your/project"
      ]
    }
  }
}
```

```toml [Codex]
# Global (Codex convention): ~/.codex/config.toml
# Project: ./.codex/config.toml (drop the --root args)
[mcp_servers.memofs]
command = "npx"
args = ["-y", "@memofs/mcp-server", "--root", "/absolute/path/to/your/project"]
```

```json [Cursor]
// Project: ./.cursor/mcp.json
// Global:  ~/.cursor/mcp.json (add "--root", "/absolute/path/to/project")
{
  "mcpServers": {
    "memofs": {
      "command": "npx",
      "args": ["-y", "@memofs/mcp-server"]
    }
  }
}
```

```jsonc [opencode]
// Project: ./opencode.json (or .jsonc)
// Global:  ~/.config/opencode/opencode.json (add "--root", "/absolute/path/to/project")
{
  "mcp": {
    "memofs": {
      "type": "local",
      "command": ["npx", "-y", "@memofs/mcp-server"],
      "enabled": true
    }
  }
}
```

```json [Gemini CLI]
// Project: ./.gemini/settings.json
// Global:  ~/.gemini/settings.json (add "--root", "/absolute/path/to/project")
{
  "mcpServers": {
    "memofs": {
      "command": "npx",
      "args": ["-y", "@memofs/mcp-server"]
    }
  }
}
```

```json [GitHub Copilot (VS Code)]
// Project: ./.vscode/mcp.json
{
  "servers": {
    "memofs": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@memofs/mcp-server"]
    }
  }
}
```

:::

> [!WARNING]
> VS Code's `.vscode/mcp.json` uses a `servers` top-level key and requires an explicit `"type"` on every entry. An `mcpServers` key copy-pasted from another client's config is **silently ignored** — no error, no server.

## Command Flags

Customize the server instantiation using standard flags:

| Flag | Default | Description |
|---|---|---|
| `--runtime <mode>` | `local` | Runtime mode: `local` or `hybrid`. |
| `--root <dir>` | Current directory | Absolute path to the project root containing `.memofs/`. |
| `--project-id <id>` | `undefined` | Project ID / default cloud project ID. |
| `--workspace-id <id>` | `undefined` | Default cloud workspace ID. |
| `--cloud-url <url>` | `undefined` | MemoFS Cloud API root (for hybrid mode). |
| `--api-key <key>` | `undefined` | MemoFS Cloud API key. Prefer `MEMOFS_API_KEY` env var. |
| `--cloud-timeout-ms <n>` | Cloud default | Cloud request timeout in milliseconds. |
| `--read-only` | `false` | Blocks all write tools. |
| `--allow-writes` | `false` | Explicitly allows write tools. |
| `--request-timeout-ms <n>` | `30000` | Per-tool request timeout. |
| `--max-input-bytes <n>` | `256000` | Max tool argument bytes. |
| `--max-output-bytes <n>` | `512000` | Max tool result bytes. |
| `--help` | — | Show help text. |

### Environment Variables

Every flag has an environment-variable equivalent — useful because most MCP client configs support an `env` block, which keeps secrets out of committed files:

| Variable | Description |
|---|---|
| `MEMOFS_RUNTIME` | Runtime mode: `local` or `hybrid`. |
| `MEMOFS_ROOT` | Local workspace root. |
| `MEMOFS_CLOUD_URL` | MemoFS Cloud API root (`MEMOFS_API_URL` is accepted as an alias). |
| `MEMOFS_API_KEY` | MemoFS Cloud API key. |
| `MEMOFS_PROJECT_ID` | Default project ID. |
| `MEMOFS_WORKSPACE_ID` | Default cloud workspace ID. |
| `MEMOFS_CLOUD_TIMEOUT_MS` | Cloud request timeout in milliseconds. |
| `MEMOFS_LOCAL_EMBEDDINGS` | Local ONNX embeddings — **on by default**; set to `0` or `false` to disable. |
| `MEMOFS_MCP_READ_ONLY` | Set to `"true"` to block write tools. |

## Exposed MCP Tools

The server exposes 10 model-facing tools — 4 memory verbs and 6 AgentFS session tools:

### Memory Tools

| Tool | Safety | Description |
|---|---|---|
| `memofs.context` | read | Build task-ready memory context (core + recall + recent + notes). Supports compact/full detail levels, progressive disclosure, and optional `taskType` (`coding`, `debug`, `refactor`, `docs`, `general`) to bias recall toward task-relevant memories. |
| `memofs.recall` | read | Semantic + lexical hybrid search over memory. |
| `memofs.remember` | write | Persist a durable memory entry (decision, constraint, goal, preference, reference, summary, or note). |
| `memofs.consolidate` | write | Run a graph consolidation pass — merge duplicate entities and retire superseded facts. |

> [!TIP]
> `memofs.context` returns a **compact briefing** (~6 KB) by default: core memory in full plus an `expandable` list naming each truncated section with an opaque cursor. Agents expand only the sections they need (`section` + `expand`), or pass `detail: "full"` for the whole dump in one call.

### AgentFS Session Tools

| Tool | Safety | Description |
|---|---|---|
| `memofs_agent_session_start` | write | Create an AgentFS session workspace for a coding task. |
| `memofs_agent_session_read` | read | Read a file from an active session workspace. |
| `memofs_agent_session_write` | write | Write to a session working/output file. |
| `memofs_agent_session_append` | write | Append to a session working/output file. |
| `memofs_agent_session_extract` | read | Extract summary, durable memory, and follow-ups from a session. |
| `memofs_agent_session_complete` | write | Extract, checkpoint, sync, and optionally persist durable memory. |

## Exposed MCP Resources

| URI | MIME Type | Description |
|---|---|---|
| `memofs://health` | `application/json` | Runtime health, version, and capabilities. |
| `memofs://context` | `application/json` | Task-ready context (query params: `query`, `limit`, `maxBytes`). |
| `memofs://memory/core` | `text/markdown` | Core memory document. |
| `memofs://memory/notes` | `text/markdown` | Notes memory document. |
| `memofs://memory/recent` | `application/json` | Recent memory events (query params: `limit`). |
| `memofs://graph/nodes` | `application/json` | Paginated graph nodes (query params: `cursor`, `limit`). |
| `memofs://graph/edges` | `application/json` | Paginated graph edges (query params: `cursor`, `limit`). |
| `memofs://agent-sessions/{sessionId}/context/core` | `text/markdown` | Session core context file. |
| `memofs://agent-sessions/{sessionId}/output/durable-memory` | `text/markdown` | Session durable memory output. |

## Exposed MCP Prompts

For clients with prompt support (e.g. slash-command style pickers):

| Prompt | Arguments | Description |
|---|---|---|
| `memofs-recall-context` | `query` (required), `workspaceId`, `includeGraph` | Turn a user question into a grounded MemoFS recall instruction. |
| `memofs-memory-review` | `content` (required), `workspaceId` | Review whether a text should become durable MemoFS memory. |

## Hybrid Mode

For cloud-synced memory, use `--runtime hybrid` with cloud credentials. Supply the API key through the `env` block rather than inline args, so it stays out of committed config:

```json
{
  "mcpServers": {
    "memofs": {
      "command": "npx",
      "args": [
        "-y",
        "@memofs/mcp-server",
        "--runtime", "hybrid",
        "--cloud-url", "https://memofs.dev/api/v1"
      ],
      "env": {
        "MEMOFS_API_KEY": "your-api-key"
      }
    }
  }
}
```

## See Also

- [CLI generate commands](/packages/cli/generate) — one-command MCP + hooks + rules setup per platform.
- [CLI memory commands](/packages/cli/memory) — `memofs context` gives hooks the same intelligence pipeline these tools use.
