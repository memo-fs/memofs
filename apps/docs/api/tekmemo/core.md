# Core Primitives

The core primitives module of `@tekbreed/tekmemo` defines the memory model, document types, validation, and canonical file path conventions. These are the building blocks used by the [`Tekmemo`](./tekmemo) class and its strategies.

## Import

```ts
import {
  bootstrapMemoryStore,
  readCoreMemory,
  writeCoreMemory,
  readNotesMemory,
  appendTimestampedNote,
  readManifest,
  searchMemoryText,
  chunkText,
  InMemoryMemoryStore,
} from "@tekbreed/tekmemo";
```

## Core concepts

- **Core Memory:** The stable project briefing.
- **Notes:** Durable, timestamped records of decisions and facts.
- **Events:** An append-only ledger of all memory changes.
- **Chunks:** Indexed fragments for fast semantic search.

## Quick start with Tekmemo

The [`Tekmemo`](./tekmemo) class wraps most core primitives behind its namespaces. Use `Tekmemo` as your primary API and reach for these helpers only when you need low-level control:

```ts
import { Tekmemo } from "@tekbreed/tekmemo";

const memo = new Tekmemo({ rootDir: "./.tekmemo", projectId: "my-app" });

// Preferred — use Tekmemo namespaces
const core = await memo.core.read();
await memo.notes.record({ content: "Ship feature X", kind: "decision" });
```

## API Reference

### Memory Store Helpers

| Helper | Purpose |
| --- | --- |
| `bootstrapMemoryStore(store, options)` | Initializes a memory store with default files and directories. |
| `chunkText(text, options)` | Splits text into semantic chunks for indexing. |

### Document Helpers

| Helper | Purpose |
| --- | --- |
| `readCoreMemory(store)` | Reads and parses the `core.md` document. |
| `writeCoreMemory(store, content)` | Validates and writes `core.md`. |
| `readNotesMemory(store)` | Reads and parses the `notes.md` document. |
| `appendTimestampedNote(store, note)` | Appends a `TimestampedNote` (e.g., `{ kind, content, timestamp }`) to notes. |
| `readManifest(store)` | Reads the `manifest.json` file. |
| `searchMemoryText(options)` | Performs a simple keyword-based search on a text string. |

### Error Classes

| Class | Code | Purpose |
| --- | --- | --- |
| `TekMemoError` | base | Base error for all core runtime errors. |
| `MemoryPathError` | `TEKMEMO_INVALID_PATH` | Invalid memory path (bad format, traversal attempt). |
| `MemoryNotFoundError` | `TEKMEMO_NOT_FOUND` | Requested memory file does not exist. |
| `MemoryValidationError` | `TEKMEMO_VALIDATION_ERROR` | Memory data fails validation. |
| `MemoryParseError` | `TEKMEMO_PARSE_ERROR` | Memory data cannot be parsed. |
| `MemoryCommandError` | `TEKMEMO_COMMAND_ERROR` | Memory command is invalid or cannot execute. |
| `MemoryStoreError` | `TEKMEMO_STORE_ERROR` | Memory store operation fails. |

```ts
import { isTekMemoError, MemoryNotFoundError } from "@tekbreed/tekmemo";

try {
  await store.read(path);
} catch (error) {
  if (isTekMemoError(error)) {
    console.error(`[${error.code}] ${error.message}`);
  }
}
```

## Direct usage (advanced)

For operations outside of `Tekmemo`:

```ts
import { InMemoryMemoryStore, readCoreMemory, writeCoreMemory } from "@tekbreed/tekmemo";

const store = new InMemoryMemoryStore();
await writeCoreMemory(store, "# Project Overview\n\nThis is a TekMemo project.");
const core = await readCoreMemory(store);
console.log(core.content);
```
