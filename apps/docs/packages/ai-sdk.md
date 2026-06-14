# AI SDK Module

The AI SDK module provides Vercel AI SDK helpers for integrating TekMemo memory tools.

## Installation

Ensure you install the Vercel AI SDK peer dependency alongside the main package:

```bash
npm install ai @tekbreed/tekmemo
```

## Import

All AI SDK helper APIs are imported directly from `@tekbreed/tekmemo`:

## Purpose

Use this package to expose TekMemo memory as AI SDK tools in `generateText`, `streamText`, and agent workflows.

The package provides:

- `buildRuntimeMemoryToolDefinition()` for a ready-to-use AI SDK tool with memory operations
- `runRuntimeMemoryTool()` for executing memory tool commands with scope enforcement
- `createLocalAiSdkRuntime()` for local file-backed memory runtime
- `buildRuntimeMemoryContext()` for building memory-aware context (system prompt)
- `buildMemoryToolDefinition()` for a standard memory tool definition (legacy API)
- `buildAgentSessionInstructions()` for agent session instruction blocks
- Scope enforcement for project, user, conversation, and participant memory

## Minimal usage

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

For cloud-backed memory tools, use a runtime initialized with the cloud client instead of the local runtime:

```ts
import { createTekMemoCloudClient } from "@tekbreed/tekmemo";

const client = createTekMemoCloudClient({
	baseUrl: "https://memo.tekbreed.com/api/v1",
	apiKey: process.env.TEKMEMO_API_KEY!,
	defaultProjectId: "proj_123",
});
```
