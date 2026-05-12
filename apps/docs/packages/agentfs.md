# `@tekmemo/agentfs`

Agent-oriented filesystem helpers for coding tools that need structured project memory access.

## Install

```bash
npm install @tekmemo/agentfs
```

## How it works

Instead of giving a coding agent raw read/write access to your entire codebase, `@tekmemo/agentfs` provides a safe sandbox (an "agent session") tailored for AI tools. It tracks what the agent reads, modifies, and decides.

### Agent sessions

When an agent begins a task, it starts a session. This session acts as a temporary overlay on your project:
1. **Start:** The agent is given a context package (core memory + task prompt).
2. **Work:** The agent runs commands and edits code, while AgentFS monitors the changes.
3. **Extract:** AgentFS extracts a summary, durable memory artifacts, and follow-ups from the session.
4. **Complete:** The session is closed, and the extracted memory is persisted to TekMemo's durable `notes.md`.

## Example usage

If you are building a custom AI coding tool, you can use `@tekmemo/agentfs` programmatically:

```ts
import {
	createTekMemoAgentSession,
	createAgentfsMemoryStore,
} from "@tekmemo/agentfs";
import { createNodeFsMemoryStore } from "@tekmemo/fs";

// Create a memory store for the project
const memory = createNodeFsMemoryStore({ rootDir: "./my-project" });
const client = createAgentfsMemoryStore({ rootDir: ".agentfs" });

// Create and prepare a tracked session
const session = createTekMemoAgentSession({
	client,
	memory,
	actorId: "assistant:claude",
	task: "Refactor the authentication flow to use NextAuth.",
});

const { sync, paths } = await session.prepare();
console.log(`Agent session started: ${session.sessionId}`);
console.log(`Working directory: ${paths.root}`);

// ... agent does its work, reading context files and updating working/output files ...

// Extract session memory without persisting
const extracted = await session.extract();
console.log(`Extracted summary: ${extracted.summary}`);

// Complete the session — extract memory, optionally persist to notes.md, and push changes
const result = await session.complete({
	extractDurableMemory: true,
	checkpointLabel: "post-auth-refactor",
});
console.log(
	`Session finished. Durable memory written: ${result.durableMemoryWritten}`,
);
```

## Use when

Use this package when you are building an AI tool that needs safer, file-oriented operations over `.tekmemo/` memory, rather than arbitrary filesystem reads and writes.
