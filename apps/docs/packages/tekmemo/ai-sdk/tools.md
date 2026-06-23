# AI SDK memory tool

TekMemo exposes **one** AI SDK-compatible memory tool via
`buildRuntimeMemoryToolDefinition()`. It is a single multi-command tool that
lets a model read project memory, recall relevant notes, and (optionally)
record new facts — all behind TekMemo's scope and permission model.

These helpers are exported from `@tekbreed/tekmemo-adapter-ai-sdk` and are built on the
`TekMemoMemoryRuntime` interface. Build the runtime with
`createAiSdkRuntimeFromTekmemo(memo)` and it works identically against a local
filesystem store, a TekMemo Cloud-backed client, or a hybrid setup — recall
always goes through the same intelligent engine.

## Helpers

| Helper | Purpose |
| --- | --- |
| `buildRuntimeMemoryToolDefinition(options)` | Returns an AI SDK tool definition (`{ description, inputSchema, execute }`) that dispatches to the memory runtime. |
| `runRuntimeMemoryTool(options, input)` | Imperatively execute a single memory command (the same logic the tool runs). Useful in tests or non-LLM code paths. |
| `createAiSdkRuntimeFromTekmemo(memo)` | Build a `TekMemoMemoryRuntime` backed by a `Tekmemo` client. The recommended way to create a runtime — local, hybrid, or cloud-backed. |

## Tool commands

The tool accepts a discriminated `command` field. Each command is gated by a
permission flag so you only expose what an agent is allowed to do.

| Command | Action | Gated by |
| --- | --- | --- |
| `read_core_memory` | Read the project's core memory document. | always available |
| `update_core_memory` | Overwrite the core memory document. | `allowCoreUpdates` |
| `remember` | Append a timestamped note (`kind`, `title`, `tags`, `confidence`, `scope`, `visibility`, `metadata`). | `allowWrites` |
| `list_notes` | List recent notes, optionally filtered by `kind` or `tag`. | always available |
| `recall` | Hybrid memory search (`query`, `topK`, `strategy`, `rerank`) — BM25 + fuzzy + embeddings + recency boost. | always available |
| `build_context` | Compile a context block (core + notes + recall) for a prompt. | always available |
| `index` | Re-index memory for vector recall (`mode`, `force`). | `allowIndexing` |

::: note Indexing
The local `Tekmemo` client indexes implicitly on every write (best-effort), so
the `index` command is only meaningful against runtimes that expose an explicit
re-index operation. A runtime built with `createAiSdkRuntimeFromTekmemo` does
**not** expose `index`, and the tool throws a clear "not supported" error if
the model calls it.
:::

## Options

`buildRuntimeMemoryToolDefinition` accepts a `RuntimeMemoryToolOptions` object:

| Option | Default | Description |
| --- | --- | --- |
| `runtime` | — | A `TekMemoMemoryRuntime`, from `createAiSdkRuntimeFromTekmemo(memo)`. |
| `access` | — | Scope context: `{ projectId, workspaceId?, tenantId?, userId?, conversationId? }`. Drives read/write scope filtering. |
| `allowWrites` | `false` | Enable the `remember` command. |
| `allowCoreUpdates` | `false` | Enable the `update_core_memory` command. |
| `allowIndexing` | `false` | Enable the `index` command. |
| `allowSecrets` | `false` | Skip the built-in secret-pattern check on written content. Leave off. |
| `maxContentChars` | `50000` | Cap on content the tool will accept or write per call. |

::: tip Content safety
With `allowSecrets` off (the default), the tool rejects content that looks like
private keys or provider API keys before it ever touches memory. Keep it off
unless you have an explicit, reviewed reason to store sensitive material.
:::

## Minimal example

```ts
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { Tekmemo } from "@tekbreed/tekmemo";
import {
  buildRuntimeMemoryToolDefinition,
  createAiSdkRuntimeFromTekmemo,
} from "@tekbreed/tekmemo-adapter-ai-sdk";

const memo = new Tekmemo({ rootDir: "./.tekmemo", projectId: "demo" });
const runtime = createAiSdkRuntimeFromTekmemo(memo);

const result = await generateText({
  model: openai("gpt-4.1-mini"),
  prompt: "What have we decided about the auth module?",
  tools: {
    // You choose the tool key. The model sees one memory tool.
    memory: buildRuntimeMemoryToolDefinition({
      runtime,
      access: { projectId: "demo", userId: "user_123" },
      allowWrites: true,
    }),
  },
});
```

## Read-only vs. writable tools

Expose **read-only** tools for user-facing agents that must not mutate memory:

```ts
const readOnlyMemory = buildRuntimeMemoryToolDefinition({
  runtime,
  access: { projectId: "demo" },
  // allowWrites / allowCoreUpdates / allowIndexing all default to false
});
```

Enable writes only where durable memory creation is intentional and reviewed —
for example, a background "memory consolidation" step, not a live chat turn.

## Imperative usage (without an LLM)

For code paths that don't go through the model, call the runtime methods
directly. `createAiSdkRuntimeFromTekmemo` returns a `TekMemoMemoryRuntime`, so
recall and reads are plain async calls:

```ts
import { Tekmemo } from "@tekbreed/tekmemo";
import { createAiSdkRuntimeFromTekmemo } from "@tekbreed/tekmemo-adapter-ai-sdk";

const memo = new Tekmemo({ rootDir: "./.tekmemo", projectId: "demo" });
const runtime = createAiSdkRuntimeFromTekmemo(memo);

// recall returns ranked, scope-filtered hits
const { items } = await runtime.recall({
  query: "database choice",
  topK: 5,
  filters: { projectId: "demo" },
});
```

This is the same path `buildRuntimeMemoryToolDefinition` dispatches to under
the hood — there is no separate imperative helper to remember.

## Multi-step (agentic) usage

To let a model reason across several turns of memory access, combine the tool
with the AI SDK's `stopWhen`:

```ts
import { generateText, stepCountIs } from "ai";

await generateText({
  model: openai("gpt-4.1-mini"),
  prompt,
  tools: {
    memory: buildRuntimeMemoryToolDefinition({
      runtime,
      access: { projectId: "demo" },
      allowWrites: true,
    }),
  },
  stopWhen: stepCountIs(6),
});
```

See [Agent patterns](./agent-patterns) for the recommended context-first +
tool-augmented flow.
