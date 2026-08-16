---
title: "How to use MemoFS with Vercel AI SDK"
date: "2026-08-05"
estimatedMinutes: 5
description: "Integrate MemoFS file-first memory with Vercel AI SDK agents and generative UI workflows."
---

# How to use MemoFS with Vercel AI SDK

This cookbook shows you how to integrate MemoFS with the **Vercel AI SDK** (`ai`) to provide memory-augmented tool calling and automatic prompt context injection.

## Prerequisites

- **Node.js**: `>= 22.0.0`
- `@memofs/core` and `@memofs/adapter-ai-sdk`
- `@ai-sdk/openai` (or any Vercel AI SDK model provider)

## Installation

::: code-group

```sh [pnpm]
pnpm add @memofs/core @memofs/adapter-ai-sdk ai @ai-sdk/openai zod
```

```sh [npm]
npm install @memofs/core @memofs/adapter-ai-sdk ai @ai-sdk/openai zod
```

```sh [yarn]
yarn add @memofs/core @memofs/adapter-ai-sdk ai @ai-sdk/openai zod
```

```sh [bun]
bun add @memofs/core @memofs/adapter-ai-sdk ai @ai-sdk/openai zod
```

:::

## Recipe 1: Tool-Calling Memory Integration

Bridge your MemoFS instance to the AI SDK runtime using `createAiSdkRuntimeFromMemoFS` and generate a tool definition with `buildRuntimeMemoryToolDefinition`:

::: code-group

```ts [createNodeMemoFs (Recommended)]
import { createNodeMemoFs } from "@memofs/core/node-fs";
import {
  createAiSdkRuntimeFromMemoFS,
  buildRuntimeMemoryToolDefinition,
} from "@memofs/adapter-ai-sdk";
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";

// 1. Initialize MemoFS and bridge to AI SDK runtime
const memo = createNodeMemoFs({ rootDir: "." });
const runtime = createAiSdkRuntimeFromMemoFS(memo);

// 2. Create Vercel AI SDK compatible tool definition
const memoryTool = buildRuntimeMemoryToolDefinition({
  runtime,
  allowWrites: true,
  allowCoreUpdates: false,
});

// 3. Pass tool to generateText
const { text } = await generateText({
  model: openai("gpt-4o"),
  tools: {
    memory: memoryTool,
  },
  maxSteps: 3,
  prompt: "What were our architectural decisions regarding database migrations?",
});

console.log(text);
```

```ts [MemoFS Class]
import { MemoFS } from "@memofs/core";
import { createNodeFsMemoryStore } from "@memofs/core/node-fs";
import {
  createAiSdkRuntimeFromMemoFS,
  buildRuntimeMemoryToolDefinition,
} from "@memofs/adapter-ai-sdk";
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";

const memo = new MemoFS({
  store: createNodeFsMemoryStore({ rootDir: "." }),
  projectId: "my-ai-app",
  mode: "local",
});

const runtime = createAiSdkRuntimeFromMemoFS(memo);
const memoryTool = buildRuntimeMemoryToolDefinition({
  runtime,
  allowWrites: true,
});

const { text } = await generateText({
  model: openai("gpt-4o"),
  tools: {
    memory: memoryTool,
  },
  maxSteps: 3,
  prompt: "What were our architectural decisions regarding database migrations?",
});

console.log(text);
```

:::

## Recipe 2: Inject Context at Request Start

Inject relevant project memory into the system prompt before calling the model using `memo.context()`:

::: code-group

```ts [createNodeMemoFs (Recommended)]
import { createNodeMemoFs } from "@memofs/core/node-fs";
import { streamText } from "ai";
import { openai } from "@ai-sdk/openai";

const memo = createNodeMemoFs({ rootDir: "." });

// Fetch task-relevant memory briefing
const memoryContext = await memo.context({
  query: "Refactoring user authentication middleware",
  taskType: "coding",
  maxChars: 4000,
});

const result = streamText({
  model: openai("gpt-4o"),
  system: `You are a Senior Full-Stack Engineer.
  
Follow the team's canonical memory rules below:
${memoryContext.text}`,
  prompt: "How should I structure the token refresh handler?",
});

for await (const chunk of result.textStream) {
  process.stdout.write(chunk);
}
```

```ts [MemoFS Class]
import { MemoFS } from "@memofs/core";
import { createNodeFsMemoryStore } from "@memofs/core/node-fs";
import { streamText } from "ai";
import { openai } from "@ai-sdk/openai";

const memo = new MemoFS({
  store: createNodeFsMemoryStore({ rootDir: "." }),
  projectId: "my-ai-app",
  mode: "local",
});

const memoryContext = await memo.context({
  query: "Refactoring user authentication middleware",
  taskType: "coding",
  maxChars: 4000,
});

const result = streamText({
  model: openai("gpt-4o"),
  system: `You are a Senior Full-Stack Engineer.

Follow the team's canonical memory rules below:
${memoryContext.text}`,
  prompt: "How should I structure the token refresh handler?",
});

for await (const chunk of result.textStream) {
  process.stdout.write(chunk);
}
```

:::

## Related Resources

* [Vercel AI SDK Adapter Reference](/adapters/ai-sdk)
* [Core Concepts & Memory Layers](/core/concepts)
* [Hybrid Recall & Semantic Search](/core/recall)
