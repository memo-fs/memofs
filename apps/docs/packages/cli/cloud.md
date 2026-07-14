# Cloud Commands

Cloud commands require `--cloud-url` and `--api-key` flags or the `MEMOFS_CLOUD_URL` and `MEMOFS_API_KEY` environment variables.

## `memofs cloud health`

Checks MemoFS Cloud health endpoint.

```bash
memofs cloud health
```

## `memofs cloud readiness`

Checks MemoFS Cloud readiness endpoint.

```bash
memofs cloud readiness
```

## `memofs cloud sync status`

Reads the current cloud sync status.

```bash
memofs cloud sync status
```

## `memofs cloud sync pull`

Pulls file replicas from the cloud into the local `.memofs/` directory.

```bash
memofs cloud sync pull
memofs cloud sync pull --since <cursor>
```

**Options:**

| Flag | Description | Default |
|------|-------------|---------|
| `--since <cursor>` | Pull everything changed since this cursor | — |

## `memofs cloud sync push`

Pushes local `.memofs/` file replicas to the cloud.

```bash
memofs cloud sync push
memofs cloud sync push --base-cursor <cursor>
```

**Options:**

| Flag | Description | Default |
|------|-------------|---------|
| `--base-cursor <cursor>` | Cursor the client last synced at | — |