# AI SDK example

Expose TekMemo memory as a scoped AI SDK-compatible tool.

## What this example demonstrates

- creates a local file-backed memory store
- creates a local TekMemo AI runtime
- creates an AI SDK-compatible memory tool with `createTekMemoTool()`
- executes a scoped `remember` command
- builds a memory-aware system prompt with `buildTekMemoSystemPrompt()`

## Install

```bash
pnpm install
```

## Run

```bash
pnpm --filter @tekmemo/example-ai-sdk dev
```

## Packages used

```bash
pnpm add @tekmemo/ai-sdk tekmemo @tekmemo/fs ai zod
```

## Safety notes

- Never put `TEKMEMO_API_KEY` in browser-side code.
- Use `@tekmemo/cloud-client` only from server routes, CLI tools, MCP runtimes, workers, or trusted backend code.
- Enable `allowWrites` only when the agent is supposed to create durable memory.
- Enable `allowCoreUpdates` only for controlled maintenance workflows.
