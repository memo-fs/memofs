# Command Line Interface (CLI)

The `@tekbreed/tekmemo-cli` package gives you a command-line tool for managing local, cloud, and hybrid memory.

## Installation

```bash
npm install -D @tekbreed/tekmemo-cli
```

## Quick start

```bash 
# Initialize memory in your project
npx tekmemo init

# Inspect the current memory state
npx tekmemo inspect

# Store a durable decision
npx tekmemo remember "Use VoyageAI for embeddings" --kind decision

# Get context for a task
npx tekmemo context --query "current task" --json

# Validate memory structure
npx tekmemo validate
```

## Runtime modes

The CLI supports three runtime modes that control where memory is stored and read from:

| Mode | Description | Command example |
| --- | --- | --- |
| **Local** (default) | Reads and writes to your `.tekmemo/` folder | `npx tekmemo context --query "task"` |
| **Hybrid** | Local files plus cloud sync — the cloud mirrors your `.tekmemo/` files across machines | Configure with `npx tekmemo config init --runtime hybrid` |
| **Memory** | In-memory only (no disk); for tests and ephemeral runs | `--runtime memory` |

There is no standalone `cloud` mode — the cloud is a sync transport reached through `hybrid`, not a runtime mode. See [Cloud commands](./cloud-commands.md) for the sync surface (`health`, `readiness`, `sync status/pull/push`).

## Global flags

These flags work with any command:

| Flag | Description | Default |
| --- | --- | --- |
| `-r, --root <path>` | Project root containing `.tekmemo/` | Current directory |
| `--runtime <mode>` | Runtime mode: `local`, `hybrid`, or `memory` | `local` |
| `--cloud-url <url>` | TekMemo Cloud API URL | `TEKMEMO_CLOUD_URL` env var |
| `--api-key <key>` | TekMemo Cloud API key | `TEKMEMO_API_KEY` env var |
| `--workspace-id <id>` | Cloud workspace ID | `TEKMEMO_WORKSPACE_ID` env var |
| `--project-id <id>` | Cloud project ID | `TEKMEMO_PROJECT_ID` env var |
| `--timeout-ms <n>` | Cloud request timeout in milliseconds | — |
| `--read-policy <policy>` | Hybrid read policy | `local-first` |
| `--write-policy <policy>` | Hybrid write policy | `local-first` |
| `-j, --json` | Output machine-readable JSON | `false` |
| `-v, --verbose` | Show detailed output | `false` |
| `-q, --quiet` | Suppress all output except errors | `false` |
| `--no-color` | Disable colored output | `false` |

## Configuration file

The CLI reads an optional `config.json` file at `.tekmemo/config.json`. This allows you to set defaults so you don't need to pass flags on every command:

```json
{
  "$schema": "https://docs.memo.tekbreed.com/1.0.0-alpha.0/config.schema.json",
  "runtime": "hybrid", 
  "root": ".",
  "cloud": {
    "baseUrl": "https://memo.tekbreed.com/api/v1",
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

Generate a config file with:

```bash
npx tekmemo config init --runtime hybrid --read-policy local-first --write-policy local-first
```

### Resolution order

For each setting, the CLI checks in this order (first non-empty value wins):

1. CLI flag (e.g. `--cloud-url`)
2. Environment variable (e.g. `TEKMEMO_CLOUD_URL`)
3. Config file value (e.g. `cloud.baseUrl`)
4. Built-in default
