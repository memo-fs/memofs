# Model Context Protocol (MCP) Server

`@memofs/mcp-server` allows AI coding agents (such as Claude Desktop, Cursor, and Zed) to securely interact with MemoFS memory layers using standard Model Context Protocol (MCP) tools.

## Installation

Install the MCP server package:

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
> The MCP server runs on **Node.js >= 22**. When configuring it for an AI agent, ensure Node 22+ is available on the machine that hosts the agent (e.g. your dev laptop, a CI runner, or the agent's sandboxed runtime).

## Integration

AI clients spawn the MCP server as a background process communicating via standard input/output (stdio). Most agents invoke it on demand via `npx` — no separate install required.

### 1. Claude Desktop Setup

Add the server definition to your `claude_desktop_config.json` configuration file:

```json
{
  "mcpServers": {
    "memofs": {
      "command": "npx",
      "args": [
        "-y",
        "@memofs/mcp-server",
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
   - **Name:** `memofs`
   - **Type:** `command`
   - **Command:** `npx -y @memofs/mcp-server --runtime local --root /path/to/project`

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

| Variable | Description |
|---|---|
| `MEMOFS_RUNTIME` | Runtime mode: `local` or `hybrid`. |
| `MEMOFS_ROOT` | Local workspace root. |
| `MEMOFS_CLOUD_URL` | MemoFS Cloud API root. |
| `MEMOFS_API_KEY` | MemoFS Cloud API key. |
| `MEMOFS_PROJECT_ID` | Default project ID. |
| `MEMOFS_WORKSPACE_ID` | Default cloud workspace ID. |
| `MEMOFS_LOCAL_EMBEDDINGS` | Enable local ONNX embeddings (`"1"` on, `"0"` off; on by default). |
| `MEMOFS_MCP_READ_ONLY` | Set to `"true"` to block write tools. |

## Exposed MCP Tools

The server exposes 10 model-facing tools — 4 memory verbs and 6 AgentFS session tools:

### Memory Tools

| Tool | Safety | Description |
|---|---|---|
| `memofs.context` | read | Build task-ready memory context (core + recall + recent + notes). Supports compact/full detail levels and progressive disclosure. |
| `memofs.recall` | read | Semantic + lexical hybrid search over memory. |
| `memofs.remember` | write | Persist a durable memory entry (decision, constraint, goal, preference, reference, summary, or note). |
| `memofs.consolidate` | write | Run a graph consolidation pass — merge duplicate entities and retire superseded facts. |

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

## Hybrid Mode

For cloud-synced memory, use `--runtime hybrid` with cloud credentials:

```json
{
  "mcpServers": {
    "memofs": {
      "command": "npx",
      "args": [
        "-y",
        "@memofs/mcp-server",
        "--runtime", "hybrid",
        "--root", "/path/to/project",
        "--cloud-url", "https://memofs.dev/api/v1",
        "--api-key", "your-api-key"
      ]
    }
  }
}
```
