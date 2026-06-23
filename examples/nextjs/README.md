# TekMemo + Next.js (App Router)

A memory-augmented chat API built with TekMemo and the [Vercel AI SDK](https://sdk.vercel.ai),
exposed as a Next.js App Router **route handler**. Demonstrates the recommended
"context-first + tool-augmented" pattern in a real HTTP server context.

## What it shows

- **Per-conversation memory** — each conversation gets its own scoped TekMemo
  instance, so memory is isolated by `conversationId`.
- **Context-first** — `buildRuntimeMemoryContext` reads core memory + recent
  notes + a hybrid recall of the user's message *before* generation, and folds
  it into the system prompt.
- **Tool-augmented** — `buildRuntimeMemoryToolDefinition` lets the model recall
  more and record durable facts during multi-step reasoning.
- **One intelligent engine** — recall always flows through the TekMemo hybrid
  engine (BM25 + fuzzy + embeddings + recency + reranker), never a naive search.

## Files

```
nextjs/
├── app/
│   └── api/
│       └── chat/
│           └── route.ts   # POST /api/chat — streaming memory-augmented chat
├── README.md              # this file
```

## Run it

This example is meant to be copied into a Next.js app. From a fresh
[Next.js](https://nextjs.org) project (App Router):

```bash
npm install @tekbreed/tekmemo ai @ai-sdk/openai
```

Add `app/api/chat/route.ts` from this folder, then:

```bash
npm run dev
```

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"conversationId":"demo","message":"What do you remember?"}'
```

Set `OPENAI_API_KEY` in your environment.

## How memory is scoped

```ts
const access = { projectId: "my-next-app", userId, conversationId };
```

The `AiMemoryAccessContext` (`projectId`, `userId`, `conversationId`,
`workspaceId`, `tenantId`) controls read/write visibility. Pass it as `access`
to both helpers — TekMemo enforces the scope on every read and write.

## See also

- [The `Tekmemo` client](https://docs.memo.tekbreed.com/packages/tekmemo/client)
- [AI SDK tools guide](https://docs.memo.tekbreed.com/packages/tekmemo/ai-sdk/tools)
- [AI SDK agent patterns](https://docs.memo.tekbreed.com/packages/tekmemo/ai-sdk/agent-patterns)
