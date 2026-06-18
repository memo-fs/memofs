# Filesystem Store Module

The filesystem store module provides the primary filesystem-backed memory store for local development and CLI usage.

## Import

```ts
import { createNodeFsMemoryStore } from "@tekbreed/tekmemo";
```

## Features

- **Atomic Writes:** Prevents data corruption during sudden crashes.
- **Path Resolution:** Handles canonical TekMemo pathing relative to a root directory.
- **Symlink Protection:** Ensures memory operations stay within the authorized root.
- **Node.js Native:** Built on the standard `node:fs/promises` module.

## Quick start with Tekmemo

The [`Tekmemo`](./tekmemo) class creates a filesystem store automatically in local mode. You rarely need to use `createNodeFsMemoryStore` directly:

```ts
import { Tekmemo } from "@tekbreed/tekmemo";

const memo = new Tekmemo({ rootDir: "./.tekmemo", projectId: "my-app" });

// Under the hood, Tekmemo uses createNodeFsMemoryStore for local mode.
// Access the store directly when needed:
const store = memo.store;
const core = await memo.core.read();
```

## API Reference

### `NodeFsMemoryStore`

| Method | Purpose |
| --- | --- |
| `createNodeFsMemoryStore(options)` | Factory function to initialize a new store. |
| `read(path)` | Reads a file from the `.tekmemo/` directory. |
| `write(path, data)` | Writes a file atomically. |
| `delete(path)` | Removes a file from the store. |
| `list(kind)` | Lists files of a specific type (e.g. snapshots). |

## Direct usage (advanced)

If you need to create a store outside of `Tekmemo` (e.g. for passing to `createLocalAiSdkRuntime` or custom tooling):

```ts
import { createNodeFsMemoryStore } from "@tekbreed/tekmemo";

const store = createNodeFsMemoryStore({ rootDir: process.cwd() });
```

## When to use

- **Default:** Let [`Tekmemo`](./tekmemo) manage the store by specifying `rootDir` in the constructor.
- **Advanced:** Use `createNodeFsMemoryStore` directly when you need a standalone store for AI SDK runtimes, custom tooling, or tests.
