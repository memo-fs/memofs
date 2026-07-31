# Building Memory-Native AI Agents in TypeScript with `@memofs/core`

![MemoFS TypeScript SDK Cover](./memofs_typescript_sdk_cover_1785315155004.jpg)

> **Platforms**: Dev.to | X Article  
> **Target Audience**: AI Agent Framework Builders, TypeScript Developers, AI Software Engineers  
> **Key Callouts**:
> - Core Package SDK Docs: [https://docs.memofs.dev/packages/core/](https://docs.memofs.dev/packages/core/)
> - Architecture & Design Post: [https://docs.memofs.dev/blog/the-memory-layer-for-any-ai-agent](https://docs.memofs.dev/blog/the-memory-layer-for-any-ai-agent)

---

Most developers building custom AI agents spend weeks attempting to solve memory management manually:
- They set up vector database wrappers.
- They craft ad-hoc chunking logic.
- They struggle with memory staleness, secret filtering, and context window blowup.

[`@memofs/core`](https://docs.memofs.dev/packages/core/) provides an open-source, production-ready TypeScript SDK that gives any custom AI agent durable, file-first persistent memory in just a few lines of code.

Because `@memofs/core` uses the canonical `.memofs/` workspace directory, memories persisted by your custom TypeScript agents seamlessly co-exist with end-user developer tools (Claude Code, Cursor, Copilot, Codex). Developers can inspect agent memory using plain text tools or `npx memofs`, while custom agent frameworks share a single source of truth across the codebase.

In this tutorial, we will build a memory-native TypeScript agent that retains knowledge across sessions, automatically sanitizes sensitive data, executes task-aware recall, and updates stale facts cleanly.

---

## Installation

Add `@memofs/core` to your project:

```bash
npm install @memofs/core
# or
pnpm add @memofs/core
```

*Note: `@memofs/core` requires Node.js >= 22.*

---

## 1. Initializing the MemoFS Engine

The core engine is instantiated using the `MemoFS` class and a Node filesystem storage store (`createNodeFsMemoryStore` from `@memofs/core/node-fs`).

```typescript
import { MemoFS } from "@memofs/core";
import { createNodeFsMemoryStore } from "@memofs/core/node-fs";

// 1. Initialize local filesystem storage root
const store = createNodeFsMemoryStore({
  rootDir: process.cwd(),
});

// 2. Instantiate MemoFS memory engine
const memo = new MemoFS({
  store,
  projectId: "my-custom-agent",
  mode: "local", // 'local' | 'hybrid'
});
```

Alternatively, Node consumers can use the `createNodeMemoFs` helper:

```typescript
import { createNodeMemoFs } from "@memofs/core/node-fs";

const memo = createNodeMemoFs({
  rootDir: process.cwd(),
  projectId: "my-custom-agent",
  mode: "local",
});
```

### Storage Modes Supported by `@memofs/core`

- **`local`**: Offline storage. Memory reads and writes execute directly against local `.memofs/` files with zero network requests.
- **`hybrid`**: Writes files locally for speed, but asynchronously syncs replicas to MemoFS Cloud for cross-machine access.

---

## 2. Generating Task-Aware Context Briefings

Before executing an agent task, retrieve a compact, structured memory briefing to inject into your LLM system prompt using `memo.context()`.

```typescript
async function buildAgentSystemPrompt(userTask: string): Promise<string> {
  // Query MemoFS for task-aware context
  const contextResult = await memo.context({
    query: userTask,
    taskType: "refactor", // 'coding' | 'debug' | 'refactor' | 'docs' | 'general'
    maxBytes: 12000,
  });

  return `
You are an autonomous coding agent.

## PROJECT MEMORY BRIEFING
${contextResult.text}

## USER TASK
${userTask}
`;
}
```

MemoFS formats the briefing automatically, categorizing output into **Core Rules**, **Relevant Historical Notes**, and **Active Constraints** while keeping total size under your specified `maxBytes` cap.

---

## 3. Writing Durable Memories with Secret Filtering

When your agent makes a design decision, discovers a constraint, or completes a task, persist it using `memo.writeMemory()`.

```typescript
async function recordAgentDecision(decisionText: string, category: "decision" | "constraint" | "note") {
  const result = await memo.writeMemory({
    content: decisionText,
    kind: category,
    tags: ["architecture", "auth"],
  });

  if (result.tier !== "durable") {
    console.warn(`Memory stored as ${result.tier} (reason: ${result.tierReason}).`);
    return;
  }

  console.log(`✓ Durable memory persisted cleanly with ID: ${result.id}`);
}

// Example invocation:
await recordAgentDecision(
  "Database queries must use Drizzle ORM prepared statements for SQL injection safety",
  "constraint"
);
```

### Built-in Safety & Sanitization

Before writing to `.memofs/memory/notes.md`, `@memofs/core` automatically executes:
1. **Secret Blocklist Pass**: Rejects API keys (`sk-...`), JWTs, and private tokens up front (unless `--allow-secrets` / explicit flags are passed).
2. **Deterministic Durability Classification**: Determines whether the fact has long-term value (*durable*) or single-turn relevance (*transient*).

---

## 4. Handling Stale Memory with Graph Relationships

When an architectural fact changes, avoid creating conflicting memories. Write the new memory and link the relationship in the entity graph via `memo.graph.upsertEdges()`:

```typescript
async function updateStaleFact(oldMemoryId: string, newFactText: string) {
  // 1. Write the new decision
  const result = await memo.writeMemory({
    content: newFactText,
    kind: "decision",
    tags: ["auth"],
  });

  // 2. Link the new memory as superseding the old memory in the relationship graph
  await memo.graph.upsertEdges({
    edges: [
      {
        source: result.id,
        target: oldMemoryId,
        type: "supersedes",
      },
    ],
  });

  console.log(`✓ Created new memory ${result.id} superseding ${oldMemoryId}`);
}
```

MemoFS updates `.memofs/graph/edges.jsonl`. Subsequent queries automatically surface the newest fact while preserving historical context for auditability.

---

## 5. End-to-End Example: Complete Agent Loop

Here is a full working agent loop demonstrating memory-native context injection, execution, and memory persistence:

```typescript
import { MemoFS } from "@memofs/core";
import { createNodeFsMemoryStore } from "@memofs/core/node-fs";

async function runMemoryNativeAgent(userPrompt: string) {
  // 1. Initialize Memory Engine
  const store = createNodeFsMemoryStore({ rootDir: "." });
  const memo = new MemoFS({
    store,
    projectId: "agent-demo",
    mode: "local",
  });

  // 2. Retrieve Memory Briefing
  const context = await memo.context({ query: userPrompt, taskType: "coding" });

  console.log("--- INJECTED MEMORY BRIEFING ---");
  console.log(context.text);

  // 3. Perform Agent Task (Simulated LLM response)
  console.log("Executing agent task...");

  // 4. Persist Learned Fact to MemoFS
  const writeResult = await memo.writeMemory({
    content: "Session tokens expire in 15 minutes",
    kind: "decision",
    tags: ["auth", "security"],
  });

  console.log(`✓ Session complete. Memory persisted to .memofs/ with ID: ${writeResult.id}`);
}

runMemoryNativeAgent("Refactor our user session timeout");
```

---

## Summary of Core API Reference

| Method | Description |
| :--- | :--- |
| `memo.context({ query, taskType, maxBytes })` | Generates a compact system prompt briefing. |
| `memo.writeMemory({ content, kind, tags })` | Filters secrets, classifies durability, and persists structured memory. |
| `memo.recall(query, { limit })` | Executes hybrid recall (BM25 + fuzzy + vector) over stored memory chunks. |
| `memo.consolidate()` | Runs background deduplication and graph cleanup over `.memofs/`. |

---

## Resources & Documentation

- **`@memofs/core` Full API Docs**: [https://docs.memofs.dev/packages/core/](https://docs.memofs.dev/packages/core/)
- **MemoFS Architecture Deep Dive**: [https://docs.memofs.dev/blog/the-memory-layer-for-any-ai-agent](https://docs.memofs.dev/blog/the-memory-layer-for-any-ai-agent)
- **Main OSS Documentation**: [https://docs.memofs.dev](https://docs.memofs.dev)
