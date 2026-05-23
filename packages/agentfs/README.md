# @tekmemo/agentfs

<p align="center">
  <a href="https://www.npmjs.com/package/@tekmemo/agentfs"><img src="https://img.shields.io/npm/v/@tekmemo%2Fagentfs?label=@tekmemo/agentfs&style=for-the-badge" alt="npm version" /></a> &nbsp; 
  <a href="https://github.com/tekbreed/tekmemo"><img src="https://img.shields.io/badge/status-alpha-orange?style=for-the-badge" alt="Status: Alpha" /></a> &nbsp; 
  <a href="https://www.npmjs.com/package/@tekmemo/agentfs"><img src="https://img.shields.io/npm/dm/@tekmemo%2Fagentfs?style=for-the-badge" alt="npm downloads" /></a> &nbsp; 
  <a href="https://github.com/tekbreed/tekmemo/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/tekbreed/tekmemo/ci.yml?branch=main&style=for-the-badge&label=CI" alt="CI" /></a> &nbsp; 
  <a href="https://docs.memo.tekbreed.com/"><img src="https://img.shields.io/badge/docs-online-blue?style=for-the-badge" alt="Docs" /></a> &nbsp; 
  <a href="../../LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg?style=for-the-badge" alt="MIT License" /></a>
</p>

AgentFS session workspace and `MemoryStore` adapter for TekMemo-powered agents.

Use this package when you want agents to work with TekMemo memory through a safe filesystem-facing workspace. AgentFS is not the durable memory engine; TekMemo remains the canonical memory layer, while AgentFS holds session context, plans, command notes, checkpoints, and extracted memory artifacts.

For the full CLI, MCP, coding-agent, and Cloud integration flow, see [AgentFS End-to-End Integration](./END_TO_END.md).

It can also expose an AgentFS-like remote file runtime as a TekMemo `MemoryStore` while preserving the canonical local memory protocol:

```txt
.tekmemo/
  manifest.json
  memory/core.md
  memory/notes.md
  events/memory-events.jsonl
  events/conversations.jsonl
  indexes/chunks.jsonl
  graph/nodes.jsonl
  graph/edges.jsonl
  snapshots/snapshots.jsonl
```

## Installation

```bash
npm install tekmemo @tekmemo/agentfs
```

## Quickstart

### Agent session workspace

```ts
import { createTekMemoAgentSession } from "@tekmemo/agentfs";

const session = createTekMemoAgentSession({
  client: agentfsClient,
  memory: tekmemoStore,
  projectId: "proj_123",
  task: "Refactor the auth middleware",
});

await session.prepare();

console.log(session.paths.context.core);
console.log(session.paths.working.plan);
console.log(session.paths.output.durableMemory);

// Let the agent work, then read curated outputs and sync the workspace.
await session.complete({
  checkpointLabel: "after-auth-refactor",
  extractDurableMemory: true,
});
```

The generated workspace uses this shape:

```txt
/agent-sessions/session_.../
  context/
    manifest.json
    core.md
    notes.md
  working/
    plan.md
    commands.md
    errors.md
    changes.md
    notes.md
  output/
    summary.md
    durable-memory.md
    follow-ups.md
  meta.json
```

### MemoryStore adapter

```ts
import { bootstrapMemoryStore, CORE_MEMORY_PATH } from "tekmemo";
import { createAgentfsMemoryStore } from "@tekmemo/agentfs";

const store = createAgentfsMemoryStore(agentfsClient, {
  scope: "project",
  projectId: "proj_123"
});

await bootstrapMemoryStore(store);
await store.write(CORE_MEMORY_PATH, "# Core Memory\n");

const content = await store.read(CORE_MEMORY_PATH);
```

---

## API reference

### `createTekMemoAgentSession(options)` → `TekMemoAgentSession`

Creates a high-level agent session workspace:

```ts
const session = createTekMemoAgentSession({
  client: agentfsClient,
  memory: tekmemoStore,
  task: "Add Cloudflare D1 support",
  projectId: "proj_123",
  sessionId: "session_d1_refactor" // optional
});

await session.prepare();
const extracted = await session.extract();
await session.complete({ extractDurableMemory: true });
```

`prepare()` pulls AgentFS changes when available, writes TekMemo context files, and scaffolds working/output files without overwriting existing agent work unless `overwriteWorkspaceFiles` is enabled.

`complete()` reads the output files, optionally appends `output/durable-memory.md` into TekMemo notes, checkpoints the AgentFS workspace, and pushes when the client supports sync.

### `createAgentfsMemoryStore(client, options)` → `AgentfsMemoryStore`

Creates an AgentFS-backed memory store:

```ts
import { createAgentfsMemoryStore } from "@tekmemo/agentfs";

const store = createAgentfsMemoryStore(client, {
  scope: "project",           // "project" | "user" | "session"
  projectId: "proj_123",      // required for project scope
  userId: "usr_123",           // required for user scope
  sessionId: "sess_123",       // required for session scope
  missingFileBehavior: "throw", // "throw" (default) | "empty"
});
```

