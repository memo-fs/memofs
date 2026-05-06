# @tekmemo/fs

[![npm](https://img.shields.io/npm/v/%40tekmemo%2Ffs?label=npm)](https://www.npmjs.com/package/@tekmemo/fs)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![Types](https://img.shields.io/badge/types-included-blue)](./dist/index.d.mts)
[![CI](https://github.com/tekbreed/tekmemo/actions/workflows/ci.yml/badge.svg)](https://github.com/tekbreed/tekmemo/actions/workflows/ci.yml)
[![Status](https://img.shields.io/badge/status-active-brightgreen)](../../README.md)

Node.js filesystem adapter for TekMemo's canonical `.tekmemo/` local memory protocol.

This package implements the core `MemoryStore` interface from `tekmemo` using the local filesystem.

## Canonical layout

When used with `bootstrapMemoryStore`, this adapter writes:

```txt
.tekmemo/
  manifest.json
  memory/
    core.md
    notes.md
  events/
    memory-events.jsonl
    conversations.jsonl
  indexes/
    chunks.jsonl
  graph/
    nodes.jsonl
    edges.jsonl
  snapshots/
    snapshots.jsonl
```

## Quickstart

```ts
import { bootstrapMemoryStore, writeCoreMemory } from "tekmemo";
import { createNodeFsMemoryStore } from "@tekmemo/fs";

const store = createNodeFsMemoryStore({
  rootDir: process.cwd()
});

await bootstrapMemoryStore(store);
await writeCoreMemory(store, "# Core Memory\n\n- Local-first memory is enabled.\n");
```

## Options

| Option | Default | Description |
|---|---:|---|
| `rootDir` | required | Project directory where `.tekmemo/` will live |
| `createRoot` | `true` | Create the root directory if missing |
| `missingFileBehavior` | `"throw"` | Throw or return empty string when reading missing files |
| `disallowSymlinks` | `true` | Reject symlinked paths under `.tekmemo/` |
| `directoryMode` | `0o700` | Directory mode for created directories |
| `fileMode` | `0o600` | File mode for created files |

## Safety behavior

This adapter provides:

- safe path resolution under `rootDir`
- canonical `.tekmemo/` path validation through `tekmemo`
- parent directory creation
- atomic writes
- same-instance append serialization
- symlink rejection by default
- missing-file behavior control

## Missing files

Strict mode:

```ts
const store = createNodeFsMemoryStore({ rootDir });
await store.read(".tekmemo/memory/core.md"); // throws if missing
```

Relaxed mode:

```ts
const store = createNodeFsMemoryStore({
  rootDir,
  missingFileBehavior: "empty"
});

await store.read(".tekmemo/memory/core.md"); // "" if missing
```
