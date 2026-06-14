# MCP runtime modes

The TekMemo MCP server supports four runtime modes that determine where memory is stored and how operations are executed.

## Mode comparison

| Mode | Command | Description |
| --- | --- | --- |
| `local` | `tekmemo-mcp --runtime local` | Reads and writes directly to a local `.tekmemo/` folder via the filesystem store. |
| `memory` | `tekmemo-mcp --runtime memory` | In-memory volatile store for tests and ephemeral sessions. |
| `cloud` | `tekmemo-mcp --runtime cloud` | Delegates all operations to TekMemo Cloud API (requires API key). |
| `hybrid` | `tekmemo-mcp --runtime hybrid` | Combines local files and cloud calls with configurable read/write policies. |

## Hybrid policies

When using `hybrid` mode, you can configure separate read and write policies:

### Read policies

| Value | Behavior |
| --- | --- |
| `local-first` | Try local storage first, fall back to cloud |
| `cloud-first` | Try cloud first, fall back to local |
| `local-only` | Only read from local `.tekmemo/` |
| `cloud-only` | Only read from TekMemo Cloud API |

### Write policies

| Value | Behavior |
| --- | --- |
| `local-first` | Write to local first, then replicate to cloud |
| `cloud-first` | Write to cloud first, then replicate to local |
| `local-only` | Only write to local |
| `cloud-only` | Only write to cloud |

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

## Configuration sources (in priority order)

1. **CLI arguments** — Highest priority
2. **Environment variables** — `TEKMEMO_RUNTIME`, `TEKMEMO_ROOT`, `TEKMEMO_CLOUD_URL`, etc.
3. **Local config file** — `.tekmemo/config.json` in the project root
4. **Defaults** — Local mode, current working directory

## Environment variables

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