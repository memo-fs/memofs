# Filesystem Store Module

The filesystem store module provides the primary filesystem-backed memory store for local development and CLI usage.

## Import

All filesystem store APIs are imported directly from `@tekbreed/tekmemo`:

## Features

- **Atomic Writes:** Prevents data corruption during sudden crashes.
- **Path Resolution:** Handles canonical TekMemo pathing relative to a root directory.
- **Symlink Protection:** Ensures memory operations stay within the authorized root.
- **Node.js Native:** Built on the standard `node:fs/promises` module.

## API Reference

### `NodeFsMemoryStore`

The primary class for filesystem storage.

| Method | Purpose |
| --- | --- |
| `createNodeFsMemoryStore(options)` | Factory function to initialize a new store. |
| `read(path)` | Reads a file from the `.tekmemo/` directory. |
| `write(path, data)` | Writes a file atomically. |
| `delete(path)` | Removes a file from the store. |
| `list(kind)` | Lists files of a specific type (e.g. snapshots). |

## Example: Setup

```ts
import { createNodeFsMemoryStore } from "@tekbreed/tekmemo";
import { readCoreMemory } from "@tekbreed/tekmemo";

// Initialize the store in the current directory
const store = createNodeFsMemoryStore({
  rootDir: process.cwd()
});

// Use it with core tekmemo helpers
const core = await readCoreMemory(store);
console.log(core.content);
```

## When to use

Use this package when you want to store TekMemo memory as plain text and JSON files on your local machine or a server with a persistent disk. This is the standard choice for **Local** and **Hybrid** runtime modes.
