# `@tekmemo/ai-sdk`

Vercel AI SDK helpers for TekMemo memory tools.

## Install

```bash
pnpm add @tekmemo/ai-sdk ai tekmemo @tekmemo/fs
```

## Purpose

Use this package to expose TekMemo memory as AI SDK tools in `generateText`, `streamText`, and agent workflows.

The package provides:

- `createTekMemoTool()` for a single AI SDK-compatible tool
- `defineTekMemoTools()` for a ready-to-pass `tools` object
- `createLocalAiSdkRuntime()` for local file-backed memory
- `buildTekMemoSystemPrompt()` for memory-aware system prompts
- scope enforcement for project, user, conversation, and participant memory

## Minimal usage

```ts
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import {
	buildTekMemoSystemPrompt,
	createLocalAiSdkRuntime,
	defineTekMemoTools,
} from "@tekmemo/ai-sdk";

const access = { projectId: "demo", userId: "user_123" };
const runtime = createLocalAiSdkRuntime({ workspace, access });
const { system } = await buildTekMemoSystemPrompt({ runtime, access, query: prompt });

await generateText({
	model: openai("gpt-4.1-mini"),
	system,
	prompt,
	tools: defineTekMemoTools({ runtime, access, allowWrites: true }),
});
```

## Boundary

Cloud-backed tools should use a runtime from `@tekmemo/cloud-client`. This package does not own hosted storage, billing, dashboards, or provider secrets.
