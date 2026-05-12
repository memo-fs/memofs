# Cloud Client

`@tekmemo/cloud-client` is the official client for connecting to the TekMemo Cloud API.

Use it to access hosted project memory, sync, recall, graph APIs, and more from any JavaScript server runtime.

## Install

```bash
npm install @tekmemo/cloud-client
```

## Create a client

```ts
import { createTekMemoCloudClient } from "@tekmemo/cloud-client";

const client = createTekMemoCloudClient({
  baseUrl: "https://memo.tekbreed.com/api/v1",
  apiKey: process.env.TEKMEMO_API_KEY!,
  defaultProjectId: "proj_123",
});
```

*Note: You can also use `createTekMemoCloudClientFromEnv(process.env)` to automatically load configuration from `TEKMEMO_CLOUD_URL`, `TEKMEMO_API_KEY`, etc.*

## Responses

All API responses follow a canonical envelope structure containing either `data` or `error`, alongside a `meta` object.

```ts
const { data, error, meta } = await client.memory.readCore();

if (error) {
  console.error("Failed:", error.message);
  return;
}

console.log("Core memory:", data.content);
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
| `client.sync.resolveConflict(input)` | Applies a resolution policy to a sync conflict. |

### `agentSessions`
Manage AgentFS sandboxed coding sessions.

| Method | Purpose |
| --- | --- |
| `client.agentSessions.create(input)` | Starts a new tracked agent session. |
| `client.agentSessions.addEvent(input)` | Records an agent action (e.g. command run, file edited). |
| `client.agentSessions.extract(input)` | Extracts durable memory from a finished session. |
| `client.agentSessions.approveMemory(input)`| Manually approves extracted memory. |
| `client.agentSessions.complete(input)` | Closes the session and saves memory to `notes.md`. |

### Advanced operations

| Namespace | Methods | Purpose |
| --- | --- | --- |
| `exports` | `client.exports.create()`, `client.exports.downloadUrl()` | Backup and export project memory. |
| `snapshots` | `client.snapshots.create()`, `client.snapshots.downloadUrl()` | Point-in-time immutable memory backups. |
| `extraction`| `client.extraction.run()`, `client.extraction.jobs()` | Trigger and monitor background memory extraction. |
| `providers` | `client.providers.list()`, `client.providers.create()`, `client.providers.test()`| Configure external models (OpenAI, VoyageAI). |
| `evals` | `client.evals.run()` | Run context quality evaluations. |
| `benchmarks`| `client.benchmarks.run()` | Run context benchmarks. |

### System checks

| Method | Purpose |
| --- | --- |
| `client.health()` | Returns `200 OK` if the API is reachable. |
| `client.readiness()` | Returns `200 OK` if the API and database are fully ready. |
