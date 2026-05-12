# AI SDK example

Build a scoped memory tool for AI SDK workflows.

Source folder:

```txt
examples/ai-sdk/
```

The example creates a local file-backed runtime, builds an AI SDK-compatible memory tool with `buildRuntimeMemoryToolDefinition()`, writes one scoped memory, and builds memory-aware context with `buildRuntimeMemoryContext()`.

Navigate to the example folder and run it:

```bash
cd examples/ai-sdk
npm install
npm run dev
```

Validate it:

```bash
npm run typecheck
```
