# Command Line Interface (CLI)

The `@memofs/cli` package provides the primary command-line tool for managing local and hybrid memory workflows.

## Installation

Install the CLI as a development dependency in your project:

::: code-group

```sh [npm]
npm install -D @memofs/cli
```

```sh [pnpm]
pnpm add -D @memofs/cli
```

```sh [yarn]
yarn add -D @memofs/cli
```

```sh [bun]
bun add -d @memofs/cli
```

```sh [deno]
deno add -D npm:@memofs/cli
```

:::

> [!NOTE]
> Requires **Node.js >= 22**.

Or install globally:

::: code-group

```sh [npm]
npm install -g @memofs/cli
```

```sh [pnpm]
pnpm add -g @memofs/cli
```

```sh [yarn]
yarn global add @memofs/cli
```

```sh [bun]
bun add -g @memofs/cli
```

```sh [deno]
deno install --global -A npm:@memofs/cli
```

:::

You can also run it on demand without installation:

```bash
npx memofs --help
```

## Global Flags

All commands accept these global flags before the subcommand:

| Flag | Description | Default |
|------|-------------|---------|
| `-r, --root <path>` | Project root containing `.memofs/` | Current directory |
| `--runtime <mode>` | Runtime mode: `local` or `hybrid` | `local` |
| `--cloud-url <url>` | MemoFS Cloud API URL | `MEMOFS_CLOUD_URL` env |
| `--api-key <key>` | MemoFS Cloud API key | `MEMOFS_API_KEY` env |
| `--workspace-id <id>` | Default cloud workspace ID | — |
| `--project-id <id>` | Default cloud project ID | — |
| `--timeout-ms <n>` | Cloud request timeout in milliseconds | — |
| `-j, --json` | Output machine-readable JSON | `false` |
| `-v, --verbose` | Show detailed output | `false` |
| `-q, --quiet` | Suppress all output except errors | `false` |
| `--no-color` | Disable colored output | `false` |

## Environment Variables

| Variable | Description |
|----------|-------------|
| `MEMOFS_RUNTIME` | Runtime mode: `local` or `hybrid` |
| `MEMOFS_CLOUD_URL` | MemoFS Cloud API URL |
| `MEMOFS_API_KEY` | MemoFS Cloud API key |
| `MEMOFS_WORKSPACE_ID` | Cloud workspace ID |
| `MEMOFS_PROJECT_ID` | Cloud project ID |
| `MEMOFS_ROOT` | Project root containing `.memofs/` |
| `MEMOFS_RECALL_ENGINE` | Recall engine: `lexical`, `vector`, `hybrid`, or `auto` |
| `MEMOFS_LOCAL_EMBEDDINGS` | Enable local embeddings (`1` or `true`) |
| `MEMOFS_EMBEDDING_MODEL` | Embedding model name |

## Configuration File

Create `.memofs/config.json` to persist defaults without storing secrets:

```bash
memofs config init --runtime hybrid --cloud-url https://memofs.dev/api/v1
```

```json
{
  "$schema": "./node_modules/@memofs/cli/schema/config.json",
  "runtime": "hybrid",
  "root": ".",
  "cloud": {
    "baseUrl": "https://memofs.dev/api/v1",
    "workspaceId": "ws_abc123"
  },
  "recall": {
    "engine": "hybrid",
    "localEmbeddings": true
  }
}
```

Inspect the resolved configuration:

```bash
memofs config get
```