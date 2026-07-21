# Hosted MCP Endpoint

The hosted MCP endpoint serves the four MemoFS memory tools directly over HTTP — **no local server, no checkout, no `npx`**. Point any MCP client that supports the streamable-HTTP transport at your project's URL and the agent speaks the same protocol it would over stdio.

Use it when the machine hosting your agent has no working copy of the repo:

- CI runners and ephemeral build agents
- Cloud-hosted agents (Claude.ai web, server-side Copilot, etc.)
- A teammate's laptop *before* they've cloned the repo
- Any cloud hosted agents/AI apps that speak MCP

If the agent runs on a machine with a full checkout and you want it to benefit from local-first reads, use [Hybrid Mode](./hybrid-mode) instead.

> [!NOTE]
> The hosted endpoint is available on **Pro and Teams** plans. The dashboard's Memory page shows an upgrade CTA when the account is on Free. See [Rate limits](#rate-limits) below.

## Quick start

The dashboard's **Memory page** shows your project's exact URL plus copy-paste snippets for the three clients whose config shapes need one. The URL has the form:

```
https://memofs.dev/api/v1/projects/<project-id>/mcp
```

Replace `<project-id>` with the project's real ID (shown on the dashboard) and `<your-api-key>` with a key from the **API Keys page**. The hosted endpoint speaks standard MCP streamable-HTTP, so any MCP client that supports that transport works (Claude Desktop, Claude Code, Codex, Cursor, opencode, Gemini CLI, GitHub Copilot in VS Code, Zed, Continue, and others). The dashboard ships copy-paste snippets for the three clients whose config shapes differ enough to need one — Claude Code, Cursor, and VS Code:

::: code-group

```sh [Claude Code]
claude mcp add --transport http memofs https://memofs.dev/api/v1/projects/<project-id>/mcp \
  --header "Authorization: Bearer <your-api-key>"

# Run from your project directory, then restart Claude Code.
```

```json [Cursor]
// Save as `.cursor/mcp.json` in your project (or merge into the global one)
{
  "mcpServers": {
    "memofs": {
      "url": "https://memofs.dev/api/v1/projects/<project-id>/mcp",
      "headers": {
        "Authorization": "Bearer <your-api-key>"
      }
    }
  }
}
```

```json [VS Code (GitHub Copilot)]
// Save as `.vscode/mcp.json` in your workspace
{
  "servers": {
    "memofs": {
      "type": "http",
      "url": "https://memofs.dev/api/v1/projects/<project-id>/mcp",
      "headers": {
        "Authorization": "Bearer <your-api-key>"
      }
    }
  }
}
```

:::

> [!WARNING]
> VS Code's `.vscode/mcp.json` uses a `servers` top-level key (not `mcpServers`) and **requires** an explicit `"type"` on every entry. A snippet copy-pasted from Cursor or Claude is **silently ignored** — no error, no server appears. The dashboard's VS Code tab pre-fills the correct shape.

## Authentication

Every request must carry a Bearer `Authorization` header:

```
Authorization: Bearer <your-api-key>
```

The endpoint authenticates with the same salted-hash lookup the rest of the MemoFS Cloud API uses — your API key is the credential, not a bearer token minted by a session. Manage keys on the dashboard's API Keys page.

## What's exposed

Only the **four memory verbs** are wired over this transport — the same tool names and schemas as the stdio server:

| Tool | Safety | Description |
|---|---|---|
| `memofs.context` | read | Build a task-ready memory briefing (core + recall + recent + notes). |
| `memofs.recall` | read | Semantic + lexical hybrid search over memory. |
| `memofs.remember` | write | Persist a durable memory entry (decision, constraint, goal, preference, reference, summary, or note). |
| `memofs.consolidate` | write | Run a graph consolidation pass — merge duplicate entities and retire superseded facts. |

Other MCP surfaces from the stdio server — AgentFS session tools (`memofs_agent_session_*`), graph/raw resources, prompts — are **not** exposed over HTTP. If an agent calls one, the MCP server returns a validation error (`Runtime does not support X`). For those features, run the agent on a machine with a checkout and use [Hybrid Mode](./hybrid-mode).

### Read-only vs. read-write keys

The hosted endpoint enforces key scope at the MCP protocol layer:

| Key scope | `memofs.context` | `memofs.recall` | `memofs.remember` | `memofs.consolidate` |
|---|:---:|:---:|:---:|:---:|
| Read-write | ✅ | ✅ | ✅ | ✅ |
| Read-only | ✅ | ✅ | ❌ | ❌ |

A read-only key never rejects `context`/`recall` — only the write tools fail, and the failure surfaces as a standard MCP authorization error, not an HTTP 403.

### Write attribution

Writes are stamped with the API key's label as the `writer` field (the submitted tool call has no `writer` field, so clients can't forge attribution). Each successful write is also logged as a `memory_events` row visible on the dashboard's Memory page.

### Local pickup of cloud writes

Writes land in the project's hosted replica. A local checkout picks them up on its next `memofs cloud sync pull` (or `memofs cloud sync push` background pass). The hosted endpoint does **not** push writes back to the local `.memofs/` directory of every machine automatically — pulls are explicit, just like with [Hybrid Mode](./hybrid-mode).

## Rate limits

Rate limits are tiered per **API key**:

| Plan | Requests per minute |
|---|---|
| Free | Upgrade to Pro/Teams |
| Pro | 60 |
| Teams | 300 |

Exceeding the limit returns HTTP `429` with a `Retry-After` indicating when the bucket resets. The MCP client surfaces that as a transport error; most agents retry transparently.

## Troubleshooting

### `402` "The hosted MCP endpoint requires a Pro or Teams plan."
Your API key belongs to a Free account. Upgrade from the dashboard's Billing page, or use a key minted under a paid account.

### `404` "Project not found. Push it with `memofs cloud sync push` first."
The project has never been synced to the cloud, so there's no replica to serve. Clone the repo on a machine with the CLI, then run `memofs cloud sync push` once to provision the hosted replica.

### `403` "Forbidden"
The authenticating key's account doesn't own the project. Re-check that you copied the right `<project-id>` and that the key belongs to the same account (or team) that owns the project.

### Write tools return an MCP authorization error
Your key is read-only. Either mint a read-write key on the API Keys page, or rely on `memofs.context` / `memofs.recall` only.

### `429` "MCP rate limit exceeded. Try again shortly."
You hit the plan's per-minute cap. Back off briefly; the `Retry-After` header tells you when the bucket resets. For higher throughput, upgrade to Teams (300 req/min) or split work across multiple agents with their own keys.

### Hosted agent can't reach `memofs://...` resources or `memofs_agent_session_*` tools
Those surfaces are stdio-only — the hosted endpoint exposes just the four memory verbs by design. Use [Hybrid Mode](./hybrid-mode) on a machine with a checkout to reach the full surface.

## See Also

- [MCP Server index](./index) — the full tool/flag surface for the stdio server.
- [Hybrid Mode](./hybrid-mode) — local stdio server that mirrors writes to the cloud replica.
- [CLI memory commands](/packages/cli/memory) — `memofs cloud sync push` to provision a project's hosted replica; `memofs cloud sync pull` to reconcile local memory with cloud writes.
