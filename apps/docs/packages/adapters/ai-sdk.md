# Vercel AI SDK Adapter (`@memofs/adapter-ai-sdk`)

The `@memofs/adapter-ai-sdk` adapter provides a runtime bridge and tool definitions to seamlessly integrate MemoFS memory into Vercel AI SDK applications.

## Installation

::: code-group

```sh [npm]
npm install @memofs/adapter-ai-sdk
```

```sh [pnpm]
pnpm add @memofs/adapter-ai-sdk
```

```sh [yarn]
yarn add @memofs/adapter-ai-sdk
```

```sh [bun]
bun add @memofs/adapter-ai-sdk
```

```sh [deno]
bun add npm:@memofs/adapter-ai-sdk
```

:::

> [!NOTE]
> Requires **Node.js >= 22**.

## Usage

Use the adapter to compile memory tools and instructions, then inject them into Vercel AI SDK's `generateText` or `streamText` function:

```ts
import { MemoFS } from "@memofs/core";
import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";
import {
  createAiSdkRuntimeFromMemoFS,
  buildRuntimeMemoryToolDefinition,
  buildAgentSessionInstructions,
} from "@memofs/adapter-ai-sdk";

const memo = new MemoFS({ /* config */ });

// 1. Build runtime context instructions
const instructions = buildAgentSessionInstructions({
  projectName: "my-app",
});

// 2. Generate Vercel AI SDK compatible tools
const memoryTool = buildRuntimeMemoryToolDefinition({
  memo,
  name: "project_memory",
  description: "Search and update project memories",
});

// 3. Execute generation
const response = await generateText({
  model: openai("gpt-4o"),
  system: `You are an AI assistant. Context:\n${instructions}`,
  tools: {
    memory: memoryTool,
  },
  prompt: "What were our decisions about database routing?",
});

console.log(response.text);
```

## Core Functions

### `createAiSdkRuntimeFromMemoFS`
Wraps a `MemoFS` client to provide Vercel AI SDK bridge helper functions.

### `buildRuntimeMemoryToolDefinition`
Generates a structured Zod schema tool definition ready to be passed to Vercel AI SDK functions.

### `buildAgentSessionInstructions`
Generates the system-prompt instructions prompting the agent on how to use and structure core/archival memory.
