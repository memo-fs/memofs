# Cloud commands

The `cloud` namespace talks to TekMemo Cloud — but the cloud is a **file replica, not an engine**. It stores byte-for-byte replicas of your canonical `.tekmemo/` files and syncs them by path + sha256. There is no cloud-side recall, graph, extraction, evals, or provider management; everything engine-backed runs locally against your files. Cloud only mirrors them.

Because of that, the `cloud` CLI surface is small: **five commands** — health, readiness, and the three sync commands.

## Environment

Cloud sync needs credentials. Set these before running cloud commands:

```bash
export TEKMEMO_CLOUD_URL="https://memo.tekbreed.com/api/v1"
export TEKMEMO_API_KEY="tk_live_..."
```

Alternatively, save them in `.tekmemo/config.json`:

```bash
npx tekmemo config init --cloud-url "https://memo.tekbreed.com/api/v1"
```

You can also pass credentials per-invocation with global flags (`--cloud-url`, `--api-key`, `--workspace-id`, `--project-id`). If no cloud client can be constructed, every `cloud` subcommand exits with a clear error.

## `cloud health`

Check the connection and health of the TekMemo Cloud API. Strict — requires a reachable API and a valid key.

```bash
npx tekmemo cloud health
```

Reports `ok`, the service `name`/`version`, advertised `capabilities`, and any `warnings`. Exits non-zero when the cloud is not healthy.

**Options:** Inherits the global cloud options only.

## `cloud readiness`

Like `health`, but more lenient — it succeeds even when an API key or project ID is missing. Use it to answer "is this environment configured enough to attempt cloud operations?" rather than "is the cloud up right now?"

```bash
npx tekmemo cloud readiness
```

**Options:** Inherits the global cloud options only.

## Cloud sync

The sync surface maps onto the frozen four-method file-replica contract: `sync.{push, complete, pull, status}`. The `push` CLI command runs phases 1 (request presigned upload URLs) and 3 (confirm uploads and commit the manifest) directly; phase 2 — the actual byte upload to R2 — runs in the runtime file-sync layer, which has access to the local file store.

### `cloud sync status`

Read the current sync status: the server-side file manifest, the current cursor, storage usage, and the last sync timestamp.

```bash
npx tekmemo cloud sync status
```

**Options:** Inherits the global cloud options only.

### `cloud sync pull`

Pull file replicas from the cloud. Requests presigned download URLs for every canonical file the local workspace is missing or behind on, plus paths removed server-side. The runtime then downloads, verifies (sha256), writes, and reindexes.

```bash
npx tekmemo cloud sync pull
npx tekmemo cloud sync pull --since <cursor>
```

**Options:**

| Option | Description |
| --- | --- |
| `--since <cursor>` | Pull only everything changed since this cursor. Omit to pull the full delta from the server's current state. |

### `cloud sync push`

Push local `.tekmemo/` file replicas to the cloud using the two-phase push contract: the CLI computes the local manifest (canonical path → sha256), requests presigned upload URLs for changed/missing files, the runtime uploads the bytes to R2, and `complete` commits the manifest update.

```bash
npx tekmemo cloud sync push
npx tekmemo cloud sync push --base-cursor <cursor>
```

When the cloud is already in sync with the local manifest, the command reports "Nothing to push" and exits 0.

**Options:**

| Option | Description |
| --- | --- |
| `--base-cursor <cursor>` | The cursor the client last synced at. Sent as `baseCursor` to the `push` call to support conflict detection. |

## What's intentionally not here

Earlier alpha releases exposed a much larger `cloud` surface — `cloud recall`, `cloud index`, `cloud remember`, `cloud read`, `cloud update-core`, `cloud recent`, `cloud validate`, `cloud context-compose`, `cloud evals`, `cloud benchmarks`, `cloud graph *`, `cloud extraction *`, `cloud exports *`, `cloud snapshots *`, and `cloud providers *`. **That cloud-engine surface was removed** in the v1.0.0-alpha.0 refactor: the cloud no longer runs an engine, so these commands have nothing to call.

The capabilities aren't gone — they run locally now:

- **Recall, context, remember, validate, read, recent, snapshots, graph** → local engine against `.tekmemo/`. Use the [local commands](./local-commands.md) or the [MCP memory tools](../mcp/tools.md).
- **Syncing that local state to other machines** → the `cloud sync` commands on this page.

See `docs/architecture/cloud-sync-and-refactor.md` §7 and §9 for the rationale and the frozen sync contract.
