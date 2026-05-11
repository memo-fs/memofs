# AI SDK example

Build a scoped memory tool for AI SDK workflows.

Source folder:

```txt
examples/ai-sdk/
```

The example creates a local file-backed runtime, creates an AI SDK-compatible TekMemo tool with `createTekMemoTool()`, writes one scoped memory, and builds a memory-aware system prompt with `buildTekMemoSystemPrompt()`.

Run it from the repository root:

```bash
pnpm --filter @tekmemo/example-ai-sdk dev
```

Validate it:

```bash
pnpm --filter @tekmemo/example-ai-sdk typecheck
```
