---
title: "CLI Cloud Commands"
description: "CLI commands for authenticating, verifying health, and syncing file replicas with MemoFS Cloud."
---

# Cloud Commands

The `cloud` command family provides tools for interacting with MemoFS Cloud. MemoFS Cloud functions as an immutable **file replica** service: it stores byte-for-byte replicas of the canonical `.memofs/` files and synchronizes them via file paths and SHA-256 hashes.

## Prerequisites & Authentication

All cloud commands require cloud API credentials. Supply them via global CLI flags or environment variables:

```bash
# Via global CLI flags
memofs --cloud-url https://memofs.dev/api/v1 --api-key tm_live_... cloud health

# Via environment variables (preferred)
export MEMOFS_CLOUD_URL="https://memofs.dev/api/v1"
export MEMOFS_API_KEY="tm_live_..."
memofs cloud health
```

---

## `memofs cloud health`

Performs an operational health check on the MemoFS Cloud service.

```bash
memofs cloud health
memofs cloud health --json
```

### Response Fields

- `ok`: Boolean indicating service health status.
- `name`: Cloud service name.
- `version`: Cloud API version.
- `capabilities`: Array of active feature capabilities (e.g. `["sync", "webhooks"]`).
- `warnings`: Array of any advisory warnings returned by the service.

---

## `memofs cloud readiness`

Performs a readiness probe verifying that the cloud database and replication endpoints are ready to accept read and sync traffic.

```bash
memofs cloud readiness
```

---

## `memofs cloud sync status`

Fetches metadata for the cloud workspace replica, including cursor position, tracked file count, total storage consumption, and the timestamp of the last synchronization.

```bash
memofs cloud sync status
memofs cloud sync status --json
```

### Response Fields

- `cursor`: Opaque sync cursor string representing the current cloud log position.
- `manifest`: Map of workspace file paths to their remote SHA-256 hashes.
- `storageBytes`: Total storage footprint in bytes.
- `lastSyncAt`: ISO 8601 timestamp of the most recent sync commit.

---

## `memofs cloud sync pull`

Pulls updated file replicas from MemoFS Cloud into the local `.memofs/` workspace.

```bash
memofs cloud sync pull
memofs cloud sync pull --since "cur_12345"
```

### Options

| Flag | Description | Default |
|------|-------------|---------|
| `--since <cursor>` | Pull all changes recorded since the specified sync cursor | — |

### Pull Workflow & Safety

1. **Local Manifest Scan**: Computes SHA-256 hashes of all local canonical memory files.
2. **Server Delta Computation**: Calls `sync.pull()` with the local manifest to identify files that are missing or out of date locally.
3. **Safety Snapshot**: If any files will be created, updated, or removed, automatically creates a local safety snapshot tagged `pre-sync-pull` in `.memofs/snapshots/` before writing changes.
4. **Verified Download**: Downloads file replicas from presigned GET URLs, asserts that the downloaded content's SHA-256 hash matches the expected hash, and validates that destination paths are canonical memory files.
5. **Pruning**: Deletes local files that were removed server-side.

---

## `memofs cloud sync push`

Synchronizes local `.memofs/` files to MemoFS Cloud using the two-phase upload protocol.

```bash
memofs cloud sync push
memofs cloud sync push --base-cursor "cur_12345"
```

### Options

| Flag | Description | Default |
|------|-------------|---------|
| `--base-cursor <cursor>` | Cursor at which the client last synced (used for conflict detection) | — |

### Two-Phase Push Workflow

1. **Manifest Computation**: Computes SHA-256 hashes for all local canonical files.
2. **Phase 1 (`sync.push`)**: Sends the local file manifest to the cloud. The cloud compares manifests and returns presigned PUT URLs only for files whose content has changed.
3. **Phase 2 (Upload)**: Streams changed file bytes directly to the presigned PUT URLs, verifying SHA-256 hashes before upload.
4. **Commit (`sync.complete`)**: Notifies the cloud API that all uploads finished, committing the new workspace manifest and advancing the sync cursor.