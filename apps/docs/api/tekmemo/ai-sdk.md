# AI SDK Module

The AI SDK module provides Vercel AI SDK helpers for integrating TekMemo memory tools into `generateText`, `streamText`, and agent workflows.

## Installation

Ensure you install the Vercel AI SDK peer dependency alongside the main package:

```bash
npm install ai @tekbreed/tekmemo
```

## Import

All AI SDK helper APIs are imported directly from `@tekbreed/tekmemo`:

```ts
import {
  buildRuntimeMemoryToolDefinition,
  buildRuntimeMemoryContext,
  runRuntimeMemoryTool,
  createLocalAiSdkRuntime,
  buildAgentSessionInstructions,
} from "@tekbreed/tekmemo";
```

## Purpose

Use this package to expose TekMemo memory as AI SDK tools. The module provides:

- `buildRuntimeMemoryToolDefinition()` for a ready-to-use AI SDK tool with memory operations
- `runRuntimeMemoryTool()` for executing memory tool commands with scope enforcement
- `createLocalAiSdkRuntime()` for local file-backed memory runtime
- `buildRuntimeMemoryContext()` for building memory-aware context (system prompt)
- `buildAgentSessionInstructions()` for agent session instruction blocks
- Scope enforcement for project, user, conversation, and participant memory

## Quick start with Tekmemo

The [`Tekmemo`](./tekmemo) class is the recommended way to set up the memory store. Pass its `store` property to the AI SDK runtime:

```ts
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import {
  Tekmemo,
  buildRuntimeMemoryContext,
  buildRuntimeMemoryToolDefinition,
  createLocalAiSdkRuntime,
} from "@tekbreed/tekmemo";

const memo = new Tekmemo({ rootDir: "./.tekmemo", projectId: "demo" });
const runtime = createLocalAiSdkRuntime({ workspace: memo.store });
const access = { projectId: "demo", userId: "user_123" };

const { text: system } = await buildRuntimeMemoryContext({
  runtime,
  access,
  query: prompt,
  baseInstructions: "You are a helpful assistant.",
});

await generateText({
  model: openai("gpt-4.1-mini"),
  system,
  prompt,
  tools: {
    memory: buildRuntimeMemoryToolDefinition({ runtime, access, allowWrites: true }),
  },
});
```

## Cloud-backed tools

For cloud-backed memory tools, construct a `Tekmemo` client in cloud mode:

```ts
import { Tekmemo } from "@tekbreed/tekmemo";

const memo = new Tekmemo({
  mode: "cloud",
  projectId: "proj_123",
  cloud: {
    baseUrl: "https://api.tekbreed.com/memo/v1",
    apiKey: process.env.TEKMEMO_API_KEY!,
  },
});
```

Then use `memo.store` or `memo.cloud` with the appropriate AI SDK runtime adapter.

## Direct usage (advanced)

If you need to bypass `Tekmemo` and wire the AI SDK helpers manually, you can use the store directly:

```ts
import { createNodeFsMemoryStore, createLocalAiSdkRuntime } from "@tekbreed/tekmemo";

const store = createNodeFsMemoryStore({ rootDir: "./.tekmemo" });
const runtime = createLocalAiSdkRuntime({ workspace: store });
```

## See also

- [`Tekmemo` client](./tekmemo) for the primary API surface
- [AI SDK Tools guide](/packages/tekmemo/ai-sdk/tools) for detailed tool configuration
