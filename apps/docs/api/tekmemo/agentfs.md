# Agent Filesystem Module

The agent filesystem module provides agent-oriented filesystem helpers for coding tools that need structured project memory access.

## Import

All Agent Filesystem APIs are imported directly from `@tekbreed/tekmemo`:

```ts
import {
  createTekMemoAgentSession,
  createAgentfsMemoryStore,
} from "@tekbreed/tekmemo";
```

## How it works

Instead of giving a coding agent raw read/write access to your entire codebase, `agentfs` provides a safe sandbox (an "agent session") tailored for AI tools. It tracks what the agent reads, modifies, and decides.

### Agent sessions

When an agent begins a task, it starts a session. This session acts as a temporary overlay on your project:
1. **Start:** The agent is given a context package (core memory + task prompt).
2. **Work:** The agent runs commands and edits code, while AgentFS monitors the changes.
3. **Extract:** AgentFS extracts a summary, durable memory artifacts, and follow-ups from the session.
4. **Complete:** The session is closed, and the extracted memory is persisted to TekMemo's durable `notes.md`.

## Quick start with Tekmemo

The [`Tekmemo`](./tekmemo) class exposes agent session management through `memo.agentfs`:

```ts
import { Tekmemo } from "@tekbreed/tekmemo";

const memo = new Tekmemo({ rootDir: "./my-project", projectId: "my-app" });

// Start a tracked agent session via Tekmemo
const result = await memo.agentfs.startSession({
  actorId: "assistant:claude",
  task: "Refactor the authentication flow to use NextAuth.",
});

// Read/write files through the agent sandbox
await memo.agentfs.readFile({ sessionId: result.sessionId, path: "src/auth.ts" });
await memo.agentfs.writeFile({
  sessionId: result.sessionId,
  path: "src/auth.ts",
  content: "// new content",
});

// Extract durable memory from the session
const extracted = await memo.agentfs.extract({
  sessionId: result.sessionId,
});

// Complete the session — persist memory to notes.md
await memo.agentfs.complete({
  sessionId: result.sessionId,
  extractDurableMemory: true,
  checkpointLabel: "post-auth-refactor",
});
```

## Direct usage (advanced)

If you need more control over the session lifecycle, you can use the low-level helpers directly with a [`Tekmemo`](./tekmemo) client's store:

```ts
import {
  createTekMemoAgentSession,
  createAgentfsMemoryStore,
} from "@tekbreed/tekmemo";

const memo = new Tekmemo({ rootDir: "./my-project", projectId: "my-app" });
const client = createAgentfsMemoryStore({ rootDir: ".agentfs" });

const session = createTekMemoAgentSession({
  client,
  memory: memo.store,
  actorId: "assistant:claude",
  task: "Refactor the authentication flow.",
});

const { sync, paths } = await session.prepare();

// ... agent does its work ...

const extracted = await session.extract();
const result = await session.complete({
  extractDurableMemory: true,
  checkpointLabel: "post-auth-refactor",
});
```

## Use when

Use this package when you are building an AI tool that needs safer, file-oriented operations over `.tekmemo/` memory, rather than arbitrary filesystem reads and writes.
