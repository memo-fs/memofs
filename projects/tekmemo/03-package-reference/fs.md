# `@tekbreed/tekmemo/fs` Package

## Purpose

`@tekbreed/tekmemo/fs` is the Node.js filesystem adapter for the TekMemo local memory protocol.

It makes this product promise real:

> Run TekMemo from inspectable `.tekmemo/` files without cloud cost.

---

# Installation

```bash
pnpm add @tekbreed/tekmemo/fs tekmemo
```

---

# Basic usage

```ts
import { bootstrapMemoryStore, updateCoreMemory, readCoreMemory } from "@tekbreed/tekmemo";
import { createNodeFsMemoryStore } from "@tekbreed/tekmemo/fs";

const store = await createNodeFsMemoryStore({
  rootDir: process.cwd()
});

await bootstrapMemoryStore(store);
await updateCoreMemory(store, "# Core Memory\n\n- Local TekMemo is working.");

const core = await readCoreMemory(store);
```

This creates:

```txt
.tekmemo/
  manifest.json
  memory/core.md
  memory/notes.md
  events/memory-events.jsonl
  events/conversations.jsonl
  indexes/chunks.jsonl
  graph/nodes.jsonl
  graph/edges.jsonl
  snapshots/snapshots.jsonl
```

---

# Production behavior

## Safe path resolution

The adapter must only allow canonical TekMemo paths.

It must reject:

- `../` traversal
- absolute paths outside the root
- null-byte paths
- unsupported memory paths

## Atomic writes

Writes should use temp-file-then-rename semantics where possible.

This protects memory files from partial writes when a process crashes during write.

## Append safety

JSONL append operations should preserve order for same-instance concurrent appends.

## Symlink policy

By default, the adapter should reject dangerous symlink situations under `.tekmemo/`.

## Missing file behavior

The production default should be strict: missing files throw.

A relaxed mode may return empty strings for local prototypes.

---

# Edge cases to test

- empty root directory
- non-existing root directory
- root exists as file
- unsupported path
- path traversal
- null-byte path
- missing file strict mode
- missing file empty mode
- atomic write replacement
- temp file cleanup
- symlink rejection
- concurrent append ordering
- full integration with `@tekbreed/tekmemo` bootstrap

---

# What this package must not do

- define new protocol paths
- call embedding providers
- call vector databases
- sync to cloud
- manage billing
- store provider secrets

It is only the local filesystem implementation of the protocol owned by `@tekbreed/tekmemo`.
