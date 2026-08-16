---
title: "Snapshots & Rollback"
description: "Memory checkpoints, atomic state restoration, and disaster recovery in @memofs/core."
---

# Snapshots & Rollback

Memory snapshots provide immutable checkpoints of the entire `.memofs/` workspace. They enable safe rollbacks when an autonomous agent hallucinates, creates incorrect memories, or makes unintended edits.

## Snapshot Architecture

Snapshots are stored under `.memofs/snapshots/`:

- **Index (`snapshots.jsonl`):** Chronological log of all snapshot metadata records (`SnapshotRecord`).
- **Data Files (`<snapshot-id>.json`):** Full-fidelity JSON archive containing the exact content of all canonical memory files at checkpoint time.

```
.memofs/snapshots/
├── snapshots.jsonl            # Metadata index
├── snap_1718000000000.json    # Full snapshot payload (core, notes, graph, etc.)
└── snap_1718003600000.json
```

## Snapshot Record Schema (`SnapshotRecord`)

```ts
interface SnapshotRecord {
  id: string;                      // Unique snapshot ID (e.g. "snap_abc123")
  path: string;                    // Canonical file path (".memofs/snapshots/snap_abc123.json")
  type: SnapshotType;              // "manual" | "automatic" | "pre-sync" | "pre-restore"
  status: "available" | "expired" | "deleted";
  createdAt: string;               // ISO 8601 timestamp
  expiresAt?: string;              // Optional expiry timestamp
  checksum?: string;               // SHA-256 integrity digest
  metadata?: Record<string, unknown>; // Label or task metadata
}
```

### Snapshot Types

- **`manual`**: Created explicitly by user or agent code before a task.
- **`automatic`**: Created on scheduled intervals or task boundaries.
- **`pre-sync`**: Created automatically before pulling changes from MemoFS Cloud.
- **`pre-restore`**: Created automatically before applying a rollback so the pre-rollback state is never lost.

## Client API (`memofs.snapshots`)

### 1. Creating a Checkpoint (`memofs.snapshots.create`)

Create a named snapshot before running a complex or speculative agent workflow:

```ts
const snapshot = await memofs.snapshots.create({
  label: "before-major-refactor",
  type: "manual",
  metadata: {
    taskId: "task-492",
    author: "autonomous-coder",
  },
});

console.log(`Checkpoint created: ${snapshot.id} (${snapshot.path})`);
```

### 2. Listing Snapshots (`memofs.snapshots.list`)

Retrieve all available snapshots ordered chronologically:

```ts
const snapshots = await memofs.snapshots.list();

for (const snap of snapshots) {
  console.log(`[${snap.createdAt}] ${snap.id} (${snap.type}) - status: ${snap.status}`);
}
```

### 3. Restoring a Checkpoint (`memofs.snapshots.restore`)

Roll back the entire `.memofs/` memory state to a previous snapshot:

```ts
// Restore to a known clean state
await memofs.snapshots.restore("snap_1718000000000");

console.log("Memory successfully restored!");
```

## Rollback Safety & Atomicity

When `memofs.snapshots.restore(id)` is invoked:
1. **Validation:** Checks that the snapshot file exists and is well-formed JSON.
2. **Pre-Restore Backup:** Automatically takes a `pre-restore` snapshot of the current state before applying changes.
3. **Atomic Overwrite:** Writes back all canonical files (`core.md`, `notes.md`, `graph/nodes.jsonl`, `indexes/chunks.jsonl`, etc.) from the checkpoint payload.
4. **Audit Logging:** Appends a `snapshot.created` event documenting the restoration.

## Knowledge Graph Snapshots

For graph-specific backups and migrations, `GraphStore` implementations support isolated graph snapshots:

```ts
// Export graph snapshot
const graphSnapshot = await graphStore.exportSnapshot();
console.log(`Exported ${graphSnapshot.nodes.length} nodes and ${graphSnapshot.edges.length} edges`);

// Import into another store
await anotherGraphStore.importSnapshot(graphSnapshot, { clear: true });
```