# `tekmemo`

`tekmemo` is the core package that defines the memory model, document types, and canonical file path conventions used throughout the ecosystem.

## Install

```bash
npm install tekmemo
```

## Core concepts

This package provides the logic for working with TekMemo's primary memory primitives:
- **Core Memory:** The stable project briefing.
- **Notes:** Durable, timestamped records of decisions and facts.
- **Events:** An append-only ledger of all memory changes.
- **Chunks:** Indexed fragments for fast semantic search.

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

## Example: Working with Core Memory

```ts
import { InMemoryMemoryStore } from "tekmemo";
import { readCoreMemory, writeCoreMemory } from "tekmemo";

const store = new InMemoryMemoryStore();

// Write some core memory
await writeCoreMemory(store, "# Project Overview\n\nThis is a TekMemo project.");

// Read it back
const core = await readCoreMemory(store);
console.log(core.content);
```

## Example: Chunking Text

```ts
import { chunkText } from "tekmemo";

const text = "A long document that needs to be indexed for recall...";
const chunks = chunkText(text, {
  source: { sourceType: "document", sourceId: "doc_1" },
  memoryType: "core",
  maxChars: 500,
  overlapChars: 50
});

console.log(`Generated ${chunks.length} chunks.`);
```
