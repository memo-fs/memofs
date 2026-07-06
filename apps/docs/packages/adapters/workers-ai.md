# Cloudflare Workers AI Adapter (`@memofs/adapter-workers-ai`)

The `@memofs/adapter-workers-ai` adapter utilizes Cloudflare's serverless GPUs to perform graph extraction on Cloudflare Workers without incurring API key setup friction.

---

## Installation

```bash
npm install @memofs/adapter-workers-ai
```

---

## Usage

Use the Cloudflare Workers AI binding environment `env.AI` to initialize the extractor:

```ts
import { Tekmemo } from "@memofs/core";
import { createWorkersAiExtractor } from "@memofs/adapter-workers-ai";
import { createR2BlobClient } from "@memofs/adapter-r2";

export default {
  async fetch(request, env) {
    const memo = new Tekmemo({
      store: createR2BlobClient({ bucket: env.BUCKET }),
      projectId: "worker-ai-project",
      extractor: createWorkersAiExtractor({
        ai: env.AI, // Injected Cloudflare Workers AI binding
        model: "@cf/meta/llama-3-8b-instruct", // Optional override
      }),
    });
    
    // ... handling fetch ...
  }
}
```

---

## Configuration API (`WorkersAiExtractorConfig`)

| Option | Type | Required | Description |
|---|---|---|---|
| `ai` | `unknown` | Yes | The Cloudflare AI binding object (`env.AI`). |
| `model` | `string` | No | Llama model path (default: `"@cf/meta/llama-3-8b-instruct"`). |
| `maxTokens` | `number` | No | Max tokens parameter for completion outputs. |