### AgentFS-like client contract

AgentFS is still a beta surface, so this package accepts a structural client:

```ts
interface AgentfsLikeClient {
  readText(path: string): Promise<string>;
  writeText(path: string, content: string): Promise<void>;
  appendText?(path: string, content: string): Promise<void>;
  exists?(path: string): Promise<boolean>;
  sync?: {
    pull?(): Promise<void>;
    push?(): Promise<void>;
    checkpoint?(label: string): Promise<void>;
  };
}
```

`appendText` and `exists` are optional. If `appendText` is missing, falls back to read/write.

### Supported scopes

```ts
// Project scope
createAgentfsMemoryStore(client, {
  scope: "project",
  projectId: "proj_123"
});
// Paths resolve to: /stores/project/proj_123/.tekmemo/...

// User scope
createAgentfsMemoryStore(client, {
  scope: "user",
  userId: "usr_123"
});
// Paths resolve to: /stores/user/usr_123/.tekmemo/...

// Session scope
createAgentfsMemoryStore(client, {
  scope: "session",
  sessionId: "sess_123"
});
// Paths resolve to: /stores/session/sess_123/.tekmemo/...
```

Behind the scenes, `CORE_MEMORY_PATH` resolves to:
```txt
/stores/project/proj_123/.tekmemo/memory/core.md
```

---

## Sync hooks

```ts
import { syncBeforeSession, syncAfterSession } from "@tekmemo/agentfs";

// Before agent session
await syncBeforeSession(agentfsClient);

// Run agent session
// ...

// After agent session (checkpoints before pushing by default)
await syncAfterSession(agentfsClient, "after-agent-session");
```

---

## Lease management

```ts
import { InMemoryLeaseManager, withMemoryLease } from "@tekmemo/agentfs";

// Create lease manager (in-memory, for tests/single-process)
const leaseManager = new InMemoryLeaseManager();

// Run operation with lease
await withMemoryLease({
  leaseManager,
  storeId: "project:proj_123",
  ownerId: "worker-1",
  ttlMs: 30_000,             // 30 second TTL
  operation: async () => {
    // Critical memory operation
    await store.write(".tekmemo/memory/core.md", content);
  }
});
```

The in-memory lease manager is useful for tests and single-process coordination. Distributed production leases should use a durable/shared implementation.

---

## Missing file behavior

### Strict mode (default)

```ts
const store = createAgentfsMemoryStore(client, {
  scope: "project",
  projectId: "proj_123",
  missingFileBehavior: "throw"
});

try {
  await store.read(".tekmemo/memory/core.md"); // throws MemoryNotFoundError
} catch (error) {
  // MemoryNotFoundError
}
```

### Relaxed mode

```ts
const store = createAgentfsMemoryStore(client, {
  scope: "project",
  projectId: "proj_123",
  missingFileBehavior: "empty"
});

const content = await store.read(".tekmemo/memory/core.md"); // "" if missing
```

---

## Error handling

```ts
import { AgentfsClientError, AgentfsValidationError } from "@tekmemo/agentfs";
import { MemoryNotFoundError, MemoryStoreError } from "tekmemo";

try {
  await store.read(".tekmemo/memory/core.md");
} catch (error) {
  if (error instanceof MemoryNotFoundError) {
    // File doesn't exist
  }
  if (error instanceof MemoryStoreError) {
    console.error(error.message);
  }
  if (error instanceof AgentfsClientError) {
    console.error(error.message);
    console.error(error.details);
  }
}
```

---

## Edge cases handled

- Invalid AgentFS client shape
- Invalid scope
- Missing scope IDs
- Unsafe IDs (with `/`, `\`, `..`, null bytes, spaces)
- Unsafe root prefixes
- Unsupported TekMemo memory paths
- Path traversal attempts
- Missing files
- Non-string provider responses
- Non-string write/append content
- Client read/write/append/exists failures
- Optional native append support
- Read/write fallback append
- Same-instance append serialization
- Sync no-op behavior
- Sync failure wrapping
- Checkpoint label validation
- Lease contention
- Expired leases
- Release-on-error lease behavior

---

## Package boundary

**This package owns:**
- Agent workspace/session files for TekMemo-powered coding agents
- Session memory extraction from AgentFS output files
- AgentFS adapter for `MemoryStore` interface
- Sync hooks for AgentFS sessions
- Lease management utilities
- Path resolution for AgentFS scopes

**This package does NOT own:**
- The `.tekmemo/` protocol itself (owned by `tekmemo` core)
- Local filesystem storage (see `@tekmemo/fs`)
- Vector recall
- Embeddings
- Reranking
- Cloud billing
- Cloud tenancy
- BYOK storage

---

## Related packages

- `tekmemo` — Core memory contracts and types
- `@tekmemo/fs` — Local filesystem adapter
- `@tekmemo/recall` — Vector recall contracts
