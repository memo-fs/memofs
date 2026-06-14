# `@tekbreed/tekmemo-tanstack-ai`

## Purpose

`@tekbreed/tekmemo-tanstack-ai` exposes TekMemo memory operations as TanStack AI-compatible tools.

It is similar in purpose to `@tekbreed/tekmemo/ai-sdk`, but it targets TanStack AI's `toolDefinition()` architecture.

## Decision

We should support TanStack AI, but as an optional integration package.

It should not replace:

```txt
@tekbreed/tekmemo/ai-sdk
```

It should sit beside it:

```txt
@tekbreed/tekmemo/ai-sdk
@tekbreed/tekmemo-tanstack-ai
```

## Why it is needed

TanStack AI provides:

- framework-agnostic AI primitives
- streaming chat
- provider adapters
- type-safe tool definitions
- isomorphic tools with server/client implementations
- React and Solid integrations
- support for React Router v7 loaders/actions

That maps well to TekMemo because TekMemo is supposed to be AI-runtime portable.

## What the package owns

```txt
TanStack AI tool definitions
TanStack AI server tool implementations
JSON Schema input/output definitions
runtime validation
memory path safety
mutation approval defaults
```

## What the package must not own

```txt
.tekmemo protocol implementation
filesystem storage
AgentFS storage
recall providers
embedding providers
reranking providers
billing
BYOK encryption
cloud tenancy
```

## Tools

```txt
tekmemo_read_memory
tekmemo_write_memory
tekmemo_append_note
tekmemo_record_event
tekmemo_search_memory
```

## Default approval policy

| Tool | Approval |
|---|---:|
| `tekmemo_read_memory` | No |
| `tekmemo_search_memory` | No |
| `tekmemo_write_memory` | Yes |
| `tekmemo_append_note` | Yes |
| `tekmemo_record_event` | Yes |

## Usage

```ts
import { chat, toolDefinition } from "@tanstack/ai";
import { openaiText } from "@tanstack/ai-openai";
import { createTekMemoTanStackTools } from "@tekbreed/tekmemo-tanstack-ai";

const tools = createTekMemoTanStackTools({
  toolDefinition,
  runtime: {
    read(path) {
      return store.read(path);
    },
    write(path, content) {
      return store.write(path, content);
    },
    append(path, content) {
      return store.append(path, content);
    },
    searchMemory(input) {
      return recall.search(input);
    }
  }
});

const stream = chat({
  adapter: openaiText("gpt-5.2"),
  messages,
  tools,
  systemPrompts: [
    "Use TekMemo tools only when memory is needed."
  ]
});
```

## Stability strategy

TanStack AI is still moving quickly.

To reduce lock-in, `@tekbreed/tekmemo-tanstack-ai` should not hard-import `toolDefinition`.

Instead, the host application passes it in:

```ts
createTekMemoTanStackTools({
  toolDefinition,
  runtime
});
```

This keeps the package useful even if TanStack AI changes internal exports.

## Edge cases handled

- invalid `toolDefinition`
- invalid runtime shape
- unsupported memory paths
- readonly path writes
- oversized memory writes
- oversized notes
- unavailable search runtime
- invalid `topK`
- circular metadata
- prototype-pollution metadata keys
- runtime failure wrapping

## Release position

This package belongs in **Build Next**, not Build Now.

Reason:

- Build Now already has `@tekbreed/tekmemo/ai-sdk`.
- TanStack AI support improves adoption and runtime portability.
- It should not delay the survival launch.
