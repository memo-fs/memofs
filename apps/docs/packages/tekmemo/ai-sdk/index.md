# Vercel AI SDK Integration

TekMemo provides official helpers for integrating memory into applications built with the [Vercel AI SDK](https://sdk.vercel.ai). These helpers live in the separate **`@tekbreed/tekmemo-adapter-ai-sdk`** adapter package and implement the framework-neutral [`TekMemoMemoryRuntime`](/api/tekmemo/) contract defined in core.

It allows your agents to automatically search memory for context and record new decisions or facts during a conversation.

## Installation

Install the adapter alongside core and the Vercel AI SDK peer dependency:

```bash
npm install @tekbreed/tekmemo @tekbreed/tekmemo-adapter-ai-sdk ai
```

## Core Helpers

| Helper | Purpose |
| --- | --- |
| `buildRuntimeMemoryContext()` | Compiles memory-aware context (core memory, notes, recall) for system prompts. |
| `buildRuntimeMemoryToolDefinition()` | Returns an AI SDK tool definition for runtime-based memory operations. |
| `runRuntimeMemoryTool()` | Executes runtime memory tool commands with scope enforcement. |
| `createAiSdkRuntimeFromTekmemo()` | Creates an AI SDK runtime backed by a `Tekmemo` instance (the recommended entry point). |

## Example Usage

This example shows how to ground a `generateText` call in your project's memory.
The runtime comes from a `Tekmemo` instance, so every operation — recall,
context, writes — flows through TekMemo's hybrid engine (BM25 + fuzzy +
vectors when an embedder is configured + recency + reranker).

```ts
import { generateText, stepCountIs } from "ai";
import { openai } from "@ai-sdk/openai";
import { Tekmemo } from "@tekbreed/tekmemo";
import {
  buildRuntimeMemoryContext,
  buildRuntimeMemoryToolDefinition,
  createAiSdkRuntimeFromTekmemo,
} from "@tekbreed/tekmemo-adapter-ai-sdk";

const memo = new Tekmemo({ rootDir: "./.tekmemo", projectId: "my-project" });
const runtime = createAiSdkRuntimeFromTekmemo(memo);
const access = { projectId: "my-project", userId: "user_123" };

async function chat(userPrompt: string) {
  // 1. Build a memory-aware context.
  // Reads core memory + notes and runs a hybrid recall over the query, then
  // compiles the results into a context block for the system prompt.
  const { text: system } = await buildRuntimeMemoryContext({
    runtime,
    access,
    query: userPrompt,
    baseInstructions: "You are a helpful coding assistant.",
  });

  // 2. Generate text with a memory tool.
  // The model can recall more, read core memory, and save durable notes
  // during multi-step reasoning.
  const result = await generateText({
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

  return result.text;
}
```

## Architectural Note

The AI SDK helpers are designed to be "pluggable." They rely on the
`TekMemoMemoryRuntime` interface (defined in core, implemented by the adapter), and
`createAiSdkRuntimeFromTekmemo()` adapts the full `Tekmemo` class to that contract — so recall,
context, and writes use the same intelligent engine whether the `Tekmemo` instance is backed by the
local filesystem (`mode: "local"`), a hybrid setup, or a cloud-backed client. Only the `Tekmemo`
construction changes; the agent code is identical.
