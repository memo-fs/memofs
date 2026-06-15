# Injecting Project Memory

If you are building an AI application using the [Vercel AI SDK](https://sdk.vercel.ai/), you can easily inject your project's `core.md` and durable notes into the LLM's context window.

This guide shows you how to use the `@tekbreed/tekmemo/ai-sdk` adapter to pass your TekMemo project memory into standard text generations.

## Prerequisites
- You have initialized a TekMemo project (`.tekmemo` directory exists).
- You have `@tekbreed/tekmemo` and `ai` installed.

## Using `getTekMemoContext`

The `getTekMemoContext` function reads the current project memory and formats it perfectly for the AI SDK's `system` prompt parameter.

```typescript
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { getTekMemoContext, NodeFsMemoryStore } from "@tekbreed/tekmemo";

async function generateResponse(prompt: string) {
	// 1. Initialize the memory store pointing to your project root
	const store = new NodeFsMemoryStore(process.cwd());

	// 2. Fetch the formatted context string
	const systemContext = await getTekMemoContext({ store });

	// 3. Pass the context into the generateText call
	const { text } = await generateText({
		model: openai("gpt-4o"),
		system: `You are an AI assistant. Adhere to these project rules: \n\n${systemContext}`,
		prompt,
	});

	return text;
}
```

## What is injected?
The `getTekMemoContext` function automatically concatenates:
1. The contents of `.tekmemo/core.md` (the stable project briefing).
2. The contents of `.tekmemo/notes.md` (the durable learned context).
3. Any active semantic or graph memory snapshots (if configured).

By prepending this to your `system` prompt, the LLM will automatically align its answers with the rules and architectural decisions stored in your TekMemo directory!
