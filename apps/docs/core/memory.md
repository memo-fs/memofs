---
title: "Reading & Writing Memory"
description: "Core memory operations, classified memory writes, notes, conversation logging, and document helpers in @memofs/core."
---

# Reading & Writing Memory

`@memofs/core` provides high-level client methods on `MemoFS` as well as standalone document functions to read, write, and append memory across canonical files.

## Writing Classified Memories (`memofs.writeMemory`)

`memofs.writeMemory()` is the primary entry point for recording new agent insights, decisions, and constraints. It automatically runs **durability classification**, **write-blocklist validation**, and **graph extraction**.

```ts
const result = await memofs.writeMemory({
  title: "Authentication Standard",
  content: "All internal service-to-service calls must use mTLS with Ed25519 certificates.",
  kind: "decision",
  tags: ["security", "auth", "networking"],
  confidence: 0.95,
  writer: "security-team@example.com",
  anchor: {
    file: "src/auth/mtls.ts",
    hash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  },
});

console.log(result.id);          // "mem_abc123"
console.log(result.created);     // true
console.log(result.tier);        // "durable" (or "transient")
console.log(result.tierReason);  // "durable-kind"
```

### Parameters (`WriteMemoryInput`)

| Field | Type | Required | Description |
|---|---|---|---|
| `content` | `string` | **Yes** | The markdown memory text body. |
| `title` | `string` | No | Optional human-readable title for the note header. |
| `kind` | `MemoryKind` | No | Memory kind: `"decision" \| "constraint" \| "goal" \| "preference" \| "reference" \| "summary" \| "note"`. |
| `tags` | `string[]` | No | Array of category tags (e.g. `["auth", "api"]`). |
| `confidence` | `number` | No | Confidence score between `0` and `1`. Confidence `< 0.4` triggers transient classification. |
| `source` | `string` | No | Source identifier (e.g. `"pr-128"`, `"slack-thread"`). |
| `writer` | `string` | No | Human or agent attribution (e.g. `"alice@corp.com"`, `"claude-code"`). |
| `id` | `string` | No | Stable memory ID override (useful for deterministic connector sync). |
| `idempotencyKey` | `string` | No | Idempotency token to prevent duplicate writes on network retries. |
| `tier` | `"durable" \| "transient"` | No | Explicit durability tier override. |
| `anchor` | `AnchorRef` | No | Source code file anchor (`file`, `hash`, optional `symbol`) for drift detection. |
| `sourceRefs` | `SourceRef[]` | No | Granular external source references. |
| `metadata` | `JsonObject` | No | Arbitrary JSON metadata attached to the record. |

### Return Value (`WriteMemoryResult`)

```ts
interface WriteMemoryResult {
  id: string;                      // Generated or provided memory ID
  created: boolean;                // False if deduplicated by idempotencyKey
  tier: "durable" | "transient";   // Final durability tier
  tierReason: DurabilityReason;    // Why the classifier chose this tier
  sourceRefs?: SourceRef[];        // Preserved source references
  warnings?: string[];             // Any non-fatal warnings
}
```

## Core Memory (`memofs.core`)

Core memory (`.memofs/memory/core.md`) stores concise, permanent workspace truths that should be loaded into active agent prompts:

```ts
// Read core memory (returns raw markdown string)
const coreMarkdown = await memofs.core.read();
console.log(coreMarkdown);

// Overwrite core memory with updated rules
await memofs.core.update(`# Project Rules

- Always use TypeScript strict mode.
- Use Bun for local scripts and Node 22 for production runtime.
- Never commit credentials to git.
`);
```

## Notes Memory (`memofs.notes`)

Notes memory (`.memofs/memory/notes.md`) stores long-form timestamped entries:

```ts
// Read entire notes file
const notes = await memofs.notes.read();

// Record a timestamped note
await memofs.notes.record({
  title: "PostgreSQL Migration",
  content: "Migrated user session tables from Redis to Postgres partitioned tables.",
  kind: "decision",
  tags: ["database", "migration"],
  confidence: 1.0,
});
```

## Conversations (`memofs.conversations`)

Conversations (`.memofs/events/conversations.jsonl`) logs interaction history for historical analysis:

```ts
// Append a conversation turn
await memofs.conversations.append({
  timestamp: new Date().toISOString(),
  role: "user",
  content: "How do we handle rate limiting in the API?",
  summary: "User asked about rate limiting architecture",
});

// Read the last 20 entries
const history = await memofs.conversations.read();
console.log(history.slice(-20));
```

## Listing Recent Events (`memofs.listRecentMemories`)

Query recent memory operations from `.memofs/events/memory-events.jsonl`:

```ts
const recent = await memofs.listRecentMemories({ limit: 10 });
for (const item of recent.items) {
  console.log(`[${item.timestamp}] ${item.type}: ${item.summary}`);
}
```

## Standalone Document Helpers

For low-level operations or custom workflows, `@memofs/core` exports pure helper functions that operate directly on any `MemoryStore`:

```ts
import {
  readCoreMemory,
  writeCoreMemory,
  readNotesMemory,
  appendTimestampedNote,
  readConversationHistory,
  appendConversationEntry,
  readMemoryEvents,
  appendMemoryEvent,
} from "@memofs/core";

// Direct document operations
const coreText = await readCoreMemory(store);
await writeCoreMemory(store, "# New Core Rules\n");

await appendTimestampedNote(store, {
  timestamp: new Date().toISOString(),
  kind: "decision",
  content: "Refactored payment gateway handler.",
});
```