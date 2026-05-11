# AI SDK

`@tekmemo/ai-sdk` exposes TekMemo memory as Vercel AI SDK tools and memory-aware prompt context.

## Install

```bash
pnpm add @tekmemo/ai-sdk ai tekmemo @tekmemo/fs
```

## Primary API

Use `defineTekMemoTools()` when you want the default `tekmemo_memory` tool name.

```ts
const tools = defineTekMemoTools({ runtime, access, allowWrites: true });
```

Use `createTekMemoTool()` when your app controls the tool key.

```ts
const tools = {
	memory: createTekMemoTool({ runtime, access }),
};
```

Use `buildTekMemoSystemPrompt()` before `generateText()` or `streamText()` when memory should be injected as context before the model answers.

```ts
const { system } = await buildTekMemoSystemPrompt({
	runtime,
	access,
	query: userPrompt,
	system: baseSystemPrompt,
});
```

## Boundary

AI SDK helpers depend on runtime interfaces. They do not own storage, billing, tenancy, or provider secrets. Hosted memory should be supplied through `@tekmemo/cloud-client`.
