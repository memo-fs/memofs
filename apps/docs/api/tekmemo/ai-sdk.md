# AI SDK Module

The AI SDK module provides Vercel AI SDK helpers for integrating TekMemo memory tools into `generateText`, `streamText`, and agent workflows.

## Installation

The AI SDK helpers live in the **`@tekbreed/tekmemo-adapter-ai-sdk`** adapter package.
Install it alongside core and the Vercel AI SDK peer dependency:

```bash
npm install @tekbreed/tekmemo @tekbreed/tekmemo-adapter-ai-sdk ai
```

## Import

The AI SDK helpers are imported from the adapter package; `Tekmemo` and the
`TekMemoMemoryRuntime` contract come from core:

```ts
import { Tekmemo } from "@tekbreed/tekmemo";
import {
  buildRuntimeMemoryToolDefinition,
  buildRuntimeMemoryContext,
  runRuntimeMemoryTool,
  createAiSdkRuntimeFromTekmemo,
  buildAgentSessionInstructions,
} from "@tekbreed/tekmemo-adapter-ai-sdk";
```

## Purpose

Use this package to expose TekMemo memory as AI SDK tools. The module provides:

- `buildRuntimeMemoryToolDefinition()` for a ready-to-use AI SDK tool with memory operations
- `runRuntimeMemoryTool()` for executing memory tool commands with scope enforcement
- `createAiSdkRuntimeFromTekmemo()` for adapting a `Tekmemo` instance to the AI SDK runtime contract
- `buildRuntimeMemoryContext()` for building memory-aware context (system prompt)
- `buildAgentSessionInstructions()` for agent session instruction blocks
- Scope enforcement for project, user, conversation, and participant memory

## Quick start with Tekmemo

The [`Tekmemo`](./tekmemo) class is the recommended way to set up memory. Pass
the instance to `createAiSdkRuntimeFromTekmemo()` and every runtime call —
recall, context, writes — is delegated back to the `Tekmemo` class, so you get
the full hybrid engine rather than a naive search:

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
  stopWhen: stepCountIs(6),
});
```

## Cloud-backed tools

For cloud-backed memory, construct a `Tekmemo` client in hybrid mode with a cloud
client (the cloud is a file replica — there is no `mode: "cloud"`) and pass it to the same
factory. The agent code does not change:

```ts
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { Tekmemo, createTekMemoCloudClient } from "@tekbreed/tekmemo";
import {
  createAiSdkRuntimeFromTekmemo,
  buildRuntimeMemoryContext,
  buildRuntimeMemoryToolDefinition,
} from "@tekbreed/tekmemo-adapter-ai-sdk";

const memo = new Tekmemo({
  mode: "hybrid",
  projectId: "proj_123",
  rootDir: "./.tekmemo",
  cloudClient: createTekMemoCloudClient({
    baseUrl: "https://memo.tekbreed.com/api/v1",
    apiKey: process.env.TEKMEMO_API_KEY!,
  }),
});

const runtime = createAiSdkRuntimeFromTekmemo(memo);
const access = { projectId: "proj_123", userId: "user_123" };

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

## Direct usage (advanced)

`createAiSdkRuntimeFromTekmemo()` is the supported entry point — it delegates
recall and writes to the `Tekmemo` class. There is intentionally no lower-level
"runtime from a raw store" factory: bypassing `Tekmemo` would lose the hybrid
recall engine, so we recommend always constructing a `Tekmemo` instance first.

## See also

- [`Tekmemo` client](./tekmemo) for the primary API surface
- [AI SDK Tools guide](/packages/tekmemo/ai-sdk/tools) for detailed tool configuration
