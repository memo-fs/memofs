# Cloud Client

The cloud client is built directly into the `@tekbreed/tekmemo` package and provides the official client for connecting to the TekMemo Cloud API.

Use it to access hosted project memory, sync, recall, graph APIs, and more from any JavaScript server runtime.

## Installation

```bash
npm install @tekbreed/tekmemo
```

## Use it through Tekmemo (hybrid)

Cloud is a **sync transport**, not a standalone runtime mode. You reach it by running the engine locally (`mode: "hybrid"`) and pointing the `cloud` block at the hosted API — Tekmemo builds the client for you:

```ts
import { Tekmemo } from "@tekbreed/tekmemo";

const memo = new Tekmemo({
  mode: "hybrid",
  projectId: "proj_123",
  cloud: {
    baseUrl: "https://memo.tekbreed.com/api/v1",
    apiKey: process.env.TEKMEMO_API_KEY!,
  },
});

// Reads/writes hit local first, then sync to cloud per your policies
const core = await memo.core.read();
await memo.notes.record({ content: "New decision", kind: "decision" });
const hits = await memo.recall("architecture decisions");
```

The `readPolicy` / `writePolicy` options (`local-first`, `cloud-first`, or `local-only`) control how each operation fans out between the local engine and the cloud replica. See [The `Tekmemo` client](/packages/tekmemo/client) for the full policy matrix.

## Create a client directly

For advanced use cases where you need the raw cloud client (e.g., custom tooling, MCP servers, or bypassing `Tekmemo`):

```ts
import { createTekMemoCloudClient } from "@tekbreed/tekmemo";

const client = createTekMemoCloudClient({
  baseUrl: "https://memo.tekbreed.com/api/v1",
  apiKey: process.env.TEKMEMO_API_KEY!,
  defaultProjectId: "proj_123",
});
```

*Note: You can also use `createTekMemoCloudClientFromEnv(process.env)` to automatically load configuration from `TEKMEMO_CLOUD_URL`, `TEKMEMO_API_KEY`, etc.*

### Project-scoped client

```ts
import { createTekMemoCloudClient, createProjectScopedClient } from "@tekbreed/tekmemo";

const baseClient = createTekMemoCloudClient({ ... });
const client = createProjectScopedClient(baseClient, "proj_123");
// All calls automatically include projectId: "proj_123"
```

## Responses

All underlying API responses follow a canonical envelope structure (`{ data, meta }` or `{ error, meta }`). However, the SDK transport automatically unwraps these envelopes for you: it returns the `data` payload directly on success, and throws a typed error on failure.

```ts
try {
  const data = await client.memory.readCore();
  console.log("Core memory:", data.content);
} catch (error) {
  console.error("Failed:", error.message);
}
```

## API Reference

The client organizes methods into namespaces matching the Cloud API structure.

### `memory`
Manage core memory and durable notes.

| Method | Purpose |
| --- | --- |
| `client.memory.readCore(input?)` | Reads the stable project briefing (`core.md`). |
| `client.memory.updateCore(input)` | Updates or replaces the core memory. |
| `client.memory.listNotes(input?)` | Paginates through durable memory notes. |
| `client.memory.createNote(input)` | Stores a new durable note. |

### `recall`
Search memory using embeddings, rerankers, and keywords.

| Method | Purpose |
| --- | --- |
| `client.recall.query(input)` | Executes a recall search (vector, keyword, or hybrid). |
| `client.recall.index(input?)` | Triggers a background job to rebuild the recall index. |

### `context`
Tools for building context windows.

| Method | Purpose |
| --- | --- |
| `client.context.compose(input)` | Packs memory into a single structured string for an LLM. |

### `graph`
Interact with relationships and architecture nodes.

| Method | Purpose |
| --- | --- |
| `client.graph.listNodes(input?)` | Paginates through graph nodes. |
| `client.graph.createNode(input)` | Creates a new graph entity. |
| `client.graph.listEdges(input?)` | Paginates through graph edges. |
| `client.graph.createEdge(input)` | Creates a relationship between two nodes. |
| `client.graph.neighbors(input)` | Finds adjacent nodes connected to a specific node. |
| `client.graph.path(input)` | Finds the shortest graph path between two nodes. |

### `sync`
Synchronize local `.tekmemo/` files with the cloud.

| Method | Purpose |
| --- | --- |
| `client.sync.push(input)` | Sends local memory events to the cloud. |
| `client.sync.pull(input)` | Fetches remote memory events to apply locally. |
| `client.sync.status(input?)` | Checks sync status and detects conflicts. |

### `candidates`
Manage memory candidates — proposed memories that need review before being promoted to durable notes.

| Method | Purpose |
| --- | --- |
| `client.candidates.list(input?)` | Paginates through memory candidates. |
| `client.candidates.create(input)` | Creates a new memory candidate. |
| `client.candidates.promote(input)` | Promotes a candidate to a durable note. |
| `client.candidates.dismiss(input)` | Dismisses a candidate without promoting. |

### `conflicts`
View and resolve memory conflicts detected during sync or extraction.

| Method | Purpose |
| --- | --- |
| `client.conflicts.list(input?)` | Paginates through memory conflicts. |
| `client.conflicts.resolve(input)` | Resolves a conflict (keep existing, use incoming, merge, or dismiss). |

### `agentSessions`
Manage AgentFS sandboxed coding sessions.

| Method | Purpose |
| --- | --- |
| `client.agentSessions.create(input)` | Starts a new tracked agent session. |
| `client.agentSessions.list(input?)` | Lists agent sessions. |
| `client.agentSessions.get(input)` | Gets a single agent session by ID. |
| `client.agentSessions.addEvent(input)` | Records an agent action (e.g. command run, file edited). |
| `client.agentSessions.extract(input)` | Extracts durable memory from a finished session. |
| `client.agentSessions.approveMemory(input)` | Manually approves extracted memory. |
| `client.agentSessions.complete(input)` | Closes the session and saves memory to `notes.md`. |

