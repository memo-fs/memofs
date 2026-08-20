---
title: "@memofs/mcp-server Overview"
description: "Model Context Protocol (MCP) server package for exposing MemoFS memory tools to AI agents."
---

# Model Context Protocol (MCP) Server

`@memofs/mcp-server` lets AI agents (Claude Code, Claude Desktop, Codex, Cursor, opencode, Gemini CLI, GitHub Copilot, Zed, and any other MCP client) securely read and write MemoFS memory through standard Model Context Protocol tools.

## Quick setup (recommended)

The MemoFS CLI writes the correct MCP config for your platform in one command — no hand-editing JSON:

```bash
memofs generate mcp claude                 # project .mcp.json (local default)
memofs generate mcp codex                  # .codex/config.toml (local default)
memofs generate mcp codex --scope global   # ~/.codex/config.toml (user-home global)
memofs generate mcp cursor --scope global  # ~/.cursor/mcp.json
memofs generate mcp --list                 # all targets + paths
```

Or set up everything at once — rules file, hooks, and MCP config:

```bash
memofs generate agent claude
memofs generate agent codex
```

Writes are merge-safe: existing servers and settings are preserved, and a prior `memofs` entry is only replaced with `--force`. See the [CLI generate commands](/cli/generate) for scopes and per-platform details.

The sections below cover manual configuration for when you can't (or don't want to) use the CLI.

## Installation

Most agents launch the server on demand via `npx` (using the binary `memofs-mcp` or package `@memofs/mcp-server`) — no installation required. To pin it as a project dependency instead:

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

## Manual integration

AI clients spawn the MCP server as a background process communicating over standard input/output (stdio).

Two conventions apply across most platforms:

- **Project-scoped configs** (committed to the repo) omit `--root` — clients like Claude Code, Codex, Cursor, and opencode launch the server with the project root as its working directory.
- **Global / app-level configs** (in your home directory) include an absolute `--root` so the server knows which project's `.memofs/` to serve.
- **Google Antigravity Exception**: Antigravity launches MCP server processes from its daemon app directory (`~/.gemini/antigravity`). Therefore, Antigravity **always requires** `--root /absolute/path/to/project` (or `MEMOFS_ROOT` env var) even in project-scoped configs like `.agents/mcp_settings.json` (or `.agents/mcp_config.json`) to prevent `UNEXPECTED_ERROR: Failed to create memory file parent directory.`.

::: code-group

```json [Claude Code]
// Project: ./.mcp.json
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

```toml [Codex]
# Project: ./.codex/config.toml (local default)
# Global: ~/.codex/config.toml (add "--root", "/absolute/path/to/your/project" to args)
[mcp_servers.memofs]
command = "npx"
args = ["-y", "@memofs/mcp-server"]
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

