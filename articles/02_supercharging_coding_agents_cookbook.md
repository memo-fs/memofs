# Supercharging AI Coding Agents & Custom Agent Runtimes with Persistent Memory: A Step-by-Step Cookbook

![MemoFS Agent Cookbook Cover](./memofs_agent_cookbook_cover_1785315146441.jpg)

> **Platforms**: Dev.to | X Article | Reddit (`r/ClaudeAI`, `r/ClaudeCode`, `r/OpenAI`, `r/LocalLLaMA`)  
> **Target Audience**: Developers using AI Coding CLIs/IDEs & Engineers Building Custom Agent Runtimes  
> **Key Callouts**:
> - Agent Cookbooks: [https://docs.memofs.dev/learn/cookbooks](https://docs.memofs.dev/learn/cookbooks)
> - Open Source Docs: [https://docs.memofs.dev](https://docs.memofs.dev)

---

Whether you use pre-built AI coding tools like **Claude Code**, **OpenAI Codex**, **OpenCode**, and **Cursor**, or you are **building custom autonomous agent runtimes** in TypeScript, every agent environment suffers from the same limitation:

- Every new chat or execution trajectory starts with zero knowledge of past decisions.
- Switching git branches or spawning subagents confuses the agent about active dependencies.
- When an agent compacts its context window to manage token limits, it erases the rules established earlier.

This guide is a practical cookbook for attaching **MemoFS**—the open-source, file-first memory runtime—to any AI coding agent or custom agent runtime in under two minutes.

---

## Cookbook Overview: How MemoFS Connects to Agents

MemoFS supports three integration patterns depending on your tool or framework:

```
┌───────────────────────────────────────────────────────────────────────────┐
│                          AI Agent Ecosystem                               │
└──────────────┬─────────────────────────────┬──────────────────────────────┘
               │                             │                              │
     (Agents with Hooks)            (Agents via MCP)           (Custom Agent Runtimes)
   Claude Code / Codex / OpenCode  Cursor / Copilot / Windsurf    TypeScript / LangChain / SDKs
               │                             │                              │
               ▼                             ▼                              ▼
     Lifecycle Hook Scripts           @memofs/mcp-server             @memofs/core SDK
   (SessionStart / Compaction)        (memofs.context / remember)    (memo.context() / writeMemory())
               │                             │                              │
               └─────────────────────────────┼──────────────────────────────┘
                                             │
                                             ▼
                                  .memofs/ Memory Store
                            (core.md, notes.md, recall index)
```

1. **Zero-Touch Hooks Mode** (Claude Code, OpenAI Codex, OpenCode): Automatically injects project context at session startup, propagates memory to subagents, and re-injects memory after context compaction.
2. **MCP Server Mode** (Cursor, GitHub Copilot, Windsurf, Gemini CLI): Connects via the Model Context Protocol, exposing standard memory tools (`memofs.context`, `memofs.remember`, `memofs.recall`).
3. **Programmatic Core SDK Mode** (Custom Agent Frameworks & Runtimes): Direct TypeScript SDK (`@memofs/core`) for agent engineers embedding memory natively into autonomous agent loops.

---

## Step 1: Initialize MemoFS in Your Repository

From the root of your project directory, run:

```bash
# Install the CLI globally or as a dev dependency
npm install -g @memofs/cli

# Initialize the .memofs/ memory runtime directory
npx memofs init
```

This creates the `.memofs/` directory containing your core briefing file (`.memofs/memory/core.md`), long-term notes (`.memofs/memory/notes.md`), derived search indexes, and entity graph files.

---

## Step 2: Configure Your Specific Agent or Runtime

### Option A: Claude Code & OpenAI Codex (Automatic Zero-Touch Hooks)

Generate the agent configuration and hook scripts with a single command:

```bash
npx memofs generate agent claude --project-name "My Application"
```

**What this configures automatically:**

- **Session Start Hook**: When you launch `claude` or `codex`, MemoFS queries your local memory store and injects a compact briefing (~6 KB) directly into the agent's initial prompt.
- **Subagent Hook**: When your main agent spawns subagents, the subagents automatically inherit the parent session's memory context.
- **Compaction-Survival Hook**: When the agent compacts its context window, MemoFS intercepts the event and re-injects core project rules—preventing memory loss during long sessions.
- **Session End Summary**: Outputs a quick compliance summary of memories accessed and persisted during the session.

### Option B: Cursor IDE (via MCP)

To wire MemoFS rules and MCP configuration into Cursor:

```bash
npx memofs generate agent cursor
```

This generates `.cursor/rules/memofs.mdc` and registers the MemoFS MCP server in `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "memofs": {
      "command": "npx",
      "args": ["-y", "@memofs/mcp-server"]
    }
  }
}
```

Now Cursor can natively invoke `memofs.context` at the start of composer tasks and call `memofs.remember` whenever you instruct it to save a decision.

### Option C: GitHub Copilot / VS Code

To configure VS Code and Copilot instructions and MCP server:

```bash
npx memofs generate agent copilot
```

This creates `.vscode/mcp.json` and adds memory management instructions to `.github/copilot-instructions.md`.

### Option D: Custom Agent Runtimes & Frameworks (via `@memofs/core` SDK)

If you are building custom AI agents in Node.js or TypeScript, install `@memofs/core` directly:

```bash
npm install @memofs/core
```

Instantiate the MemoFS engine inside your agent loop to fetch task-aware context briefings and persist learned facts:

```typescript
import { MemoFS } from "@memofs/core";
import { createNodeFsMemoryStore } from "@memofs/core/node-fs";

const memo = new MemoFS({
  store: createNodeFsMemoryStore({ rootDir: "." }),
  projectId: "custom-agent-app",
  mode: "local",
});

// Fetch system prompt briefing for custom LLM call
const { text } = await memo.context({ query: "Refactor payment service", taskType: "refactor" });

// Save decisions programmatically
await memo.writeMemory({ content: "Payment service uses Stripe v3 API", kind: "decision" });
```

---

## Step 3: Record Memories & Test Context Persistence

### Recording Memories via CLI

You can explicitly record project rules, architectural decisions, and stack constraints directly from your terminal:

```bash
# Record an architectural decision
npx memofs remember "We use PostgreSQL with Drizzle ORM for main storage, and Redis for session cache" --kind decision

# Record a technical constraint
npx memofs remember "Do not use Axios. All HTTP requests must use native fetch with custom retry wrappers" --kind constraint
```

### Automatic Memory Extraction During Agent Sessions

When working with your agent, instruct it naturally:

> **You**: *"We just refactored the auth module to use Argon2id instead of bcrypt. Remember this decision in MemoFS."*  
> **Agent**: *Calls `memofs.remember("Auth password hashing uses Argon2id", { kind: "decision" })` or `memo.writeMemory()`.*  
> **MemoFS**: *Sanitizes secrets, tags frontmatter metadata, and writes the record to `.memofs/memory/notes.md`.*

---

## Step 4: Verify Memory Health with `memofs doctor`

MemoFS includes a built-in diagnostic tool to verify store integrity, validate frontmatter schemas, and rebuild derived search indexes:

```bash
npx memofs doctor
```

```text
MemoFS doctor passed.
```

---

## Summary of Agent Support Matrix

| Agent Tool / Framework | Integration Mode | Context Auto-Load | Compaction Survival | Integration Method |
| :--- | :--- | :--- | :--- | :--- |
| **Claude Code** | Native Hooks | ✅ Automatic | ✅ Automatic | `npx memofs generate agent claude` |
| **OpenAI Codex** | Native Hooks | ✅ Automatic | ✅ Automatic | `npx memofs generate agent codex` |
| **OpenCode** | Plugin Hooks | ✅ Plugin-assisted | ✅ Session toast | `npx memofs generate agent opencode` |
| **Cursor** | MCP Server | 💡 Via MDC Rule | 💡 Rule-guided | `npx memofs generate agent cursor` |
| **Windsurf** | MCP Server | 💡 Via Rules | 💡 Rule-guided | `npx memofs generate agent windsurf` |
| **GitHub Copilot** | MCP Server | 💡 Instructions file | 💡 Instruction-guided | `npx memofs generate agent copilot` |
| **Custom TS Runtimes** | Core SDK | ✅ Programmatic | ✅ Programmatic | `npm install @memofs/core` |

---

## Next Steps & Further Reading

- **Official Agent Cookbooks**: Browse detailed setup guides for every coding agent at [https://docs.memofs.dev/learn/cookbooks](https://docs.memofs.dev/learn/cookbooks)
- **Core Documentation**: [https://docs.memofs.dev](https://docs.memofs.dev)
- **Deep Architecture Post**: Read how file-first memory works under the hood at [https://docs.memofs.dev/blog/the-memory-layer-for-any-ai-agent](https://docs.memofs.dev/blog/the-memory-layer-for-any-ai-agent)


