# AI SDK agent patterns

The goal of memory in an agent is **intelligence that compounds**: each turn
starts from everything the agent has previously learned, and every durable
decision gets persisted so the next turn is smarter. TekMemo supports this with
two complementary primitives:

- **Context-first** — inject relevant memory into the system prompt *before*
  generation with `buildRuntimeMemoryContext()`.
- **Tool-augmented** — hand the model a memory tool
  (`buildRuntimeMemoryToolDefinition()`) so it can recall and remember *during*
  multi-step reasoning.

Use them together. Context-first makes the first response good; the tool keeps
the agent correct across many steps.

## Recommended flow

```text
User turn
   │
   ├─ 1. buildRuntimeMemoryContext()  → memory-aware system prompt
   │     (core memory + notes + recall, scope-filtered)
   │
   ├─ 2. generateText / streamText with the memory tool
   │     (model may recall more, read core, and remember durable facts)
   │
   └─ 3. (optional) background consolidation: index + snapshot
```

## Full pattern

```ts
import { generateText, stepCountIs } from "ai";
import { openai } from "@ai-sdk/openai";
import { Tekmemo } from "@tekbreed/tekmemo";
import {
  buildRuntimeMemoryContext,
  buildRuntimeMemoryToolDefinition,
  createAiSdkRuntimeFromTekmemo,
} from "@tekbreed/tekmemo-adapter-ai-sdk";

const memo = new Tekmemo({ rootDir: "./.tekmemo", projectId: "demo" });
const runtime = createAiSdkRuntimeFromTekmemo(memo);

const access = { projectId: "demo", userId: "user_123" };

async function agentTurn(userPrompt: string) {
  // 1. Context-first: ground the model in existing memory.
  const { text: system } = await buildRuntimeMemoryContext({
    runtime,
    access,
    query: userPrompt,
    baseInstructions:
      "You are a senior engineer. Use memory before answering. " +
      "Only persist durable, non-secret decisions.",
  });

  // 2. Tool-augmented: let the model recall and remember during reasoning.
  const { text } = await generateText({
    model: openai("gpt-4.1-mini"),
    system,
    prompt: userPrompt,
    tools: {
      memory: buildRuntimeMemoryToolDefinition({
        runtime,
        access,
        allowWrites: true,
      }),
    },
    stopWhen: stepCountIs(6),
  });

  return text;
}
```

## Streaming the response

The same memory primitives work with `streamText` — the context-first block
still runs before generation, and the tool is still available during the stream.
This is the shape to reach for in chat UIs:

```ts
import { streamText, stepCountIs } from "ai";
import { openai } from "@ai-sdk/openai";
import { Tekmemo } from "@tekbreed/tekmemo";
import {
  buildRuntimeMemoryContext,
  buildRuntimeMemoryToolDefinition,
  createAiSdkRuntimeFromTekmemo,
} from "@tekbreed/tekmemo-adapter-ai-sdk";

const memo = new Tekmemo({ rootDir: "./.tekmemo", projectId: "demo" });
const runtime = createAiSdkRuntimeFromTekmemo(memo);
const access = { projectId: "demo", userId: "user_123" };

export async function streamAgentTurn(userPrompt: string) {
  const { text: system } = await buildRuntimeMemoryContext({
    runtime,
    access,
    query: userPrompt,
    baseInstructions: "You are a senior engineer. Use memory before answering.",
  });

  const result = streamText({
    model: openai("gpt-4.1-mini"),
    system,
    prompt: userPrompt,
    tools: {
      memory: buildRuntimeMemoryToolDefinition({ runtime, access, allowWrites: true }),
    },
    stopWhen: stepCountIs(6),
  });

  return result.textStream; // pipe to your UI
}
```

## Before answering: recall

When the user's message arrives, `buildRuntimeMemoryContext` already runs a
recall over `query: userPrompt`. For deeper, targeted retrieval the model can
call the tool directly:

```ts
{ command: "recall", query: "auth token rotation policy", topK: 8 }
```

Recall always routes through the same TekMemo hybrid engine, regardless of
mode: **BM25 + fuzzy token matching**, a **vector channel** (when an embedder is
configured), a **recency boost**, and an optional **reranker**. The model gets
ranked, explainable hits — not raw keyword grep. The engine runs locally over
your `.tekmemo/` files in every mode; in hybrid mode the cloud mirrors those
files across machines but does not run its own engine. No mode degrades to
plain text search.

## After durable decisions: remember

Only persist facts that will still matter later — architectural decisions,
constraints, stable preferences. Let ephemeral state die with the conversation.

```ts
{ command: "remember",
  kind: "decision",
  title: "Use HTTP-only cookies for sessions",
  content: "Sessions are stored in HTTP-only, SameSite=Lax cookies; no localStorage tokens.",
  tags: ["auth", "security"],
  confidence: 0.9,
}
```

::: warning Never persist secrets
With `allowSecrets` left off (the default), the tool blocks content matching
common key/secret patterns. Do not store credentials, tokens, or PII in memory.
:::

## Scoping

`access` controls what an agent can read and write. TekMemo filters both reads
and writes by scope metadata, so a per-user agent can't read another user's
private notes and a project agent can't leak across projects.

| Scope | Read | Write |
| --- | --- | --- |
| `project` / `workspace` | shared project memory | shared project notes |
| `user` | the calling user's private notes | the calling user's notes |
| `conversation` | this conversation only | this conversation only |

Provide `userId` / `conversationId` in `access` to enable finer scopes.

## Local mode vs. hybrid mode

The runtime is identical in both modes — `createAiSdkRuntimeFromTekmemo(memo)`
delegates every call to the `Tekmemo` class, so recall, context, and writes use
the **same hybrid engine** everywhere. Only the backing store differs:

- **Local mode** — `new Tekmemo({ rootDir: "./.tekmemo", ... })`. Memory lives in
  files in your repo. Best for repository-bound coding agents and local-first
  apps. No API keys, works offline. The hybrid engine runs with whatever
  channels are configured locally (BM25 + fuzzy always; vectors + reranker when
  an embedder/reranker is provided).
- **Hybrid mode** — `new Tekmemo({ ... cloud: { ... } })`. The same local
  engine, plus a cloud client that mirrors your `.tekmemo/` files across
  machines by path + sha256. The cloud is a file replica, not a hosted engine,
  so there is no separate "hosted recall" — recall reads the synced local files.
  Use hybrid when you need the same memory on multiple machines. Same tool and
  context helpers; only the `Tekmemo` construction changes.

```ts
// local
const memo = new Tekmemo({ rootDir: "./.tekmemo", projectId: "demo" });
// hybrid (cloud mirrors the local files)
const hybridMemo = new Tekmemo({
  projectId: "demo",
  mode: "hybrid",
  cloud: {
    baseUrl: "https://memo.tekbreed.com/api/v1",
    apiKey: process.env.TEKMEMO_API_KEY!,
  },
});

const runtime = createAiSdkRuntimeFromTekmemo(memo); // or hybridMemo
```

The rest of the agent code is unchanged.

## Memory intelligence checklist

- [ ] Context-first on every turn (`buildRuntimeMemoryContext`)
- [ ] Tool available for in-turn recall + writes (`buildRuntimeMemoryToolDefinition`)
- [ ] Multi-step reasoning enabled (`stopWhen: stepCountIs(N)`)
- [ ] Scope set via `access` (`projectId`, and `userId`/`conversationId` where relevant)
- [ ] Writes gated to intentional steps (`allowWrites`, never `allowSecrets`)
- [ ] Periodic `index` + `snapshot` for vector recall and rollback
