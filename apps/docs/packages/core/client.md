# Client API Reference

The `MemoFS` class is the central entry point for all memory operations in your application.

```ts
import { MemoFS } from "@memofs/core";
```

---

## Constructor

Instantiates a new unified client:

```ts
const memo = new MemoFS(config?: MemoFsConfig);
```

### Configuration Options (`MemoFsConfig`)

| Option | Type | Default | Description |
|---|---|---|---|
| `store` | `MemoryStore` | (Required) | Memory store adapter (filesystem or in-memory). |
| `mode` | `MemoFSRuntimeMode` | `"local"` | Runtime mode: `"local" \| "hybrid"`. |
| `projectId` | `string` | `undefined` | Unique identifier for the project workspace. |
| `cloud` | `MemoFsCloudOptions` | `undefined` | Cloud client config (`baseUrl`, `apiKey`) for hybrid sync. |
| `embedder` | `MemoryEmbedder` | `undefined` | Vector embedding client. |
| `reranker` | `Reranker` | `undefined` | Hybrid search results reranker. |
| `extractor` | `Extractor` | `undefined` | Entity/relationship graph extractor. |
| `llmClient` | `LlmClient` | `undefined` | Provider-neutral LLM client. |

---

## Memory Sub-APIs

### `memo.core`

Read and update the core memory document (`.memofs/memory/core.md`).

```ts
// Read core memory (returns raw markdown string)
const text = await memo.core.read();
console.log(text);

// Overwrite core memory
await memo.core.update("# Project Rules\n\nAlways use TypeScript strict mode.");
```

### `memo.notes`

Read and record timestamped notes (`.memofs/memory/notes.md`).

```ts
// Read all notes
const notes = await memo.notes.read();

// Record a new note (auto-timestamped)
await memo.notes.record({
  content: "Deployment checklist added on July 4th.",
  kind: "decision",
});
```

### `memo.conversations`

Read and append to the conversation log (`.memofs/events/conversations.jsonl`).

```ts
const entries = await memo.conversations.read({ limit: 20 });
await memo.conversations.append({
  role: "user",
  content: "How does auth work?",
});
```

---

## Recall & Context

### `memo.recall`

Performs lexical, vector, or hybrid query recall to retrieve relevant memory fragments.

- **Parameters:** `query: string, options?: { limit?, filter?, namespace?, workspaceId?, projectId? }`
- **Returns:** `Promise<RecallResult>`

```ts
const results = await memo.recall("how does auth work?", { limit: 5 });
for (const item of results.items) {
  console.log(item.text, item.score);
}
```

### `memo.context`

Builds a progressive-disclosure context briefing for an agent — core + entities + recall + recent + notes, packed into `maxBytes`.

```ts
const ctx = await memo.context({
  query: "how does auth work?",
  detail: "compact",
  maxBytes: 6000,
});
console.log(ctx.text);
```

### `memo.writeMemory`

Writes a memory entry with kind, tags, source refs, and durability classification.

```ts
const result = await memo.writeMemory({
  content: "We chose Cloudflare D1 for metadata storage.",
  kind: "decision",
  tags: ["architecture", "database"],
});
console.log(result.id, result.tier, result.tierReason);
```

### `memo.listRecentMemories`

Lists recent memory events from the event log.

```ts
const recent = await memo.listRecentMemories({ limit: 10 });
```

---

## Graph Sub-API

### `memo.graph`

Entity-relationship graph operations — upsert nodes/edges, query neighbors, find paths.

```ts
await memo.graph.upsertNodes({
  nodes: [{ id: "auth", type: "feature", label: "Authentication" }],
});

const neighbors = await memo.graph.neighbors({
  nodeId: "auth",
  direction: "both",
});
```

---

## Snapshots Sub-API

### `memo.snapshots.create`

Takes a versioned checkpoint of the current memory filesystem.

```ts
const snapshot = await memo.snapshots.create({ label: "before-refactor" });
console.log(`Snapshot created: ${snapshot.id}`);
```

### `memo.snapshots.restore`

Restores the memory filesystem to a previously created checkpoint.

```ts
await memo.snapshots.restore("snap_12345");
```

### `memo.snapshots.list`

Lists all stored snapshots.

```ts
const snapshots = await memo.snapshots.list();
```

---

## AgentFS Sub-API

### `memo.agentfs`

Agent session lifecycle — start, read/write files, extract durable memory, complete.

```ts
const session = await memo.agentfs.startSession({
  task: "implement auth flow",
});

await memo.agentfs.writeFile({
  sessionId: session.sessionId,
  path: "plan.md",
  content: "# Auth Plan",
});

const extracted = await memo.agentfs.extract({ sessionId: session.sessionId });
await memo.agentfs.complete({ sessionId: session.sessionId });
```

---

## Sync Sub-API (Hybrid Mode Only)

### `memo.sync.status`

Checks sync status, returning counts of local-only changes or remote-only changes.

```ts
const status = await memo.sync.status();
console.log(`Unpushed changes: ${status.localChangesCount}`);
```

### `memo.sync.push`

Pushes local modifications to the remote cloud replica (two-phase: upload + complete).

```ts
const pushResult = await memo.sync.push({});
await memo.sync.complete({ uploadId: pushResult.uploadId });
```

### `memo.sync.pull`

Pulls remote memory changes and applies them to the local store.

```ts
await memo.sync.pull({});
```

---

## Utilities

### `memo.validate`

Validates the memory filesystem integrity.

```ts
const result = await memo.validate({ strict: true });
console.log(result.ok, result.errors);
```

### `memo.consolidate`

Runs a local consolidation pass — merges duplicate graph entities and retires superseded facts.

```ts
const result = await memo.consolidate({ apply: true });
console.log(result.mergesApplied, result.retirementsApplied);
```

### `memo.health`

Returns the runtime health and capability list.

```ts
const health = await memo.health();
console.log(health.ok, health.capabilities);
```
