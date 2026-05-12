# `@tekmemo/adapters`

`@tekmemo/adapters` is a convenience package that reexports all TekMemo adapter packages through a single install.

It lets you use one package for AI SDK, cloud, embedding, vector, and rerank integrations instead of installing each adapter individually.

## Install

```bash
npm install @tekmemo/adapters
```

Install the external peer packages only for the adapter families you use:

```bash
# Vercel AI SDK tools
npm install @tekmemo/adapters ai tekmemo @tekmemo/fs

# OpenAI embedding adapter
npm install @tekmemo/adapters openai

# Upstash Vector recall adapter
npm install @tekmemo/adapters @upstash/vector
```

VoyageAI embedding and rerank adapters use HTTP/fetch and do not require a provider SDK package.

## Import paths

Use subpath imports for the adapters you need:

```ts
import { buildRuntimeMemoryToolDefinition } from "@tekmemo/adapters/ai-sdk";
import { createTekMemoCloudClient } from "@tekmemo/adapters/cloud-client";
import { createOpenAIEmbedder } from "@tekmemo/adapters/openai";
import { createVoyageEmbedder } from "@tekmemo/adapters/voyageai";
import { createUpstashRecallStore } from "@tekmemo/adapters/upstash-vector";
import { createVoyageReranker } from "@tekmemo/adapters/rerank-voyage";
```

The root import provides metadata only:

```ts
import { adapterImportPaths, tekMemoAdapters } from "@tekmemo/adapters";
```

The root module does not load provider implementations, so optional peer dependencies like `ai`, `openai`, or `@upstash/vector` are only loaded when you import the matching subpath.

## Available adapters

| Import path | Reexports |
| --- | --- |
| `@tekmemo/adapters/ai-sdk` | `@tekmemo/ai-sdk` |
| `@tekmemo/adapters/cloud-client` | `@tekmemo/cloud-client` |
| `@tekmemo/adapters/openai` | `@tekmemo/openai` |
| `@tekmemo/adapters/openai/testing` | `@tekmemo/openai/testing` |
| `@tekmemo/adapters/upstash-vector` | `@tekmemo/upstash-vector` |
| `@tekmemo/adapters/voyageai` | `@tekmemo/voyageai` |
| `@tekmemo/adapters/voyageai/testing` | `@tekmemo/voyageai/testing` |
| `@tekmemo/adapters/rerank-voyage` | `@tekmemo/rerank-voyage` |
| `@tekmemo/adapters/rerank-voyage/testing` | `@tekmemo/rerank-voyage/testing` |

## When to use adapters vs direct packages

Use `@tekmemo/adapters` when you want a single first-party package for multiple integrations. Use the direct packages (e.g., `@tekmemo/openai`) when you want the smallest possible dependency footprint.
