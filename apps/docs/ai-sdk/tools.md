# AI SDK tools

The main tool helpers are:

- `createTekMemoTool()` — returns one AI SDK-compatible memory tool
- `defineTekMemoTools()` — returns `{ tekmemo_memory: tool }`
- `createLocalTekMemoTool()` — creates a local runtime and one tool in one call
- `defineLocalTekMemoTools()` — creates a local runtime and `{ tekmemo_memory: tool }`

Typical use with AI SDK:

```ts
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { defineTekMemoTools } from "@tekbreed/tekmemo";

const result = await generateText({
	model: openai("gpt-4.1-mini"),
	prompt,
	tools: defineTekMemoTools({
		runtime,
		access: { projectId: "demo", userId: "user_123" },
		allowWrites: true,
	}),
});
```

Use read-only tools for user-facing agents that should not mutate memory. Enable writes only where durable memory creation is intentional.
