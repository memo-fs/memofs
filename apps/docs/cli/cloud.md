# Cloud commands

The CLI gives you direct access to TekMemo Cloud APIs. You can read context, trigger indexing, and sync memory without writing code.

## Environment

Set these variables before running cloud commands:

```bash
export TEKMEMO_CLOUD_URL="https://memo.tekbreed.com/api/v1"
export TEKMEMO_API_KEY="tk_live_..."
export TEKMEMO_PROJECT_ID="proj_123"
```

*Alternatively, you can save these in `.tekmemo/config.json` using `npx tekmemo config init`.*

## Core commands

### `cloud health`
Check the connection and health of the TekMemo Cloud API.

```bash
npx tekmemo cloud health
```

### `cloud context`
Pack cloud memory into an agent-friendly context block.

```bash
npx tekmemo cloud context --query "current task" --json
```

### `cloud recall`
Search TekMemo Cloud memory using keyword, vector, or hybrid search.

```bash
npx tekmemo cloud recall "billing webhooks" --limit 5 --strategy hybrid
```

### `cloud index`
Request background indexing for the project's recall search.

```bash
npx tekmemo cloud index --mode changed
```

### `cloud remember`
Store durable memory directly in TekMemo Cloud.

```bash
npx tekmemo cloud remember "Use D1 for sync truth." --kind decision
```

### `cloud read`
Read a TekMemo Cloud memory document.

```bash
npx tekmemo cloud read core
npx tekmemo cloud read notes --limit 50
```

### `cloud update-core`
Replace the project's core memory.

```bash
npx tekmemo cloud update-core "This project uses Next.js and D1."
```

### `cloud recent`
List recent memory events from the cloud.

```bash
npx tekmemo cloud recent
```

## Advanced operations

The CLI also supports managing advanced cloud features:

| Command | Purpose |
| --- | --- |
| `cloud sync` | Sync local `.tekmemo/` files with the cloud (`pull`, `push`, `status`, `resolve`). |
| `cloud graph` | Manage graph nodes, edges, paths, and neighbors. |
| `cloud extraction` | Run and monitor background extraction jobs. |
| `cloud exports` | Create and download full memory backups. |
| `cloud snapshots` | Create and download point-in-time snapshots. |
| `cloud providers` | Test and configure embedding providers. |
| `cloud evals` | Run context quality evaluations. |
| `cloud benchmarks` | Run context benchmarks. |

Use `--help` on any command to see the full list of options:
```bash
npx tekmemo cloud graph --help
```
