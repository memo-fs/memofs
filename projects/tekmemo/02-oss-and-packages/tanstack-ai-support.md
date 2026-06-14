# TanStack AI Support Decision

## Decision

TekMemo should support TanStack AI through a dedicated optional package:

```txt
@tekbreed/tekmemo-tanstack-ai
```

This package is needed, but it should not replace:

```txt
@tekbreed/tekmemo/ai-sdk
```

## Reason

TanStack AI and Vercel AI SDK overlap, but they do not expose the same integration surface.

TanStack AI uses:

```txt
toolDefinition()
.server()
.client()
```

while the existing AI SDK integration uses AI SDK-style tool definitions.

TekMemo should support both because the project goal is:

```txt
developer-owned memory infrastructure for AI apps and agents
```

not:

```txt
memory tied to one AI SDK
```

## Position in roadmap

Move `@tekbreed/tekmemo-tanstack-ai` into **Build Next**.

It improves adoption and ecosystem coverage, but it should not block the first survival launch.

## Package list update

AI runtime integrations:

```txt
@tekbreed/tekmemo/ai-sdk
@tekbreed/tekmemo-tanstack-ai
```

## What gets exposed

```txt
tekmemo_read_memory
tekmemo_write_memory
tekmemo_append_note
tekmemo_record_event
tekmemo_search_memory
```

## Safety defaults

- read/search are enabled without approval
- write/append/event tools require approval
- only allowlisted `.tekmemo/` paths are accessible
- readonly protocol files cannot be overwritten
- memory writes have byte limits
- search `topK` has a cap
- metadata is validated

## Why not put this inside `@tekbreed/tekmemo`

Because `@tekbreed/tekmemo` is the runtime contract.

Runtime-specific integrations belong in separate packages.
