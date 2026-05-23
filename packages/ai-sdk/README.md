# `@tekmemo/ai-sdk`

<p align="center">
  <a href="https://www.npmjs.com/package/@tekmemo/ai-sdk"><img src="https://img.shields.io/npm/v/@tekmemo%2Fai-sdk?label=@tekmemo/ai-sdk&style=for-the-badge" alt="npm version" /></a> &nbsp; 
  <a href="https://github.com/tekbreed/tekmemo"><img src="https://img.shields.io/badge/status-alpha-orange?style=for-the-badge" alt="Status: Alpha" /></a> &nbsp; 
  <a href="https://www.npmjs.com/package/@tekmemo/ai-sdk"><img src="https://img.shields.io/npm/dm/@tekmemo%2Fai-sdk?style=for-the-badge" alt="npm downloads" /></a> &nbsp; 
  <a href="https://github.com/tekbreed/tekmemo/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/tekbreed/tekmemo/ci.yml?branch=main&style=for-the-badge&label=CI" alt="CI" /></a> &nbsp; 
  <a href="https://docs.memo.tekbreed.com/"><img src="https://img.shields.io/badge/docs-online-blue?style=for-the-badge" alt="Docs" /></a> &nbsp; 
  <a href="../../LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg?style=for-the-badge" alt="MIT License" /></a>
</p>

## Purpose

`@tekmemo/ai-sdk` makes TekMemo usable as a Vercel AI SDK tool with minimal glue code. It exposes helpers for:

- creating an AI SDK-compatible memory tool
- defining a ready-to-spread `tools` object
- building a memory-aware `system` prompt
- using local, cloud, or hybrid TekMemo runtimes behind the same API
- enforcing project, user, conversation, and participant scope boundaries before memory is returned to the model
- generating AgentFS session instructions for Codex, Claude Code, and AI SDK agents

## AgentFS session instructions

Use this when an AI SDK-powered agent is working inside an AgentFS session created by `@tekmemo/agentfs`:

```ts
import { createTekMemoAgentSession } from "@tekmemo/agentfs";
import { buildAgentSessionInstructions } from "@tekmemo/ai-sdk";

const session = createTekMemoAgentSession({
  client: agentfsClient,
  memory: tekmemoStore,
  task: "Refactor auth middleware",
});

await session.prepare();

const system = buildAgentSessionInstructions({
  sessionId: session.sessionId,
  task: "Refactor auth middleware",
  paths: session.paths,
});
```

## Install

```bash
npm install @tekmemo/ai-sdk ai tekmemo @tekmemo/fs
```

For hosted memory, also install `@tekmemo/cloud-client` and create a cloud runtime there.

## Plug-and-play AI SDK usage

```ts
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { createNodeFsMemoryStore } from "@tekmemo/fs";
import {
  buildTekMemoSystemPrompt,
  createLocalAiSdkRuntime,
  defineTekMemoTools,
} from "@tekmemo/ai-sdk";

const workspace = createNodeFsMemoryStore({
  rootDir: process.cwd(),
  createRoot: true,
  missingFileBehavior: "empty",
});

const access = {
  projectId: "my-project",
  userId: "user_123",
  conversationId: "thread_456",
  actorId: "assistant:web",
};

const runtime = createLocalAiSdkRuntime({ workspace, access });
const { system } = await buildTekMemoSystemPrompt({
  runtime,
  access,
  query: "What should I remember before answering this request?",
  system: "You are a helpful product engineering assistant.",
});

const result = await generateText({
  model: openai("gpt-4.1-mini"),
  system,
  prompt: "Summarize the current implementation risks.",
  tools: defineTekMemoTools({
    runtime,
    access,
    allowWrites: true,
    allowCoreUpdates: false,
  }),
});

console.log(result.text);
```

The exported tool name is `tekmemo_memory`. To control the tool key yourself, use `createTekMemoTool()` directly:

```ts
import { createTekMemoTool } from "@tekmemo/ai-sdk";

const tools = {
  memory: createTekMemoTool({ runtime, access, allowWrites: true }),
};
```

## Local convenience helpers

For local file-backed apps, `createLocalTekMemoTool()` and `defineLocalTekMemoTools()` create the local runtime and AI SDK tool in one call.

```ts
import { defineLocalTekMemoTools } from "@tekmemo/ai-sdk";

const tools = defineLocalTekMemoTools({
  workspace,
  access: { projectId: "my-project", userId: "user_123" },
  allowWrites: true,
});
```

Use the explicit `runtime + defineTekMemoTools()` form when you also need to call `buildTekMemoSystemPrompt()` with the same runtime.

## Safety defaults

Writes are disabled unless `allowWrites: true` is passed. Core memory updates are disabled unless `allowCoreUpdates: true` is passed. Indexing is disabled unless `allowIndexing: true` is passed. Likely API keys and private keys are rejected by default unless `allowSecrets: true` is intentionally enabled.

Scope filtering is applied using the `access` object. User memory requires `userId`, conversation memory requires `conversationId`, and participant-shared memory requires `participantIds`.

## Boundary

This package owns the AI SDK integration layer only. It does not own TekMemo Cloud billing, dashboards, tenancy, hosted database storage, or provider secrets.

For hosted memory, use `@tekmemo/cloud-client`. For local file-backed memory, use `tekmemo` with `@tekmemo/fs`. For MCP tools, use `@tekmemo/mcp-server`.

## License

MIT.
