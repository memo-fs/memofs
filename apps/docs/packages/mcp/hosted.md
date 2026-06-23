# Hosted MCP

TekMemo runs a hosted MCP server at **`https://mcp.memo.tekbreed.com/`** over stateless [Streamable HTTP](https://modelcontextprotocol.io/specification/basic/transports). This is the fastest way to give an agent access to TekMemo Cloud memory — no local process, no filesystem, no package install.

> The hosted server is **cloud-only**. It backs onto TekMemo Cloud and cannot read your local `.tekmemo/` folder. For file-first `local` or `hybrid` memory, [self-host the stdio server](./#self-hosted-stdio-server) instead.

## Endpoint

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/` | MCP JSON-RPC endpoint (Streamable HTTP). |
| `OPTIONS` | `/` | CORS preflight. |
| `GET` | `/` | Health/metadata payload. |
| `GET` | `/health` | Alias of the health payload. |

The MCP Streamable HTTP transport only `POST`s JSON-RPC, so the root is routed by method — `POST /` is MCP, `GET /` is health. There is no `/mcp` sub-path.

## Authentication

Every MCP request must carry a bearer token:

```http
POST / HTTP/1.1
Host: mcp.memo.tekbreed.com
Authorization: Bearer <your TEKMEMO_MCP_BEARER_TOKEN>
Accept: application/json, text/event-stream
Content-Type: application/json
```

- **Auth is required by default.** Requests without a valid token are rejected with `401`.
- **The server fails closed.** If TekMemo has not configured a bearer token on the Worker, the endpoint returns `500` and serves no traffic — it never goes open.
- Token comparison is constant-time.
- Your token is provisioned by TekMemo Cloud and is separate from your `TEKMEMO_API_KEY`.

## Connecting a client

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

See [Client setup](./client-setup#hosted-server) for client-specific JSON (Claude Code, Cursor, Codex, etc.).

## Read-only by default

The hosted endpoint ships in **read-only mode** (`TEKMEMO_MCP_READ_ONLY=true`). All write tools (`tekmemo.remember`, `tekmemo.update_core_memory`, `tekmemo.snapshot`, `tekmemo.sync_push`, …) are blocked; read tools (`tekmemo.context`, `tekmemo.recall`, `tekmemo.read_core_memory`, …) work normally.

If you need the agent to write memory, contact TekMemo to enable writes for your project, or self-host the stdio server where you control the flag.

## CORS (browser clients)

If you connect from a browser-based client, TekMemo must allowlist your Origin. Provide your Origin(s) to TekMemo Cloud and they will be added to the `TEKMEMO_MCP_ALLOWED_ORIGINS` allowlist on the Worker. Requests from non-allowlisted Origins receive `403`. Non-browser clients (desktop agents, CLI) are unaffected.

## Protocol conformance

- **Supported versions:** `2025-11-25`, `2025-06-18`, `2025-03-26`, `2024-11-05`.
- `Accept` must include both `application/json` and `text/event-stream`.
- `Content-Type` must be `application/json` (or `+json`).
- `MCP-Protocol-Version` is validated when sent; unsupported values return `400`.
- Stateless: sessions are not held across requests. Each `POST` is independent.

## Health check

```bash
curl https://mcp.memo.tekbreed.com/health
```

```json
{ "ok": true, "name": "tekmemo-mcp-worker", "mcp": "/" }
```

## Self-hosting the Worker

The hosted Worker lives in this repo at `apps/tekmemo-mcp-worker`. It is a thin routing shell over `@tekbreed/tekmemo-mcp-server/http`. To deploy your own:

1. Configure `wrangler.jsonc` with your custom domain and `TEKMEMO_CLOUD_URL`.
2. Set secrets: `wrangler secret put TEKMEMO_API_KEY` and `wrangler secret put TEKMEMO_MCP_BEARER_TOKEN`.
3. `wrangler deploy`.

See the Worker's `README.md` for the full deploy checklist, environment reference, and security model.

## When to choose hosted vs stdio

| You want… | Use |
| --- | --- |
| Cloud memory, zero local setup | **Hosted server** |
| Shared/team memory with no infra to run | **Hosted server** |
| File-first memory in `.tekmemo/` version-controlled with your code | **Self-hosted stdio** (local or hybrid) |
| Offline / air-gapped agents | **Self-hosted stdio** (local) |
| Full control over read/write policy and secrets | **Self-hosted stdio** |