```json [Antigravity]
// Project: ./.agents/mcp_settings.json (or .agents/mcp_config.json - MUST include --root or MEMOFS_ROOT env var)
// Global:  ~/.gemini/antigravity-cli/settings.json
{
  "mcpServers": {
    "memofs": {
      "command": "npx",
      "args": ["-y", "@memofs/mcp-server", "--root", "/absolute/path/to/your/project"]
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

## Command flags

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

### Environment variables

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

---

## Exposed MCP Tools

The server exposes 10 model-facing tools — 4 memory verbs and 6 AgentFS session tools:

### 1. Memory Tools

#### `memofs.context`
- **Safety**: `read` (Read-only, idempotent)
- **Description**: Builds a task-ready briefing combining core memory, recent memory events, graph entities, and relevant recall.
- **Parameters**:
  - `query` (*string, required*): The user task or prompt.
  - `taskType` (*string, optional*): `coding` | `debug` | `refactor` | `docs` | `general` (default `general`).
  - `limit` (*integer, optional*): Maximum recall items to include (1 to `maxPageSize`).
  - `maxBytes` (*integer, optional*): Maximum briefing byte limit (1024 to 262144).
  - `detail` (*string, optional*): `compact` (default ~6 KB briefing with expandable cursors) or `full` (complete dump).
  - `section` (*string, optional*): `entities` | `recall` | `recent` | `notes` (used with `expand`).
  - `expand` (*string, optional*): Opaque cursor returned from prior compact briefing.
  - `includeCore`, `includeNotes`, `includeRecent`, `includeGraph`, `includeSources` (*boolean, optional*).

#### `memofs.recall`
- **Safety**: `read` (Read-only, idempotent)
- **Description**: Natural language hybrid (semantic + lexical) memory search.
- **Parameters**:
  - `query` (*string, required*): Natural language query.
  - `limit` (*integer, optional*): Maximum results (1 to `maxPageSize`).
  - `includeGraph`, `includeSources` (*boolean, optional*).
- **Result Flags**:
  - `anchor`: `{ file: string, hash: string, symbol?: string }`
  - `stale`: `true` if the anchored file changed or was removed since the note was recorded.
  - `unverified`: `true` if memory has exceeded its kind-specific decay floor.

#### `memofs.remember`
- **Safety**: `write` (Destructive: false, idempotent: false)
- **Description**: Persists durable facts to `memory/notes.md` and appends a `memory.created` event.
- **Parameters**:
  - `content` (*string, required*): Memory text note.
  - `title` (*string, optional*): Header title.
  - `kind` (*string, optional*): `decision` | `constraint` | `goal` | `preference` | `reference` | `summary` | `note` (default `note`).
  - `confidence` (*number, optional*): Certainty score between 0 and 1.
  - `source` (*string, optional*): Origin source identifier.
  - `tags` (*string[], optional*): Tags to attach (max 50).
  - `sourceRefs` (*object[], optional*): External source reference objects.
  - `anchor` (*object, optional*): `{ file: string, hash: string, symbol?: string }` code anchor.
  - `metadata` (*object, optional*): Structured JSON metadata.

#### `memofs.consolidate`
- **Safety**: `write` (Destructive: false, idempotent: true)
- **Description**: Runs graph consolidation pass, merging duplicate entities and retiring superseded facts.
- **Parameters**:
  - `apply` (*boolean, optional*): `true` (default) to persist changes; `false` to preview plan.
  - `now` (*string, optional*): ISO 8601 timestamp override for retirements.
  - `supersedingEdgeType` (*string, optional*): Default `supersedes`.

---

### 2. AgentFS Session Tools

#### `memofs_agent_session_start`
- **Safety**: `write`
- **Parameters**: `task` (*string, required*), `actorId` (*string, optional*), `sessionId` (*string, optional*), `workspaceId`, `projectId`.

#### `memofs_agent_session_read`
- **Safety**: `read`
- **Parameters**: `sessionId` (*string, required*), `path` (*string, required*), `workspaceId`, `projectId`.

#### `memofs_agent_session_write`
- **Safety**: `write`
- **Parameters**: `sessionId` (*string, required*), `path` (*string, required*), `content` (*string, required*), `workspaceId`, `projectId`.

#### `memofs_agent_session_append`
- **Safety**: `write`
- **Parameters**: `sessionId` (*string, required*), `path` (*string, required*), `content` (*string, required*), `workspaceId`, `projectId`.

#### `memofs_agent_session_extract`
- **Safety**: `read`
- **Parameters**: `sessionId` (*string, required*), `workspaceId`, `projectId`.

#### `memofs_agent_session_complete`
- **Safety**: `write`
- **Parameters**:
  - `sessionId` (*string, required*).
  - `extractDurableMemory` (*boolean, optional*): Persist durable memory to `notes.md`.
  - `checkpointLabel` (*string, optional*): Tagged snapshot checkpoint label.
  - `outcome` (*string, optional*): `"success"` | `"failure"` | `"aborted"`.
  - `ephemeral` (*boolean, optional*): Clean `working/` and `output/` on failure.
  - `reason` (*string, optional*): Failure or abort audit text.

---

## Exposed MCP Resources

| URI | MIME Type | Description |
|---|---|---|
| `memofs://health` | `application/json` | Runtime health, version, and capabilities. |
| `memofs://context` | `application/json` | Task-ready context (query params: `query`, `workspaceId`, `projectId`, `limit`, `maxBytes`). |
| `memofs://memory/core` | `text/markdown` | Core memory document (`memory/core.md`). |
| `memofs://memory/notes` | `text/markdown` | Notes memory document (`memory/notes.md`). |
| `memofs://memory/recent` | `application/json` | Recent memory events (query params: `workspaceId`, `projectId`, `limit`). |
| `memofs://graph/nodes` | `application/json` | Paginated graph nodes (query params: `workspaceId`, `cursor`, `limit`). |
| `memofs://graph/edges` | `application/json` | Paginated graph edges (query params: `workspaceId`, `cursor`, `limit`). |
| `memofs://agent-sessions/{sessionId}/context/core` | `text/markdown` | Session snapshot core context file. |
| `memofs://agent-sessions/{sessionId}/output/durable-memory` | `text/markdown` | Candidate session durable memory output. |

