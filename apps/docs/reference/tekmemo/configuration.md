# Configuration

TekMemo uses a predictable configuration hierarchy. For any given setting, the resolution order is:

1. **CLI Flag** (e.g., `--cloud-url`)
2. **Environment Variable** (e.g., `TEKMEMO_CLOUD_URL`)
3. **Config File** (e.g., `.tekmemo/config.json`)
4. **Built-in Default**

## Environment variables

| Variable | Purpose | Default |
| --- | --- | --- |
| `TEKMEMO_ROOT` | Project root folder containing `.tekmemo/` | `.` (current directory) |
| `TEKMEMO_RUNTIME` | Runtime mode: `local`, `cloud`, or `hybrid` | `local` |
| `TEKMEMO_CLOUD_URL` | Cloud API base URL ending in `/api/v1` | — |
| `TEKMEMO_API_URL` | Alias for `TEKMEMO_CLOUD_URL` | — |
| `TEKMEMO_API_KEY` | TekMemo Cloud API key | — |
| `TEKMEMO_PROJECT_ID` | Default Cloud project ID | — |
| `TEKMEMO_WORKSPACE_ID` | Optional workspace context ID | — |
| `TEKMEMO_CLOUD_TIMEOUT_MS` | Cloud request timeout in milliseconds | — |
| `TEKMEMO_READ_POLICY` | Hybrid read policy (`local-first`, `cloud-only`, etc.) | `local-first` |
| `TEKMEMO_WRITE_POLICY` | Hybrid write policy (`local-first`, `cloud-only`, etc.) | `local-first` |

## Configuration file

The `.tekmemo/config.json` file stores project-specific defaults so you don't need to specify flags on every command. 

Generate one using the CLI:
```bash
npx tekmemo config init --runtime hybrid
```

### Schema

```json
{
  "$schema": "https://oss.tekbreed.com/1.0.0-alpha.0/config.schema.json",
  "runtime": "hybrid",
  "root": ".",
  "cloud": {
    "baseUrl": "https://api.tekbreed.com/memo/v1",
    "projectId": "proj_123",
    "workspaceId": "ws_456",
    "timeoutMs": 10000
  },
  "hybrid": {
    "readPolicy": "local-first",
    "writePolicy": "local-first"
  }
}
```

### Properties

| Field | Description |
| --- | --- |
| `runtime` | `"local"`, `"cloud"`, or `"hybrid"` |
| `root` | Relative path to the folder where memory operations should run |
| `cloud.baseUrl` | TekMemo Cloud URL |
| `cloud.projectId` | Default project ID |
| `cloud.workspaceId` | Default workspace ID |
| `cloud.timeoutMs` | Timeout in milliseconds (must be a positive integer) |
| `hybrid.readPolicy` | `"local-first"`, `"cloud-first"`, `"local-only"`, or `"cloud-only"` |
| `hybrid.writePolicy` | `"local-first"`, `"cloud-first"`, `"local-only"`, or `"cloud-only"` |
