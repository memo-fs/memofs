# Vercel AI SDK Integration

TekMemo provides official helpers for integrating memory into applications built with the [Vercel AI SDK](https://sdk.vercel.ai). These helpers are built directly into the `@tekbreed/tekmemo` package.

It allows your agents to automatically search memory for context and record new decisions or facts during a conversation.

## Installation

Ensure you install the Vercel AI SDK peer dependency alongside the main package:

```bash
npm install ai @tekbreed/tekmemo
```

## Core Helpers

| Helper | Purpose |
| --- | --- |
| `buildRuntimeMemoryContext()` | Compiles memory-aware context (core memory, notes, recall) for system prompts. |
| `buildRuntimeMemoryToolDefinition()` | Returns an AI SDK tool definition for runtime-based memory operations. |
| `runRuntimeMemoryTool()` | Executes runtime memory tool commands with scope enforcement. |
| `createLocalAiSdkRuntime()` | Creates a local runtime backed by a `MemoryStore`. |

## Example Usage

This example shows how to ground a `generateText` call in your project's local memory.

```ts
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import {
	buildRuntimeMemoryContext,
	buildRuntimeMemoryToolDefinition,
	createLocalAiSdkRuntime,
	createNodeFsMemoryStore,
} from "@tekbreed/tekmemo";

const store = createNodeFsMemoryStore({ rootDir: "./.tekmemo" });
const runtime = createLocalAiSdkRuntime({ workspace: store });

async function chat(userPrompt: string) {
	// 1. Build a memory-aware context
	// This reads core memory, notes, and performs recall search, then
	// compiles the results into a context block for the system prompt.
	const { text: system } = await buildRuntimeMemoryContext({
		runtime,
		access: { projectId: "my-project" },
		query: userPrompt,
		baseInstructions: "You are a helpful coding assistant.",
	});

	// 2. Generate text with memory tools
	// The model can now call tools to read core memory or save new notes.
	const result = await generateText({
		model: openai("gpt-4o"),
		system,
		prompt: userPrompt,
		tools: {
			memory: buildRuntimeMemoryToolDefinition({
				runtime,
				access: { projectId: "my-project" },
				allowWrites: true,
			}),
		},
	});

	return result.text;
}
```

## Architectural Note

The AI SDK helpers are designed to be "pluggable." They rely on the `MemoryStore` and `RecallStore` interfaces, meaning they work equally well with local filesystem memory or hosted cloud memory.
