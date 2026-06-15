# Cloud Synchronization

To share memory across a team of developers, or synchronize state between multiple autonomous agents running in parallel, you can use TekMemo Cloud.

This guide demonstrates how to use the `@tekbreed/tekmemo/cloud-client` to programmatically sync your local `.tekmemo` memory to the remote SaaS.

## Prerequisites
- A TekMemo Cloud account and an API Key.
- Set `TEKMEMO_API_KEY` in your environment.
- Note: This functionality requires `@tekbreed/tekmemo` v1.0.0+.

## 1. Initialize the Cloud Client

Create an instance of the `TekMemoCloudClient`, passing in your project's `MemoryStore` and your authentication token.

```typescript
import { NodeFsMemoryStore } from "@tekbreed/tekmemo";
import { TekMemoCloudClient } from "@tekbreed/tekmemo/cloud-client";

const store = new NodeFsMemoryStore(process.cwd());

// You can optionally pass the API Key directly, 
// or let it default to process.env.TEKMEMO_API_KEY
const cloud = new TekMemoCloudClient({
	store,
	token: process.env.TEKMEMO_API_KEY, 
});
```

## 2. Push Memory (Backup)

To back up your local project memory (`core.md`, `notes.md`) to the cloud, use the `push` method. This creates an immutable snapshot of the project's state on the server.

```typescript
const projectId = "prj_123456"; // Your project ID from the cloud dashboard

async function backup() {
	const result = await cloud.push(projectId);
	console.log(`Pushed snapshot ${result.snapshotId} at ${result.timestamp}`);
}
```

## 3. Pull Memory (Restore)

To pull the latest memory state from the cloud to your local machine, use the `pull` method. By default, this will fetch the latest snapshot and write it to your local store.

```typescript
async function restore() {
	// Downloads the latest snapshot and overwrites local files
	await cloud.pull(projectId);
	console.log("Memory successfully synchronized with the cloud.");
}
```

## Manual Resolution
Currently, the client uses a "last write wins" sync model. If you are building a deeply collaborative tool, you can fetch raw snapshots and inspect them using the underlying API methods:

```typescript
// Get the current hosted core briefing
const coreMemory = await cloud.getCore(projectId);
console.log(coreMemory);
```

By integrating these calls into your agent's CI/CD pipeline or boot sequence, your team's AI memory will always remain up-to-date.
