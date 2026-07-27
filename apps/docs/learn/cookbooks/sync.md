---
title: "CLI Sync in Action: Tracking & Synchronizing Memory Across Machines"
date: "2026-07-27"
estimatedMinutes: 6
---

## Overview

Initialize, track memory changes, and synchronize your repository's `.memofs/` store seamlessly across multiple developer machines and team environments. MemoFS provides a Git-like workflow for AI memory: local edits are recorded deterministically and synchronized with cloud replicas without phantom conflicts.

This step-by-step cookbook demonstrates initializing local stores, inspecting change sets, pushing memory updates, and pulling team memories using the MemoFS CLI.

![Screenshot Placeholder: Terminal demonstration of memofs cloud push and pull synchronization]

---

## Key Capabilities

- **Git-Native Delta Tracking**: Tracks note changes, index updates, and connector manifests inside `.memofs/`.
- **Conflict-Free Replication**: Deduplicates notes using content-derived hashes (`conn_<hash>`) to guarantee clean merges across branches.
- **Cross-Machine Alignment**: Ensures AI agents (Codex, Claude Code, Cursor) share identical memory state regardless of workstation.

---

## Prerequisites

- **Node.js**: `v22.0.0` or higher
- **MemoFS CLI**: Installed (`npm install -g @memofs/cli`)
- **MemoFS Account**: Authenticated via `memofs cloud login`
- Reference: [MemoFS CLI Cloud Commands](https://docs.memofs.dev/packages/cli/cloud)

---

## Step 1: Initialize Workspace & Authenticate

From your project root, initialize MemoFS and log in to your MemoFS Cloud account:

```bash
# Initialize local store
npx @memofs/cli init

# Authenticate with MemoFS Cloud
npx @memofs/cli cloud login
```

![Screenshot Placeholder: Terminal showing memofs cloud login prompt and successful authentication]

---

## Step 2: Track Memory Changes

As coding agents write memory notes or as connectors ingest data, inspect local store changes:

```bash
# View current memory store status
npx @memofs/cli status

# Inspect local memory notes and diffs
npx @memofs/cli diff
```

### Output Example
```
Store Root: ./.memofs
Project ID: proj_abc123
Pending Notes: 3 modified, 1 added

+ [note_8f9a2b] Architectural decision: Migrate auth tokens to RS256
+ [conn_4a12cd] GitHub Issue #42: Add streaming endpoint
```

---

## Step 3: Push Memory to Cloud Replica

Push your local `.memofs/` store to your cloud project repository:

```bash
npx @memofs/cli cloud push
```

### Pre-Push Snapshot Guarantee
Before any remote synchronization occurs, MemoFS automatically captures a **pre-sync snapshot**. If a conflict or unexpected override occurs, you can roll back instantly.

![Screenshot Placeholder: memofs cloud push output showing snapshot creation and file uploads]

---

## Step 4: Pull & Sync Remote Changes

On another machine or after team members update memory, pull remote changes:

```bash
npx @memofs/cli cloud pull
```

This merges incoming note entries into `.memofs/notes.md` and rebuilds local BM25 and vector indices automatically.

---

## Video Walkthrough

Watch the complete demonstration of CLI sync in action:



---

## Summary & Best Practices

1. **Push Regularly**: Run `memofs cloud push` after major architectural decisions or connector runs.
2. **Pull Before Starting Work**: Run `memofs cloud pull` to give your local coding agents the freshest team memory.
3. **Commit `.memofs/` to Git**: Maintain version control alignment alongside your cloud sync replica.

---

## Related Documentation & Resources

- [MemoFS Cloud CLI Reference](https://docs.memofs.dev/packages/cli/cloud)
- [Sync Sub-API Documentation](https://docs.memofs.dev/packages/core/client/sync)
- [Snapshots Sub-API Guide](https://docs.memofs.dev/packages/core/client/snapshots)
