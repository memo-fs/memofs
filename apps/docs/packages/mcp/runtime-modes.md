# MCP runtime modes

Where TekMemo memory lives depends on which MCP path you use. The **hosted server** is cloud-only; the **self-hosted stdio server** supports all four modes.

## At a glance

| Path | Available modes | Why |
| --- | --- | --- |
| **Hosted server** (`https://mcp.memo.tekbreed.com/`) | `cloud` only | The Worker runs in Cloudflare's edge and cannot read your local filesystem. |
| **Self-hosted stdio** (`@tekbreed/tekmemo-mcp-server`) | `local`, `cloud`, `hybrid`, `memory` | Runs on your machine, so it can read `.tekmemo/` and/or call the cloud. |

See [Hosted MCP](./hosted) for the hosted endpoint details.

## Stdio mode comparison

The stdio binary `tekmemo-mcp` supports four runtime modes:

| Mode | Command | Description |
| --- | --- | --- |
| `local` | `tekmemo-mcp --runtime local` | Reads and writes directly to a local `.tekmemo/` folder via the filesystem store. |
| `memory` | `tekmemo-mcp --runtime memory` | In-memory volatile store for tests and ephemeral sessions. Nothing persists. |
| `cloud` | `tekmemo-mcp --runtime cloud` | Delegates all operations to TekMemo Cloud API (requires API key). |
| `hybrid` | `tekmemo-mcp --runtime hybrid` | Combines local files and cloud calls with configurable read/write policies. |

## Hybrid policies

When using stdio `hybrid` mode, you can configure separate read and write policies:

### Read policies

| Value | Behavior |
| --- | --- |
| `local-first` | Try local storage first, fall back to cloud |
| `cloud-first` | Try cloud first, fall back to local |
| `local-only` | Only read from local `.tekmemo/` |

### Write policies

| Value | Behavior |
| --- | --- |
| `local-first` | Write to local first, then replicate to cloud |
| `cloud-first` | Write to cloud first, then replicate to local |
| `local-only` | Only write to local |

Policies only apply to stdio `hybrid` mode. The hosted server ignores them — it is cloud-only.

### Example hybrid configuration

```bash
tekmemo-mcp \
  --runtime hybrid \
  --root . \
  --read-policy local-first \
  --write-policy local-first \
  --cloud-url https://memo.tekbreed.com/api/v1 \
  --api-key "$TEKMEMO_API_KEY"
```

## Recommended first setup

For most users starting with local file-first memory:

```bash
# Local only - simplest, no cloud dependencies
tekmemo-mcp --runtime local --root .
```

For teams using TekMemo Cloud:

```bash
# Hybrid with local-first for speed, cloud sync for sharing
tekmemo-mcp \
  --runtime hybrid \
  --root . \
  --read-policy local-first \
  --write-policy local-first \
  --cloud-url https://memo.tekbreed.com/api/v1 \
  --api-key "$TEKMEMO_API_KEY"
```

For zero local setup, skip the stdio server and use the [hosted server](./hosted).

## Configuration sources (stdio, in priority order)

1. **CLI arguments** — Highest priority
2. **Environment variables** — `TEKMEMO_RUNTIME`, `TEKMEMO_ROOT`, `TEKMEMO_CLOUD_URL`, etc.
3. **Local config file** — `.tekmemo/config.json` in the project root
4. **Defaults** — Local mode, current working directory

## Environment variables (stdio)

| Variable | Description |
| --- | --- |
| `TEKMEMO_RUNTIME` | `local`, `memory`, `cloud`, or `hybrid` |
| `TEKMEMO_ROOT` | Local workspace root directory |
| `TEKMEMO_CLOUD_URL` / `TEKMEMO_API_URL` | TekMemo Cloud API root |
| `TEKMEMO_API_KEY` | TekMemo Cloud API key |
| `TEKMEMO_WORKSPACE_ID` | Default cloud workspace ID |
| `TEKMEMO_PROJECT_ID` | Default project ID |
| `TEKMEMO_CLOUD_TIMEOUT_MS` | Cloud request timeout |
| `TEKMEMO_READ_POLICY` | Hybrid read policy |
| `TEKMEMO_WRITE_POLICY` | Hybrid write policy |
| `TEKMEMO_MCP_READ_ONLY` | Set to `true` to block write tools |

The hosted server uses a separate set of Worker bindings (`TEKMEMO_MCP_BEARER_TOKEN`, `TEKMEMO_MCP_ALLOWED_ORIGINS`, etc.) documented in [Hosted MCP](./hosted).
