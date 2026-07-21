# AgentFS

AgentFS is the virtual filesystem layer built into the `@memofs/core` runtime. It abstracts directory access, file reading, writing, and synchronization into a single interface.

## Canonical Memory Path Structure

Inside the project root directory, AgentFS manages memory assets within the `.memofs/` subfolder:

```
.memofs/
├── manifest.json              # Versioned manifest of all tracked memory assets
├── memory/
│   ├── core.md                # Core canonical memory
│   └── notes.md               # Archival memory notes
├── events/
│   ├── memory-events.jsonl    # Memory write/event log
│   └── conversations.jsonl    # Conversation history for recall
├── indexes/
│   ├── chunks.jsonl           # Chunked text index for recall
│   └── embeddings.jsonl       # Vector embeddings index
├── graph/
│   ├── nodes.jsonl            # Entity nodes
│   └── edges.jsonl            # Relationship edges
├── connectors.json            # Connector config (no secrets)
└── snapshots/
    └── snapshots.jsonl        # Snapshot index
```

## The Virtual Path Contract

AgentFS does not interact directly with Node's `fs` or other runtime environments. Instead, it interacts with an injected `MemoryStore` interface. This allows AgentFS to run seamlessly in any JavaScript execution context, including web browsers and Cloudflare Workers.

### Injected Store Operations

An implementation of `MemoryStore` exposes five primitives:

- `read(path: string): Promise<string>`
- `write(path: string, content: string): Promise<void>`
- `append(path: string, content: string): Promise<void>`
- `exists(path: string): Promise<boolean>`
- `delete(path: string): Promise<void>`

## Agent Sessions

Agent sessions provide a structured workspace for a single agent task — scaffolding files, syncing state before/after, and extracting durable memory on completion.

```ts
import { createMemoFsAgentSession } from "@memofs/core";

const session = createMemoFsAgentSession({
  client: agentfsClient,
  memory: memo.store,
  task: "implement authentication flow",
  projectId: "my-project",
});

// Sync memory state and scaffold working files
await session.prepare();

// ... agent does its work, reads/writes session files ...

// Extract durable memory from the session output
const extracted = await session.extract();

// Complete: write durable memory back, create checkpoint, sync
const result = await session.complete({
  checkpointLabel: "auth-flow-done",
  extractDurableMemory: true,
});
```

Alternatively, use the `MemoFS` client's convenience methods:

```ts
const session = await memo.agentfs.startSession({
  task: "implement authentication flow",
});

await memo.agentfs.writeFile({
  sessionId: session.sessionId,
  path: "plan.md",
  content: "# Auth Plan",
});

const extracted = await memo.agentfs.extract({
  sessionId: session.sessionId,
});

await memo.agentfs.complete({
  sessionId: session.sessionId,
  extractDurableMemory: true,
});
```
