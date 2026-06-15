# Mounting AgentFS Sessions

If you are building an autonomous coding agent, you don't want it mutating your host machine directly. Instead, you run the agent inside a sandbox (like Docker or an E2B container) and use AgentFS to securely mount your TekMemo project memory *into* that sandbox.

This guide shows how to bridge your host's permanent memory with a remote sandbox using `AgentfsMemoryStore` and session lifecycles.

## 1. Create the Client Adapter
You must define an `AgentfsLikeClient` that tells TekMemo how to read and write files inside your specific sandbox environment.

```typescript
import { AgentfsLikeClient } from "@tekbreed/tekmemo";
import { Sandbox } from "your-sandbox-provider"; // e.g. E2B or Docker client

const sandbox = new Sandbox();

const client: AgentfsLikeClient = {
	async readText(path: string) {
		return await sandbox.filesystem.read(path);
	},
	async writeText(path: string, content: string) {
		await sandbox.filesystem.write(path, content);
	}
};
```

## 2. Start the Session
Before the agent starts, you must sync the host's `.tekmemo/core.md` into the sandbox. This injects the project's rules into the environment so the agent can read it locally.

```typescript
import { 
	NodeFsMemoryStore, 
	AgentfsMemoryStore, 
	createTekMemoAgentSession 
} from "@tekbreed/tekmemo";

// The host's permanent memory
const hostStore = new NodeFsMemoryStore(process.cwd());

// The sandbox's ephemeral memory
const sandboxStore = new AgentfsMemoryStore(client, "/sandbox/workspace");

// Create the session and sync memory INTO the sandbox
const session = await createTekMemoAgentSession({
	hostStore,
	agentStore: sandboxStore,
});

await session.syncBeforeSession();
```

## 3. Run the Agent
Now run your LLM agent. Inside the sandbox, the agent can use the standard CLI (`tekmemo note "I fixed the bug"`) or just write to `/sandbox/workspace/.tekmemo/notes.md`. 

Because it's isolated, its notes won't permanently overwrite your host machine until you say so.

## 4. Extract Notes
When the agent finishes, you extract the notes from the sandbox back out to your host.

```typescript
// The agent has finished!
// Extract the newly written notes from the sandbox back to the host machine.
await session.syncAfterSession();

console.log("Memory successfully merged to host.");
```

By following this pattern, your host machine retains long-term memory across multiple autonomous agent sessions safely!
