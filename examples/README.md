# MemoFS Examples

Runnable, end-to-end examples for building memory-augmented agents with MemoFS.

## Prerequisites

From the repo root, install dependencies and build the packages once:

```bash
pnpm install
pnpm packages:build
```

## Examples

### AI SDK agent — [`ai-sdk/agent.ts`](./ai-sdk/agent.ts)

A memory-augmented agent built with the [Vercel AI SDK](https://sdk.vercel.ai).
Demonstrates the recommended "intelligent memory" pattern end to end:

- **Context-first** — `buildRuntimeMemoryContext` grounds the model in core
  memory, recent notes, and a hybrid recall of the user's message *before*
  generation.
- **Tool-augmented** — `buildRuntimeMemoryToolDefinition` lets the model recall
  more, read core memory, and record durable facts *during* multi-step
  reasoning.
- **Single intelligent engine** — the runtime is built with
  `createAiSdkRuntimeFromMemoFS`, so every recall flows through the MemoFS
  hybrid engine (BM25 + fuzzy + embeddings + recency boost + reranker), not a
  naive text search.

#### Run it

```bash
export OPENAI_API_KEY="sk-..."

# uses a default prompt
pnpm --filter @memofs/examples ai-sdk:agent

# or pass your own
pnpm --filter @memofs/examples ai-sdk:agent "How should we handle session auth?"
```

Memory is written to `examples/.memofs/`. Re-run the example and it will
recall what it learned on the previous run — that's durable, compounding
memory.

### OpenAI Agents SDK agent — [`openai-agents-sdk/agent.ts`](./openai-agents-sdk/agent.ts)

The same memory-augmented pattern built with the [OpenAI Agents SDK](https://github.com/openai/openai-agents-js)
for TypeScript (`@openai/agents`). MemoFS memory is surfaced as SDK `tool()`
calls — `recall_memory` and `remember` — so the agent reads durable context and
records new facts during a run.

```bash
export OPENAI_API_KEY="sk-..."
pnpm --filter @memofs/examples openai-agents:agent
```

### Next.js (App Router) chat API — [`nextjs/`](./nextjs/)

A memory-augmented **HTTP chat endpoint** (`POST /api/chat`) using MemoFS + the
Vercel AI SDK in a Next.js route handler. Demonstrates per-`conversationId`
scoped memory in a real server context. This example is meant to be copied into
a Next.js app — see [`nextjs/README.md`](./nextjs/README.md) for setup.

### MCP coding-agent setup — [`mcp-coding-agent/`](./mcp-coding-agent/)

Give your daily coding agent (Cursor, Claude Code, Codex, Copilot, Gemini)
persistent MemoFS memory over MCP. Covers `memofs init`, `memofs generate
agent-rules` for each agent, and the per-platform MCP config. This is MemoFS's
differentiator for **local daily builders** — memory that lives in your repo,
not a vendor database. See [`mcp-coding-agent/README.md`](./mcp-coding-agent/README.md).

### Self-host the `memofs-server` runtime — [`server/`](./server/)

Run the **same** memory engine MemoFS Cloud runs, on your own infra — a single
Node process (Fly / Railway / VPS) or a Cloudflare Worker. Bring your own blob
store (R2-compatible), metadata store (Turso/libSQL), and providers; the engine
is identical. Covers the JSON-RPC runtime API, the write-gate, and the canonical
self-host bundle. See [`server/README.md`](./server/README.md).

## See also

- [AI SDK Tools guide](https://docs.memofs.dev/packages/ai-sdk/tools)
- [AI SDK Agent patterns](https://docs.memofs.dev/packages/ai-sdk/agent-patterns)
- [The `MemoFS` client](https://docs.memofs.dev/packages/client)