---

## Exposed MCP Prompts

| Prompt | Arguments | Description |
|---|---|---|
| `memofs-recall-context` | `query` (required), `workspaceId`, `includeGraph` | Transforms a user query into a grounded recall prompt workflow. |
| `memofs-memory-review` | `content` (required), `workspaceId` | Evaluates whether candidate text meets durable memory criteria. |

---

## Programmatic Server Embedding

You can embed the MCP server into your existing Node.js application, wrapping a [`MemoFS`](/core/configuration) class instance:

::: code-group

```ts [Direct MemoFS Class]
import { MemoFS } from "@memofs/core";
import { createNodeFsMemoryStore } from "@memofs/core/node-fs";
import {
  createMemoFSMcpRuntimeFromMemoFS,
  createMemoFSMcpProtocolServer,
  runStdioServer,
} from "@memofs/mcp-server";

// 1. Instantiate the MemoFS engine with any MemoryStore
const memo = new MemoFS({
  store: createNodeFsMemoryStore({ rootDir: "." }),
  mode: "local",
});

// 2. Wrap MemoFS as an MCP runtime
const runtime = createMemoFSMcpRuntimeFromMemoFS(memo);

// 3. Create protocol server
const server = createMemoFSMcpProtocolServer({ runtime });

// 4. Run over stdio or connect to custom transports
await runStdioServer(server);
```

```ts [Node Helper (createNodeMemoFs)]
import { createNodeMemoFs } from "@memofs/core/node-fs";
import {
  createMemoFSMcpRuntimeFromMemoFS,
  createMemoFSMcpProtocolServer,
  runStdioServer,
} from "@memofs/mcp-server";

// 1. Instantiate MemoFS via the Node.js helper
const memo = createNodeMemoFs({ rootDir: "." });

// 2. Wrap MemoFS as an MCP runtime
const runtime = createMemoFSMcpRuntimeFromMemoFS(memo);

// 3. Create protocol server
const server = createMemoFSMcpProtocolServer({ runtime });

// 4. Run over stdio
await runStdioServer(server);
```

:::

For the complete programmatic TypeScript API reference, see the [MCP Server API Reference](/api/mcp-server).

---

## See Also

- [Hybrid Mode](./hybrid-mode) — local stdio server that mirrors writes to the cloud replica.
- [Hosted MCP Endpoint](./hosted-mcp-endpoint) — HTTP-only variant for agents on machines with no checkout (Pro/Teams).
- [CLI generate commands](/cli/generate) — one-command MCP + hooks + rules setup per platform.
- [CLI memory commands](/cli/memory) — `memofs context` gives hooks the same intelligence pipeline these tools use.