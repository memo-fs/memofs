# `@tekmemo/adapters`

`@tekmemo/adapters` is the convenience package for adapter imports.

It keeps `tekmemo` solo. The core package remains provider-neutral. Apps that want AI SDK, cloud, embedding, vector, or rerank integrations can install the adapters package and import the needed adapter through a subpath.

## Install

```bash
pnpm add @tekmemo/adapters
```

Install the external peer packages only for the adapter families you use:

```bash
# Vercel AI SDK tools
pnpm add @tekmemo/adapters ai tekmemo @tekmemo/fs

# OpenAI embedding adapter
pnpm add @tekmemo/adapters openai

# Upstash Vector recall adapter
pnpm add @tekmemo/adapters @upstash/vector
```

VoyageAI embedding and rerank adapters use HTTP/fetch and do not require a provider SDK package.

## Import paths

Use subpath imports for implementation APIs:

```ts
import { defineTekMemoTools } from "@tekmemo/adapters/ai-sdk";
import { createTekMemoCloudClient } from "@tekmemo/adapters/cloud-client";
import { createOpenAIEmbedder } from "@tekmemo/adapters/openai";
import { createVoyageEmbedder } from "@tekmemo/adapters/voyageai";
import { createUpstashRecallStore } from "@tekmemo/adapters/upstash-vector";
import { createVoyageReranker } from "@tekmemo/adapters/rerank-voyage";
```

The root import is metadata-only:

```ts
import { adapterImportPaths, tekMemoAdapters } from "@tekmemo/adapters";
```

The root module does not import provider implementations. That prevents optional peer dependencies such as `ai`, `openai`, or `@upstash/vector` from being loaded unless the matching adapter subpath is imported.

## Reexported adapters

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

## Boundary

Use `@tekmemo/adapters` in applications and examples when convenience matters. Use the direct packages when you want the smallest dependency graph.

Do not import `@tekmemo/adapters` from `tekmemo` core or other low-level packages. Core must remain independent of providers, cloud transport, vector stores, and AI SDK tooling.
