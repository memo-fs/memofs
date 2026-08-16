---
title: "Utilities & Helper Functions"
description: "Validation, maintenance, cryptographic helpers, path guards, chunking, and testing utilities in @memofs/core."
---

# Utilities & Helper Functions

`@memofs/core` provides runtime maintenance methods on the `MemoFS` client alongside pure utility functions for cryptography, path validation, pagination, text chunking, and testing.

## Runtime Maintenance Methods (`MemoFS`)

### 1. Integrity Validation (`memofs.validate`)

Validates canonical file structure, JSONL syntax, and graph referential integrity:

```ts
const report = await memofs.validate({ strict: true });

if (!report.ok) {
  console.error("Validation errors found:", report.errors);
  console.warn("Validation warnings:", report.warnings);
} else {
  console.log("Memory filesystem integrity verified!");
}
```

### 2. Backfilling Code Anchors (`memofs.migrateAnchors`)

Walks existing `notes.md` entries and attaches `AnchorRef` metadata by detecting source code file paths referenced in note content:

```ts
const migration = await memofs.migrateAnchors();

console.log(`Scanned ${migration.totalNotes} notes.`);
console.log(`Attached ${migration.anchorsAttached} new code anchors.`);
```

### 3. Archiving Deprecated Memories (`memofs.archiveDeprecated`)

Physically moves all memories marked with `status === "deprecated"` from `notes.md` into cold storage (`.memofs/archive/<id>.json`):

```ts
const archiveResult = await memofs.archiveDeprecated();

console.log(`Archived ${archiveResult.archivedCount} deprecated memories.`);
```

### 4. Restoring an Archived Memory (`memofs.restoreMemory`)

Reverses a cold-archive operation, restoring the note into `notes.md` and reactivating its graph nodes:

```ts
const restoreResult = await memofs.restoreMemory("mem_abc123");

console.log(`Memory ${restoreResult.id} restored to active status.`);
```

### 5. Runtime Health & Capabilities (`memofs.health`)

Returns runtime status, version, mode, and active adapter capabilities:

```ts
const health = await memofs.health();

console.log(health.name, health.version);
console.log("Capabilities:", health.capabilities);
```

### 6. Executing Memory Commands (`memofs.runCommand`)

Executes structured memory commands (`view`, `create`, `update`, `search`) against the store:

```ts
// View core memory
const viewOutput = await memofs.runCommand({
  command: "view",
  path: ".memofs/memory/core.md",
});

// Search within notes
const searchOutput = await memofs.runCommand({
  command: "search",
  path: ".memofs/memory/notes.md",
  query: "authentication",
  limit: 5,
});
```

## Cryptographic & Hashing Helpers

Cross-runtime cryptographic hashing functions powered by Web Crypto (`crypto.subtle`):

```ts
import { hashBytesHex, sha256BytesHex, sha256Hex } from "@memofs/core";

// Hash a string to lowercase 64-char hex SHA-256
const stringDigest = await sha256Hex("Hello World");
console.log(stringDigest); // "a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146e"

// Hash raw bytes
const bytes = new TextEncoder().encode("Hello World");
const byteDigest = await sha256BytesHex(bytes);
```

## Canonical Path Utilities

Validates and guards against path traversal vulnerabilities:

```ts
import {
  assertMemoryPath,
  createArchivePath,
  createSnapshotPath,
  isMemoryPath,
  memoryTypeFromPath,
} from "@memofs/core";

// Check if a path is canonical
if (isMemoryPath(".memofs/memory/core.md")) {
  console.log("Valid canonical path");
}

// Asserts path is inside .memofs/ and safe (throws MemoryPathError on traversal)
assertMemoryPath(".memofs/events/memory-events.jsonl");

// Generate safe dynamic paths
const snapPath = createSnapshotPath("snap_123"); // ".memofs/snapshots/snap_123.json"
const arcPath = createArchivePath("mem_456");     // ".memofs/archive/mem_456.json"

// Resolve memory path kind
const kind = memoryTypeFromPath(".memofs/memory/core.md"); // "core"
```

## Pagination & Cursor Utilities

```ts
import { decodeCursor, encodeCursor, paginateArray } from "@memofs/core";

const items = ["a", "b", "c", "d", "e"];

// Paginate an array with opaque base64url cursors
const page1 = paginateArray(items, 2);
console.log(page1.items); // ["a", "b"]
console.log(page1.nextCursor);

const page2 = paginateArray(items, 2, page1.nextCursor);
console.log(page2.items); // ["c", "d"]
```

## Security & Durability Classifiers

```ts
import {
  assertWriteAllowed,
  classifyDurability,
  containsBlockedContent,
  detectBlockedContent,
} from "@memofs/core";

// Classify durability
const decision = classifyDurability({
  content: "We selected Postgres for primary storage.",
  kind: "decision",
  confidence: 0.9,
});
console.log(decision.tier);   // "durable"
console.log(decision.reason); // "durable-kind"

// Scan for secrets
const violations = detectBlockedContent("My key is sk-1234567890abcdef1234567890abcdef");
if (violations.length) {
  console.warn("Secret detected:", violations[0].preview); // "sk-…f"
}

// Assert write allowed (throws MemoryWriteBlockedError if secret found)
assertWriteAllowed(["Safe documentation content"]);
```

## Text Chunking (`chunkText`)

Splits large documents into overlapping text chunks with character offsets:

```ts
import { chunkText } from "@memofs/core";

const chunks = chunkText(longMarkdownDocument, {
  source: {
    sourceType: "document",
    sourceId: "arch_doc_1",
    sourcePath: ".memofs/memory/notes.md",
  },
  memoryType: "notes",
  chunkSize: 500,
  overlap: 50,
});

for (const chunk of chunks) {
  console.log(`Chunk ${chunk.index} [${chunk.startOffset}..${chunk.endOffset}]: ${chunk.hash}`);
}
```

## Isolated Testing Helper (`@memofs/core/node-fs`)

Create temporary directories for unit and integration testing with automated cleanup:

```ts
import { createTempMemoFsDir } from "@memofs/core/node-fs";

const { rootDir, cleanup } = await createTempMemoFsDir();

try {
  const memofs = createNodeMemoFs({ rootDir });
  await memofs.bootstrap();
  // ... run tests against isolated store ...
} finally {
  await cleanup(); // Automatically removes temporary directory
}
```
