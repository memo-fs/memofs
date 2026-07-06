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
| `mode` | `MemofsRuntimeMode` | `"local"` | Runtime mode: `"local" \| "hybrid" \| "memory"`. |
| `projectId` | `string` | `undefined` | Unique identifier for the project workspace. |
| `readPolicy` | `RuntimeReadPolicy` | `"local-first"` | Read policy for hybrid syncing. |
| `writePolicy`| `RuntimeWritePolicy`| `"local-first"` | Write policy for hybrid syncing. |
| `embedder` | `MemoryEmbedder` | `undefined` | Vector embedding client. |
| `reranker` | `Reranker` | `undefined` | Hybrid search results reranker. |
| `extractor` | `Extractor` | `undefined` | Entity/relationship graph extractor. |
| `llmClient` | `LlmClient` | `undefined` | Provider-neutral LLM client. |

---

## core API Methods

### `memo.read`
Reads the raw document content of a specific memory kind.

- **Parameters:** `{ kind: MemoryKind }`
- **Returns:** `Promise<MemoryDocumentResult>`

```ts
const doc = await memo.read({ kind: "core" });
console.log(doc.content);
```

### `memo.write`
Writes or appends to a specific memory layer.

- **Parameters:** `{ kind: MemoryKind, content: string }`
- **Returns:** `Promise<WriteMemoryResult>`

```ts
await memo.write({
  kind: "notes",
  content: "Deployment checklist added on July 4th.",
});
```

### `memo.recall`
Performs lexical, vector, or hybrid query recall to retrieve relevant memory fragments.

- **Parameters:** `{ query: string, limit?: number }`
- **Returns:** `Promise<RecallResult>`

```ts
const results = await memo.recall({
  query: "how does auth work?",
  limit: 5,
});
```

---

## Snapshots Sub-API

### `memo.snapshot.create`
Takes a versioned checkpoint of the current memory filesystem.

```ts
const snapshot = await memo.snapshot.create();
console.log(`Snapshot created: ${snapshot.id}`);
```

### `memo.snapshot.restore`
Restores the memory filesystem to a previously created checkpoint.

```ts
await memo.snapshot.restore({ snapshotId: "snap_12345" });
```

---

## Sync Sub-API (Hybrid Mode Only)

### `memo.sync.status`
Checks sync status, returning counts of local-only changes or remote-only changes.

```ts
const status = await memo.sync.status();
console.log(`Unpushed changes: ${status.localChangesCount}`);
```

### `memo.sync.pull`
Pulls remote memory changes and merges them with the local store.

```ts
await memo.sync.pull();
```

### `memo.sync.push`
Pushes local modifications to the remote cloud replica.

```ts
await memo.sync.push();
```
