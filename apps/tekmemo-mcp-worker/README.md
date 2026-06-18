# TekMemo MCP Worker

Cloudflare Worker that hosts the TekMemo MCP server over stateless [Streamable HTTP](https://modelcontextprotocol.io/specification/basic/transports). This is the **hosted** MCP endpoint — cloud-only by design.

> **Production endpoint:** `https://mcp.memo.tekbreed.com/`

The MCP Streamable HTTP transport only `POST`s JSON-RPC, so the worker routes by method: `POST /` dispatches to MCP and `GET /` returns a small health payload.

## Routes

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/` | MCP JSON-RPC endpoint (Streamable HTTP). |
| `OPTIONS` | `/` | CORS preflight. |
| `GET` | `/` | Health/metadata payload. |
| `GET` | `/health` | Alias of the health payload. |

## Cloud-only by design

A hosted Worker runs in Cloudflare's edge and **cannot read a user's local filesystem**. This endpoint therefore only supports TekMemo Cloud as its backing store — it cannot serve `local` or `hybrid` (filesystem) modes.

| Mode | Supported here? | Why |
| --- | :---: | --- |
| Cloud | ✅ | Backed by the TekMemo Cloud API. |
| Local | ❌ | The Worker has no access to your `.tekmemo/` files. |
| Hybrid | ❌ | Requires local filesystem access. |
| Memory | ❌ | Volatile and stateless across requests. |

For **file-first local or hybrid memory** with an agent, self-host the stdio package (`@tekbreed/tekmemo-mcp-server`) instead. See the [MCP docs](https://oss.tekbreed.com/packages/mcp/) for both paths.

## Required configuration

All non-secret values live in `wrangler.jsonc`. **Secrets must never be committed** — set them with Wrangler:

```bash
wrangler secret put TEKMEMO_API_KEY
wrangler secret put TEKMEMO_MCP_BEARER_TOKEN
```

| Variable | Required | Purpose |
| --- | :---: | --- |
| `TEKMEMO_CLOUD_URL` | ✅ | TekMemo Cloud base URL (`https://api.tekbreed.com/memo/v1`). Set in `wrangler.jsonc`. |
| `TEKMEMO_API_KEY` | ✅ (secret) | TekMemo Cloud API key used by the cloud runtime. |
| `TEKMEMO_MCP_BEARER_TOKEN` | ✅ (secret) | Bearer token clients must present. **The worker fails closed** — if unset, every request returns `500`. |
| `TEKMEMO_PROJECT_ID` | Recommended | Default Cloud project scope. |
| `TEKMEMO_WORKSPACE_ID` | Optional | Caller-side workspace scope. |
| `TEKMEMO_CLOUD_TIMEOUT_MS` | Optional | Cloud request timeout (positive integer). |
| `TEKMEMO_MCP_READ_ONLY` | Optional | Set to `"true"` (default) to block write tools; `"false"` to enable them. |
| `TEKMEMO_MCP_ALLOWED_ORIGINS` | Optional | Comma-separated browser Origins allowed via CORS. Omit for non-browser clients. |

`TEKMEMO_API_URL` and `TEKMEMO_MCP_TOKEN` are accepted as legacy aliases for `TEKMEMO_CLOUD_URL` and `TEKMEMO_MCP_BEARER_TOKEN` respectively.

## Security model

- **Bearer-token auth is required by default.** Requests without a valid `Authorization: Bearer <token>` header are rejected with `401`.
- **Fail-closed.** If `TEKMEMO_MCP_BEARER_TOKEN` is not configured, the worker refuses to serve MCP traffic (`500`) rather than going open.
- Token comparison is constant-time via Web Crypto.
- The `Accept` header must include both `application/json` and `text/event-stream`; `Content-Type` must be JSON; `MCP-Protocol-Version` is validated when sent.
- Browser `Origin` is checked against `TEKMEMO_MCP_ALLOWED_ORIGINS` when present.
- Supported MCP protocol versions: `2025-11-25`, `2025-06-18`, `2025-03-26`, `2024-11-05`.

## Connecting from an MCP client

Point any Streamable-HTTP-compatible client at the root URL with the bearer token:

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

See the [client setup guide](https://oss.tekbreed.com/packages/mcp/client-setup) for client-specific examples (Claude Code, Cursor, Codex, etc.).

## Local development

```bash
pnpm install
pnpm dev        # wrangler dev on http://localhost:8787
```

Create a `.dev.vars` file (gitignored) with local values:

```bash
TEKMEMO_API_KEY=...
TEKMEMO_MCP_BEARER_TOKEN=dev-token
```

## Deploy

`wrangler.jsonc` defines `production` and `staging` environments, each with its own custom domain and vars. Secrets are per-environment.

```bash
# Production (mcp.memo.tekbreed.com)
wrangler secret put TEKMEMO_API_KEY --env production
wrangler secret put TEKMEMO_MCP_BEARER_TOKEN --env production
wrangler deploy --env production

# Staging (mcp-staging.memo.tekbreed.com)
wrangler secret put TEKMEMO_API_KEY --env staging
wrangler secret put TEKMEMO_MCP_BEARER_TOKEN --env staging
wrangler deploy --env staging
```

## Tests

```bash
pnpm test:run    # unit + routing + auth (fail-closed) tests
pnpm typecheck
```

## How it relates to the rest of TekMemo

This worker is a thin routing shell over `@tekbreed/tekmemo-mcp-server/http`, which contains the full MCP protocol, tool/resource/prompt definitions, security validation, and the cloud runtime. The worker only adds Cloudflare bindings and request routing.