### Advanced operations

| Namespace | Methods | Purpose |
| --- | --- | --- |
| `exports` | `client.exports.create()`, `client.exports.downloadUrl()` | Backup and export project memory. |
| `snapshots` | `client.snapshots.create()`, `client.snapshots.downloadUrl()` | Point-in-time immutable memory backups. |
| `extraction` | `client.extraction.run()`, `client.extraction.jobs()` | Trigger and monitor background memory extraction. |
| `providers` | `client.providers.list()`, `client.providers.create()`, `client.providers.update()`, `client.providers.delete()`, `client.providers.test()` | Configure external models (OpenAI, VoyageAI). |
| `evals` | `client.evals.run()` | Run context quality evaluations. |
| `benchmarks` | `client.benchmarks.run()` | Run context benchmarks. |

### System checks

| Method | Purpose |
| --- | --- |
| `client.health()` | Returns `200 OK` if the API is reachable. |
| `client.readiness()` | Returns `200 OK` if the API and database are fully ready. |

## Cloud runtime helpers

The cloud client module can create runtime objects used by CLI, MCP, and AI SDK helpers. However, the [`Tekmemo`](/api/tekmemo/tekmemo) class handles this automatically — prefer `new Tekmemo({ mode: "hybrid", cloud: { ... } })` when possible.

```ts
import { createCloudTekMemoRuntime, createTekMemoCloudClient } from "@tekbreed/tekmemo";

const client = createTekMemoCloudClient({
  baseUrl: process.env.TEKMEMO_CLOUD_URL!,
  apiKey: process.env.TEKMEMO_API_KEY!,
});

const runtime = createCloudTekMemoRuntime({
  client,
  projectId: "proj_123",
});

await runtime.recall({ query: "billing" });
```

Hybrid runtimes combine local and cloud runtimes with read/write policies:

```ts
import { createHybridTekMemoRuntime } from "@tekbreed/tekmemo";

const runtime = createHybridTekMemoRuntime({
  local: localRuntime,
  cloud: cloudRuntime,
  readPolicy: "local-first",
  writePolicy: "local-first",
});
```

::: tip
The equivalent via `Tekmemo` is simply `new Tekmemo({ mode: "hybrid", readPolicy: "local-first", writePolicy: "local-first", cloud: { ... } })`.
:::

## Cloud client errors

The cloud client exposes typed errors for auth, validation, rate limits, network failures, and server errors.

```ts
import { isTekMemoCloudError } from "@tekbreed/tekmemo";

try {
  await client.memory.readCore();
} catch (error) {
  if (isTekMemoCloudError(error)) {
    console.error(error.code, error.status);
  }
}
```

Error messages are automatically redacted for common secret patterns such as `tk_live_...`, `Bearer ...`, and provider keys. See [`Errors`](./errors) for the full hierarchy.

## Cloud API routes

Cloud routes are project-scoped.

```txt
GET  /api/v1/health
GET  /api/v1/readiness

GET  /api/v1/projects/:projectId/memory/core
PUT  /api/v1/projects/:projectId/memory/core
GET  /api/v1/projects/:projectId/memory/notes
POST /api/v1/projects/:projectId/memory/notes

POST /api/v1/projects/:projectId/context/compose
POST /api/v1/projects/:projectId/recall/query
POST /api/v1/projects/:projectId/recall/index

GET  /api/v1/projects/:projectId/graph/nodes
POST /api/v1/projects/:projectId/graph/nodes
GET  /api/v1/projects/:projectId/graph/edges
POST /api/v1/projects/:projectId/graph/edges
POST /api/v1/projects/:projectId/graph/neighbors
POST /api/v1/projects/:projectId/graph/path

GET  /api/v1/projects/:projectId/candidates
POST /api/v1/projects/:projectId/candidates
POST /api/v1/projects/:projectId/candidates/:candidateId/promote
POST /api/v1/projects/:projectId/candidates/:candidateId/dismiss

GET  /api/v1/projects/:projectId/conflicts
POST /api/v1/projects/:projectId/conflicts/:conflictId/resolve

POST /api/v1/projects/:projectId/agent-sessions
GET  /api/v1/projects/:projectId/agent-sessions
GET  /api/v1/projects/:projectId/agent-sessions/:sessionId
POST /api/v1/projects/:projectId/agent-sessions/:sessionId/events
POST /api/v1/projects/:projectId/agent-sessions/:sessionId/extract
POST /api/v1/projects/:projectId/agent-sessions/:sessionId/approve-memory
POST /api/v1/projects/:projectId/agent-sessions/:sessionId/complete

POST /api/v1/projects/:projectId/extraction/run
GET  /api/v1/projects/:projectId/extraction/jobs
POST /api/v1/projects/:projectId/evals/run
POST /api/v1/projects/:projectId/benchmarks/run

POST /api/v1/projects/:projectId/sync/push
POST /api/v1/projects/:projectId/sync/pull
GET  /api/v1/projects/:projectId/sync/status

POST /api/v1/projects/:projectId/exports
GET  /api/v1/projects/:projectId/exports/:exportId/download
POST /api/v1/projects/:projectId/snapshots
GET  /api/v1/projects/:projectId/snapshots/:snapshotId/download

GET  /api/v1/projects/:projectId/providers
POST /api/v1/projects/:projectId/providers
PATCH /api/v1/projects/:projectId/providers/:credentialId
DELETE /api/v1/projects/:projectId/providers/:credentialId
POST /api/v1/projects/:projectId/providers/:credentialId/test
```
