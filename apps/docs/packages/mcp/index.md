# Model Context Protocol (MCP)

TekMemo exposes memory to MCP-compatible coding agents (Claude Code, Cursor, Codex, OpenCode, etc.) over the **Model Context Protocol**. There are **two ways to run the MCP server**, depending on where your memory lives:

## Two ways to connect

| Path | What it is | Modes | Best for |
| --- | --- | --- | --- |
| **Hosted server** | TekMemo runs the MCP endpoint for you at `https://mcp.memo.tekbreed.com/` over Streamable HTTP. | `cloud` only | Zero setup, teams, SaaS users. You use TekMemo Cloud as the backing store. |
| **Self-hosted stdio** | You run the `@tekbreed/tekmemo-mcp-server` package as a local stdio subprocess. | `local`, `cloud`, `hybrid`, `memory` | File-first memory in `.tekmemo/`, offline work, full control. |

### Why two paths?

A hosted server lives in the cloud and **cannot read files on your machine**, so the hosted endpoint is cloud-only by design. To use **local or hybrid memory** (the file-first `.tekmemo/` model) with an agent, self-host the stdio package — it runs on your machine and can read your filesystem.

If you only want cloud memory and prefer zero local setup, use the **hosted server**.

## Hosted server (cloud-only)

Point any Streamable-HTTP-compatible client at the root URL with your bearer token:

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

The hosted server is read-only by default (`TEKMEMO_MCP_READ_ONLY=true`) and requires a bearer token on every request. See [Hosted MCP](./hosted) for auth, CORS, and deployment details, and [Client setup](./client-setup) for per-client examples.

## Self-hosted stdio server

Install the package and run it as a subprocess. The binary is `tekmemo-mcp`.

```bash
npm install -D @tekbreed/tekmemo-mcp-server
```

### Local mode (file-first)

Expose memory stored in a local `.tekmemo/` folder:

```bash
tekmemo-mcp --runtime local --root .
```

### Cloud mode

Expose memory hosted on TekMemo Cloud without running the hosted server:

```bash
tekmemo-mcp \
  --runtime cloud \
  --cloud-url https://memo.tekbreed.com/api/v1 \
  --api-key "$TEKMEMO_API_KEY" \
  --project-id proj_123
```

### Hybrid mode (local files + cloud)

Combine a local `.tekmemo/` folder with cloud recall and sync:

```bash
tekmemo-mcp \
  --runtime hybrid \
  --root . \
  --cloud-url https://memo.tekbreed.com/api/v1 \
  --api-key "$TEKMEMO_API_KEY" \
  --read-policy local-first \
  --write-policy local-first
```

See [Runtime modes](./runtime-modes) for the full mode comparison and [Client setup](./client-setup) for how to register the stdio server with each agent client.

## What tools does the agent get?

Both paths expose the **same TekMemo tool surface** — `tekmemo.context`, `tekmemo.recall`, `tekmemo.remember`, graph, sync, AgentFS session tools, and cloud management tools. The only difference is the backing store the tools read from and write to. See [Tools](./tools) for the full list.

## Where to go next

- [Client setup](./client-setup) — register the hosted URL or stdio command with your specific agent.
- [Runtime modes](./runtime-modes) — `local` vs `cloud` vs `hybrid` vs `memory`.
- [Hosted MCP](./hosted) — auth, CORS, fail-closed behavior, and self-deploying the Worker.
- [Tools](./tools) — the full tool reference.
- [Security](./security) — read-only mode, write approval, and secret handling.
