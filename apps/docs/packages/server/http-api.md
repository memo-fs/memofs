# HTTP API (JSON-RPC 2.0)

Both deploy targets serve the same surface:

- `GET /health` — liveness probe (`{"ok":true,...}`)
- `POST /` or `POST /rpc` — JSON-RPC 2.0 dispatch
- `OPTIONS` — CORS preflight (when `allowedOrigins` is set)

## Example: Recall

**Request (`POST /`):**

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "recall",
  "params": {
    "query": "how to deploy database",
    "limit": 3
  }
}
```

**Response:**

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "items": [
      {
        "content": "Database migrations run via Drizzle Migrator.",
        "score": 0.89,
        "source": { "kind": "notes", "path": "memory/notes.md" }
      }
    ]
  }
}
```

## Method Surface

| Method | What it does | Status |
|--------|-------------|--------|
| `health` | Liveness probe | Live |
| `recall` | Semantic/hybrid recall | Live |
| `context` | Task briefing (progressive disclosure) | Live |
| `memory.readCore` | Read core memory document | Live |
| `memory.readNotes` | Read notes document | Live |
| `memory.readConversations` | Read conversation history | Live |
| `memory.listRecent` | List recent memory events | Live |
| `memory.validate` | Validate memory integrity | Live |
| `graph.listNodes` | List graph nodes | Live |
| `graph.listEdges` | List graph edges | Live |
| `graph.neighbors` | Graph neighbors query | Live |
| `graph.path` | Graph path search | Live |
| `snapshots.list` | List snapshots | Live |
| `memory.write` | Write a memory | **Gated (`503`)** |
| `memory.recordNote` | Record a note | **Gated (`503`)** |
| `memory.updateCore` | Update core memory | **Gated (`503`)** |
| `memory.appendConversation` | Append a conversation entry | **Gated (`503`)** |
| `graph.upsertNodes` | Upsert graph nodes | **Gated (`503`)** |
| `graph.upsertEdges` | Upsert graph edges | **Gated (`503`)** |
| `consolidate` | Run consolidation | **Gated (`503`)** |
| `snapshots.create` | Create a snapshot | **Gated (`503`)** |
| `snapshots.restore` | Restore a snapshot | **Gated (`503`)** |

## The Write Gate

Every mutating method returns `503` until a **concurrency layer** is injected. This is deliberate: concurrent writes to the same project would silently lose data under last-writer-wins. The gate is "method rejects," never "method present unsafely."

To enable writes, pass a `concurrencyLayer` in the options — an object with a single `acquire(projectId, fn)` method that serializes concurrent writers to the same project (a per-project mutex is enough for a single instance; use a distributed lock across instances):

```ts
const response = await handleRuntimeRequest(webRequest, {
  runtime,
  concurrencyLayer: {
    acquire: (projectId, fn) => myProjectMutex.runExclusive(projectId, fn),
  },
});
```

When injected, gated methods run inside `acquire` so contended writes serialize instead of corrupting each other. This is exactly how MemoFS Cloud runs this package: its runtime Worker injects a per-project mutex, which is what powers cloud writes — including the hosted MCP endpoint's `memofs.remember` and `memofs.consolidate` tools.

Without a concurrency layer, reads work fully; to write memory programmatically, use the `MemoFS` client directly in-process.