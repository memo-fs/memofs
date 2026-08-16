---
title: "How to rollback and checkpoint agent memory with Snapshots"
date: "2026-08-06"
estimatedMinutes: 3
description: "Create pre-sync memory checkpoints and execute 1-click rollbacks using MemoFS snapshots."
---

# How to rollback and checkpoint agent memory with Snapshots

AI coding agents occasionally make mistakes or record bad architectural assumptions. MemoFS provides **Snapshots** — point-in-time versioned checkpoints of the entire `.memofs/` memory filesystem — enabling instant, safe rollbacks.

## Creating a Snapshot Checkpoint

Create a snapshot before launching an autonomous agent on an experimental or risky refactor:

### Using the CLI

```bash
npx @memofs/cli snapshots create --label "pre-auth-refactor"
```

Output:
```
✓ Created snapshot snap_20260806_a1b2c3d ("pre-auth-refactor")
```

### Using the Core SDK

```ts
import { MemoFS } from "@memofs/core";
import { createNodeFsMemoryStore } from "@memofs/core/node-fs";

const memo = new MemoFS({
  store: createNodeFsMemoryStore({ rootDir: "." }),
});

const snapshot = await memo.snapshots.create({
  label: "before-major-migration",
});
console.log("Snapshot ID:", snapshot.id);
```

## Listing Snapshots

View all saved checkpoints and their timestamps:

```bash
npx @memofs/cli snapshots list
```

```
Snapshots:
- snap_20260806_a1b2c3d (pre-auth-refactor) · 2026-08-06 14:22:01
- snap_20260801_f8e9d0c (initial-seed)      · 2026-08-01 09:15:30
```

## Restoring a Snapshot

If the agent produced erroneous notes or corrupted graph relationships, restore the checkpoint:

### Using the CLI

```bash
npx @memofs/cli snapshots restore snap_20260806_a1b2c3d
```

Output:
```
✓ Restored memory state to snap_20260806_a1b2c3d.
✓ Re-indexed chunks and entity graph.
```

### Using the SDK

```ts
await memo.snapshots.restore("snap_20260806_a1b2c3d");
```

## Related Resources

* [Snapshots Sub-API Reference](/core/snapshots)
* [Memory Event Log & Auditing](/core/concepts)
* [AgentFS Sessions & Checkpoints](/core/agentfs)