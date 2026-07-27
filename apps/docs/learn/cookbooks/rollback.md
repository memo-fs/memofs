---
title: "Pre-Sync Snapshots & One-Click Rollback"
date: "2026-07-27"
estimatedMinutes: 5
---

## Overview

Protect your project memory from accidental deletions, bad ingestion runs, or corrupted state. MemoFS automatically captures an immutable **pre-sync snapshot** before every cloud push operation. If unwanted changes are committed to memory, you can restore previous states in a single click from the MemoFS Dashboard (Pro & Teams) or via the CLI.

This guide details snapshot creation, inspecting snapshot history, and executing rollbacks.

![Screenshot Placeholder: MemoFS Cloud Dashboard showing snapshot timeline and one-click rollback button]

---

## Why Pre-Sync Snapshots Matter

- **Zero-Risk Ingestion**: Experiment with automated connectors or new AI agents knowing every push is checkpointed.
- **Instant Disaster Recovery**: Revert broken or hallucinated agent facts back to a verified baseline state.
- **Auditability**: Track who pushed memory updates, when snapshots were captured, and what files changed.

---

## Prerequisites

- **MemoFS CLI**: Installed (`npm install -g @memofs/cli`)
- **MemoFS Account**: Active Pro or Teams tier account
- Reference: [MemoFS Snapshots API Documentation](https://docs.memofs.dev/packages/core/client/snapshots)

---

## Step 1: Automatic Pre-Sync Snapshot Capture

Whenever you execute a push command, the MemoFS engine generates an immutable snapshot payload before writing updates to the cloud store:

```bash
npx @memofs/cli cloud push
```

### Terminal Output
```
[info] Capturing pre-sync snapshot...
[success] Snapshot created: snap_987654321 (14 notes, 2 indexes)
[info] Uploading changes to MemoFS Cloud...
[success] Sync complete!
```

---

## Step 2: Inspecting Snapshots via CLI

View the timeline of snapshots captured for your repository:

```bash
npx @memofs/cli snapshot list
```

### Example List Output
| Snapshot ID | Created At | Source | Note Count |
|-------------|------------|--------|------------|
| `snap_987654321` | 2026-07-27 13:00 | CLI Push | 14 |
| `snap_123456789` | 2026-07-27 11:30 | Connector Ingest | 12 |

Inspect details of a specific snapshot:

```bash
npx @memofs/cli snapshot inspect snap_987654321
```

![Screenshot Placeholder: Terminal window displaying memofs snapshot list output]

---

## Step 3: Rolling Back State

If an erroneous write occurs, roll back your store to any previous snapshot.

### Method A: One-Click Rollback from Dashboard (Pro & Teams)
1. Log in to your **MemoFS Cloud Dashboard**.
2. Navigate to **Project Settings -> Snapshots**.
3. Locate the snapshot prior to the unwanted change.
4. Click **Roll Back to Snapshot**.

### Method B: Roll Back via CLI

```bash
npx @memofs/cli snapshot restore snap_987654321
```

This replaces current local and cloud note stores with the exact snapshot state, instantly syncing across all connected agent sessions.

![Screenshot Placeholder: MemoFS Cloud Dashboard showing successful snapshot restoration alert]

---

## Video Walkthrough

Watch how pre-sync snapshots and rollbacks work in practice:



---

## Related Documentation & Resources

- [Snapshots Sub-API Reference](https://docs.memofs.dev/packages/core/client/snapshots)
- [MemoFS Cloud Dashboard Guide](https://docs.memofs.dev/packages/cli/cloud)
- [CLI Reference Guide](https://docs.memofs.dev/packages/cli/)
